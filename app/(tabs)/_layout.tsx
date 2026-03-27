import { Tabs } from "expo-router";

import { AppTabBar } from "@/components/app-tab-bar";
import { useAppTheme } from "@/theme/theme-provider";

export default function TabLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: theme.background
        }
      }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tabs.Screen name="food" options={{ title: "Food" }} />
      <Tabs.Screen name="workout" options={{ title: "Workout" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      <Tabs.Screen name="today" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="ai" options={{ href: null }} />
    </Tabs>
  );
}
