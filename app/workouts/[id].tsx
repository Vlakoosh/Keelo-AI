import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { PageHeader } from "@/components/page-header";
import { PrimaryButton } from "@/components/primary-button";
import { StatTile, Tile } from "@/components/ui";
import {
  type WorkoutSessionDetail,
  deleteWorkoutSession,
  loadWorkoutSessionById,
  updateWorkoutSessionMeta,
} from "@/features/workout/storage";
import { useAppTheme } from "@/theme/theme-provider";

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const { theme } = useAppTheme();
  const [workout, setWorkout] = useState<WorkoutSessionDetail | null>(null);
  const isEdit = params.mode === "edit";

  useEffect(() => {
    let active = true;

    async function load() {
      const session = await loadWorkoutSessionById(params.id);
      if (active) {
        setWorkout(session);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [params.id]);

  if (!workout) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }} />
    );
  }

  const activeWorkout = workout;

  const durationSeconds = Math.max(
    0,
    Math.floor((activeWorkout.finishedAt - activeWorkout.startedAt) / 1000),
  );
  const setCount = activeWorkout.exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.filter(
        (set) => set.type === "normal" || set.type === "failure",
      ).length,
    0,
  );
  const volume = activeWorkout.exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce((exerciseSum, set) => {
        const weight = Number(set.enteredWeight || 0) * set.pulleyMultiplier;
        return exerciseSum + weight * Number(set.reps || 0);
      }, 0),
    0,
  );

  async function handleSave() {
    await updateWorkoutSessionMeta(activeWorkout.id, {
      name: activeWorkout.name,
      notes: activeWorkout.notes,
    });
    router.replace({
      pathname: "/workouts/[id]",
      params: { id: activeWorkout.id },
    });
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.canvas }}>
      <PageHeader
        title="Workout"
        onBack={() => router.back()}
        rightSlot={
          isEdit ? (
            <Pressable
              onPress={() => {
                void handleSave();
              }}
              className="px-1 py-2"
            >
              <Text
                className="text-base font-semibold"
                style={{ color: theme.primaryAccent }}
              >
                Save
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-10 pt-4"
      >
        {isEdit ? (
          <TextInput
            value={activeWorkout.name}
            onChangeText={(text) =>
              setWorkout((current) =>
                current ? { ...current, name: text } : current,
              )
            }
            className="text-3xl font-semibold"
            style={{ color: theme.primaryAccent }}
          />
        ) : (
          <Text
            className="text-3xl font-semibold"
            style={{ color: theme.primaryAccent }}
          >
            {activeWorkout.name}
          </Text>
        )}
        <Text className="text-sm" style={{ color: theme.textMuted }}>
          {formatDateTime(activeWorkout.startedAt)}
        </Text>
        {isEdit ? (
          <TextInput
            multiline
            value={activeWorkout.notes}
            onChangeText={(text) =>
              setWorkout((current) =>
                current ? { ...current, notes: text } : current,
              )
            }
            placeholder="Add notes"
            placeholderTextColor={theme.textMuted}
            className="min-h-[64px] text-base"
            style={{ color: theme.text }}
          />
        ) : activeWorkout.notes ? (
          <Text className="text-base leading-6" style={{ color: theme.text }}>
            {activeWorkout.notes}
          </Text>
        ) : null}
        <View className="flex-row gap-3">
          <StatTile value={fmt(durationSeconds)} label="Duration" variant="accent" />
          <StatTile value={`${setCount}`} label="Sets" />
          <StatTile value={`${volume.toFixed(0)} kg`} label="Volume" />
        </View>
        <Text className="text-sm font-medium" style={{ color: theme.textMuted }}>
          Exercises
        </Text>
        {activeWorkout.exercises.map((exercise) => (
          <Tile key={exercise.id} className="gap-3 p-4">
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/exercises/[name]",
                  params: { name: exercise.name },
                })
              }
              className="py-1"
            >
              <Text
                className="text-xl font-semibold"
                style={{ color: theme.text }}
              >
                {exercise.name}
              </Text>
            </Pressable>
            <View className="gap-2">
              {exercise.sets.map((set) => (
                <View key={set.id} className="flex-row items-center gap-3">
                  <View
                    className="rounded-card px-3 py-2"
                    style={{ backgroundColor: theme.cardMuted }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: theme.text }}
                    >
                      {set.type === "warmup"
                        ? "W"
                        : set.type === "drop"
                          ? "D"
                          : set.type === "failure"
                            ? "F"
                            : setNumber(exercise.sets, set.id)}
                    </Text>
                  </View>
                  <Text className="text-sm" style={{ color: theme.textSecondary }}>
                    {trimValue(set.enteredWeight)} {set.unit} x {set.reps} ={" "}
                    {(
                      Number(set.enteredWeight || 0) *
                      set.pulleyMultiplier *
                      Number(set.reps || 0)
                    ).toFixed(0)}{" "}
                    kg
                  </Text>
                </View>
              ))}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {medalChips(exercise).map((chip) => (
                <View
                  key={chip}
                  className="rounded-full px-3 py-2"
                  style={{ backgroundColor: theme.warningSoft }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: theme.warning }}
                  >
                    {chip}
                  </Text>
                </View>
              ))}
            </View>
          </Tile>
        ))}
        {!isEdit ? (
          <View className="gap-3 pt-2">
            <PrimaryButton
              label="Edit Workout"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/workouts/[id]",
                  params: { id: activeWorkout.id, mode: "edit" },
                })
              }
            />
            <Pressable
              onPress={() => {
                void deleteWorkoutSession(activeWorkout.id)
                  .then(() => router.back())
                  .catch((error) => {
                    console.error(error);
                    Alert.alert(
                      "Delete workout",
                      "Unable to delete this workout.",
                    );
                  });
              }}
              className="rounded-card px-4 py-4"
              style={{
                backgroundColor: theme.destructiveSoft,
              }}
            >
              <Text
                className="text-base font-semibold"
                style={{ color: theme.destructive }}
              >
                Delete Workout
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function medalChips(exercise: WorkoutSessionDetail["exercises"][number]) {
  const entries = exercise.sets
    .filter((set) => set.completed)
    .map((set) => {
      const weight = Number(set.enteredWeight || 0) * set.pulleyMultiplier;
      const reps = Number(set.reps || 0);
      return {
        weight,
        volume: weight * reps,
        pr: weight * (1 + reps / 30),
      };
    });

  if (entries.length === 0) return [];

  const maxWeight = Math.max(...entries.map((entry) => entry.weight));
  const maxVolume = Math.max(...entries.map((entry) => entry.volume));
  const maxPr = Math.max(...entries.map((entry) => entry.pr));
  const chips: string[] = [];
  if (maxWeight > exercise.benchmarks.bestWeight) chips.push("Highest Weight");
  if (maxVolume > exercise.benchmarks.bestVolume) chips.push("Highest Volume");
  if (maxPr > exercise.benchmarks.bestPr) chips.push("Highest PR");
  return chips;
}

function Metric({
  label,
  value,
  dividerColor,
}: {
  label: string;
  value: string;
  dividerColor?: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      className="flex-1 items-center justify-center"
      style={
        dividerColor
          ? { borderRightWidth: 1, borderRightColor: dividerColor }
          : undefined
      }
    >
      <Text className="text-2xl font-semibold" style={{ color: theme.text }}>
        {value}
      </Text>
      <Text className="mt-2 text-sm" style={{ color: theme.muted }}>
        {label}
      </Text>
    </View>
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

function formatDateTime(value: number) {
  return new Date(value).toLocaleString();
}

function setNumber(
  sets: WorkoutSessionDetail["exercises"][number]["sets"],
  setId: string,
) {
  let count = 0;
  for (const set of sets) {
    if (set.type === "normal" || set.type === "failure") count += 1;
    if (set.id === setId) return count;
  }
  return "?";
}

function trimValue(value: string) {
  const numeric = Number(value);
  return Number.isInteger(numeric)
    ? String(numeric)
    : String(Number(numeric.toFixed(2)));
}
