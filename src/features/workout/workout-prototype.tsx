import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import ConfettiCannon from "react-native-confetti-cannon";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { BottomPopup } from "@/components/bottom-popup";
import { PageHeader } from "@/components/page-header";
import { PrimaryButton } from "@/components/primary-button";
import {
  consumePendingExerciseSelection,
  setPendingExerciseAddMode,
} from "@/features/workout/add-exercise-bridge";
import { useActiveWorkout } from "@/features/workout/active-workout-provider";
import {
  createEmptySession,
  type WorkoutRoutine,
  type SetType,
  type WeightUnit,
  type WorkoutExercise,
  type WorkoutSession,
} from "@/features/workout/mock-data";
import { getWorkoutDurationSeconds } from "@/features/workout/session-utils";
import {
  createExerciseFromCatalogId,
  createSessionFromRoutine,
  deleteWorkoutSession,
  deleteWorkoutRoutine,
  duplicateWorkoutRoutine,
  initializeWorkoutStorage,
  loadWorkoutHistory,
  loadWorkoutRoutines,
  saveWorkoutSession,
} from "@/features/workout/storage";
import type { WorkoutHistoryItem } from "@/features/workout/storage";
import { useAppTheme } from "@/theme/theme-provider";
import type { WorkoutView } from "@/features/workout/types";

type Sheet =
  | { type: "none" }
  | { type: "routine"; id: string }
  | { type: "history"; id: string }
  | { type: "exercise"; id: string }
  | { type: "set"; exerciseId: string; setId: string }
  | { type: "weight"; exerciseId: string }
  | { type: "rest"; exerciseId: string }
  | { type: "duration" }
  | { type: "timer" }
  | { type: "photo" };

const rests = Array.from({ length: 37 }, (_, index) => index * 5);
const REST_ITEM_HEIGHT = 44;
const REST_WINDOW_HEIGHT = 220;
const REST_SPACER = (REST_WINDOW_HEIGHT - REST_ITEM_HEIGHT) / 2;
const durationHours = Array.from({ length: 9 }, (_, index) => index);
const durationMinutes = Array.from({ length: 60 }, (_, index) => index);
const durationSeconds = Array.from({ length: 12 }, (_, index) => index * 5);
const dateOptions = Array.from({ length: 15 }, (_, index) => {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - index);
  return value.getTime();
});

