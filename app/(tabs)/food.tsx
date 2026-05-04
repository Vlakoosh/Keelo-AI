import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { BottomPopup } from "@/components/bottom-popup";
import { PageHeader } from "@/components/page-header";
import { PrimaryButton } from "@/components/primary-button";
import { EmptyState, StatTile, Tile } from "@/components/ui";
import {
  addDays,
  formatDayLabel,
  formatMonthDay,
  toDateKey,
} from "@/features/nutrition/date-utils";
import {
  deleteFoodLog,
  initializeNutritionStorage,
  loadNutritionDay,
  saveNutritionGoals,
  updateFoodLogServings,
} from "@/features/nutrition/storage";
import {
  MEALS,
  type FoodLogEntry,
  type MacroTotals,
  type MealType,
  type NutritionDay,
  type NutritionDayStatus,
  type NutritionGoals,
} from "@/features/nutrition/types";
import { useAppTheme } from "@/theme/theme-provider";

type Sheet =
  | { type: "none" }
  | { type: "goals" }
  | { type: "meal"; meal: MealType }
  | { type: "edit-log"; meal: MealType; entry: FoodLogEntry };

const todayKey = () => toDateKey(new Date());

export default function FoodScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { theme } = useAppTheme();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [day, setDay] = useState<NutritionDay | null>(null);
  const [week, setWeek] = useState<NutritionDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheet, setSheet] = useState<Sheet>({ type: "none" });

  async function refresh(nextDate = selectedDate) {
    await initializeNutritionStorage();
    const dates = Array.from({ length: 7 }, (_, index) =>
      addDays(nextDate, index - 3),
    );
    const [nextDay, nextWeek] = await Promise.all([
      loadNutritionDay(nextDate),
      Promise.all(dates.map(loadNutritionDay)),
    ]);
    setDay(nextDay);
    setWeek(nextWeek);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!isFocused) return;
    void refresh(selectedDate).catch((error) => {
      console.error(error);
      setIsLoading(false);
    });
  }, [isFocused, selectedDate]);

  if (isLoading || !day) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.canvas }}
      >
        <Text className="text-lg font-semibold" style={{ color: theme.text }}>
          Loading nutrition...
        </Text>
      </View>
    );
  }

  const left = day.goals.calories - day.totals.calories;
  const calorieCopy =
    left >= 0
      ? `${round(left)} kcal left`
      : `${round(Math.abs(left))} kcal over`;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.canvas }}>
      <PageHeader
        title="Nutrition"
        subtitle={formatMonthDay(selectedDate)}
        rightSlot={
          <Pressable
            onPress={() => setSheet({ type: "goals" })}
            className="px-1 py-2"
          >
            <Text
              className="text-base font-semibold"
              style={{ color: theme.primaryAccent }}
            >
              Goals
            </Text>
          </Pressable>
        }
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-2"
      >
        <DateSlider
          week={week}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />

        <Tile variant={left < 0 ? "warning" : "accent"} className="p-5">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.textMuted }}
              >
                Daily calories
              </Text>
              <Text
                className="mt-3 text-5xl font-semibold"
                style={{ color: theme.text }}
              >
                {round(day.totals.calories)}
              </Text>
              <Text className="mt-1 text-base" style={{ color: theme.textSecondary }}>
                eaten of {round(day.goals.calories)} kcal
              </Text>
            </View>
            <View
              className="items-center justify-center rounded-full px-4 py-3"
              style={{
                backgroundColor: left < 0 ? theme.warningSoft : theme.card,
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: left < 0 ? theme.warning : theme.primaryAccent }}
              >
                {calorieCopy}
              </Text>
            </View>
          </View>
          <ProgressBar
            value={day.totals.calories}
            target={day.goals.calories}
            warning={left < 0}
          />
        </Tile>

        <View className="flex-row gap-3">
          <StatTile label="Carbs" value={`${round(day.totals.carbs)}g`} icon="leaf-outline" />
          <StatTile label="Protein" value={`${round(day.totals.protein)}g`} icon="fish-outline" />
          <StatTile label="Fat" value={`${round(day.totals.fat)}g`} icon="water-outline" />
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold" style={{ color: theme.text }}>
              Meals
            </Text>
            <Text className="text-sm" style={{ color: theme.textMuted }}>
              {MEALS.reduce((count, meal) => count + day.meals[meal.key].length, 0)} entries
            </Text>
          </View>
          {MEALS.map((meal) => (
            <MealTile
              key={meal.key}
              meal={meal.key}
              label={meal.label}
              entries={day.meals[meal.key]}
              onPress={() => setSheet({ type: "meal", meal: meal.key })}
            />
          ))}
        </View>
      </ScrollView>

      <BottomPopup
        visible={sheet.type !== "none"}
        title={
          sheet.type === "goals"
            ? "Nutrition goals"
            : sheet.type === "edit-log"
              ? "Edit log"
              : sheet.type === "meal"
                ? mealLabel(sheet.meal)
                : ""
        }
        onClose={() => setSheet({ type: "none" })}
      >
        {sheet.type === "goals" ? (
          <GoalsForm
            current={day.goals}
            onSaved={async () => {
              await refresh(selectedDate);
              setSheet({ type: "none" });
            }}
          />
        ) : null}
        {sheet.type === "meal" ? (
          <MealSheet
            meal={sheet.meal}
            entries={day.meals[sheet.meal]}
            onLogFood={() => {
              setSheet({ type: "none" });
              router.push({
                pathname: "/food/log",
                params: { dateKey: selectedDate, meal: sheet.meal },
              });
            }}
            onEdit={(entry) =>
              setSheet({ type: "edit-log", meal: sheet.meal, entry })
            }
            onDelete={async (entryId) => {
              await deleteFoodLog(entryId);
              await refresh(selectedDate);
            }}
          />
        ) : null}
        {sheet.type === "edit-log" ? (
          <EditLogForm
            entry={sheet.entry}
            onSaved={async () => {
              await refresh(selectedDate);
              setSheet({ type: "meal", meal: sheet.meal });
            }}
          />
        ) : null}
      </BottomPopup>
    </View>
  );
}

