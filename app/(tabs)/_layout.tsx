import { Tabs } from "expo-router";

import { AppTabBar } from "@/components/app-tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: "#050505"
        }
      }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="food" options={{ title: "Food" }} />
      <Tabs.Screen name="workout" options={{ title: "Workout" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="ai" options={{ title: "AI" }} />
    </Tabs>
  );
}
