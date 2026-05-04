import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { PageHeader } from "@/components/page-header";
import { EmptyState, Tile } from "@/components/ui";
import {
  type ExerciseHistoryDetail,
  type ExerciseHistorySession,
  initializeWorkoutStorage,
  loadExerciseHistory,
} from "@/features/workout/storage";
import { useAppTheme } from "@/theme/theme-provider";

const CHART_LIMIT = 8;
const CHART_HEIGHT = 220;
const CHART_BOTTOM_PADDING = 34;
const CHART_TOP_PADDING = 18;
const CHART_SIDE_PADDING = 28;
const DOT_SIZE = 16;

type GraphMetricKey = "estimatedPr" | "bestWeight" | "bestSetVolume" | "volume";

type GraphMetric = {
  key: GraphMetricKey;
  label: string;
  recordLabel: string;
};

type WeeklyPoint = {
  weekStart: number;
  label: string;
  value: number;
};

const GRAPH_METRICS: GraphMetric[] = [
  { key: "estimatedPr", label: "1RM", recordLabel: "Estimated 1RM" },
  { key: "bestWeight", label: "Weight", recordLabel: "Best Weight" },
  { key: "bestSetVolume", label: "Set Volume", recordLabel: "Best Set Volume" },
  { key: "volume", label: "Volume", recordLabel: "Best Volume" },
];

export default function ExerciseHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const { theme } = useAppTheme();
  const exerciseName = String(params.name ?? "");
  const [history, setHistory] = useState<ExerciseHistoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] =
    useState<GraphMetricKey>("estimatedPr");

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

  const chartPoints = useMemo(
    () =>
      aggregateWeeklyPoints(history?.sessions ?? [], selectedMetric).slice(
        -CHART_LIMIT,
      ),
    [history?.sessions, selectedMetric],
  );
  const activeMetric = GRAPH_METRICS.find(
    (metric) => metric.key === selectedMetric,
  );

  return (
    <View className="flex-1" style={{ backgroundColor: theme.canvas }}>
      <PageHeader title="Exercise" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-10 pt-4"
      >
        <View className="gap-2">
          <Text
            className="text-3xl font-semibold"
            style={{ color: theme.primaryAccent }}
          >
            {exerciseName || "Exercise"}
          </Text>
          <Text className="text-sm" style={{ color: theme.textMuted }}>
            {history
              ? `${history.stats.sessions} sessions logged`
              : "Loading exercise history"}
          </Text>
        </View>

        {isLoading ? (
          <Text className="text-sm" style={{ color: theme.textMuted }}>
            Loading history...
          </Text>
        ) : history && history.sessions.length > 0 ? (
          <>
            <Tile className="gap-4 p-5">
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-lg font-semibold"
                  style={{ color: theme.text }}
                >
                  Progress
                </Text>
                <Text className="text-sm" style={{ color: theme.textMuted }}>
                  Weekly best
                </Text>
              </View>
              <HistoryChart
                points={chartPoints}
                unit={history.unit}
                metricLabel={activeMetric?.label ?? "Progress"}
              />
              <MetricSelector
                selectedMetric={selectedMetric}
                onSelect={setSelectedMetric}
              />
            </Tile>

            <RecordsPanel history={history} />

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
          <EmptyState
            title="No logged sets yet"
            description="Completed sets for this exercise will appear here after you save a workout."
            icon="barbell-outline"
          />
        )}
      </ScrollView>
    </View>
  );
}

