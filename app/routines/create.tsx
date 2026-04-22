import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { BottomPopup } from "@/components/bottom-popup";
import { PageHeader } from "@/components/page-header";
import { PrimaryButton } from "@/components/primary-button";
import {
  consumePendingExerciseSelection,
  setPendingExerciseAddMode,
  setPendingExerciseReplacement,
} from "@/features/workout/add-exercise-bridge";
import {
  type WorkoutExercise,
  type WorkoutSession,
  type WeightUnit,
  type SetType,
} from "@/features/workout/mock-data";
import {
  createExerciseFromCatalogId,
  createWorkoutRoutine,
  initializeWorkoutStorage,
  loadWorkoutRoutineById,
  updateWorkoutRoutine,
} from "@/features/workout/storage";
import { useAppTheme } from "@/theme/theme-provider";

type Sheet =
  | { type: "none" }
  | { type: "exercise"; id: string }
  | { type: "set"; exerciseId: string; setId: string }
  | { type: "weight"; exerciseId: string }
  | { type: "rest"; exerciseId: string };

export default function CreateRoutineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ routineId?: string }>();
  const isFocused = useIsFocused();
  const { theme } = useAppTheme();
  const [routine, setRoutine] = useState<WorkoutSession>({
    id: "routine-draft",
    name: "Untitled Routine",
    exercises: [],
    notes: "",
    startedAt: Date.now(),
  });
  const [sheet, setSheet] = useState<Sheet>({ type: "none" });

  useEffect(() => {
    let active = true;

    async function load() {
      await initializeWorkoutStorage();
      if (!params.routineId) {
        return;
      }

      const existingRoutine = await loadWorkoutRoutineById(params.routineId);
      if (!active || !existingRoutine) {
        return;
      }

      setRoutine({
        id: existingRoutine.id,
        name: existingRoutine.name,
        exercises: structuredClone(existingRoutine.exercises),
        notes: existingRoutine.description ?? "",
        startedAt: Date.now(),
      });
    }

    void load();

    return () => {
      active = false;
    };
  }, [params.routineId]);

  useEffect(() => {
    if (!isFocused) return;
    const pendingSelection = consumePendingExerciseSelection();
    if (!pendingSelection) return;

    void createExerciseFromCatalogId(pendingSelection.exerciseId)
      .then((exercise) => {
        setRoutine((current) => {
          if (pendingSelection.type === "replace") {
            return {
              ...current,
              exercises: current.exercises.map((currentExercise) =>
                currentExercise.id === pendingSelection.targetExerciseId
                  ? {
                      ...exercise,
                      sets: currentExercise.sets,
                      restTimerSeconds: currentExercise.restTimerSeconds,
                    }
                  : currentExercise,
              ),
            };
          }

          return { ...current, exercises: [...current.exercises, exercise] };
        });
      })
      .catch((error) => {
        console.error(error);
        Alert.alert("Add exercise", "Unable to load that exercise right now.");
      });
  }, [isFocused]);

  const updateExercise = (
    exerciseId: string,
    fn: (exercise: WorkoutExercise) => WorkoutExercise,
  ) =>
    setRoutine((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? fn(exercise) : exercise,
      ),
    }));
  const updateSet = (
    exerciseId: string,
    setId: string,
    fn: (
      set: WorkoutExercise["sets"][number],
    ) => WorkoutExercise["sets"][number],
  ) =>
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? fn(set) : set)),
    }));

  async function handleSaveRoutine() {
    if (params.routineId) {
      await updateWorkoutRoutine(params.routineId, {
        name: routine.name,
        description: routine.notes,
        exercises: routine.exercises,
      });
    } else {
      await createWorkoutRoutine({
        name: routine.name,
        description: routine.notes,
        exercises: routine.exercises,
      });
    }
    router.back();
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <PageHeader
        title={params.routineId ? "Edit Routine" : "Create Routine"}
        onBack={() => router.back()}
        rightSlot={
          <Pressable
            onPress={() => {
              void handleSaveRoutine();
            }}
            className="px-1 py-2"
          >
            <Text
              className="text-base font-semibold uppercase tracking-[1px]"
              style={{ color: theme.secondary }}
            >
              Save
            </Text>
          </Pressable>
        }
      />
      <ScrollView
        keyboardShouldPersistTaps="never"
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-10 pt-4"
      >
        <View className="gap-2">
          <TextInput
            value={routine.name}
            onChangeText={(text) =>
              setRoutine((current) => ({ ...current, name: text }))
            }
            placeholder="Routine Name"
            placeholderTextColor="#A3A3A3"
            className="py-0 text-3xl font-semibold"
            style={{ color: theme.text }}
          />
          <TextInput
            multiline
            value={routine.notes}
            onChangeText={(text) =>
              setRoutine((current) => ({ ...current, notes: text }))
            }
            placeholder="Add notes or description"
            placeholderTextColor="#A3A3A3"
            textAlignVertical="top"
            className="min-h-[56px] px-0 py-2 text-base"
            style={{ color: theme.text }}
          />
        </View>
        {routine.exercises.map((exercise) => (
          <RoutineExerciseCard
            key={exercise.id}
            exercise={exercise}
            updateSet={updateSet}
            addSet={() =>
              updateExercise(exercise.id, (current) => ({
                ...current,
                sets: [
                  ...current.sets,
                  {
                    id: `${current.id}-${current.sets.length + 1}`,
                    type: "normal",
                    previous: "No data",
                    enteredWeight: "",
                    reps: "",
                    weightPlaceholder: "",
                    repsPlaceholder: "",
                    completed: false,
                    unit: current.sets[current.sets.length - 1]?.unit ?? "kg",
                    pulleyMultiplier:
                      current.sets[current.sets.length - 1]?.pulleyMultiplier ??
                      1,
                  },
                ],
              }))
            }
            openSheet={setSheet}
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
      <RoutinePopup
        sheet={sheet}
        setSheet={setSheet}
        routine={routine}
        setRoutine={setRoutine}
      />
    </View>
  );
}

function RoutineExerciseCard({
  exercise,
  updateSet,
  addSet,
  openSheet,
}: {
  exercise: WorkoutExercise;
  updateSet: (
    exerciseId: string,
    setId: string,
    fn: (
      set: WorkoutExercise["sets"][number],
    ) => WorkoutExercise["sets"][number],
  ) => void;
  addSet: () => void;
  openSheet: (sheet: Sheet) => void;
}) {
  const router = useRouter();
  const displayUnit = exercise.sets[0]?.unit ?? "kg";

  return (
    <View className="gap-4 border-b border-tertiary py-5">
      <View className="flex-row items-center justify-between gap-3">
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/exercises/[name]",
              params: { name: exercise.name },
            })
          }
          className="flex-1 py-1"
        >
          <Text className="text-xl font-semibold text-text">
            {exercise.name}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => openSheet({ type: "exercise", id: exercise.id })}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#FAFAFA" />
        </Pressable>
      </View>
      <Pressable
        onPress={() => openSheet({ type: "rest", exerciseId: exercise.id })}
        className="flex-row items-center justify-between"
      >
        <Text className="text-sm font-medium text-muted">Rest Timer</Text>
        <Text className="text-sm text-muted">
          {exercise.restTimerSeconds === 0
            ? "OFF"
            : `${exercise.restTimerSeconds}s`}
        </Text>
      </Pressable>
      <View className="py-3">
        <View className="mb-3 flex-row items-center">
          <Hdr label="Set" className="w-14 text-center" />
          <Pressable
            onPress={() =>
              openSheet({ type: "weight", exerciseId: exercise.id })
            }
            className="ml-2 flex-1 flex-row items-center justify-center gap-1"
          >
            <Hdr label={displayUnit} className="text-center" />
            <Ionicons name="swap-horizontal" size={12} color="#FF772C" />
          </Pressable>
          <Hdr label="Reps" className="ml-2 flex-1 text-center" />
        </View>
        <View className="gap-3">
          {exercise.sets.map((set) => (
            <View key={set.id} className="flex-row items-center">
              <Pressable
                onPress={() =>
                  openSheet({
                    type: "set",
                    exerciseId: exercise.id,
                    setId: set.id,
                  })
                }
                className="h-12 w-14 items-center justify-center rounded-card bg-tertiary"
              >
                <SetIndicator set={set} sets={exercise.sets} />
              </Pressable>
              <View className="ml-2 h-12 flex-1 justify-center rounded-card border border-quaternary bg-primary px-3">
                <TextInput
                  value={set.enteredWeight}
                  keyboardType="decimal-pad"
                  onChangeText={(text) =>
                    updateSet(exercise.id, set.id, (current) => ({
                      ...current,
                      enteredWeight: text,
                    }))
                  }
                  className="py-0 text-center text-base font-semibold text-text"
                  placeholder={set.weightPlaceholder || "0"}
                  placeholderTextColor="#737373"
                />
              </View>
              <View className="ml-2 h-12 flex-1 justify-center rounded-card border border-quaternary bg-primary px-3">
                <TextInput
                  value={set.reps}
                  keyboardType="numeric"
                  onChangeText={(text) =>
                    updateSet(exercise.id, set.id, (current) => ({
                      ...current,
                      reps: text,
                    }))
                  }
                  className="py-0 text-center text-base font-semibold text-text"
                  placeholder={set.repsPlaceholder || "0"}
                  placeholderTextColor="#737373"
                />
              </View>
            </View>
          ))}
        </View>
      </View>
      <PrimaryButton label="Add set" variant="secondary" onPress={addSet} />
    </View>
  );
}