function DateSlider({
  week,
  selectedDate,
  onSelect,
}: {
  week: NutritionDay[];
  selectedDate: string;
  onSelect: (dateKey: string) => void;
}) {
  const { theme } = useAppTheme();
  return (
    <Tile className="p-2">
      <View className="flex-row gap-2">
        {week.map((day) => {
          const selected = day.dateKey === selectedDate;
          return (
            <Pressable
              key={day.dateKey}
              onPress={() => onSelect(day.dateKey)}
              className="flex-1 items-center justify-center rounded-card py-3"
              style={{
                backgroundColor: selected ? theme.primaryAccent : theme.transparent,
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: selected ? theme.textOnAccent : theme.textMuted }}
              >
                {formatDayLabel(day.dateKey)}
              </Text>
              <Text
                className="mt-1 text-base font-semibold"
                style={{ color: selected ? theme.textOnAccent : theme.text }}
              >
                {day.dateKey.slice(-2)}
              </Text>
              <Ionicons
                name={statusIcon(day.status)}
                size={16}
                color={
                  selected ? theme.textOnAccent : statusColor(theme, day.status)
                }
                style={{ marginTop: 6 }}
              />
            </Pressable>
          );
        })}
      </View>
    </Tile>
  );
}

function MealTile({
  meal,
  label,
  entries,
  onPress,
}: {
  meal: MealType;
  label: string;
  entries: FoodLogEntry[];
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const totals = entries.reduce(
    (sum, entry) => addTotals(sum, entry.totals),
    zeroTotals(),
  );
  return (
    <Pressable onPress={onPress}>
      <Tile className="p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-3">
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: mealColor(theme, meal).soft }}
              >
                <Ionicons
                  name={mealIcon(meal)}
                  size={19}
                  color={mealColor(theme, meal).strong}
                />
              </View>
              <View>
                <Text className="text-base font-semibold" style={{ color: theme.text }}>
                  {label}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                  {entries.length
                    ? `${entries.length} item${entries.length === 1 ? "" : "s"}`
                    : "No foods logged"}
                </Text>
              </View>
            </View>
            {entries.length ? (
              <Text
                numberOfLines={1}
                className="mt-3 text-sm"
                style={{ color: theme.textSecondary }}
              >
                {entries.map((entry) => entry.name).join(", ")}
              </Text>
            ) : null}
          </View>
          <View className="items-end">
            <Text className="text-xl font-semibold" style={{ color: theme.text }}>
              {round(totals.calories)}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: theme.textMuted }}>
              kcal
            </Text>
          </View>
        </View>
      </Tile>
    </Pressable>
  );
}

function MealSheet({
  meal,
  entries,
  onLogFood,
  onEdit,
  onDelete,
}: {
  meal: MealType;
  entries: FoodLogEntry[];
  onLogFood: () => void;
  onEdit: (entry: FoodLogEntry) => void;
  onDelete: (entryId: string) => void;
}) {
  const { theme } = useAppTheme();
  const totals = entries.reduce(
    (sum, entry) => addTotals(sum, entry.totals),
    zeroTotals(),
  );
  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <StatTile label="Calories" value={`${round(totals.calories)}`} />
        <StatTile label="Protein" value={`${round(totals.protein)}g`} />
      </View>
      {entries.length ? (
        <View className="gap-3">
          {entries.map((entry) => (
            <Tile key={entry.id} variant="muted" className="p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-base font-semibold" style={{ color: theme.text }}>
                    {entry.name}
                  </Text>
                  <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                    {fmtServing(entry.servings)} x {entry.servingLabel}
                  </Text>
                  <Text className="mt-2 text-sm" style={{ color: theme.textSecondary }}>
                    {round(entry.totals.calories)} kcal · P {round(entry.totals.protein)}g · C {round(entry.totals.carbs)}g · F {round(entry.totals.fat)}g
                  </Text>
                </View>
                <Pressable
                  onPress={() => onEdit(entry)}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.card }}
                >
                  <Ionicons name="create-outline" size={17} color={theme.icon} />
                </Pressable>
                <Pressable
                  onPress={() => onDelete(entry.id)}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.destructiveSoft }}
                >
                  <Ionicons name="trash-outline" size={17} color={theme.destructive} />
                </Pressable>
              </View>
            </Tile>
          ))}
        </View>
      ) : (
        <EmptyState
          title={`No ${mealLabel(meal).toLowerCase()} yet`}
          description="Log a food or recipe from your food list."
          icon={mealIcon(meal)}
        />
      )}
      <PrimaryButton label="Log Food" onPress={onLogFood} />
    </View>
  );
}

