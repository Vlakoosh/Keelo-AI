import * as SQLite from "expo-sqlite";

import type {
  CustomFood,
  FoodLogEntry,
  FoodLogSourceType,
  MacroTotals,
  MealType,
  NutritionDay,
  NutritionGoals,
  Recipe,
  RecipeIngredient,
} from "@/features/nutrition/types";
import { MEALS } from "@/features/nutrition/types";

const dbPromise = SQLite.openDatabaseAsync("keelo.db");
let initializeNutritionStoragePromise: Promise<void> | null = null;

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2200,
  protein: 160,
  carbs: 240,
  fat: 70,
};

export type CreateCustomFoodInput = {
  name: string;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
};

export type RecipeIngredientInput = {
  foodId: string;
  servings: number;
};

export type CreateRecipeInput = {
  name: string;
  servingsMade: number;
  notes?: string;
  ingredients: RecipeIngredientInput[];
};

export type LogFoodInput = {
  dateKey: string;
  meal: MealType;
  sourceType: FoodLogSourceType;
  sourceId: string;
  servings: number;
};

export async function initializeNutritionStorage() {
  initializeNutritionStoragePromise ??= initializeNutritionStorageOnce().catch(
    (error) => {
      initializeNutritionStoragePromise = null;
      throw error;
    },
  );

  return initializeNutritionStoragePromise;
}

async function initializeNutritionStorageOnce() {
  const db = await dbPromise;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS nutrition_goals (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_foods (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      serving_label TEXT NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      servings_made REAL NOT NULL,
      notes TEXT,
      active_version_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipe_versions (
      id TEXT PRIMARY KEY NOT NULL,
      recipe_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      servings_made REAL NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY NOT NULL,
      recipe_version_id TEXT NOT NULL,
      food_id TEXT NOT NULL,
      food_name TEXT NOT NULL,
      serving_label TEXT NOT NULL,
      servings REAL NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      ingredient_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_logs (
      id TEXT PRIMARY KEY NOT NULL,
      date_key TEXT NOT NULL,
      meal TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_version_id TEXT,
      name TEXT NOT NULL,
      serving_label TEXT NOT NULL,
      servings REAL NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      logged_at INTEGER NOT NULL
    );
  `);

  const goals = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM nutrition_goals WHERE id = 1",
  );
  if (!goals) {
    await db.runAsync(
      `INSERT INTO nutrition_goals (id, calories, protein, carbs, fat, updated_at)
       VALUES (1, ?, ?, ?, ?, ?)`,
      DEFAULT_GOALS.calories,
      DEFAULT_GOALS.protein,
      DEFAULT_GOALS.carbs,
      DEFAULT_GOALS.fat,
      Date.now(),
    );
  }
}

export async function loadNutritionGoals() {
  const db = await dbPromise;
  const row = await db.getFirstAsync<MacroTotals>(
    "SELECT calories, protein, carbs, fat FROM nutrition_goals WHERE id = 1",
  );
  return row ?? DEFAULT_GOALS;
}

export async function saveNutritionGoals(goals: NutritionGoals) {
  const db = await dbPromise;
  await db.runAsync(
    `INSERT INTO nutrition_goals (id, calories, protein, carbs, fat, updated_at)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       calories = excluded.calories,
       protein = excluded.protein,
       carbs = excluded.carbs,
       fat = excluded.fat,
       updated_at = excluded.updated_at`,
    cleanNumber(goals.calories),
    cleanNumber(goals.protein),
    cleanNumber(goals.carbs),
    cleanNumber(goals.fat),
    Date.now(),
  );
}

export async function loadCustomFoods() {
  const db = await dbPromise;
  const rows = await db.getAllAsync<CustomFoodRow>(
    `SELECT id, name, serving_label, calories, protein, carbs, fat, notes, created_at, updated_at
     FROM custom_foods
     ORDER BY updated_at DESC, name ASC`,
  );
  return rows.map(parseCustomFood);
}

export async function createCustomFood(input: CreateCustomFoodInput) {
  const db = await dbPromise;
  const now = Date.now();
  const id = createId("food");
  await db.runAsync(
    `INSERT INTO custom_foods
      (id, name, serving_label, calories, protein, carbs, fat, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name.trim() || "Untitled food",
    input.servingLabel.trim() || "1 serving",
    cleanNumber(input.calories),
    cleanNumber(input.protein),
    cleanNumber(input.carbs),
    cleanNumber(input.fat),
    input.notes?.trim() || null,
    now,
    now,
  );
  return id;
}

export async function loadRecipes() {
  const db = await dbPromise;
  const rows = await db.getAllAsync<RecipeRow>(
    `SELECT r.id, r.name, r.servings_made, r.notes, r.active_version_id, r.created_at, r.updated_at,
            rv.calories, rv.protein, rv.carbs, rv.fat
     FROM recipes r
     JOIN recipe_versions rv ON rv.id = r.active_version_id
     ORDER BY r.updated_at DESC, r.name ASC`,
  );

  return Promise.all(rows.map((row) => loadRecipeFromRow(row)));
}

export async function loadRecipeById(recipeId: string) {
  const db = await dbPromise;
  const row = await db.getFirstAsync<RecipeRow>(
    `SELECT r.id, r.name, r.servings_made, r.notes, r.active_version_id, r.created_at, r.updated_at,
            rv.calories, rv.protein, rv.carbs, rv.fat
     FROM recipes r
     JOIN recipe_versions rv ON rv.id = r.active_version_id
     WHERE r.id = ?`,
    recipeId,
  );
  return row ? loadRecipeFromRow(row) : null;
}

export async function createRecipe(input: CreateRecipeInput) {
  const db = await dbPromise;
  const recipeId = createId("recipe");
  const now = Date.now();

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO recipes (id, name, servings_made, notes, active_version_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
      recipeId,
      input.name.trim() || "Untitled recipe",
      Math.max(1, cleanNumber(input.servingsMade)),
      input.notes?.trim() || null,
      now,
      now,
    );

    const versionId = await createRecipeVersion(txn, recipeId, input, 1);
    await txn.runAsync(
      "UPDATE recipes SET active_version_id = ? WHERE id = ?",
      versionId,
      recipeId,
    );
  });

  return recipeId;
}

export async function recipeHasLoggedEntries(recipeId: string) {
  const db = await dbPromise;
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM food_logs WHERE source_type = 'recipe' AND source_id = ?",
    recipeId,
  );
  return (row?.count ?? 0) > 0;
}