function RoutinePopup({
  sheet,
  setSheet,
  routine,
  setRoutine,
}: {
  sheet: Sheet;
  setSheet: (sheet: Sheet) => void;
  routine: WorkoutSession;
  setRoutine: React.Dispatch<React.SetStateAction<WorkoutSession>>;
}) {
  const router = useRouter();

  return (
    <BottomPopup
      visible={sheet.type !== "none"}
      title={
        sheet.type === "exercise"
          ? "Exercise actions"
          : sheet.type === "set"
            ? "Set type"
            : sheet.type === "weight"
              ? "Weight preferences"
              : "Rest timer"
      }
      onClose={() => setSheet({ type: "none" })}
    >
      {sheet.type === "exercise" ? (
        <View className="gap-3">
          <PrimaryButton
            label="Move exercise up"
            variant="secondary"
            onPress={() =>
              reorderRoutine(routine, setRoutine, sheet.id, -1, setSheet)
            }
          />
          <PrimaryButton
            label="Move exercise down"
            variant="secondary"
            onPress={() =>
              reorderRoutine(routine, setRoutine, sheet.id, 1, setSheet)
            }
          />
          <PrimaryButton
            label="Replace exercise"
            variant="secondary"
            onPress={() => {
              setPendingExerciseReplacement(sheet.id);
              setSheet({ type: "none" });
              router.push("/exercises/add");
            }}
          />
          <PrimaryButton
            label="Remove exercise"
            variant="danger"
            onPress={() => {
              setRoutine((current) => ({
                ...current,
                exercises: current.exercises.filter(
                  (exercise) => exercise.id !== sheet.id,
                ),
              }));
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
                setRoutine((current) => ({
                  ...current,
                  exercises: current.exercises.map((exercise) =>
                    exercise.id === sheet.exerciseId
                      ? {
                          ...exercise,
                          sets: exercise.sets.map((set) =>
                            set.id === sheet.setId ? { ...set, type } : set,
                          ),
                        }
                      : exercise,
                  ),
                }));
                setSheet({ type: "none" });
              }}
            />
          ))}
          <PrimaryButton
            label="Delete set"
            variant="danger"
            onPress={() => {
              setRoutine((current) => ({
                ...current,
                exercises: current.exercises.map((exercise) =>
                  exercise.id === sheet.exerciseId
                    ? {
                        ...exercise,
                        sets: exercise.sets.filter(
                          (set) => set.id !== sheet.setId,
                        ),
                      }
                    : exercise,
                ),
              }));
              setSheet({ type: "none" });
            }}
          />
        </View>
      ) : null}
      {sheet.type === "weight" ? (
        <RoutineWeightSheet
          sheet={sheet}
          routine={routine}
          setRoutine={setRoutine}
          setSheet={setSheet}
        />
      ) : null}
      {sheet.type === "rest" ? (
        <RoutineRestSheet
          sheet={sheet}
          routine={routine}
          setRoutine={setRoutine}
          setSheet={setSheet}
        />
      ) : null}
    </BottomPopup>
  );
}

