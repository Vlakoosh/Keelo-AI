import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { PageHeader } from "@/components/page-header";
import { PrimaryButton } from "@/components/primary-button";
import { EmptyState, Tile } from "@/components/ui";
import {
  createRecipe,
  initializeNutritionStorage,
  loadCustomFoods,
  loadRecipeById,
  recipeHasLoggedEntries,
  updateRecipe,
  type CreateRecipeInput,
} from "@/features/nutrition/storage";
import {
  consumePendingIngredientFood,
} from "@/features/nutrition/food-selection-bridge";
import type { CustomFood, MacroTotals, Recipe } from "@/features/nutrition/types";
import { useAppTheme } from "@/theme/theme-provider";

export default function RecipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipeId?: string }>();
  const isFocused = useIsFocused();
  const { theme } = useAppTheme();
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [name, setName] = useState("");
  const [servingsMade, setServingsMade] = useState("4");
  const [ingredients, setIngredients] = useState<
    Array<{ foodId: string; servings: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    await initializeNutritionStorage();
    const [nextFoods, nextRecipe] = await Promise.all([
      loadCustomFoods(),
      params.recipeId ? loadRecipeById(params.recipeId) : Promise.resolve(null),
    ]);
    setFoods(nextFoods);
    if (nextRecipe && !recipe) {
      setRecipe(nextRecipe);
      setName(nextRecipe.name);
      setServingsMade(String(nextRecipe.servingsMade));
      setIngredients(
        nextRecipe.ingredients.map((ingredient) => ({
          foodId: ingredient.foodId,
          servings: String(ingredient.servings),
        })),
      );
    }
    setIsLoading(false);
  }

  useEffect(() => {
    if (!isFocused) return;
    void refresh()
      .then(() => {
        const selectedFoodId = consumePendingIngredientFood();
        if (selectedFoodId) {
          setIngredients((current) => [
            ...current,
            { foodId: selectedFoodId, servings: "1" },
          ]);
        }
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
  }, [isFocused]);

  const totals = useMemo(
    () =>
      ingredients.reduce((sum, ingredient) => {
        const food = foods.find((item) => item.id === ingredient.foodId);
        if (!food) return sum;
        return addTotals(sum, multiplyTotals(food, toNumber(ingredient.servings, 1)));
      }, zeroTotals()),
    [foods, ingredients],
  );
  const perServing = multiplyTotals(
    totals,
    1 / Math.max(1, toNumber(servingsMade, 1)),
  );

  async function save(mode: "future-only" | "update-history" = "future-only") {
    const input: CreateRecipeInput = {
      name,
      servingsMade: toNumber(servingsMade, 1),
      ingredients: ingredients
        .filter((ingredient) => ingredient.foodId)
        .map((ingredient) => ({
          foodId: ingredient.foodId,
          servings: toNumber(ingredient.servings, 1),
        })),
    };
    if (!input.ingredients.length) {
      Alert.alert("Recipe", "Add at least one food.");
      return;
    }
    if (recipe) {
      await updateRecipe(recipe.id, input, mode);
    } else {
      await createRecipe(input);
    }
    router.back();
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.canvas }}>
      <PageHeader
        title={recipe ? "Edit Recipe" : "Create Recipe"}
        onBack={() => router.back()}
        rightSlot={
          <Pressable
            onPress={async () => {
              if (!recipe) {
                await save();
                return;
              }
              if (await recipeHasLoggedEntries(recipe.id)) {
                Alert.alert(
                  "Update previous logs?",
                  "This recipe has been logged before. Update previous logs or keep this for future logs only?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Future logs only",
                      onPress: () => void save("future-only"),
                    },
                    {
                      text: "Update previous",
                      onPress: () => void save("update-history"),
                    },
                  ],
                );
                return;
              }
              await save();
            }}
            className="px-1 py-2"
          >
            <Text className="text-base font-semibold" style={{ color: theme.primaryAccent }}>
              Save
            </Text>
          </Pressable>
        }
      />
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        <Tile className="gap-4 p-5">
          <InputField label="Recipe name" value={name} onChangeText={setName} />
          <InputField
            label="Total servings"
            value={servingsMade}
            onChangeText={setServingsMade}
            keyboardType="decimal-pad"
          />
          <View className="rounded-card p-4" style={{ backgroundColor: theme.cardMuted }}>
            <Text className="text-sm font-semibold" style={{ color: theme.text }}>
              Per serving
            </Text>
            <Text className="mt-2 text-sm" style={{ color: theme.textSecondary }}>
              {round(perServing.calories)} kcal · P {round(perServing.protein)}g · C {round(perServing.carbs)}g · F {round(perServing.fat)}g
            </Text>
          </View>
        </Tile>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold" style={{ color: theme.text }}>
              Foods
            </Text>
            <Pressable
              onPress={() => router.push("/food/select-ingredient")}
              className="rounded-card px-4 py-2"
              style={{ backgroundColor: theme.primaryAccent }}
            >
              <Text className="text-sm font-semibold" style={{ color: theme.textOnAccent }}>
                Add Food
              </Text>
            </Pressable>
          </View>
          {ingredients.length ? (
            ingredients.map((ingredient, index) => {
              const food = foods.find((item) => item.id === ingredient.foodId);
              return (
                <Tile key={`${ingredient.foodId}-${index}`} className="p-4">
                  <View className="gap-3">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-base font-semibold" style={{ color: theme.text }}>
                          {food?.name ?? "Missing food"}
                        </Text>
                        <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                          {food ? `${round(food.calories)} kcal per ${food.servingLabel}` : ""}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          setIngredients((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: theme.destructiveSoft }}
                      >
                        <Ionicons name="close" size={17} color={theme.destructive} />
                      </Pressable>
                    </View>
                    <InputField
                      label="Servings used"
                      value={ingredient.servings}
                      onChangeText={(value) =>
                        setIngredients((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, servings: value } : item,
                          ),
                        )
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                </Tile>
              );
            })
          ) : (
            <EmptyState
              title={isLoading ? "Loading foods" : "No foods added"}
              description="Use Add Food to search your custom foods and build this recipe."
              icon="book-outline"
            />
          )}
        </View>

        <PrimaryButton label={recipe ? "Save Recipe" : "Create Recipe"} onPress={() => void save()} />
      </ScrollView>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "decimal-pad";
}) {
  const { theme } = useAppTheme();
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold" style={{ color: theme.text }}>
        {label}
      </Text>
      <View className="rounded-card px-4 py-3" style={{ backgroundColor: theme.input }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          className="py-0 text-base"
          style={{ color: theme.text }}
          placeholderTextColor={theme.textMuted}
        />
      </View>
    </View>
  );
}

function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

function multiplyTotals(totals: MacroTotals, multiplier: number): MacroTotals {
  return {
    calories: totals.calories * multiplier,
    protein: totals.protein * multiplier,
    carbs: totals.carbs * multiplier,
    fat: totals.fat * multiplier,
  };
}

function zeroTotals(): MacroTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value: number) {
  return Math.round(value);
}