export async function updateRecipe(
  recipeId: string,
  input: CreateRecipeInput,
  mode: "update-history" | "future-only",
) {
  const db = await dbPromise;
  const now = Date.now();

  await db.withExclusiveTransactionAsync(async (txn) => {
    const latest = await txn.getFirstAsync<{ version_number: number }>(
      "SELECT MAX(version_number) as version_number FROM recipe_versions WHERE recipe_id = ?",
      recipeId,
    );
    const nextVersionNumber =
      mode === "future-only" ? (latest?.version_number ?? 0) + 1 : (latest?.version_number ?? 1);
    const versionId = await createRecipeVersion(
      txn,
      recipeId,
      input,
      nextVersionNumber,
    );

    await txn.runAsync(
      `UPDATE recipes
       SET name = ?, servings_made = ?, notes = ?, active_version_id = ?, updated_at = ?
       WHERE id = ?`,
      input.name.trim() || "Untitled recipe",
      Math.max(1, cleanNumber(input.servingsMade)),
      input.notes?.trim() || null,
      versionId,
      now,
      recipeId,
    );

    if (mode === "update-history") {
      const version = await txn.getFirstAsync<MacroTotals>(
        "SELECT calories, protein, carbs, fat FROM recipe_versions WHERE id = ?",
        versionId,
      );
      if (version) {
        const logs = await txn.getAllAsync<{ id: string; servings: number }>(
          "SELECT id, servings FROM food_logs WHERE source_type = 'recipe' AND source_id = ?",
          recipeId,
        );
        for (const log of logs) {
          await txn.runAsync(
            `UPDATE food_logs
             SET source_version_id = ?, name = ?, serving_label = ?, calories = ?, protein = ?, carbs = ?, fat = ?
             WHERE id = ?`,
            versionId,
            input.name.trim() || "Untitled recipe",
            "1 serving",
            version.calories * log.servings,
            version.protein * log.servings,
            version.carbs * log.servings,
            version.fat * log.servings,
            log.id,
          );
        }
      }
    }
  });
}

export async function loadNutritionDay(dateKey: string): Promise<NutritionDay> {
  const [goals, entries] = await Promise.all([
    loadNutritionGoals(),
    loadFoodLogs(dateKey),
  ]);
  const meals = Object.fromEntries(
    MEALS.map((meal) => [
      meal.key,
      entries.filter((entry) => entry.meal === meal.key),
    ]),
  ) as NutritionDay["meals"];
  const totals = entries.reduce((sum, entry) => addTotals(sum, entry.totals), zeroTotals());

  return {
    dateKey,
    goals,
    totals,
    meals,
    status: getDayStatus(totals.calories, goals.calories),
  };
}

