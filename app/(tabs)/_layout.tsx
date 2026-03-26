import { Tabs } from "expo-router";

import { AppTabBar } from "@/components/app-tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: "#111111"
        }
      }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tabs.Screen name="food" options={{ title: "Food" }} />
      <Tabs.Screen name="workout" options={{ title: "Workout" }} />
      <Tabs.Screen name="today" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="ai" options={{ href: null }} />
    </Tabs>
  );
}