function HistoryChart({
  points,
  unit,
  metricLabel,
}: {
  points: WeeklyPoint[];
  unit: string;
  metricLabel: string;
}) {
  const { theme } = useAppTheme();
  const [chartWidth, setChartWidth] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState<WeeklyPoint | null>(null);
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const minValue = Math.min(...points.map((point) => point.value));
  const range = Math.max(1, maxValue - minValue);
  const usableHeight = CHART_HEIGHT - CHART_TOP_PADDING - CHART_BOTTOM_PADDING;
  const usableWidth = Math.max(0, chartWidth - CHART_SIDE_PADDING * 2);
  const plottedPoints = points.map((point, index) => {
    const x =
      points.length === 1
        ? CHART_SIDE_PADDING + usableWidth / 2
        : (usableWidth / (points.length - 1)) * index;
    const y =
      CHART_TOP_PADDING +
      usableHeight -
      ((point.value - minValue) / range) * usableHeight;

    return {
      ...point,
      x: points.length === 1 ? x : x + CHART_SIDE_PADDING,
      y,
    };
  });

  function handleLayout(event: LayoutChangeEvent) {
    setChartWidth(event.nativeEvent.layout.width);
  }

  return (
    <View className="gap-3">
      <View
        onLayout={handleLayout}
        className="relative"
        style={{ height: CHART_HEIGHT }}
      >
        <View className="absolute inset-x-0 top-4 h-px" style={{ backgroundColor: theme.hairline }} />
        <View className="absolute inset-x-0 top-1/2 h-px" style={{ backgroundColor: theme.hairline }} />
        <View
          className="absolute inset-x-0 h-px"
          style={{ bottom: CHART_BOTTOM_PADDING, backgroundColor: theme.hairline }}
        />
        {chartWidth > 0 && plottedPoints.length > 1
          ? plottedPoints.slice(0, -1).map((point, index) => {
              const next = plottedPoints[index + 1];
              const dx = next.x - point.x;
              const dy = next.y - point.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = `${Math.atan2(dy, dx)}rad`;
              const centerX = point.x + dx / 2;
              const centerY = point.y + dy / 2;

              return (
                <View
                  key={`${point.weekStart}-${next.weekStart}`}
                  className="absolute h-[3px] rounded-full"
                  style={{
                    left: centerX - length / 2,
                    top: centerY - 1.5,
                    width: length,
                    backgroundColor: theme.primaryAccent,
                    transform: [{ rotateZ: angle }],
                  }}
                />
              );
            })
          : null}
        {chartWidth > 0
          ? plottedPoints.map((point) => (
              <View key={point.weekStart}>
                {selectedPoint?.weekStart === point.weekStart ? (
                  <View
                    className="absolute rounded-card px-3 py-2"
                    style={{
                      left: Math.min(
                        Math.max(0, point.x - 54),
                        Math.max(0, chartWidth - 108),
                      ),
                      top: Math.max(0, point.y - 52),
                      backgroundColor: theme.card,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: theme.text }}
                    >
                      {formatNumber(point.value)} {unit}
                    </Text>
                    <Text
                      className="mt-1 text-xs"
                      style={{ color: theme.textMuted }}
                    >
                      {metricLabel} - {point.label}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => setSelectedPoint(point)}
                  onHoverIn={() => setSelectedPoint(point)}
                  onHoverOut={() => setSelectedPoint(null)}
                  className="absolute items-center justify-center"
                  style={{
                    left: point.x - DOT_SIZE,
                    top: point.y - DOT_SIZE,
                    height: DOT_SIZE * 2,
                    width: DOT_SIZE * 2,
                  }}
                >
                  <View
                    className="rounded-full"
                    style={{
                      height: DOT_SIZE,
                      width: DOT_SIZE,
                      borderWidth: 3,
                      borderColor: theme.primaryAccent,
                      backgroundColor: theme.card,
                    }}
                  />
                </Pressable>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className="absolute w-14 text-center text-xs"
                  style={{
                    left: point.x - 28,
                    top: CHART_HEIGHT - 24,
                    color: theme.textMuted,
                  }}
                >
                  {point.label}
                </Text>
              </View>
            ))
          : null}
      </View>
    </View>
  );
}

function MetricSelector({
  selectedMetric,
  onSelect,
}: {
  selectedMetric: GraphMetricKey;
  onSelect: (metric: GraphMetricKey) => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View className="flex-row flex-wrap gap-2">
      {GRAPH_METRICS.map((metric) => {
        const isActive = selectedMetric === metric.key;
        return (
          <Pressable
            key={metric.key}
            onPress={() => onSelect(metric.key)}
            className="rounded-full px-4 py-3"
            style={{
              backgroundColor: isActive ? theme.primaryAccent : theme.cardMuted,
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: isActive ? theme.textOnAccent : theme.text }}
            >
              {metric.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RecordsPanel({ history }: { history: ExerciseHistoryDetail }) {
  const { theme } = useAppTheme();
  const records = [
    {
      label: "Estimated 1RM",
      value: `${formatNumber(history.stats.estimatedOneRepMax)} ${history.unit}`,
    },
    {
      label: "Best Weight",
      value: `${formatNumber(history.stats.bestWeight)} ${history.unit}`,
    },
    {
      label: "Best Set Volume",
      value: `${formatNumber(history.stats.bestSetVolume)} ${history.unit}`,
    },
    {
      label: "Best Volume",
      value: `${formatNumber(history.stats.bestVolume)} ${history.unit}`,
    },
    {
      label: "Working Sets",
      value: `${history.stats.workingSets}`,
    },
  ];

  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold" style={{ color: theme.text }}>
        Records
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {records.map((record) => (
          <Tile
            key={record.label}
            className="min-w-[46%] flex-1 rounded-card px-4 py-4"
          >
            <Text className="text-sm" style={{ color: theme.textMuted }}>
              {record.label}
            </Text>
            <Text
              className="mt-2 text-xl font-semibold"
              style={{ color: theme.text }}
            >
              {record.value}
            </Text>
          </Tile>
        ))}
      </View>
    </View>
  );
}

function HistorySessionRow({ session }: { session: ExerciseHistorySession }) {
  const { theme } = useAppTheme();
  return (
    <Tile className="gap-3 p-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="text-base font-semibold"
            style={{ color: theme.text }}
          >
            {session.workoutName}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
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
            style={{ backgroundColor: theme.cardMuted }}
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
    </Tile>
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

function aggregateWeeklyPoints(
  sessions: ExerciseHistorySession[],
  metric: GraphMetricKey,
) {
  const pointsByWeek = new Map<number, WeeklyPoint>();
  const sortedSessions = [...sessions].sort(
    (a, b) => a.startedAt - b.startedAt,
  );

  for (const session of sortedSessions) {
    const weekStart = getWeekStart(session.startedAt);
    const value = getMetricValue(session, metric);
    const current = pointsByWeek.get(weekStart);

    if (!current || value > current.value) {
      pointsByWeek.set(weekStart, {
        weekStart,
        label: formatShortDate(weekStart),
        value,
      });
    }
  }

  return Array.from(pointsByWeek.values()).sort(
    (a, b) => a.weekStart - b.weekStart,
  );
}

function getMetricValue(
  session: ExerciseHistorySession,
  metric: GraphMetricKey,
) {
  if (metric === "bestWeight") return session.bestWeight;
  if (metric === "bestSetVolume") return session.bestVolume;
  if (metric === "volume") return session.totalVolume;
  return session.bestPr;
}

function getWeekStart(value: number) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
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