function RoutineWeightSheet({
  sheet,
  routine,
  setRoutine,
  setSheet,
}: {
  sheet: Extract<Sheet, { type: "weight" }>;
  routine: WorkoutSession;
  setRoutine: React.Dispatch<React.SetStateAction<WorkoutSession>>;
  setSheet: (sheet: Sheet) => void;
}) {
  const exercise = routine.exercises.find(
    (item) => item.id === sheet.exerciseId,
  );
  const [unit, setUnit] = useState<WeightUnit>(exercise?.sets[0]?.unit ?? "kg");
  const [ratio, setRatio] = useState<1 | 0.5>(
    exercise?.sets[0]?.pulleyMultiplier ?? 1,
  );
  if (!exercise) return null;
  return (
    <View className="gap-5">
      <View className="flex-row gap-3">
        {(["kg", "lb"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setUnit(value)}
            className={`flex-1 rounded-card border px-4 py-3 ${unit === value ? "border-accent bg-accent" : "border-white bg-background"}`}
          >
            <Text
              className={`text-center text-sm font-semibold ${unit === value ? "text-background" : "text-text"}`}
            >
              {value.toUpperCase()}
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
            onValueChange={(next) => setRatio(next ? 1 : 0.5)}
          />
        </View>
      </View>
      <PrimaryButton
        label="Apply preferences"
        onPress={() => {
          setRoutine((current) => ({
            ...current,
            exercises: current.exercises.map((item) =>
              item.id === exercise.id
                ? {
                    ...item,
                    sets: item.sets.map((set) => ({
                      ...set,
                      unit,
                      pulleyMultiplier: ratio,
                    })),
                  }
                : item,
            ),
          }));
          setSheet({ type: "none" });
        }}
      />
    </View>
  );
}

function RoutineRestSheet({
  sheet,
  routine,
  setRoutine,
  setSheet,
}: {
  sheet: Extract<Sheet, { type: "rest" }>;
  routine: WorkoutSession;
  setRoutine: React.Dispatch<React.SetStateAction<WorkoutSession>>;
  setSheet: (sheet: Sheet) => void;
}) {
  const exercise = routine.exercises.find(
    (item) => item.id === sheet.exerciseId,
  );
  const [selected, setSelected] = useState(exercise?.restTimerSeconds ?? 0);
  if (!exercise) return null;
  return (
    <View className="gap-3">
      {[0, 30, 45, 60, 90, 120, 180].map((seconds) => (
        <PrimaryButton
          key={seconds}
          label={seconds === 0 ? "OFF" : `${seconds}s`}
          variant="secondary"
          onPress={() => setSelected(seconds)}
        />
      ))}
      <PrimaryButton
        label="Apply rest timer"
        onPress={() => {
          setRoutine((current) => ({
            ...current,
            exercises: current.exercises.map((item) =>
              item.id === exercise.id
                ? { ...item, restTimerSeconds: selected }
                : item,
            ),
          }));
          setSheet({ type: "none" });
        }}
      />
    </View>
  );
}

function reorderRoutine(
  routine: WorkoutSession,
  setRoutine: React.Dispatch<React.SetStateAction<WorkoutSession>>,
  exerciseId: string,
  diff: -1 | 1,
  setSheet: (sheet: Sheet) => void,
) {
  const index = routine.exercises.findIndex(
    (exercise) => exercise.id === exerciseId,
  );
  const next = index + diff;
  if (index < 0 || next < 0 || next >= routine.exercises.length) return;
  setRoutine((current) => {
    const exercises = [...current.exercises];
    const [moved] = exercises.splice(index, 1);
    exercises.splice(next, 0, moved);
    return { ...current, exercises };
  });
  setSheet({ type: "none" });
}

function SetIndicator({
  set,
  sets,
}: {
  set: WorkoutExercise["sets"][number];
  sets: WorkoutExercise["sets"];
}) {
  if (set.type === "failure")
    return (
      <Text className="text-left text-base font-semibold text-red-500">F</Text>
    );
  if (set.type === "warmup")
    return (
      <Text className="text-left text-base font-semibold text-yellow-400">
        W
      </Text>
    );
  if (set.type === "drop")
    return (
      <Text className="text-left text-base font-semibold text-carbs">D</Text>
    );
  return (
    <Text className="text-left text-base font-semibold text-text">
      {setLabel(sets, set.id)}
    </Text>
  );
}

function Hdr({ label, className = "" }: { label: string; className?: string }) {
  return (
    <Text className={`${className} text-sm font-medium text-muted`}>
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

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
