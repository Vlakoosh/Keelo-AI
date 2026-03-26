import "../.nativewind/tailwind.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#111111");
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#111111"
          }
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercises/add" />
        <Stack.Screen name="routines/create" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  );
}
