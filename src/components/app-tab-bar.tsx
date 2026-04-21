import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useActiveWorkout } from "@/features/workout/active-workout-provider";
import { getWorkoutDurationSeconds } from "@/features/workout/session-utils";
import { useAppTheme } from "@/theme/theme-provider";

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: "nutrition-outline",
  workout: "barbell-outline",
  settings: "options-outline",
};

export function AppTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(1)).current;
  const [now, setNow] = useState(() => Date.now());
  const {
    activeWorkout,
    discardActiveWorkout,
    isActiveWorkoutVisible,
    lastEditedExerciseName,
    requestResume,
  } = useActiveWorkout();
  const visibleRoutes = state.routes.filter((route) => route.name in tabIcons);
  const shouldShowActiveWorkout = activeWorkout && !isActiveWorkoutVisible;

  useEffect(() => {
    if (!shouldShowActiveWorkout) return;

    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [shouldShowActiveWorkout]);

  useEffect(() => {
    if (!activeWorkout) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [activeWorkout, pulse]);

  return (
    <View
      className="px-3 pt-2"
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
        borderTopWidth: 1,
        borderTopColor: theme.border,
        backgroundColor: theme.background,
      }}
    >
      {shouldShowActiveWorkout ? (
        <View
          className="mb-3 flex-row items-center gap-3 rounded-card px-4 py-3"
          style={{
            borderWidth: 1,
            borderColor: theme.quaternary,
            backgroundColor: theme.tertiary,
          }}
        >
          <Pressable
            onPress={() => {
              requestResume();
              navigation.navigate("workout");
            }}
            className="h-10 w-10 items-center justify-center"
          >
            <Ionicons name="chevron-up" size={18} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={() => {
              requestResume();
              navigation.navigate("workout");
            }}
            className="flex-1"
          >
            <View className="flex-row items-center gap-2">
              <Animated.View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: theme.protein, opacity: pulse }}
              />
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.text }}
              >
                Workout:{" "}
                {formatDuration(getWorkoutDurationSeconds(activeWorkout, now))}
              </Text>
            </View>
            <Text
              className="mt-1 text-sm"
              numberOfLines={1}
              style={{ color: theme.muted }}
            >
              {lastEditedExerciseName || "Workout in progress"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert("Discard workout", "Discard the active workout?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Discard",
                  style: "destructive",
                  onPress: discardActiveWorkout,
                },
              ]);
            }}
            className="h-10 w-10 items-center justify-center"
          >
            <Ionicons name="close" size={18} color="#EF4444" />
          </Pressable>
        </View>
      ) : null}
      <View className="flex-row gap-2">
        {visibleRoutes.map((route) => {
          const index = state.routes.findIndex(
            (item) => item.key === route.key,
          );
          const isFocused = state.index === index;
          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              className="flex-1 items-center justify-center gap-1 px-2 py-3"
            >
              <Ionicons
                name={tabIcons[route.name] ?? "ellipse-outline"}
                size={20}
                color={isFocused ? theme.secondary : theme.muted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const hours = Math.floor(minutes / 60);
  return hours > 0
    ? `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
