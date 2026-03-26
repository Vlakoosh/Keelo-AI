import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import ConfettiCannon from "react-native-confetti-cannon";
import { useEffect, useRef, useState } from "react";
import { Alert, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Switch, Text, TextInput, Vibration, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { BottomPopup } from "@/components/bottom-popup";
import { PageHeader } from "@/components/page-header";
import { PrimaryButton } from "@/components/primary-button";
import { consumePendingExerciseSelection } from "@/features/workout/add-exercise-bridge";
import {
  createEmptySession,
  type WorkoutRoutine,
  type SetType,
  type WeightUnit,
  type WorkoutExercise,
  type WorkoutSession
} from "@/features/workout/mock-data";
import {
  createExerciseFromCatalogId,
  createSessionFromRoutine,
  deleteWorkoutRoutine,
  duplicateWorkoutRoutine,
  initializeWorkoutStorage,
  loadWorkoutHistory,
  loadWorkoutRoutines,
  saveWorkoutSession
} from "@/features/workout/storage";
import type { WorkoutHistoryItem } from "@/features/workout/storage";
import type { WorkoutView } from "@/features/workout/types";

type Sheet =
  | { type: "none" }
  | { type: "routine"; id: string }
  | { type: "exercise"; id: string }
  | { type: "set"; exerciseId: string; setId: string }
  | { type: "weight"; exerciseId: string }
  | { type: "rest"; exerciseId: string }
  | { type: "timer" }
  | { type: "photo" };

const rests = Array.from({ length: 37 }, (_, index) => index * 5);
const REST_ITEM_HEIGHT = 44;
const REST_WINDOW_HEIGHT = 220;
const REST_SPACER = (REST_WINDOW_HEIGHT - REST_ITEM_HEIGHT) / 2;

export function WorkoutPrototype() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [view, setView] = useState<WorkoutView>("library");
  const [libraryMode, setLibraryMode] = useState<"tracker" | "routines">("tracker");
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sheet, setSheet] = useState<Sheet>({ type: "none" });
  const [rest, setRest] = useState<{ exerciseId: string; left: number } | null>(null);
  const [timerMode, setTimerMode] = useState<"timer" | "stopwatch">("timer");
  const [toolSeconds, setToolSeconds] = useState(90);
  const [toolRunning, setToolRunning] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [confettiSetId, setConfettiSetId] = useState<string | null>(null);
  const [showWorkoutHistory, setShowWorkoutHistory] = useState(true);
  const [showMyRoutines, setShowMyRoutines] = useState(true);

  useEffect(() => {
    if (!rest?.left) return;
    const id = setInterval(() => {
      setRest((current) => {
        if (!current) return current;
        if (current.left <= 1) {
          Vibration.vibrate(500);
          return null;
        }
        return { ...current, left: current.left - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rest?.left]);

  useEffect(() => {
    if (!toolRunning) return;
    const id = setInterval(() => {
      setToolSeconds((c) => {
        if (timerMode === "timer") return c > 1 ? c - 1 : (setToolRunning(false), 0);
        return c + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerMode, toolRunning]);

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      await initializeWorkoutStorage();
      const [storedRoutines, storedHistory] = await Promise.all([
        loadWorkoutRoutines(),
        loadWorkoutHistory()
      ]);

      if (!isMounted) return;

      setRoutines(storedRoutines);
      setHistory(storedHistory);
      setIsLoading(false);
    }

    load().catch((error) => {
      console.error(error);
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isFocused || view !== "library") {
      return;
    }

    void Promise.all([loadWorkoutRoutines(), loadWorkoutHistory()]).then(([storedRoutines, storedHistory]) => {
      setRoutines(storedRoutines);
      setHistory(storedHistory);
    }).catch((error) => console.error(error));
  }, [isFocused, view]);

  useEffect(() => {
    if (!isFocused || view !== "active" || !session) {
      return;
    }

    const pendingExerciseId = consumePendingExerciseSelection();
    if (!pendingExerciseId) {
      return;
    }

    void createExerciseFromCatalogId(pendingExerciseId)
      .then((nextExercise) => {
        setSession((current) =>
          current
            ? {
                ...current,
                exercises: [...current.exercises, nextExercise]
              }
            : current
        );
      })
      .catch((error) => {
        console.error(error);
        Alert.alert("Add exercise", "Unable to load that exercise right now.");
      });
  }, [isFocused, session, view]);

  const secs = session ? Math.floor((now - session.startedAt) / 1000) : 0;
  const sum = summary(session);
  const updateExercise = (exerciseId: string, fn: (exercise: WorkoutExercise) => WorkoutExercise) =>
    setSession((c) => (c ? { ...c, exercises: c.exercises.map((e) => (e.id === exerciseId ? fn(e) : e)) } : c));
  const updateSet = (exerciseId: string, setId: string, fn: (set: WorkoutExercise["sets"][number]) => WorkoutExercise["sets"][number]) =>
    updateExercise(exerciseId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? fn(s) : s)) }));

  async function startRoutine(routineId: string) {
    const nextSession = await createSessionFromRoutine(routineId);
    setSession(nextSession);
    setView("active");
  }

  async function handleSaveWorkout() {
    if (!session) {
      return;
    }

    if (hasInvalidSets(session)) {
      Alert.alert("Incomplete sets", "There are incomplete or unapproved sets in this workout.");
      return;
    }

    await saveWorkoutSession(session);
    const [storedRoutines, storedHistory] = await Promise.all([
      loadWorkoutRoutines(),
      loadWorkoutHistory()
    ]);

    setRoutines(storedRoutines);
    setHistory(storedHistory);
    Alert.alert("Workout saved", "Saved locally to Keelo on this device.");
    setSession(null);
    setView("library");
    setRest(null);
    setSheet({ type: "none" });
  }

  function attemptFinishWorkout() {
    if (!session) {
      return;
    }

    if (hasInvalidSets(session)) {
      Alert.alert("Incomplete sets", "There are incomplete or unapproved sets in this workout.");
      return;
    }

    setView("finish");
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-lg font-semibold text-text">Loading workout data...</Text>
      </View>
    );
  }

  if (view === "library") {
    return (
      <View className="flex-1 bg-background">
        <PageHeader title="Workouts" />
        <ScrollView keyboardShouldPersistTaps="never" className="flex-1" contentContainerClassName="gap-6 px-5 pb-8 pt-5">
          <View className="flex-row">
            <Pressable
              onPress={() => setLibraryMode("tracker")}
              className={`flex-1 items-center border-b pb-3 ${libraryMode === "tracker" ? "border-b-[3px] border-secondary" : "border-border"}`}
            >
              <Text className={`text-base font-semibold ${libraryMode === "tracker" ? "text-text" : "text-muted"}`}>Tracker</Text>
            </Pressable>
            <Pressable
              onPress={() => setLibraryMode("routines")}
              className={`flex-1 items-center border-b pb-3 ${libraryMode === "routines" ? "border-b-[3px] border-secondary" : "border-border"}`}
            >
              <Text className={`text-base font-semibold ${libraryMode === "routines" ? "text-text" : "text-muted"}`}>Routines</Text>
            </Pressable>
          </View>

          {libraryMode === "tracker" ? (
            <>
              <Pressable
                onPress={() => { setSession(createEmptySession()); setView("active"); }}
                className="items-center justify-center rounded-card bg-secondary px-4 py-4"
              >
                <Text className="text-base font-semibold uppercase tracking-[1px] text-text-secondary">Start Empty Workout</Text>
              </Pressable>
              <View className="gap-4">
                <Pressable
                  onPress={() => setShowWorkoutHistory((current) => !current)}
                  className="flex-row items-center justify-between"
                >
                  <Text className="text-sm font-medium text-muted">Workout History</Text>
                  <Ionicons
                    name={showWorkoutHistory ? "chevron-down" : "chevron-forward"}
                    size={16}
                    color="#A3A3A3"
                  />
                </Pressable>
                {showWorkoutHistory ? (
                  history.length > 0 ? (
                    <View className="gap-4">
                      {history.map((item) => (
                        <HistoryTile key={item.id} item={item} onMenuPress={() => Alert.alert("Workout menu", "History actions are next.")} />
                      ))}
                    </View>
                  ) : (
                    <View className="rounded-card border border-quaternary bg-tertiary px-4 py-5">
                      <Text className="text-sm text-muted">No workouts yet</Text>
                    </View>
                  )
                ) : null}
              </View>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => router.push("/routines/create")}
                className="items-center justify-center rounded-card bg-secondary px-4 py-4"
              >
                <Text className="text-base font-semibold uppercase tracking-[1px] text-text-secondary">Create New Routine</Text>
              </Pressable>
              <View className="gap-4">
                <Pressable
                  onPress={() => setShowMyRoutines((current) => !current)}
                  className="flex-row items-center justify-between"
                >
                  <Text className="text-sm font-medium text-muted">My Routines</Text>
                  <Ionicons
                    name={showMyRoutines ? "chevron-down" : "chevron-forward"}
                    size={16}
                    color="#A3A3A3"
                  />
                </Pressable>
                {showMyRoutines ? (
                  routines.length > 0 ? (
                    <View className="gap-4">
                      {routines.map((routine) => (
                        <RoutineTile
                          key={routine.id}
                          routine={routine}
                          onMenuPress={() => setSheet({ type: "routine", id: routine.id })}
                          onStart={() => { void startRoutine(routine.id); }}
                        />
                      ))}
                    </View>
                  ) : (
                    <View className="rounded-card border border-quaternary bg-tertiary px-4 py-5">
                      <Text className="text-sm text-muted">No routines yet</Text>
                    </View>
                  )
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
        <Popup
          sheet={sheet}
          setSheet={setSheet}
          onRefreshLibrary={async () => {
            const [storedRoutines, storedHistory] = await Promise.all([
              loadWorkoutRoutines(),
              loadWorkoutHistory()
            ]);
            setRoutines(storedRoutines);
            setHistory(storedHistory);
          }}
        />
      </View>
    );
  }

  if (!session) return <View className="flex-1 bg-background" />;

  return (
    <View className="flex-1 bg-background">
      <PageHeader
        title={view === "finish" ? "Workout Finished" : "Track Workout"}
        onBack={() => (view === "finish" ? setView("active") : (setSession(null), setView("library"), setRest(null), setSheet({ type: "none" })))}
        rightSlot={view === "active" ? <><Pressable onPress={() => setSheet({ type: "timer" })} className="h-11 w-11 items-center justify-center"><Ionicons name="timer-outline" size={22} color="#FAFAFA" /></Pressable><Pressable onPress={attemptFinishWorkout} className="px-1 py-2"><Text className="text-base font-semibold uppercase tracking-[1px] text-secondary">Save</Text></Pressable></> : undefined}
      />
      {view === "active" ? (
        <ScrollView keyboardShouldPersistTaps="never" className="flex-1" contentContainerClassName="gap-6 px-5 pb-10 pt-4">
          <View className="gap-2">
            <TextInput
              value={session.name}
              onChangeText={(text) => setSession((c) => (c ? { ...c, name: text } : c))}
              placeholder="Workout Name"
              placeholderTextColor="#A3A3A3"
              className="py-0 text-3xl font-semibold text-text"
            />
            <TextInput
              multiline
              value={session.notes}
              onChangeText={(text) => setSession((c) => (c ? { ...c, notes: text } : c))}
              placeholder="Add notes or description"
              placeholderTextColor="#A3A3A3"
              textAlignVertical="top"
              className="min-h-[56px] px-0 py-2 text-base text-text"
            />
          </View>
          <View className="flex-row border-y border-tertiary py-4">
            <Metric label="Duration" value={fmt(secs)} className="border-r border-tertiary" />
            <Metric label="Volume" value={`${sum.volume.toFixed(0)} kg`} className="border-r border-tertiary" />
            <Metric label="Sets" value={`${sum.sets}`} />
          </View>
          {session.exercises.map((e) => <ExerciseCard key={e.id} exercise={e} activeRestSeconds={rest?.exerciseId === e.id ? rest.left : null} confettiSetId={confettiSetId} clearConfetti={() => setConfettiSetId(null)} updateExercise={updateExercise} updateSet={updateSet} addSet={() => updateExercise(e.id, (x) => ({ ...x, sets: [...x.sets, { id: `${x.id}-${x.sets.length + 1}`, type: "normal", previous: x.sets[x.sets.length - 1]?.previous ?? "No data", enteredWeight: "", reps: "", weightPlaceholder: x.sets[x.sets.length - 1]?.weightPlaceholder ?? x.sets[x.sets.length - 1]?.enteredWeight ?? "", repsPlaceholder: x.sets[x.sets.length - 1]?.repsPlaceholder ?? x.sets[x.sets.length - 1]?.reps ?? "", completed: false, unit: x.sets[x.sets.length - 1]?.unit ?? "kg", pulleyMultiplier: x.sets[x.sets.length - 1]?.pulleyMultiplier ?? 1 }] }))} openSheet={setSheet} onCheck={(setId, done) => { const updatedExercise = { ...e, sets: e.sets.map((set) => set.id === setId ? { ...set, completed: done } : set) }; const shouldCelebrate = Boolean(done && getMedalMap(updatedExercise)[setId]); updateSet(e.id, setId, (s) => ({ ...s, completed: done })); if (done && e.restTimerSeconds > 0) setRest({ exerciseId: e.id, left: e.restTimerSeconds }); if (shouldCelebrate) setConfettiSetId(setId); }} />)}
          <PrimaryButton label="Add Exercise" onPress={() => router.push("/exercises/add")} />
        </ScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="never" className="flex-1" contentContainerClassName="gap-5 px-5 pb-10 pt-5">
          <View className="flex-row gap-3"><Metric label="Duration" value={fmt(secs)} /><Metric label="Volume" value={`${sum.volume.toFixed(0)} kg`} /><Metric label="Sets" value={`${sum.sets}`} /></View>
          <View className="gap-3 border-b border-border pb-5"><Text className="text-lg font-semibold text-text">Session notes</Text><TextInput multiline value={session.notes} onChangeText={(text) => setSession((c) => (c ? { ...c, notes: text } : c))} placeholder="How did the session feel?" placeholderTextColor="#737373" textAlignVertical="top" className="min-h-[120px] rounded-card border border-border bg-background px-4 py-4 text-base text-text" /></View>
          <Pressable onPress={() => setSheet({ type: "photo" })} className="gap-3 border-b border-border pb-5"><View className="flex-row items-center justify-between"><Text className="text-lg font-semibold text-text">Progress photo</Text><View className="rounded-card border border-yellow-500/30 bg-transparent px-3 py-1"><Ionicons name="flash" size={14} color="#FCD34D" /></View></View><View className="h-40 items-center justify-center rounded-card border border-dashed border-border bg-background"><Ionicons name="images-outline" size={28} color="#737373" /><Text className="mt-3 text-sm text-muted">Take with camera or select from gallery</Text></View></Pressable>
          <PrimaryButton label="Save workout" onPress={() => { void handleSaveWorkout(); }} />
        </ScrollView>
      )}
      <Popup
        sheet={sheet}
        setSheet={setSheet}
        session={session}
        setSession={setSession}
        onRefreshLibrary={async () => {
          const [storedRoutines, storedHistory] = await Promise.all([
            loadWorkoutRoutines(),
            loadWorkoutHistory()
          ]);
          setRoutines(storedRoutines);
          setHistory(storedHistory);
        }}
        setToolRunning={setToolRunning}
        setToolSeconds={setToolSeconds}
        toolRunning={toolRunning}
        toolSeconds={toolSeconds}
        timerMode={timerMode}
        setTimerMode={setTimerMode}
      />
    </View>
  );
}

function Popup({
  sheet,
  setSheet,
  session,
  setSession,
  onRefreshLibrary,
  setToolRunning,
  setToolSeconds,
  toolRunning,
  toolSeconds,
  timerMode,
  setTimerMode
}: {
  sheet: Sheet;
  setSheet: (sheet: Sheet) => void;
  session?: WorkoutSession | null;
  setSession?: React.Dispatch<React.SetStateAction<WorkoutSession | null>>;
  onRefreshLibrary?: () => Promise<void>;
  setToolRunning?: React.Dispatch<React.SetStateAction<boolean>>;
  setToolSeconds?: React.Dispatch<React.SetStateAction<number>>;
  toolRunning?: boolean;
  toolSeconds?: number;
  timerMode?: "timer" | "stopwatch";
  setTimerMode?: React.Dispatch<React.SetStateAction<"timer" | "stopwatch">>;
}) {
  const router = useRouter();
  return (
    <BottomPopup
      visible={sheet.type !== "none"}
      title={sheet.type === "routine" ? "Routine menu" : sheet.type === "exercise" ? "Exercise actions" : sheet.type === "set" ? "Set type" : sheet.type === "weight" ? "Weight preferences" : sheet.type === "rest" ? "Rest timer" : sheet.type === "timer" ? "Timer / Stopwatch" : "Add progress photo"}
      subtitle={sheet.type === "set" ? "Warmup and drop sets do not increment the main working-set count." : sheet.type === "weight" ? "Switch unit or pulley ratio without losing the logged machine weight." : sheet.type === "timer" ? "Use a countdown between sets or switch to stopwatch mode." : undefined}
      onClose={() => setSheet({ type: "none" })}
    >
      {sheet.type === "routine" ? <View className="gap-3"><PrimaryButton label="Duplicate routine" variant="secondary" onPress={() => { void duplicateWorkoutRoutine(sheet.id).then(async () => { await onRefreshLibrary?.(); setSheet({ type: "none" }); }).catch((error) => console.error(error)); }} /><PrimaryButton label="Edit routine" variant="secondary" onPress={() => { setSheet({ type: "none" }); router.push({ pathname: "/routines/create", params: { routineId: sheet.id } }); }} /><PrimaryButton label="Delete routine" variant="danger" onPress={() => { void deleteWorkoutRoutine(sheet.id).then(async () => { await onRefreshLibrary?.(); setSheet({ type: "none" }); }).catch((error) => console.error(error)); }} /></View> : null}
      {sheet.type === "exercise" ? <View className="gap-3"><PrimaryButton label="Move exercise up" variant="secondary" onPress={() => reorder(session ?? null, setSession, sheet.id, -1, setSheet)} /><PrimaryButton label="Move exercise down" variant="secondary" onPress={() => reorder(session ?? null, setSession, sheet.id, 1, setSheet)} /><PrimaryButton label="Replace exercise" variant="secondary" onPress={() => Alert.alert("Replace exercise", "Exercise library hookup is next.")} /><PrimaryButton label="Remove exercise" variant="danger" onPress={() => { setSession?.((c) => c ? { ...c, exercises: c.exercises.filter((e) => e.id !== sheet.id) } : c); setSheet({ type: "none" }); }} /></View> : null}
      {sheet.type === "set" ? <View className="gap-3">{(["warmup", "drop", "failure", "normal"] as const).map((type) => <PrimaryButton key={type} label={cap(type)} variant="secondary" onPress={() => { setSession?.((c) => c ? { ...c, exercises: c.exercises.map((e) => e.id === sheet.exerciseId ? { ...e, sets: e.sets.map((s) => s.id === sheet.setId ? { ...s, type } : s) } : e) } : c); setSheet({ type: "none" }); }} />)}<PrimaryButton label="Delete set" variant="danger" onPress={() => { setSession?.((c) => c ? { ...c, exercises: c.exercises.map((e) => e.id === sheet.exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== sheet.setId) } : e) } : c); setSheet({ type: "none" }); }} /></View> : null}
      {sheet.type === "weight" ? <WeightSheet sheet={sheet} session={session} setSession={setSession} setSheet={setSheet} /> : null}
      {sheet.type === "rest" ? <RestSheet sheet={sheet} session={session} setSession={setSession} setSheet={setSheet} /> : null}
      {sheet.type === "timer" ? <View className="gap-5"><View className="flex-row gap-3"><Pressable onPress={() => { setTimerMode?.("timer"); setToolRunning?.(false); setToolSeconds?.((c) => c === 0 ? 90 : c); }} className={`flex-1 rounded-card border px-4 py-3 ${timerMode === "timer" ? "border-accent bg-accent" : "border-white bg-background"}`}><Text className={`text-center text-sm font-semibold ${timerMode === "timer" ? "text-background" : "text-text"}`}>Timer</Text></Pressable><Pressable onPress={() => { setTimerMode?.("stopwatch"); setToolRunning?.(false); setToolSeconds?.(0); }} className={`flex-1 rounded-card border px-4 py-3 ${timerMode === "stopwatch" ? "border-accent bg-accent" : "border-white bg-background"}`}><Text className={`text-center text-sm font-semibold ${timerMode === "stopwatch" ? "text-background" : "text-text"}`}>Stopwatch</Text></Pressable></View><View className="items-center justify-center"><View className="w-full flex-row items-center justify-center"><View className="w-20 items-center">{timerMode === "timer" ? <Pressable onPress={() => setToolSeconds?.((c) => Math.max(0, c - 10))} className="h-11 flex-row items-center justify-center gap-2 rounded-card border border-white px-4"><Ionicons name="remove" size={18} color="#FAFAFA" /><Text className="text-sm font-semibold text-text">-10s</Text></Pressable> : null}</View><View className="h-52 w-52 items-center justify-center rounded-full border border-border bg-background"><Text className="text-4xl font-semibold text-text">{fmt(toolSeconds ?? 0)}</Text><Text className="mt-2 text-sm text-muted">{timerMode === "timer" ? "Countdown" : "Elapsed time"}</Text></View><View className="w-20 items-center">{timerMode === "timer" ? <Pressable onPress={() => setToolSeconds?.((c) => c + 10)} className="h-11 flex-row items-center justify-center gap-2 rounded-card border border-white px-4"><Ionicons name="add" size={18} color="#FAFAFA" /><Text className="text-sm font-semibold text-text">+10s</Text></Pressable> : null}</View></View></View><PrimaryButton label={toolRunning ? "Stop" : "Start"} onPress={() => { if (toolRunning) { setToolRunning?.(false); setToolSeconds?.(timerMode === "timer" ? 90 : 0); return; } if (timerMode === "stopwatch") setToolSeconds?.(0); if (timerMode === "timer" && toolSeconds === 0) setToolSeconds?.(90); setToolRunning?.(true); }} /></View> : null}
      {sheet.type === "photo" ? <View className="gap-3"><PrimaryButton label="Take with camera" variant="secondary" onPress={() => Alert.alert("Camera flow", "We can wire Expo Image Picker next.")} /><PrimaryButton label="Select from gallery" variant="secondary" onPress={() => Alert.alert("Gallery flow", "We can wire Expo Image Picker next.")} /></View> : null}
    </BottomPopup>
  );
}

function summary(session: WorkoutSession | null) {
  let volume = 0, sets = 0;
  session?.exercises.forEach((e) => e.sets.forEach((s) => {
    if (!s.completed || (s.type !== "normal" && s.type !== "failure")) return;
    volume += Number(s.enteredWeight) * s.pulleyMultiplier * Number(s.reps);
    sets += 1;
  }));
  return { volume, sets };
}

function reorder(session: WorkoutSession | null, setSession: PopupProps["setSession"], exerciseId: string, diff: -1 | 1, setSheet: (sheet: Sheet) => void) {
  if (!session || !setSession) return;
  const index = session.exercises.findIndex((e) => e.id === exerciseId);
  const next = index + diff;
  if (index < 0 || next < 0 || next >= session.exercises.length) return;
  setSession((c) => {
    if (!c) return c;
    const exercises = [...c.exercises];
    const [moved] = exercises.splice(index, 1);
    exercises.splice(next, 0, moved);
    return { ...c, exercises };
  });
  setSheet({ type: "none" });
}

type PopupProps = Parameters<typeof Popup>[0];

function ExerciseCard({
  exercise,
  activeRestSeconds,
  confettiSetId,
  clearConfetti,
  updateExercise,
  updateSet,
  addSet,
  openSheet,
  onCheck
}: {
  exercise: WorkoutExercise;
  activeRestSeconds: number | null;
  confettiSetId: string | null;
  clearConfetti: () => void;
  updateExercise: (exerciseId: string, fn: (exercise: WorkoutExercise) => WorkoutExercise) => void;
  updateSet: (exerciseId: string, setId: string, fn: (set: WorkoutExercise["sets"][number]) => WorkoutExercise["sets"][number]) => void;
  addSet: () => void;
  openSheet: (sheet: Sheet) => void;
  onCheck: (setId: string, done: boolean) => void;
}) {
  const medals = getMedalMap(exercise);
  const displayUnit = exercise.sets[0]?.unit ?? "kg";
  return (
    <View className="gap-4 border-b border-tertiary py-5">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-xl font-semibold text-text">{exercise.name}</Text>
        <Pressable onPress={() => openSheet({ type: "exercise", id: exercise.id })} className="h-10 w-10 items-center justify-center">
          <Ionicons name="ellipsis-horizontal" size={18} color="#FAFAFA" />
        </Pressable>
      </View>
      <Pressable onPress={() => openSheet({ type: "rest", exerciseId: exercise.id })} className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-medium text-muted">Rest Timer</Text>
          {activeRestSeconds !== null ? <Text className="text-sm font-semibold text-carbs">{fmt(activeRestSeconds)}</Text> : null}
        </View>
        <Text className="text-sm text-muted">{exercise.restTimerSeconds === 0 ? "OFF" : `${exercise.restTimerSeconds}s`}</Text>
      </Pressable>
      <View className="py-3">
        <View className="mb-3 flex-row items-center">
          <Hdr label="Set" className="w-14 text-center" />
          <Hdr label="Previous" className="ml-2 flex-1 text-center" />
          <Pressable onPress={() => openSheet({ type: "weight", exerciseId: exercise.id })} className="ml-2 w-20 flex-row items-center justify-center gap-1">
            <Hdr label={displayUnit} className="text-center" />
            <Ionicons name="swap-horizontal" size={12} color="#FF772C" />
          </Pressable>
          <Hdr label="Reps" className="ml-2 w-20 text-center" />
          <View className="ml-2 w-14 items-center"><Ionicons name="checkmark" size={16} color="#A3A3A3" /></View>
        </View>
        <View className="gap-3">
          {exercise.sets.map((set) => (
            <View key={set.id} className="relative flex-row items-center">
              {confettiSetId === set.id ? <View pointerEvents="none" className="absolute left-4 top-2 z-10"><ConfettiCannon count={8} origin={{ x: 0, y: 0 }} fadeOut autoStart explosionSpeed={120} fallSpeed={1400} onAnimationEnd={clearConfetti} /></View> : null}
              <Pressable onPress={() => medals[set.id] ? Alert.alert("Set medal", medals[set.id].join("\n")) : openSheet({ type: "set", exerciseId: exercise.id, setId: set.id })} className="h-12 w-14 items-center justify-center rounded-card bg-tertiary">
                {medals[set.id] ? <Ionicons name="trophy" size={18} color="#FF772C" /> : <SetIndicator set={set} sets={exercise.sets} />}
              </Pressable>
              <View className="ml-2 h-12 flex-1 items-center justify-center rounded-card bg-quaternary px-3">
                <Text className="text-center text-sm text-text">{set.previous}</Text>
              </View>
              <View className="ml-2 h-12 w-20 rounded-card border border-quaternary bg-primary px-3 justify-center">
                <TextInput value={set.enteredWeight} keyboardType="decimal-pad" onChangeText={(text) => updateSet(exercise.id, set.id, (x) => ({ ...x, enteredWeight: text }))} className="py-0 text-center text-base font-semibold text-text" placeholder={set.weightPlaceholder || "0"} placeholderTextColor="#737373" />
              </View>
              <View className="ml-2 h-12 w-20 rounded-card border border-quaternary bg-primary px-3 justify-center">
                <TextInput value={set.reps} keyboardType="numeric" onChangeText={(text) => updateSet(exercise.id, set.id, (x) => ({ ...x, reps: text }))} className="py-0 text-center text-base font-semibold text-text" placeholder={set.repsPlaceholder || "0"} placeholderTextColor="#737373" />
              </View>
              <View className="ml-2 w-14 items-center">
                <Pressable onPress={() => onCheck(set.id, !set.completed)} className={`h-12 w-14 items-center justify-center rounded-card border ${set.completed ? "border-secondary bg-primary" : "border-quaternary bg-primary"}`}>
                  <Ionicons name="checkmark" size={18} color="#FF772C" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
      <PrimaryButton label="Add set" variant="secondary" onPress={addSet} />
    </View>
  );
}

function HistoryTile({
  item,
  onMenuPress
}: {
  item: WorkoutHistoryItem;
  onMenuPress: () => void;
}) {
  return (
    <View className="rounded-card border border-quaternary bg-tertiary px-4 py-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xl font-semibold text-text">{item.name}</Text>
          <Text className="mt-2 text-sm text-muted">Exercises</Text>
        </View>
        <Pressable onPress={onMenuPress} className="h-10 w-10 items-center justify-center">
          <Ionicons name="ellipsis-horizontal" size={18} color="#FAFAFA" />
        </Pressable>
      </View>
      <Text numberOfLines={2} ellipsizeMode="tail" className="mt-2 text-sm leading-6 text-muted">
        {item.exercisePreview.join(", ")}
      </Text>
      <View className="mt-4 border-t border-quaternary pt-4">
        <View className="flex-row">
          <Metric label="Duration" value={fmt(item.durationSeconds)} className="border-r border-quaternary" />
          <Metric label="Sets" value={`${item.setCount}`} className="border-r border-quaternary" />
          <Metric label="Weight" value={`${item.totalWeight.toFixed(0)} kg`} />
        </View>
      </View>
    </View>
  );
}

function RoutineTile({
  routine,
  onMenuPress,
  onStart
}: {
  routine: WorkoutRoutine;
  onMenuPress: () => void;
  onStart: () => void;
}) {
  return (
    <View className="rounded-card border border-quaternary bg-tertiary px-4 py-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xl font-semibold text-text">{routine.name}</Text>
          <Text className="mt-2 text-sm text-muted">Exercises</Text>
        </View>
        <Pressable onPress={onMenuPress} className="h-10 w-10 items-center justify-center">
          <Ionicons name="ellipsis-horizontal" size={18} color="#FAFAFA" />
        </Pressable>
      </View>
      <Text numberOfLines={2} ellipsizeMode="tail" className="mt-2 text-sm leading-6 text-muted">
        {routine.exercisePreview.join(", ")}
      </Text>
      <View className="mt-4">
        <PrimaryButton label="START ROUTINE" variant="secondary" onPress={onStart} />
      </View>
    </View>
  );
}

function WeightSheet({ sheet, session, setSession, setSheet }: { sheet: Extract<Sheet, { type: "weight" }>; session?: WorkoutSession | null; setSession?: PopupProps["setSession"]; setSheet: (sheet: Sheet) => void; }) {
  const exercise = session?.exercises.find((e) => e.id === sheet.exerciseId);
  const [unit, setUnit] = useState<WeightUnit>(exercise?.sets[0]?.unit ?? "kg");
  const [ratio, setRatio] = useState<1 | 0.5>(exercise?.sets[0]?.pulleyMultiplier ?? 1);
  if (!exercise || !setSession) return null;
  return <View className="gap-5"><View className="flex-row gap-3">{(["kg", "lb"] as const).map((u) => <Pressable key={u} onPress={() => setUnit(u)} className={`flex-1 rounded-card border px-4 py-3 ${unit === u ? "border-accent bg-accent" : "border-white bg-background"}`}><Text className={`text-center text-sm font-semibold ${unit === u ? "text-background" : "text-text"}`}>{u.toUpperCase()}</Text></Pressable>)}</View><View className="gap-3 rounded-card border border-border bg-background p-4"><View className="flex-row items-center justify-between"><Text className="text-base font-semibold text-text">Use 1x machine ratio</Text><Switch value={ratio === 1} onValueChange={(v) => setRatio(v ? 1 : 0.5)} /></View><Text className="text-sm leading-6 text-muted">Toggle to 0.5x when the cable machine uses a doubled pulley ratio and you want the app to calculate the effective load in half.</Text></View><PrimaryButton label="Apply preferences" onPress={() => { setSession((c) => c ? { ...c, exercises: c.exercises.map((e) => e.id === exercise.id ? { ...e, sets: e.sets.map((s) => ({ ...s, unit, pulleyMultiplier: ratio })) } : e) } : c); setSheet({ type: "none" }); }} /></View>;
}

function RestSheet({ sheet, session, setSession, setSheet }: { sheet: Extract<Sheet, { type: "rest" }>; session?: WorkoutSession | null; setSession?: PopupProps["setSession"]; setSheet: (sheet: Sheet) => void; }) {
  const exercise = session?.exercises.find((e) => e.id === sheet.exerciseId);
  const [selected, setSelected] = useState(exercise?.restTimerSeconds ?? 0);
  const scrollRef = useRef<ScrollView>(null);

  if (!exercise || !setSession) return null;

  useEffect(() => {
    const index = rests.indexOf(selected);
    const offset = Math.max(0, index * REST_ITEM_HEIGHT);
    const timeout = setTimeout(() => scrollRef.current?.scrollTo({ y: offset, animated: false }), 50);
    return () => clearTimeout(timeout);
  }, [selected]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.max(
      0,
      Math.min(rests.length - 1, Math.round(event.nativeEvent.contentOffset.y / REST_ITEM_HEIGHT))
    );
    setSelected(rests[index]);
  };

  return (
    <View className="gap-5">
      <View className="relative overflow-hidden" style={{ height: REST_WINDOW_HEIGHT }}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={REST_ITEM_HEIGHT}
          snapToAlignment="start"
          disableIntervalMomentum={false}
          decelerationRate="normal"
          contentOffset={{ x: 0, y: rests.indexOf(selected) * REST_ITEM_HEIGHT }}
          contentContainerStyle={{ paddingVertical: REST_SPACER }}
          onMomentumScrollEnd={onScrollEnd}
        >
          {rests.map((seconds) => (
            <Pressable
              key={seconds}
              onPress={() => setSelected(seconds)}
              className="items-center justify-center"
              style={{ height: REST_ITEM_HEIGHT }}
            >
              <Text className={`${selected === seconds ? "text-xl text-text" : "text-base text-muted"} font-semibold`}>
                {seconds === 0 ? "OFF" : `${seconds}s`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={["#000000", "rgba(0,0,0,0)"]}
          className="absolute inset-x-0 top-0"
          style={{ height: REST_SPACER }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(0,0,0,0)", "#000000"]}
          className="absolute inset-x-0 bottom-0"
          style={{ height: REST_SPACER }}
        />
        <View
          pointerEvents="none"
          className="absolute inset-x-0"
          style={{ top: REST_SPACER, height: REST_ITEM_HEIGHT }}
        />
      </View>
      <PrimaryButton
        label="Apply rest timer"
        onPress={() => {
          setSession((c) =>
            c
              ? {
                  ...c,
                  exercises: c.exercises.map((e) =>
                    e.id === exercise.id ? { ...e, restTimerSeconds: selected } : e
                  )
                }
              : c
          );
          setSheet({ type: "none" });
        }}
      />
    </View>
  );
}

function NotesField({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.trim().length > 0;

  return (
    <View className={`relative border-b border-border ${focused || hasValue ? "min-h-[72px]" : "min-h-[44px]"}`}>
      <TextInput
        multiline
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textAlignVertical="top"
        style={{ textAlignVertical: "top" }}
        className={`${focused || hasValue ? "min-h-[72px] pb-6 pt-2" : "min-h-[44px] py-2"} px-0 text-base text-text`}
      />
      {!focused ? (
        <Text className="absolute bottom-2 left-0 text-sm text-[#5C5C5C]">
          Add notes here
        </Text>
      ) : null}
    </View>
  );
}

function SetIndicator({ set, sets }: { set: WorkoutExercise["sets"][number]; sets: WorkoutExercise["sets"] }) {
  if (set.type === "failure") {
    return <Text className="text-left text-base font-semibold text-red-500">F</Text>;
  }

  if (set.type === "warmup") {
    return <Text className="text-left text-base font-semibold text-yellow-400">W</Text>;
  }

  if (set.type === "drop") {
    return <Text className="text-left text-base font-semibold text-carbs">D</Text>;
  }

  return <Text className="text-left text-base font-semibold text-text">{setLabel(sets, set.id)}</Text>;
}

function Metric({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <View className={`flex-1 items-center justify-center ${className}`}><Text className="text-2xl font-semibold text-text">{value}</Text><Text className="mt-2 text-sm text-muted">{label}</Text></View>;
}

function Hdr({ label, className = "" }: { label: string; className?: string }) {
  return <Text className={`${className} text-sm font-medium text-muted`}>{label}</Text>;
}

function setLabel(sets: WorkoutExercise["sets"], setId: string) {
  let count = 0;
  for (const set of sets) {
    if (set.type === "normal" || set.type === "failure") count += 1;
    if (set.id === setId) return set.type === "warmup" ? "W" : set.type === "drop" ? "D" : `${count}`;
  }
  return "?";
}

function getMedalMap(exercise: WorkoutExercise) {
  const medalMap: Record<string, string[]> = {};
  const candidates = exercise.sets
    .filter((set) => set.completed && set.enteredWeight.trim() && set.reps.trim())
    .map((set) => {
      const weight = Number(set.enteredWeight) * set.pulleyMultiplier;
      const reps = Number(set.reps);
      return {
        id: set.id,
        weight,
        volume: weight * reps,
        pr: weight * (1 + reps / 30)
      };
    });

  const topWeight = candidates.reduce<typeof candidates[number] | null>((best, current) => (!best || current.weight > best.weight ? current : best), null);
  const topVolume = candidates.reduce<typeof candidates[number] | null>((best, current) => (!best || current.volume > best.volume ? current : best), null);
  const topPr = candidates.reduce<typeof candidates[number] | null>((best, current) => (!best || current.pr > best.pr ? current : best), null);

  if (topWeight && topWeight.weight > exercise.benchmarks.bestWeight) {
    medalMap[topWeight.id] = [...(medalMap[topWeight.id] ?? []), `Highest weight +${(topWeight.weight - exercise.benchmarks.bestWeight).toFixed(1)}`];
  }
  if (topVolume && topVolume.volume > exercise.benchmarks.bestVolume) {
    medalMap[topVolume.id] = [...(medalMap[topVolume.id] ?? []), `Highest set volume +${(topVolume.volume - exercise.benchmarks.bestVolume).toFixed(1)}`];
  }
  if (topPr && topPr.pr > exercise.benchmarks.bestPr) {
    medalMap[topPr.id] = [...(medalMap[topPr.id] ?? []), `Highest calculated PR +${(topPr.pr - exercise.benchmarks.bestPr).toFixed(1)}`];
  }

  return medalMap;
}

function hasInvalidSets(session: WorkoutSession) {
  return session.exercises.some((exercise) =>
    exercise.sets.some((set) => {
      const hasInput = Boolean(set.enteredWeight.trim() || set.reps.trim());
      const hasCompleteInput = Boolean(set.enteredWeight.trim() && set.reps.trim());
      if (set.completed) {
        return !hasCompleteInput;
      }
      return hasInput;
    })
  );
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
