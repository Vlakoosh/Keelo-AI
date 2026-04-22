import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PageHeader } from "@/components/page-header";
import {
  type ExerciseHistoryDetail,
  type ExerciseHistorySession,
  initializeWorkoutStorage,
  loadExerciseHistory,
} from "@/features/workout/storage";
import { useAppTheme } from "@/theme/theme-provider";

const CHART_LIMIT = 8;

export default function ExerciseHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const { theme } = useAppTheme();
  const exerciseName = String(params.name ?? "");
  const [history, setHistory] = useState<ExerciseHistoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      await initializeWorkoutStorage();
      const nextHistory = await loadExerciseHistory(exerciseName);
      if (active) {
        setHistory(nextHistory);
        setIsLoading(false);
      }
    }

    void load().catch((error) => {
      console.error(error);
      if (active) {
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [exerciseName]);

  const chartSessions = useMemo(
    () => [...(history?.sessions ?? [])].reverse().slice(-CHART_LIMIT),
    [history?.sessions],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <PageHeader title="Exercise" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-10 pt-4"
      >
        <View className="gap-2">
          <Text
            className="text-3xl font-semibold"
            style={{ color: theme.secondary }}
          >
            {exerciseName || "Exercise"}
          </Text>
          <Text className="text-sm" style={{ color: theme.muted }}>
            {history
              ? `${history.stats.sessions} sessions logged`
              : "Loading exercise history"}
          </Text>
        </View>

        {isLoading ? (
          <Text className="text-sm" style={{ color: theme.muted }}>
            Loading history...
          </Text>
        ) : history && history.sessions.length > 0 ? (
          <>
            <View
              className="gap-4 border-y py-5"
              style={{ borderColor: theme.tertiary }}
            >
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-lg font-semibold"
                  style={{ color: theme.text }}
                >
                  Progress
                </Text>
                <Text className="text-sm" style={{ color: theme.muted }}>
                  Estimated 1RM
                </Text>
              </View>
              <HistoryChart sessions={chartSessions} unit={history.unit} />
            </View>

            <View className="flex-row flex-wrap gap-2">
              <StatPill
                label="1RM"
                value={`${formatNumber(history.stats.estimatedOneRepMax)} ${history.unit}`}
              />
              <StatPill
                label="Best Weight"
                value={`${formatNumber(history.stats.bestWeight)} ${history.unit}`}
              />
              <StatPill
                label="Best Set Volume"
                value={`${formatNumber(history.stats.bestSetVolume)} ${history.unit}`}
              />
              <StatPill
                label="Best Volume"
                value={`${formatNumber(history.stats.bestVolume)} ${history.unit}`}
              />
              <StatPill label="Sets" value={`${history.stats.workingSets}`} />
            </View>

            <View className="gap-4">
              <Text
                className="text-lg font-semibold"
                style={{ color: theme.text }}
              >
                History
              </Text>
              {history.sessions.map((session) => (
                <HistorySessionRow key={session.id} session={session} />
              ))}
            </View>
          </>
        ) : (
          <View
            className="items-center justify-center border-y py-12"
            style={{ borderColor: theme.tertiary }}
          >
            <Ionicons name="barbell-outline" size={28} color={theme.muted} />
            <Text
              className="mt-4 text-center text-lg font-semibold"
              style={{ color: theme.text }}
            >
              No logged sets yet
            </Text>
            <Text
              className="mt-2 text-center text-sm leading-6"
              style={{ color: theme.muted }}
            >
              Completed sets for this exercise will appear here after you save a
              workout.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function HistoryChart({
  sessions,
  unit,
}: {
  sessions: ExerciseHistorySession[];
  unit: string;
}) {
  const { theme } = useAppTheme();
  const maxPr = Math.max(1, ...sessions.map((session) => session.bestPr));

  return (
    <View className="h-56">
      <View className="absolute inset-x-0 top-0 h-px bg-border" />
      <View className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <View className="absolute inset-x-0 bottom-8 h-px bg-border" />
      <View className="h-full flex-row items-end gap-2 pb-8">
        {sessions.map((session) => {
          const height = Math.max(12, (session.bestPr / maxPr) * 168);
          return (
            <View key={session.id} className="flex-1 items-center gap-2">
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                className="text-center text-xs font-semibold"
                style={{ color: theme.text }}
              >
                {formatNumber(session.bestPr)}
              </Text>
              <View
                className="w-full rounded-t-card"
                style={{
                  height,
                  backgroundColor: theme.secondary,
                }}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                className="text-center text-xs"
                style={{ color: theme.muted }}
              >
                {formatShortDate(session.startedAt)}
              </Text>
            </View>
          );
        })}
      </View>
      <Text
        className="absolute right-0 top-2 text-xs"
        style={{ color: theme.muted }}
      >
        {formatNumber(maxPr)} {unit}
      </Text>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View
      className="rounded-full px-4 py-3"
      style={{ backgroundColor: theme.tertiary }}
    >
      <Text className="text-xs font-medium" style={{ color: theme.muted }}>
        {label}
      </Text>
      <Text
        className="mt-1 text-base font-semibold"
        style={{ color: theme.text }}
      >
        {value}
      </Text>
    </View>
  );
}

function HistorySessionRow({ session }: { session: ExerciseHistorySession }) {
  const { theme } = useAppTheme();
  return (
    <View
      className="gap-3 border-b pb-4"
      style={{ borderBottomColor: theme.tertiary }}
    >
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="text-base font-semibold"
            style={{ color: theme.text }}
          >
            {session.workoutName}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: theme.muted }}>
            {formatLongDate(session.startedAt)}
          </Text>
        </View>
        <Text className="text-sm font-semibold" style={{ color: theme.text }}>
          {formatNumber(session.totalVolume)} vol
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {session.sets.map((set, index) => (
          <View
            key={set.id}
            className="rounded-full px-3 py-2"
            style={{ backgroundColor: theme.tertiary }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: theme.text }}
            >
              {setLabel(set.type, index)} {formatNumber(set.weight)} {set.unit}{" "}
              x {set.reps}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function setLabel(
  type: ExerciseHistorySession["sets"][number]["type"],
  index: number,
) {
  if (type === "warmup") return "W";
  if (type === "drop") return "D";
  if (type === "failure") return "F";
  return `${index + 1}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(1)));
}

function formatShortDate(value: number) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(value: number) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
