import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { EmptyState, Tile } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import {
  initializeNutritionStorage,
  loadCustomFoods,
} from "@/features/nutrition/storage";
import { setPendingIngredientFood } from "@/features/nutrition/food-selection-bridge";
import type { CustomFood } from "@/features/nutrition/types";
import { useAppTheme } from "@/theme/theme-provider";

export default function SelectIngredientScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { theme } = useAppTheme();
  const [search, setSearch] = useState("");
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFocused) return;
    void initializeNutritionStorage()
      .then(loadCustomFoods)
      .then((nextFoods) => {
        setFoods(nextFoods);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
  }, [isFocused]);

  const visibleFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    return foods.filter((food) => food.name.toLowerCase().includes(query));
  }, [foods, search]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.canvas }}>
      <PageHeader title="Select Food" onBack={() => router.back()} />
      <View className="px-5 pt-4">
        <View
          className="flex-row items-center gap-3 rounded-card px-4 py-3"
          style={{ backgroundColor: theme.card }}
        >
          <Ionicons name="search-outline" size={18} color={theme.iconMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search custom foods"
            placeholderTextColor={theme.textMuted}
            className="flex-1 py-0 text-base"
            style={{ color: theme.text }}
          />
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-8 pt-5">
        {isLoading ? (
          <Text className="text-sm" style={{ color: theme.textMuted }}>
            Loading foods...
          </Text>
        ) : visibleFoods.length ? (
          visibleFoods.map((food) => (
            <Pressable
              key={food.id}
              onPress={() => {
                setPendingIngredientFood(food.id);
                router.back();
              }}
            >
              <Tile className="p-4">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-semibold" style={{ color: theme.text }}>
                      {food.name}
                    </Text>
                    <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                      {Math.round(food.calories)} kcal per {food.servingLabel}
                    </Text>
                  </View>
                  <Ionicons name="add" size={20} color={theme.primaryAccent} />
                </View>
              </Tile>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="No custom foods"
            description="Create custom foods first, then add them to recipes."
            icon="restaurant-outline"
          />
        )}
      </ScrollView>
    </View>
  );
}
