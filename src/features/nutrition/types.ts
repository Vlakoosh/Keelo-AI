export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionGoals = MacroTotals;

export type CustomFood = MacroTotals & {
  id: string;
  name: string;
  servingLabel: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
};

export type RecipeIngredient = {
  id: string;
  foodId: string;
  foodName: string;
  servingLabel: string;
  servings: number;
  totals: MacroTotals;
};

export type Recipe = {
  id: string;
  name: string;
  servingsMade: number;
  notes: string;
  activeVersionId: string;
  totals: MacroTotals;
  perServing: MacroTotals;
  ingredients: RecipeIngredient[];
  createdAt: number;
  updatedAt: number;
};

export type FoodLogSourceType = "food" | "recipe";

export type FoodLogEntry = {
  id: string;
  dateKey: string;
  meal: MealType;
  sourceType: FoodLogSourceType;
  sourceId: string;
  sourceVersionId?: string;
  name: string;
  servingLabel: string;
  servings: number;
  totals: MacroTotals;
  loggedAt: number;
};

export type NutritionDayStatus = "none" | "under" | "on-track" | "over";

export type NutritionDay = {
  dateKey: string;
  goals: NutritionGoals;
  totals: MacroTotals;
  status: NutritionDayStatus;
  meals: Record<MealType, FoodLogEntry[]>;
};

export const MEALS: Array<{ key: MealType; label: string }> = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
];
