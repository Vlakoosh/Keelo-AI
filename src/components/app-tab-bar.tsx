import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  today: "home-outline",
  food: "restaurant-outline",
  workout: "barbell-outline",
  progress: "stats-chart-outline",
  ai: "sparkles-outline"
};

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View className="border-t border-border bg-background px-3 pb-3 pt-2">
      <View className="flex-row gap-2">
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
                ? options.title
                : route.name;

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              className="flex-1 items-center justify-center gap-1 px-2 py-3"
            >
              <Ionicons
                name={tabIcons[route.name] ?? "ellipse-outline"}
                size={18}
                color={isFocused ? "#FAFAFA" : "#A3A3A3"}
              />
              <Text
                className={`text-xs font-semibold ${
                  isFocused ? "text-text" : "text-muted"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