export async function loadFoodLogs(dateKey: string) {
  const db = await dbPromise;
  const rows = await db.getAllAsync<FoodLogRow>(
    `SELECT id, date_key, meal, source_type, source_id, source_version_id, name,
            serving_label, servings, calories, protein, carbs, fat, logged_at
     FROM food_logs
     WHERE date_key = ?
     ORDER BY logged_at ASC`,
    dateKey,
  );
  return rows.map(parseFoodLog);
}

export async function logFood(input: LogFoodInput) {
  const db = await dbPromise;
  const id = createId("food-log");
  const servings = Math.max(0.01, cleanNumber(input.servings));

  if (input.sourceType === "food") {
    const food = await db.getFirstAsync<CustomFoodRow>(
      `SELECT id, name, serving_label, calories, protein, carbs, fat, notes, created_at, updated_at
       FROM custom_foods
       WHERE id = ?`,
      input.sourceId,
    );
    if (!food) throw new Error("Food not found.");
    const parsed = parseCustomFood(food);
    await insertFoodLog(db, id, input, servings, {
      name: parsed.name,
      servingLabel: parsed.servingLabel,
      sourceVersionId: null,
      totals: multiplyTotals(parsed, servings),
    });
    return id;
  }

  const recipe = await loadRecipeById(input.sourceId);
  if (!recipe) throw new Error("Recipe not found.");
  await insertFoodLog(db, id, input, servings, {
    name: recipe.name,
    servingLabel: "1 serving",
    sourceVersionId: recipe.activeVersionId,
    totals: multiplyTotals(recipe.perServing, servings),
  });
  return id;
}

export async function deleteFoodLog(logId: string) {
  const db = await dbPromise;
  await db.runAsync("DELETE FROM food_logs WHERE id = ?", logId);
}

export async function updateFoodLogServings(logId: string, servings: number) {
  const db = await dbPromise;
  const row = await db.getFirstAsync<FoodLogRow>(
    `SELECT id, date_key, meal, source_type, source_id, source_version_id, name,
            serving_label, servings, calories, protein, carbs, fat, logged_at
     FROM food_logs
     WHERE id = ?`,
    logId,
  );
  if (!row) return;

  const nextServings = Math.max(0.01, cleanNumber(servings));
  const multiplier = nextServings / Math.max(0.01, row.servings);
  await db.runAsync(
    `UPDATE food_logs
     SET servings = ?, calories = ?, protein = ?, carbs = ?, fat = ?
     WHERE id = ?`,
    nextServings,
    row.calories * multiplier,
    row.protein * multiplier,
    row.carbs * multiplier,
    row.fat * multiplier,
    logId,
  );
}

