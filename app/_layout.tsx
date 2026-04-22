import "../.nativewind/tailwind.css";

import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ActiveWorkoutProvider } from "@/features/workout/active-workout-provider";
import { ThemeProvider, useAppTheme } from "@/theme/theme-provider";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ActiveWorkoutProvider>
        <ThemedRootLayout />
      </ActiveWorkoutProvider>
    </ThemeProvider>
  );
}

function ThemedRootLayout() {
  const { theme, mode } = useAppTheme();
  const [fontsLoaded] = useFonts(Ionicons.font);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercises/add" />
        <Stack.Screen name="exercises/[name]" />
        <Stack.Screen name="routines/create" />
        <Stack.Screen name="workouts/[id]" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  );
}
