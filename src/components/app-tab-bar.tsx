import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, View } from "react-native";

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: "nutrition-outline",
  workout: "barbell-outline"
};

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const visibleRoutes = state.routes.filter((route) => route.name in tabIcons);

  return (
    <View className="border-t border-border bg-background px-3 pb-3 pt-2">
      <View className="flex-row gap-2">
        {visibleRoutes.map((route) => {
          const index = state.routes.findIndex((item) => item.key === route.key);
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
                color={isFocused ? "#FAFAFA" : "#A3A3A3"}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