export function WorkoutPrototype() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { theme, mode } = useAppTheme();
  const {
    activeWorkout: session,
    setActiveWorkout: setSession,
    discardActiveWorkout,
    setIsActiveWorkoutVisible,
    setLastEditedExerciseName,
    resumeSignal,
  } = useActiveWorkout();
  const [view, setView] = useState<WorkoutView>("library");
  const [libraryMode, setLibraryMode] = useState<"tracker" | "routines">(
    "tracker",
  );
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheet, setSheet] = useState<Sheet>({ type: "none" });
  const [rest, setRest] = useState<{ exerciseId: string; left: number } | null>(
    null,
  );
  const [timerMode, setTimerMode] = useState<"timer" | "stopwatch">("timer");
  const [toolSeconds, setToolSeconds] = useState(90);
  const [toolRunning, setToolRunning] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [confettiSetId, setConfettiSetId] = useState<string | null>(null);
  const [showWorkoutHistory, setShowWorkoutHistory] = useState(true);
  const [showMyRoutines, setShowMyRoutines] = useState(true);

  useEffect(() => {
    setIsActiveWorkoutVisible(isFocused && view === "active");
    return () => setIsActiveWorkoutVisible(false);
  }, [isFocused, setIsActiveWorkoutVisible, view]);

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
        if (timerMode === "timer")
          return c > 1 ? c - 1 : (setToolRunning(false), 0);
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
        loadWorkoutHistory(),
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

    void Promise.all([loadWorkoutRoutines(), loadWorkoutHistory()])
      .then(([storedRoutines, storedHistory]) => {
        setRoutines(storedRoutines);
        setHistory(storedHistory);
      })
      .catch((error) => console.error(error));
  }, [isFocused, view]);

  useEffect(() => {
    if (!isFocused || view !== "active" || !session) {
      return;
    }

    const pendingSelection = consumePendingExerciseSelection();
    if (!pendingSelection) {
      return;
    }

    void createExerciseFromCatalogId(pendingSelection.exerciseId)
      .then((nextExercise) => {
        if (pendingSelection.type === "replace") {
          return;
        }

        setSession((current) =>
          current
            ? {
                ...current,
                exercises: [...current.exercises, nextExercise],
              }
            : current,
        );
        setLastEditedExerciseName(nextExercise.name);
      })
      .catch((error) => {
        console.error(error);
        Alert.alert("Add exercise", "Unable to load that exercise right now.");
      });
  }, [isFocused, session, view]);

  const lastResumeSignal = useRef(resumeSignal);

  useEffect(() => {
    if (resumeSignal === lastResumeSignal.current) {
      return;
    }

    lastResumeSignal.current = resumeSignal;
    if (session) {
      setView("active");
    }
  }, [resumeSignal, session]);

  useEffect(() => {
    if (!session && view !== "library") {
      setView("library");
    }
  }, [session, view]);

  const secs = session ? getWorkoutDurationSeconds(session, now) : 0;
  const sum = summary(session);
  const updateExercise = (
    exerciseId: string,
    fn: (exercise: WorkoutExercise) => WorkoutExercise,
  ) =>
    setSession((c) => {
      if (!c) return c;
      const currentExercise = c.exercises.find(
        (exercise) => exercise.id === exerciseId,
      );
      if (currentExercise) {
        setLastEditedExerciseName(currentExercise.name);
      }
      return {
        ...c,
        exercises: c.exercises.map((e) => (e.id === exerciseId ? fn(e) : e)),
      };
    });
  const updateSet = (
    exerciseId: string,
    setId: string,
    fn: (
      set: WorkoutExercise["sets"][number],
    ) => WorkoutExercise["sets"][number],
  ) =>
    updateExercise(exerciseId, (e) => ({
      ...e,
      sets: e.sets.map((s) => (s.id === setId ? fn(s) : s)),
    }));

  async function startRoutine(routineId: string) {
    if (session) {
      Alert.alert(
        "Workout in progress",
        "Finish, save, or discard the current workout first.",
      );
      setView("active");
      return;
    }
    const nextSession = await createSessionFromRoutine(routineId);
    setSession(nextSession);
    setLastEditedExerciseName(nextSession.exercises.at(-1)?.name ?? "");
    setView("active");
  }

  async function handleSaveWorkout() {
    if (!session) {
      return;
    }

    if (hasInvalidSets(session)) {
      Alert.alert(
        "Incomplete sets",
        "There are incomplete or unapproved sets in this workout.",
      );
      return;
    }

    await saveWorkoutSession(session);
    const [storedRoutines, storedHistory] = await Promise.all([
      loadWorkoutRoutines(),
      loadWorkoutHistory(),
    ]);

    setRoutines(storedRoutines);
    setHistory(storedHistory);
    Alert.alert("Workout saved", "Saved locally to Keelo on this device.");
    discardActiveWorkout();
    setView("library");
    setRest(null);
    setSheet({ type: "none" });
  }

  function attemptFinishWorkout() {
    if (!session) {
      return;
    }

    if (hasInvalidSets(session)) {
      Alert.alert(
        "Incomplete sets",
        "There are incomplete or unapproved sets in this workout.",
      );
      return;
    }

    setView("finish");
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-lg font-semibold text-text">
          Loading workout data...
        </Text>
      </View>
    );
  }

  if (view === "library") {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1" style={{ backgroundColor: theme.background }}>
          <PageHeader title="Workouts" />
          <ScrollView
            keyboardShouldPersistTaps="never"
            className="flex-1"
            contentContainerClassName="gap-6 px-5 pb-8 pt-5"
          >
            <View className="flex-row">
              <Pressable
                onPress={() => setLibraryMode("tracker")}
                className="flex-1 items-center border-b pb-3"
                style={{
                  borderBottomWidth: libraryMode === "tracker" ? 3 : 1,
                  borderBottomColor:
                    libraryMode === "tracker" ? theme.secondary : theme.border,
                }}
              >
                <Text
                  className="text-base font-semibold"
                  style={{
                    color: libraryMode === "tracker" ? theme.text : theme.muted,
                  }}
                >
                  Tracker
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLibraryMode("routines")}
                className="flex-1 items-center border-b pb-3"
                style={{
                  borderBottomWidth: libraryMode === "routines" ? 3 : 1,
                  borderBottomColor:
                    libraryMode === "routines" ? theme.secondary : theme.border,
                }}
              >
                <Text
                  className="text-base font-semibold"
                  style={{
                    color:
                      libraryMode === "routines" ? theme.text : theme.muted,
                  }}
                >
                  Routines
                </Text>
              </Pressable>
            </View>

            {libraryMode === "tracker" ? (
              <>
                <Pressable
                  onPress={() => {
                    if (session) {
                      Alert.alert(
                        "Workout in progress",
                        "Finish, save, or discard the current workout first.",
                      );
                      setView("active");
                      return;
                    }
                    const nextSession = createEmptySession();
                    setSession(nextSession);
                    setLastEditedExerciseName("");
                    setView("active");
                  }}
                  className="items-center justify-center rounded-card px-4 py-4"
                  style={{ backgroundColor: theme.secondary }}
                >
                  <Text
                    className="text-base font-semibold uppercase tracking-[1px]"
                    style={{ color: theme.textSecondary }}
                  >
                    Start Empty Workout
                  </Text>
                </Pressable>
                <View className="gap-4">
                  <Pressable
                    onPress={() => setShowWorkoutHistory((current) => !current)}
                    className="flex-row items-center justify-between"
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: theme.muted }}
                    >
                      Workout History
                    </Text>
                    <Ionicons
                      name={
                        showWorkoutHistory ? "chevron-down" : "chevron-forward"
                      }
                      size={16}
                      color={theme.muted}
                    />
                  </Pressable>
                  {showWorkoutHistory ? (
                    history.length > 0 ? (
                      <View className="gap-4">
                        {history.map((item) => (
                          <HistoryTile
                            key={item.id}
                            item={item}
                            onMenuPress={() =>
                              setSheet({ type: "history", id: item.id })
                            }
                          />
                        ))}
                      </View>
                    ) : (
                      <View
                        className="rounded-card px-4 py-5"
                        style={{
                          borderWidth: 1,
                          borderColor: theme.quaternary,
                          backgroundColor: theme.tertiary,
                        }}
                      >
                        <Text
                          className="text-sm"
                          style={{ color: theme.muted }}
                        >
                          No workouts yet
                        </Text>
                      </View>
                    )
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => router.push("/routines/create")}
                  className="items-center justify-center rounded-card px-4 py-4"
                  style={{ backgroundColor: theme.secondary }}
                >
                  <Text
                    className="text-base font-semibold uppercase tracking-[1px]"
                    style={{ color: theme.textSecondary }}
                  >
                    Create New Routine
                  </Text>
                </Pressable>
                <View className="gap-4">
                  <Pressable
                    onPress={() => setShowMyRoutines((current) => !current)}
                    className="flex-row items-center justify-between"
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: theme.muted }}
                    >
                      My Routines
                    </Text>
                    <Ionicons
                      name={showMyRoutines ? "chevron-down" : "chevron-forward"}
                      size={16}
                      color={theme.muted}
                    />
                  </Pressable>
                  {showMyRoutines ? (
                    routines.length > 0 ? (
                      <View className="gap-4">
                        {routines.map((routine) => (
                          <RoutineTile
                            key={routine.id}
                            routine={routine}
                            onMenuPress={() =>
                              setSheet({ type: "routine", id: routine.id })
                            }
                            onStart={() => {
                              void startRoutine(routine.id);
                            }}
                          />
                        ))}
                      </View>
                    ) : (
                      <View
                        className="rounded-card px-4 py-5"
                        style={{
                          borderWidth: 1,
                          borderColor: theme.quaternary,
                          backgroundColor: theme.tertiary,
                        }}
                      >
                        <Text
                          className="text-sm"
                          style={{ color: theme.muted }}
                        >
                          No routines yet
                        </Text>
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
                loadWorkoutHistory(),
              ]);
              setRoutines(storedRoutines);
              setHistory(storedHistory);
            }}
          />
        </View>
      </View>
    );
  }

  if (!session) return <View className="flex-1 bg-background" />;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <PageHeader
        title={view === "finish" ? "Workout Finished" : "Track Workout"}
        onBack={() =>
          view === "finish"
            ? setView("active")
            : (setView("library"), setRest(null), setSheet({ type: "none" }))
        }
        rightSlot={
          view === "active" ? (
            <>
              <Pressable
                onPress={() => setSheet({ type: "timer" })}
                className="h-11 w-11 items-center justify-center"
              >
                <Ionicons name="timer-outline" size={22} color={theme.text} />
              </Pressable>
              <Pressable onPress={attemptFinishWorkout} className="px-1 py-2">
                <Text
                  className="text-base font-semibold uppercase tracking-[1px]"
                  style={{ color: theme.secondary }}
                >
                  Save
                </Text>
              </Pressable>
            </>
          ) : undefined
        }
      />
      {view === "active" ? (
        <ScrollView
          keyboardShouldPersistTaps="never"
          className="flex-1"
          contentContainerClassName="gap-6 px-5 pb-10 pt-4"
        >
          <View className="gap-2">
            <TextInput
              value={session.name}
              onChangeText={(text) =>
                setSession((c) => (c ? { ...c, name: text } : c))
              }
              placeholder="Workout Name"
              placeholderTextColor={theme.muted}
              className="py-0 text-3xl font-semibold text-text"
            />
            <TextInput
              multiline
              value={session.notes}
              onChangeText={(text) =>
                setSession((c) => (c ? { ...c, notes: text } : c))
              }
              placeholder="Add notes or description"
              placeholderTextColor={theme.muted}
              textAlignVertical="top"
              className="min-h-[56px] px-0 py-2 text-base text-text"
            />
          </View>
          <View className="flex-row border-y border-tertiary py-4">
            <Pressable
              className="flex-1"
              onPress={() => setSheet({ type: "duration" })}
            >
              <Metric
                label="Duration"
                dividerColor={theme.tertiary}
                value={fmt(secs)}
                valueColor={theme.secondary}
              />
            </Pressable>
            <Metric
              label="Volume"
              dividerColor={theme.tertiary}
              value={`${sum.volume.toFixed(0)} kg`}
            />
            <Metric label="Sets" value={`${sum.sets}`} />
          </View>
          {session.exercises.map((e) => (
            <ExerciseCard
              key={e.id}
              exercise={e}
              activeRestSeconds={rest?.exerciseId === e.id ? rest.left : null}
              confettiSetId={confettiSetId}
              clearConfetti={() => setConfettiSetId(null)}
              updateExercise={updateExercise}
              updateSet={updateSet}
              addSet={() => {
                setLastEditedExerciseName(e.name);
                updateExercise(e.id, (x) => ({
                  ...x,
                  sets: [
                    ...x.sets,
                    {
                      id: `${x.id}-${x.sets.length + 1}`,
                      type: "normal",
                      previous:
                        x.sets[x.sets.length - 1]?.previous ?? "No data",
                      enteredWeight: "",
                      reps: "",
                      weightPlaceholder:
                        x.sets[x.sets.length - 1]?.weightPlaceholder ??
                        x.sets[x.sets.length - 1]?.enteredWeight ??
                        "",
                      repsPlaceholder:
                        x.sets[x.sets.length - 1]?.repsPlaceholder ??
                        x.sets[x.sets.length - 1]?.reps ??
                        "",
                      completed: false,
                      unit: x.sets[x.sets.length - 1]?.unit ?? "kg",
                      pulleyMultiplier:
                        x.sets[x.sets.length - 1]?.pulleyMultiplier ?? 1,
                    },
                  ],
                }));
              }}
              openSheet={setSheet}
              onCheck={(setId, done) => {
                const updatedExercise = {
                  ...e,
                  sets: e.sets.map((set) =>
                    set.id === setId ? completeSetWithPrevious(set, done) : set,
                  ),
                };
                const shouldCelebrate = Boolean(
                  done && getMedalMap(updatedExercise)[setId],
                );
                setLastEditedExerciseName(e.name);
                updateSet(e.id, setId, (s) => completeSetWithPrevious(s, done));
                if (done && e.restTimerSeconds > 0)
                  setRest({ exerciseId: e.id, left: e.restTimerSeconds });
                if (shouldCelebrate) setConfettiSetId(setId);
              }}
            />
          ))}
          <PrimaryButton
            label="Add Exercise"
            onPress={() => {
              setPendingExerciseAddMode();
              router.push("/exercises/add");
            }}
          />
        </ScrollView>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="never"
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pb-10 pt-5"
        >
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1"
              onPress={() => setSheet({ type: "duration" })}
            >
              <Metric
                label="Duration"
                value={fmt(secs)}
                valueColor={theme.secondary}
              />
            </Pressable>
            <Metric label="Volume" value={`${sum.volume.toFixed(0)} kg`} />
            <Metric label="Sets" value={`${sum.sets}`} />
          </View>
          <View className="gap-3 border-b border-border pb-5">
            <Text className="text-lg font-semibold text-text">
              Session notes
            </Text>
            <TextInput
              multiline
              value={session.notes}
              onChangeText={(text) =>
                setSession((c) => (c ? { ...c, notes: text } : c))
              }
              placeholder="How did the session feel?"
              placeholderTextColor={theme.muted}
              textAlignVertical="top"
              className="min-h-[120px] rounded-card border border-border bg-background px-4 py-4 text-base text-text"
            />
          </View>
          <Pressable
            onPress={() => setSheet({ type: "photo" })}
            className="gap-3 border-b border-border pb-5"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-text">
                Progress photo
              </Text>
              <View className="rounded-card border border-yellow-500/30 bg-transparent px-3 py-1">
                <Ionicons name="flash" size={14} color="#FCD34D" />
              </View>
            </View>
            <View className="h-40 items-center justify-center rounded-card border border-dashed border-border bg-background">
              <Ionicons name="images-outline" size={28} color="#737373" />
              <Text className="mt-3 text-sm text-muted">
                Take with camera or select from gallery
              </Text>
            </View>
          </Pressable>
          <PrimaryButton
            label="Save workout"
            onPress={() => {
              void handleSaveWorkout();
            }}
          />
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
            loadWorkoutHistory(),
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
  setTimerMode,
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
      title={
        sheet.type === "routine"
          ? "Routine menu"
          : sheet.type === "history"
            ? "Workout menu"
            : sheet.type === "exercise"
              ? "Exercise actions"
              : sheet.type === "set"
                ? "Set type"
                : sheet.type === "weight"
                  ? "Weight preferences"
                  : sheet.type === "rest"
                    ? "Rest timer"
                    : sheet.type === "duration"
                      ? "Workout timing"
                      : sheet.type === "timer"
                        ? "Timer / Stopwatch"
                        : "Add progress photo"
      }
      subtitle={
        sheet.type === "set"
          ? "Warmup and drop sets do not increment the main working-set count."
          : sheet.type === "weight"
            ? "Switch unit or pulley ratio without losing the logged machine weight."
            : sheet.type === "timer"
              ? "Use a countdown between sets or switch to stopwatch mode."
              : undefined
      }
      onClose={() => setSheet({ type: "none" })}
    >
      {sheet.type === "routine" ? (
        <View className="gap-3">
          <PrimaryButton
            label="Duplicate routine"
            variant="secondary"
            onPress={() => {
              void duplicateWorkoutRoutine(sheet.id)
                .then(async () => {
                  await onRefreshLibrary?.();
                  setSheet({ type: "none" });
                })
                .catch((error) => console.error(error));
            }}
          />
          <PrimaryButton
            label="Edit routine"
            variant="secondary"
            onPress={() => {
              setSheet({ type: "none" });
              router.push({
                pathname: "/routines/create",
                params: { routineId: sheet.id },
              });
            }}
          />
          <PrimaryButton
            label="Delete routine"
            variant="danger"
            onPress={() => {
              void deleteWorkoutRoutine(sheet.id)
                .then(async () => {
                  await onRefreshLibrary?.();
                  setSheet({ type: "none" });
                })
                .catch((error) => console.error(error));
            }}
          />
        </View>
      ) : null}
      {sheet.type === "history" ? (
        <View className="gap-3">
          <PrimaryButton
            label="View workout"
            variant="secondary"
            onPress={() => {
              setSheet({ type: "none" });
              router.push({
                pathname: "/workouts/[id]",
                params: { id: sheet.id },
              });
            }}
          />
          <PrimaryButton
            label="Edit workout"
            variant="secondary"
            onPress={() => {
              setSheet({ type: "none" });
              router.push({
                pathname: "/workouts/[id]",
                params: { id: sheet.id, mode: "edit" },
              });
            }}
          />
          <PrimaryButton
            label="Delete workout"
            variant="danger"
            onPress={() => {
              void deleteWorkoutSession(sheet.id)
                .then(async () => {
                  await onRefreshLibrary?.();
                  setSheet({ type: "none" });
                })
                .catch((error) => console.error(error));
            }}
          />
        </View>
      ) : null}
      {sheet.type === "exercise" ? (
        <View className="gap-3">
          <PrimaryButton
            label="Move exercise up"
            variant="secondary"
            onPress={() =>
              reorder(session ?? null, setSession, sheet.id, -1, setSheet)
            }
          />
          <PrimaryButton
            label="Move exercise down"
            variant="secondary"
            onPress={() =>
              reorder(session ?? null, setSession, sheet.id, 1, setSheet)
            }
          />
          <PrimaryButton
            label="Replace exercise"
            variant="secondary"
            onPress={() =>
              Alert.alert(
                "Replace exercise",
                "Exercise library hookup is next.",
              )
            }
          />
          <PrimaryButton
            label="Remove exercise"
            variant="danger"
            onPress={() => {
              setSession?.((c) =>
                c
                  ? {
                      ...c,
                      exercises: c.exercises.filter((e) => e.id !== sheet.id),
                    }
                  : c,
              );
              setSheet({ type: "none" });
            }}
          />
        </View>
      ) : null}
      {sheet.type === "set" ? (
        <View className="gap-3">
          {(["warmup", "drop", "failure", "normal"] as const).map((type) => (
            <PrimaryButton
              key={type}
              label={cap(type)}
              variant="secondary"
              onPress={() => {
                setSession?.((c) =>
                  c
                    ? {
                        ...c,
                        exercises: c.exercises.map((e) =>
                          e.id === sheet.exerciseId
                            ? {
                                ...e,
                                sets: e.sets.map((s) =>
                                  s.id === sheet.setId ? { ...s, type } : s,
                                ),
                              }
                            : e,
                        ),
                      }
                    : c,
                );
                setSheet({ type: "none" });
              }}
            />
          ))}
          <PrimaryButton
            label="Delete set"
            variant="danger"
            onPress={() => {
              setSession?.((c) =>
                c
                  ? {
                      ...c,
                      exercises: c.exercises.map((e) =>
                        e.id === sheet.exerciseId
                          ? {
                              ...e,
                              sets: e.sets.filter((s) => s.id !== sheet.setId),
                            }
                          : e,
                      ),
                    }
                  : c,
              );
              setSheet({ type: "none" });
            }}
          />
        </View>
      ) : null}
      {sheet.type === "weight" ? (
        <WeightSheet
          sheet={sheet}
          session={session}
          setSession={setSession}
          setSheet={setSheet}
        />
      ) : null}
      {sheet.type === "rest" ? (
        <RestSheet
          sheet={sheet}
          session={session}
          setSession={setSession}
          setSheet={setSheet}
        />
      ) : null}
      {sheet.type === "duration" ? (
        <DurationSheet session={session} setSession={setSession} />
      ) : null}
      {sheet.type === "timer" ? (
        <View className="gap-5">
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => {
                setTimerMode?.("timer");
                setToolRunning?.(false);
                setToolSeconds?.((c) => (c === 0 ? 90 : c));
              }}
              className={`flex-1 rounded-card border px-4 py-3 ${timerMode === "timer" ? "border-accent bg-accent" : "border-white bg-background"}`}
            >
              <Text
                className={`text-center text-sm font-semibold ${timerMode === "timer" ? "text-background" : "text-text"}`}
              >
                Timer
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTimerMode?.("stopwatch");
                setToolRunning?.(false);
                setToolSeconds?.(0);
              }}
              className={`flex-1 rounded-card border px-4 py-3 ${timerMode === "stopwatch" ? "border-accent bg-accent" : "border-white bg-background"}`}
            >
              <Text
                className={`text-center text-sm font-semibold ${timerMode === "stopwatch" ? "text-background" : "text-text"}`}
              >
                Stopwatch
              </Text>
            </Pressable>
          </View>
          <View className="items-center justify-center">
            <View className="w-full flex-row items-center justify-center">
              <View className="w-20 items-center">
                {timerMode === "timer" ? (
                  <Pressable
                    onPress={() => setToolSeconds?.((c) => Math.max(0, c - 10))}
                    className="h-11 flex-row items-center justify-center gap-2 rounded-card border border-white px-4"
                  >
                    <Ionicons name="remove" size={18} color="#FAFAFA" />
                    <Text className="text-sm font-semibold text-text">
                      -10s
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View className="h-52 w-52 items-center justify-center rounded-full border border-border bg-background">
                <Text className="text-4xl font-semibold text-text">
                  {fmt(toolSeconds ?? 0)}
                </Text>
                <Text className="mt-2 text-sm text-muted">
                  {timerMode === "timer" ? "Countdown" : "Elapsed time"}
                </Text>
              </View>
              <View className="w-20 items-center">
                {timerMode === "timer" ? (
                  <Pressable
                    onPress={() => setToolSeconds?.((c) => c + 10)}
                    className="h-11 flex-row items-center justify-center gap-2 rounded-card border border-white px-4"
                  >
                    <Ionicons name="add" size={18} color="#FAFAFA" />
                    <Text className="text-sm font-semibold text-text">
                      +10s
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
          <PrimaryButton
            label={toolRunning ? "Stop" : "Start"}
            onPress={() => {
              if (toolRunning) {
                setToolRunning?.(false);
                setToolSeconds?.(timerMode === "timer" ? 90 : 0);
                return;
              }
              if (timerMode === "stopwatch") setToolSeconds?.(0);
              if (timerMode === "timer" && toolSeconds === 0)
                setToolSeconds?.(90);
              setToolRunning?.(true);
            }}
          />
        </View>
      ) : null}
      {sheet.type === "photo" ? (
        <View className="gap-3">
          <PrimaryButton
            label="Take with camera"
            variant="secondary"
            onPress={() =>
              Alert.alert("Camera flow", "We can wire Expo Image Picker next.")
            }
          />
          <PrimaryButton
            label="Select from gallery"
            variant="secondary"
            onPress={() =>
              Alert.alert("Gallery flow", "We can wire Expo Image Picker next.")
            }
          />
        </View>
      ) : null}
    </BottomPopup>
  );
}

function summary(session: WorkoutSession | null) {
  let volume = 0,
    sets = 0;
  session?.exercises.forEach((e) =>
    e.sets.forEach((s) => {
      if (!s.completed || (s.type !== "normal" && s.type !== "failure")) return;
      volume += Number(s.enteredWeight) * s.pulleyMultiplier * Number(s.reps);
      sets += 1;
    }),
  );
  return { volume, sets };
}

function reorder(
  session: WorkoutSession | null,
  setSession: PopupProps["setSession"],
  exerciseId: string,
  diff: -1 | 1,
  setSheet: (sheet: Sheet) => void,
) {
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
  onCheck,
}: {
  exercise: WorkoutExercise;
  activeRestSeconds: number | null;
  confettiSetId: string | null;
  clearConfetti: () => void;
  updateExercise: (
    exerciseId: string,
    fn: (exercise: WorkoutExercise) => WorkoutExercise,
  ) => void;
  updateSet: (
    exerciseId: string,
    setId: string,
    fn: (
      set: WorkoutExercise["sets"][number],
    ) => WorkoutExercise["sets"][number],
  ) => void;
  addSet: () => void;
  openSheet: (sheet: Sheet) => void;
  onCheck: (setId: string, done: boolean) => void;
}) {
  const { theme } = useAppTheme();
  const medals = getMedalMap(exercise);
  const displayUnit = exercise.sets[0]?.unit ?? "kg";
  return (
    <View
      className="gap-4 py-5"
      style={{ borderBottomWidth: 1, borderBottomColor: theme.tertiary }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text
          className="flex-1 text-xl font-semibold"
          style={{ color: theme.text }}
        >
          {exercise.name}
        </Text>
        <Pressable
          onPress={() => openSheet({ type: "exercise", id: exercise.id })}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.text} />
        </Pressable>
      </View>
      <Pressable
        onPress={() => openSheet({ type: "rest", exerciseId: exercise.id })}
        className="flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2">
          <Text
            className="text-sm font-medium"
            style={{ color: theme.secondary }}
          >
            Rest Timer
          </Text>
          {activeRestSeconds !== null ? (
            <Text
              className="text-sm font-semibold"
              style={{ color: theme.secondary }}
            >
              {fmt(activeRestSeconds)}
            </Text>
          ) : null}
        </View>
        <Text className="text-sm" style={{ color: theme.secondary }}>
          {exercise.restTimerSeconds === 0
            ? "OFF"
            : `${exercise.restTimerSeconds}s`}
        </Text>
      </Pressable>
      <View className="py-3">
        <View className="mb-3 flex-row items-center">
          <Hdr label="Set" className="w-14 text-center" />
          <Hdr label="Previous" className="ml-2 flex-1 text-center" />
          <Pressable
            onPress={() =>
              openSheet({ type: "weight", exerciseId: exercise.id })
            }
            className="ml-2 w-20 flex-row items-center justify-center gap-1"
          >
            <Hdr label={displayUnit} className="text-center" />
            <Ionicons name="swap-horizontal" size={12} color="#FF772C" />
          </Pressable>
          <Hdr label="Reps" className="ml-2 w-20 text-center" />
          <View className="ml-2 w-14 items-center">
            <Ionicons name="checkmark" size={16} color={theme.muted} />
          </View>
        </View>
        <View className="gap-3">
          {exercise.sets.map((set) => (
            <View key={set.id} className="relative flex-row items-center">
              {confettiSetId === set.id ? (
                <View
                  pointerEvents="none"
                  className="absolute left-4 top-2 z-10"
                >
                  <ConfettiCannon
                    count={8}
                    origin={{ x: 0, y: 0 }}
                    fadeOut
                    autoStart
                    explosionSpeed={120}
                    fallSpeed={1400}
                    onAnimationEnd={clearConfetti}
                  />
                </View>
              ) : null}
              <Pressable
                onPress={() =>
                  medals[set.id]
                    ? Alert.alert("Set medal", medals[set.id].join("\n"))
                    : openSheet({
                        type: "set",
                        exerciseId: exercise.id,
                        setId: set.id,
                      })
                }
                className="h-12 w-14 items-center justify-center rounded-card"
                style={{ backgroundColor: theme.tertiary }}
              >
                {medals[set.id] ? (
                  <Ionicons name="trophy" size={18} color={theme.secondary} />
                ) : (
                  <SetIndicator set={set} sets={exercise.sets} />
                )}
              </Pressable>
              <View
                className="ml-2 h-12 flex-1 items-center justify-center rounded-card px-3"
                style={{ backgroundColor: theme.quaternary }}
              >
                <Text
                  className="text-center text-sm"
                  style={{ color: theme.text }}
                >
                  {set.previous}
                </Text>
              </View>
              <View
                className="ml-2 h-12 w-20 justify-center rounded-card px-3"
                style={{
                  borderWidth: 1,
                  borderColor: theme.quaternary,
                  backgroundColor: theme.primary,
                }}
              >
                <TextInput
                  value={set.enteredWeight}
                  keyboardType="decimal-pad"
                  onChangeText={(text) =>
                    updateSet(exercise.id, set.id, (x) => ({
                      ...x,
                      enteredWeight: text,
                    }))
                  }
                  className="py-0 text-center text-base font-semibold"
                  style={{ color: theme.text }}
                  placeholder={set.weightPlaceholder || "0"}
                  placeholderTextColor={theme.muted}
                />
              </View>
              <View
                className="ml-2 h-12 w-20 justify-center rounded-card px-3"
                style={{
                  borderWidth: 1,
                  borderColor: theme.quaternary,
                  backgroundColor: theme.primary,
                }}
              >
                <TextInput
                  value={set.reps}
                  keyboardType="numeric"
                  onChangeText={(text) =>
                    updateSet(exercise.id, set.id, (x) => ({
                      ...x,
                      reps: text,
                    }))
                  }
                  className="py-0 text-center text-base font-semibold"
                  style={{ color: theme.text }}
                  placeholder={set.repsPlaceholder || "0"}
                  placeholderTextColor={theme.muted}
                />
              </View>
              <View className="ml-2 w-14 items-center">
                <Pressable
                  onPress={() => onCheck(set.id, !set.completed)}
                  className="h-12 w-14 items-center justify-center rounded-card"
                  style={{
                    borderWidth: 1,
                    borderColor: set.completed
                      ? theme.secondary
                      : theme.quaternary,
                    backgroundColor: theme.primary,
                  }}
                >
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={theme.secondary}
                  />
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
  onMenuPress,
}: {
  item: WorkoutHistoryItem;
  onMenuPress: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      className="rounded-card px-4 py-4"
      style={{
        borderWidth: 1,
        borderColor: theme.quaternary,
        backgroundColor: theme.tertiary,
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xl font-semibold" style={{ color: theme.text }}>
            {item.name}
          </Text>
          <Text className="mt-2 text-sm" style={{ color: theme.muted }}>
            Exercises
          </Text>
        </View>
        <Pressable
          onPress={onMenuPress}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.text} />
        </Pressable>
      </View>
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        className="mt-2 text-sm leading-6"
        style={{ color: theme.muted }}
      >
        {item.exercisePreview.join(", ")}
      </Text>
      <View
        className="mt-4 pt-4"
        style={{ borderTopWidth: 1, borderTopColor: theme.quaternary }}
      >
        <View className="flex-row">
          <Metric
            label="Duration"
            value={fmt(item.durationSeconds)}
            className=""
            dividerColor={theme.quaternary}
          />
          <Metric
            label="Sets"
            value={`${item.setCount}`}
            className=""
            dividerColor={theme.quaternary}
          />
          <Metric label="Weight" value={`${item.totalWeight.toFixed(0)} kg`} />
        </View>
      </View>
    </View>
  );
}

function RoutineTile({
  routine,
  onMenuPress,
  onStart,
}: {
  routine: WorkoutRoutine;
  onMenuPress: () => void;
  onStart: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      className="rounded-card px-4 py-4"
      style={{
        borderWidth: 1,
        borderColor: theme.quaternary,
        backgroundColor: theme.tertiary,
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xl font-semibold" style={{ color: theme.text }}>
            {routine.name}
          </Text>
          <Text className="mt-2 text-sm" style={{ color: theme.muted }}>
            Exercises
          </Text>
        </View>
        <Pressable
          onPress={onMenuPress}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.text} />
        </Pressable>
      </View>
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        className="mt-2 text-sm leading-6"
        style={{ color: theme.muted }}
      >
        {routine.exercisePreview.join(", ")}
      </Text>
      <View className="mt-4">
        <PrimaryButton
          label="START ROUTINE"
          variant="secondary"
          onPress={onStart}
        />
      </View>
    </View>
  );
}

function WeightSheet({
  sheet,
  session,
  setSession,
  setSheet,
}: {
  sheet: Extract<Sheet, { type: "weight" }>;
  session?: WorkoutSession | null;
  setSession?: PopupProps["setSession"];
  setSheet: (sheet: Sheet) => void;
}) {
  const exercise = session?.exercises.find((e) => e.id === sheet.exerciseId);
  const [unit, setUnit] = useState<WeightUnit>(exercise?.sets[0]?.unit ?? "kg");
  const [ratio, setRatio] = useState<1 | 0.5>(
    exercise?.sets[0]?.pulleyMultiplier ?? 1,
  );
  if (!exercise || !setSession) return null;
  return (
    <View className="gap-5">
      <View className="flex-row gap-3">
        {(["kg", "lb"] as const).map((u) => (
          <Pressable
            key={u}
            onPress={() => setUnit(u)}
            className={`flex-1 rounded-card border px-4 py-3 ${unit === u ? "border-accent bg-accent" : "border-white bg-background"}`}
          >
            <Text
              className={`text-center text-sm font-semibold ${unit === u ? "text-background" : "text-text"}`}
            >
              {u.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="gap-3 rounded-card border border-border bg-background p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-text">
            Use 1x machine ratio
          </Text>
          <Switch
            value={ratio === 1}
            onValueChange={(v) => setRatio(v ? 1 : 0.5)}
          />
        </View>
        <Text className="text-sm leading-6 text-muted">
          Toggle to 0.5x when the cable machine uses a doubled pulley ratio and
          you want the app to calculate the effective load in half.
        </Text>
      </View>
      <PrimaryButton
        label="Apply preferences"
        onPress={() => {
          setSession((c) =>
            c
              ? {
                  ...c,
                  exercises: c.exercises.map((e) =>
                    e.id === exercise.id
                      ? {
                          ...e,
                          sets: e.sets.map((s) => ({
                            ...s,
                            unit,
                            pulleyMultiplier: ratio,
                          })),
                        }
                      : e,
                  ),
                }
              : c,
          );
          setSheet({ type: "none" });
        }}
      />
    </View>
  );
}

function RestSheet({
  sheet,
  session,
  setSession,
  setSheet,
}: {
  sheet: Extract<Sheet, { type: "rest" }>;
  session?: WorkoutSession | null;
  setSession?: PopupProps["setSession"];
  setSheet: (sheet: Sheet) => void;
}) {
  const { theme } = useAppTheme();
  const exercise = session?.exercises.find((e) => e.id === sheet.exerciseId);
  const [selected, setSelected] = useState(exercise?.restTimerSeconds ?? 0);
  const scrollRef = useRef<ScrollView>(null);

  if (!exercise || !setSession) return null;

  useEffect(() => {
    const index = rests.indexOf(selected);
    const offset = Math.max(0, index * REST_ITEM_HEIGHT);
    const timeout = setTimeout(
      () => scrollRef.current?.scrollTo({ y: offset, animated: false }),
      50,
    );
    return () => clearTimeout(timeout);
  }, [selected]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.max(
      0,
      Math.min(
        rests.length - 1,
        Math.round(event.nativeEvent.contentOffset.y / REST_ITEM_HEIGHT),
      ),
    );
    setSelected(rests[index]);
  };

  return (
    <View className="gap-5">
      <View
        className="relative overflow-hidden"
        style={{ height: REST_WINDOW_HEIGHT }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={REST_ITEM_HEIGHT}
          snapToAlignment="start"
          disableIntervalMomentum={false}
          decelerationRate="normal"
          contentOffset={{
            x: 0,
            y: rests.indexOf(selected) * REST_ITEM_HEIGHT,
          }}
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
              <Text
                className="font-semibold"
                style={{
                  color: selected === seconds ? theme.text : theme.muted,
                  fontSize: selected === seconds ? 20 : 16,
                }}
              >
                {seconds === 0 ? "OFF" : `${seconds}s`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={[theme.background, "rgba(0,0,0,0)"]}
          className="absolute inset-x-0 top-0"
          style={{ height: REST_SPACER }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(0,0,0,0)", theme.background]}
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
                    e.id === exercise.id
                      ? { ...e, restTimerSeconds: selected }
                      : e,
                  ),
                }
              : c,
          );
          setSheet({ type: "none" });
        }}
      />
    </View>
  );
}

function DurationSheet({
  session,
  setSession,
}: {
  session?: WorkoutSession | null;
  setSession?: PopupProps["setSession"];
}) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState<"duration" | "start" | null>(
    "duration",
  );

  if (!session || !setSession) {
    return null;
  }

  const startedAt = new Date(session.startedAt);
  const currentDuration = getWorkoutDurationSeconds(session);
  const selectedDate = new Date(startedAt);
  selectedDate.setHours(0, 0, 0, 0);

  const currentHour = Math.floor(currentDuration / 3600);
  const currentMinute = Math.floor((currentDuration % 3600) / 60);
  const currentSecond = currentDuration % 60;

  const setDuration = (hours: number, minutes: number, seconds: number) => {
    const total = hours * 3600 + minutes * 60 + seconds;
    setSession((current) =>
      current
        ? {
            ...current,
            startedAt: Date.now() - total * 1000,
            durationOverrideSeconds: total,
          }
        : current,
    );
  };

  const setStartTime = (dateMs: number, hour: number, minute: number) => {
    setSession((current) => {
      if (!current) {
        return current;
      }

      const nextDate = new Date(dateMs);
      nextDate.setHours(hour, minute, 0, 0);
      return {
        ...current,
        startedAt: nextDate.getTime(),
        durationOverrideSeconds: getWorkoutDurationSeconds(current),
      };
    });
  };

  return (
    <View className="gap-5">
      <Pressable
        onPress={() =>
          setExpanded((current) => (current === "duration" ? null : "duration"))
        }
        className="gap-1"
      >
        <Text className="text-sm font-medium" style={{ color: theme.muted }}>
          Duration
        </Text>
        <Text
          className="text-xl font-semibold"
          style={{ color: theme.secondary }}
        >
          {fmt(currentDuration)}
        </Text>
      </Pressable>
      {expanded === "duration" ? (
        <View className="flex-row gap-3">
          <WheelPicker
            values={durationHours}
            selected={Math.min(
              currentHour,
              durationHours[durationHours.length - 1],
            )}
            labelForValue={(value) => `${value}h`}
            onSelect={(value) =>
              setDuration(
                value,
                currentMinute,
                currentSecond - (currentSecond % 5),
              )
            }
          />
          <WheelPicker
            values={durationMinutes}
            selected={currentMinute}
            labelForValue={(value) => `${String(value).padStart(2, "0")}m`}
            onSelect={(value) =>
              setDuration(
                currentHour,
                value,
                currentSecond - (currentSecond % 5),
              )
            }
          />
          <WheelPicker
            values={durationSeconds}
            selected={currentSecond - (currentSecond % 5)}
            labelForValue={(value) => `${String(value).padStart(2, "0")}s`}
            onSelect={(value) => setDuration(currentHour, currentMinute, value)}
          />
        </View>
      ) : null}

      <Pressable
        onPress={() =>
          setExpanded((current) => (current === "start" ? null : "start"))
        }
        className="gap-1"
      >
        <Text className="text-sm font-medium" style={{ color: theme.muted }}>
          Start time
        </Text>
        <Text className="text-xl font-semibold" style={{ color: theme.text }}>
          {formatStartTime(session.startedAt)}
        </Text>
      </Pressable>
      {expanded === "start" ? (
        <View className="flex-row gap-3">
          <WheelPicker
            values={dateOptions}
            selected={selectedDate.getTime()}
            labelForValue={(value) => formatDateOption(value)}
            onSelect={(value) =>
              setStartTime(value, startedAt.getHours(), startedAt.getMinutes())
            }
          />
          <WheelPicker
            values={Array.from({ length: 24 }, (_, index) => index)}
            selected={startedAt.getHours()}
            labelForValue={(value) => `${String(value).padStart(2, "0")}h`}
            onSelect={(value) =>
              setStartTime(
                selectedDate.getTime(),
                value,
                startedAt.getMinutes(),
              )
            }
          />
          <WheelPicker
            values={Array.from({ length: 60 }, (_, index) => index)}
            selected={startedAt.getMinutes()}
            labelForValue={(value) => `${String(value).padStart(2, "0")}m`}
            onSelect={(value) =>
              setStartTime(selectedDate.getTime(), startedAt.getHours(), value)
            }
          />
        </View>
      ) : null}
    </View>
  );
}

function WheelPicker<T extends string | number>({
  values,
  selected,
  labelForValue,
  onSelect,
}: {
  values: T[];
  selected: T;
  labelForValue: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  const { theme } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(
    0,
    values.findIndex((value) => value === selected),
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: selectedIndex * REST_ITEM_HEIGHT,
        animated: false,
      });
    }, 30);
    return () => clearTimeout(timeout);
  }, [selectedIndex]);

  return (
    <View
      className="relative flex-1 overflow-hidden"
      style={{ height: REST_WINDOW_HEIGHT }}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={REST_ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: REST_SPACER }}
        onMomentumScrollEnd={(event) => {
          const index = Math.max(
            0,
            Math.min(
              values.length - 1,
              Math.round(event.nativeEvent.contentOffset.y / REST_ITEM_HEIGHT),
            ),
          );
          onSelect(values[index]);
        }}
      >
        {values.map((value) => {
          const isSelected = value === selected;
          return (
            <Pressable
              key={String(value)}
              onPress={() => onSelect(value)}
              className="items-center justify-center"
              style={{ height: REST_ITEM_HEIGHT }}
            >
              <Text
                className="font-semibold"
                style={{
                  color: isSelected ? theme.text : theme.muted,
                  fontSize: isSelected ? 20 : 16,
                }}
              >
                {labelForValue(value)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <LinearGradient
        pointerEvents="none"
        colors={[theme.background, "rgba(0,0,0,0)"]}
        className="absolute inset-x-0 top-0"
        style={{ height: REST_SPACER }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", theme.background]}
        className="absolute inset-x-0 bottom-0"
        style={{ height: REST_SPACER }}
      />
    </View>
  );
}

function NotesField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.trim().length > 0;

  return (
    <View
      className={`relative border-b border-border ${focused || hasValue ? "min-h-[72px]" : "min-h-[44px]"}`}
    >
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

function SetIndicator({
  set,
  sets,
}: {
  set: WorkoutExercise["sets"][number];
  sets: WorkoutExercise["sets"];
}) {
  const { theme } = useAppTheme();
  if (set.type === "failure") {
    return (
      <Text className="text-left text-base font-semibold text-red-500">F</Text>
    );
  }

  if (set.type === "warmup") {
    return (
      <Text className="text-left text-base font-semibold text-yellow-400">
        W
      </Text>
    );
  }

  if (set.type === "drop") {
    return (
      <Text className="text-left text-base font-semibold text-carbs">D</Text>
    );
  }

  return (
    <Text
      className="text-left text-base font-semibold"
      style={{ color: theme.text }}
    >
      {setLabel(sets, set.id)}
    </Text>
  );
}

function Metric({
  label,
  value,
  className = "",
  dividerColor,
  valueColor,
}: {
  label: string;
  value: string;
  className?: string;
  dividerColor?: string;
  valueColor?: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      className={`flex-1 items-center justify-center ${className}`}
      style={
        dividerColor
          ? { borderRightWidth: 1, borderRightColor: dividerColor }
          : undefined
      }
    >
      <Text
        className="text-2xl font-semibold"
        style={{ color: valueColor ?? theme.text }}
      >
        {value}
      </Text>
      <Text className="mt-2 text-sm" style={{ color: theme.muted }}>
        {label}
      </Text>
    </View>
  );
}

function Hdr({ label, className = "" }: { label: string; className?: string }) {
  const { theme } = useAppTheme();
  return (
    <Text
      className={`${className} text-sm font-medium`}
      style={{ color: theme.muted }}
    >
      {label}
    </Text>
  );
}

function setLabel(sets: WorkoutExercise["sets"], setId: string) {
  let count = 0;
  for (const set of sets) {
    if (set.type === "normal" || set.type === "failure") count += 1;
    if (set.id === setId)
      return set.type === "warmup"
        ? "W"
        : set.type === "drop"
          ? "D"
          : `${count}`;
  }
  return "?";
}

function getMedalMap(exercise: WorkoutExercise) {
  const medalMap: Record<string, string[]> = {};
  const candidates = exercise.sets
    .filter(
      (set) => set.completed && set.enteredWeight.trim() && set.reps.trim(),
    )
    .map((set) => {
      const weight = Number(set.enteredWeight) * set.pulleyMultiplier;
      const reps = Number(set.reps);
      return {
        id: set.id,
        weight,
        volume: weight * reps,
        pr: weight * (1 + reps / 30),
      };
    });

  const topWeight = candidates.reduce<(typeof candidates)[number] | null>(
    (best, current) => (!best || current.weight > best.weight ? current : best),
    null,
  );
  const topVolume = candidates.reduce<(typeof candidates)[number] | null>(
    (best, current) => (!best || current.volume > best.volume ? current : best),
    null,
  );
  const topPr = candidates.reduce<(typeof candidates)[number] | null>(
    (best, current) => (!best || current.pr > best.pr ? current : best),
    null,
  );

  if (topWeight && topWeight.weight > exercise.benchmarks.bestWeight) {
    medalMap[topWeight.id] = [
      ...(medalMap[topWeight.id] ?? []),
      `Highest weight +${(topWeight.weight - exercise.benchmarks.bestWeight).toFixed(1)}`,
    ];
  }
  if (topVolume && topVolume.volume > exercise.benchmarks.bestVolume) {
    medalMap[topVolume.id] = [
      ...(medalMap[topVolume.id] ?? []),
      `Highest set volume +${(topVolume.volume - exercise.benchmarks.bestVolume).toFixed(1)}`,
    ];
  }
  if (topPr && topPr.pr > exercise.benchmarks.bestPr) {
    medalMap[topPr.id] = [
      ...(medalMap[topPr.id] ?? []),
      `Highest calculated PR +${(topPr.pr - exercise.benchmarks.bestPr).toFixed(1)}`,
    ];
  }

  return medalMap;
}

function completeSetWithPrevious(
  set: WorkoutExercise["sets"][number],
  completed: boolean,
) {
  if (!completed) {
    return {
      ...set,
      completed,
    };
  }

  return {
    ...set,
    enteredWeight: set.enteredWeight || set.weightPlaceholder || "",
    reps: set.reps || set.repsPlaceholder || "",
    completed,
  };
}

function hasInvalidSets(session: WorkoutSession) {
  return session.exercises.some((exercise) =>
    exercise.sets.some((set) => {
      const hasInput = Boolean(set.enteredWeight.trim() || set.reps.trim());
      const hasCompleteInput = Boolean(
        set.enteredWeight.trim() && set.reps.trim(),
      );
      if (set.completed) {
        return !hasCompleteInput;
      }
      return hasInput;
    }),
  );
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  return h > 0
    ? `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateOption(value: number) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatStartTime(value: number) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