function GoalsForm({
  current,
  onSaved,
}: {
  current: NutritionGoals;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<Record<keyof NutritionGoals, string>>({
    calories: String(round(current.calories)),
    protein: String(round(current.protein)),
    carbs: String(round(current.carbs)),
    fat: String(round(current.fat)),
  });
  return (
    <View className="gap-4">
      <InputField label="Calories" value={form.calories} onChangeText={(value) => setForm({ ...form, calories: value })} keyboardType="decimal-pad" />
      <InputField label="Protein grams" value={form.protein} onChangeText={(value) => setForm({ ...form, protein: value })} keyboardType="decimal-pad" />
      <InputField label="Carb grams" value={form.carbs} onChangeText={(value) => setForm({ ...form, carbs: value })} keyboardType="decimal-pad" />
      <InputField label="Fat grams" value={form.fat} onChangeText={(value) => setForm({ ...form, fat: value })} keyboardType="decimal-pad" />
      <PrimaryButton
        label="Save goals"
        onPress={async () => {
          await saveNutritionGoals({
            calories: toNumber(form.calories),
            protein: toNumber(form.protein),
            carbs: toNumber(form.carbs),
            fat: toNumber(form.fat),
          });
          await onSaved();
        }}
      />
    </View>
  );
}

function EditLogForm({
  entry,
  onSaved,
}: {
  entry: FoodLogEntry;
  onSaved: () => Promise<void>;
}) {
  const { theme } = useAppTheme();
  const [servings, setServings] = useState(String(entry.servings));
  return (
    <View className="gap-4">
      <Tile variant="muted" className="p-4">
        <Text className="text-base font-semibold" style={{ color: theme.text }}>
          {entry.name}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
          {entry.servingLabel}
        </Text>
      </Tile>
      <InputField
        label="Servings eaten"
        value={servings}
        onChangeText={setServings}
        keyboardType="decimal-pad"
      />
      <PrimaryButton
        label="Save entry"
        onPress={async () => {
          await updateFoodLogServings(entry.id, toNumber(servings, entry.servings));
          await onSaved();
        }}
      />
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

function ProgressBar({
  value,
  target,
  warning,
}: {
  value: number;
  target: number;
  warning: boolean;
}) {
  const { theme } = useAppTheme();
  const pct = Math.min(100, target > 0 ? (value / target) * 100 : 0);
  return (
    <View className="mt-5 h-3 overflow-hidden rounded-full" style={{ backgroundColor: theme.card }}>
      <View
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          backgroundColor: warning ? theme.warning : theme.primaryAccent,
        }}
      />
    </View>
  );
}

function statusIcon(status: NutritionDayStatus) {
  switch (status) {
    case "on-track":
      return "checkmark-circle";
    case "over":
      return "alert-circle";
    case "under":
      return "ellipse";
    default:
      return "ellipse-outline";
  }
}

function statusColor(
  theme: ReturnType<typeof useAppTheme>["theme"],
  status: NutritionDayStatus,
) {
  switch (status) {
    case "on-track":
      return theme.success;
    case "over":
      return theme.warning;
    case "under":
      return theme.info;
    default:
      return theme.iconMuted;
  }
}

function mealIcon(meal: MealType) {
  switch (meal) {
    case "breakfast":
      return "sunny-outline";
    case "lunch":
      return "restaurant-outline";
    case "dinner":
      return "moon-outline";
    case "snacks":
      return "cafe-outline";
  }
}

function mealColor(theme: ReturnType<typeof useAppTheme>["theme"], meal: MealType) {
  switch (meal) {
    case "breakfast":
      return { soft: theme.warningSoft, strong: theme.warning };
    case "lunch":
      return { soft: theme.successSoft, strong: theme.success };
    case "dinner":
      return { soft: theme.infoSoft, strong: theme.info };
    case "snacks":
      return { soft: theme.secondaryAccentSoft, strong: theme.secondaryAccent };
  }
}

function mealLabel(meal: MealType) {
  return MEALS.find((item) => item.key === meal)?.label ?? "Meal";
}

function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

function zeroTotals(): MacroTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function round(value: number) {
  return Math.round(value);
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fmtServing(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
