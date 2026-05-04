import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { EmptyState, Tile } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import {
  initializeNutritionStorage,
  loadCustomFoods,
  loadRecipes,
  logFood,
} from "@/features/nutrition/storage";
import type {
  CustomFood,
  FoodLogSourceType,
  MealType,
  Recipe,
} from "@/features/nutrition/types";
import { useAppTheme } from "@/theme/theme-provider";

type FoodListItem =
  | { type: "food"; item: CustomFood }
  | { type: "recipe"; item: Recipe };

export default function LogFoodScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ dateKey: string; meal: MealType }>();
  const { theme } = useAppTheme();
  const [search, setSearch] = useState("");
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    await initializeNutritionStorage();
    const [nextFoods, nextRecipes] = await Promise.all([
      loadCustomFoods(),
      loadRecipes(),
    ]);
    setFoods(nextFoods);
    setRecipes(nextRecipes);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!isFocused) return;
    void refresh().catch((error) => {
      console.error(error);
      setIsLoading(false);
    });
  }, [isFocused]);

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    const all: FoodListItem[] = [
      ...foods.map((item) => ({ type: "food" as const, item })),
      ...recipes.map((item) => ({ type: "recipe" as const, item })),
    ];
    return all.filter(({ item }) => item.name.toLowerCase().includes(query));
  }, [foods, recipes, search]);

  async function handleLog(sourceType: FoodLogSourceType, sourceId: string) {
    await logFood({
      dateKey: params.dateKey,
      meal: params.meal,
      sourceType,
      sourceId,
      servings: 1,
    });
    router.back();
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.canvas }}>
      <PageHeader title="Log Food" onBack={() => router.back()} />
      <View className="px-5 pt-4">
        <View
          className="flex-row items-center gap-3 rounded-card px-4 py-3"
          style={{ backgroundColor: theme.card }}
        >
          <Ionicons name="search-outline" size={18} color={theme.iconMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search foods and recipes"
            placeholderTextColor={theme.textMuted}
            className="flex-1 py-0 text-base"
            style={{ color: theme.text }}
          />
        </View>
        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={() => router.push("/food/recipe")}
            className="flex-1 rounded-card px-4 py-3"
            style={{ backgroundColor: theme.primaryAccent }}
          >
            <Text className="text-center text-sm font-semibold" style={{ color: theme.textOnAccent }}>
              Create Recipe
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/food/custom-food")}
            className="flex-1 rounded-card px-4 py-3"
            style={{ backgroundColor: theme.card }}
          >
            <Text className="text-center text-sm font-semibold" style={{ color: theme.text }}>
              Create Custom Food
            </Text>
          </Pressable>
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-8 pt-5">
        {isLoading ? (
          <Text className="text-sm" style={{ color: theme.textMuted }}>
            Loading foods...
          </Text>
        ) : items.length ? (
          items.map(({ type, item }) => {
            const totals = type === "food" ? item as CustomFood : (item as Recipe).perServing;
            return (
              <Tile key={`${type}-${item.id}`} className="p-4">
                <View className="flex-row items-center justify-between gap-3">
                  <Pressable
                    onPress={() => handleLog(type, item.id)}
                    className="flex-1 flex-row items-center gap-3"
                  >
                    <View
                      className="h-11 w-11 items-center justify-center rounded-full"
                      style={{
                        backgroundColor:
                          type === "recipe"
                            ? theme.secondaryAccentSoft
                            : theme.primaryAccentSoft,
                      }}
                    >
                      <Ionicons
                        name={type === "recipe" ? "book-outline" : "restaurant-outline"}
                        size={19}
                        color={type === "recipe" ? theme.secondaryAccent : theme.primaryAccent}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold" style={{ color: theme.text }}>
                        {item.name}
                      </Text>
                      <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                        {type === "recipe" ? "Recipe" : (item as CustomFood).servingLabel} · {round(totals.calories)} kcal
                      </Text>
                    </View>
                  </Pressable>
                  {type === "recipe" ? (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/food/recipe",
                          params: { recipeId: item.id },
                        })
                      }
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.cardMuted }}
                    >
                      <Ionicons name="create-outline" size={17} color={theme.icon} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => handleLog(type, item.id)}
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.primaryAccent }}
                  >
                    <Ionicons name="add" size={19} color={theme.textOnAccent} />
                  </Pressable>
                </View>
              </Tile>
            );
          })
        ) : (
          <EmptyState
            title="No foods yet"
            description="Create a custom food or recipe to start logging."
            icon="restaurant-outline"
          />
        )}
      </ScrollView>
    </View>
  );
}

function round(value: number) {
  return Math.round(value);
}