async function insertFoodLog(
  db: SQLite.SQLiteDatabase,
  id: string,
  input: LogFoodInput,
  servings: number,
  snapshot: {
    name: string;
    servingLabel: string;
    sourceVersionId: string | null;
    totals: MacroTotals;
  },
) {
  await db.runAsync(
    `INSERT INTO food_logs
      (id, date_key, meal, source_type, source_id, source_version_id, name, serving_label,
       servings, calories, protein, carbs, fat, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.dateKey,
    input.meal,
    input.sourceType,
    input.sourceId,
    snapshot.sourceVersionId,
    snapshot.name,
    snapshot.servingLabel,
    servings,
    snapshot.totals.calories,
    snapshot.totals.protein,
    snapshot.totals.carbs,
    snapshot.totals.fat,
    Date.now(),
  );
}

async function createRecipeVersion(
  txn: SQLite.SQLiteDatabase,
  recipeId: string,
  input: CreateRecipeInput,
  versionNumber: number,
) {
  const versionId = createId("recipe-version");
  const servingsMade = Math.max(1, cleanNumber(input.servingsMade));
  const foods = await loadFoodsForIngredients(txn, input.ingredients);
  const totals = foods.reduce((sum, ingredient) => addTotals(sum, ingredient.totals), zeroTotals());
  const perServing = divideTotals(totals, servingsMade);
  const now = Date.now();

  await txn.runAsync(
    `INSERT INTO recipe_versions
      (id, recipe_id, version_number, name, servings_made, calories, protein, carbs, fat, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    versionId,
    recipeId,
    versionNumber,
    input.name.trim() || "Untitled recipe",
    servingsMade,
    perServing.calories,
    perServing.protein,
    perServing.carbs,
    perServing.fat,
    now,
  );

  for (const [index, ingredient] of foods.entries()) {
    await txn.runAsync(
      `INSERT INTO recipe_ingredients
        (id, recipe_version_id, food_id, food_name, serving_label, servings, calories, protein, carbs, fat, ingredient_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      createId("recipe-ingredient"),
      versionId,
      ingredient.foodId,
      ingredient.foodName,
      ingredient.servingLabel,
      ingredient.servings,
      ingredient.totals.calories,
      ingredient.totals.protein,
      ingredient.totals.carbs,
      ingredient.totals.fat,
      index,
    );
  }

  return versionId;
}

async function loadFoodsForIngredients(
  txn: SQLite.SQLiteDatabase,
  ingredients: RecipeIngredientInput[],
) {
  const rows: RecipeIngredient[] = [];
  for (const ingredient of ingredients.filter((item) => item.foodId)) {
    const food = await txn.getFirstAsync<CustomFoodRow>(
      `SELECT id, name, serving_label, calories, protein, carbs, fat, notes, created_at, updated_at
       FROM custom_foods
       WHERE id = ?`,
      ingredient.foodId,
    );
    if (!food) continue;
    const parsed = parseCustomFood(food);
    const servings = Math.max(0.01, cleanNumber(ingredient.servings));
    rows.push({
      id: createId("ingredient-input"),
      foodId: parsed.id,
      foodName: parsed.name,
      servingLabel: parsed.servingLabel,
      servings,
      totals: multiplyTotals(parsed, servings),
    });
  }
  return rows;
}

async function loadRecipeFromRow(row: RecipeRow): Promise<Recipe> {
  const db = await dbPromise;
  const ingredients = await db.getAllAsync<RecipeIngredientRow>(
    `SELECT id, food_id, food_name, serving_label, servings, calories, protein, carbs, fat
     FROM recipe_ingredients
     WHERE recipe_version_id = ?
     ORDER BY ingredient_order ASC`,
    row.active_version_id,
  );
  const perServing = {
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
  };
  return {
    id: row.id,
    name: row.name,
    servingsMade: row.servings_made,
    notes: row.notes ?? "",
    activeVersionId: row.active_version_id,
    totals: multiplyTotals(perServing, row.servings_made),
    perServing,
    ingredients: ingredients.map(parseRecipeIngredient),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseCustomFood(row: CustomFoodRow): CustomFood {
  return {
    id: row.id,
    name: row.name,
    servingLabel: row.serving_label,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseRecipeIngredient(row: RecipeIngredientRow): RecipeIngredient {
  return {
    id: row.id,
    foodId: row.food_id,
    foodName: row.food_name,
    servingLabel: row.serving_label,
    servings: row.servings,
    totals: {
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
    },
  };
}

function parseFoodLog(row: FoodLogRow): FoodLogEntry {
  return {
    id: row.id,
    dateKey: row.date_key,
    meal: row.meal as MealType,
    sourceType: row.source_type as FoodLogSourceType,
    sourceId: row.source_id,
    sourceVersionId: row.source_version_id ?? undefined,
    name: row.name,
    servingLabel: row.serving_label,
    servings: row.servings,
    totals: {
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
    },
    loggedAt: row.logged_at,
  };
}

function getDayStatus(calories: number, goal: number) {
  if (calories <= 0) return "none";
  if (goal > 0 && calories > goal) return "over";
  if (goal > 0 && calories >= goal * 0.9) return "on-track";
  return "under";
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

function divideTotals(totals: MacroTotals, divisor: number): MacroTotals {
  return multiplyTotals(totals, 1 / Math.max(1, divisor));
}

function zeroTotals(): MacroTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function cleanNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type CustomFoodRow = {
  id: string;
  name: string;
  serving_label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
};

type RecipeRow = {
  id: string;
  name: string;
  servings_made: number;
  notes: string | null;
  active_version_id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: number;
  updated_at: number;
};

type RecipeIngredientRow = {
  id: string;
  food_id: string;
  food_name: string;
  serving_label: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type FoodLogRow = {
  id: string;
  date_key: string;
  meal: string;
  source_type: string;
  source_id: string;
  source_version_id: string | null;
  name: string;
  serving_label: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: number;
};
