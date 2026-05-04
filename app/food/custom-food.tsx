import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { PageHeader } from "@/components/page-header";
import { PrimaryButton } from "@/components/primary-button";
import { Tile } from "@/components/ui";
import {
  createCustomFood,
  initializeNutritionStorage,
} from "@/features/nutrition/storage";
import { useAppTheme } from "@/theme/theme-provider";

export default function CustomFoodScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [step, setStep] = useState<"basics" | "macros">("basics");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [servingLabel, setServingLabel] = useState("1 serving");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  return (
    <View className="flex-1" style={{ backgroundColor: theme.canvas }}>
      <PageHeader
        title={step === "basics" ? "Create Food" : "Nutrition Label"}
        onBack={() => (step === "basics" ? router.back() : setStep("basics"))}
      />
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        {step === "basics" ? (
          <>
            <Tile className="gap-4 p-5">
              <InputField label="Food name" value={name} onChangeText={setName} />
              <InputField
                label="Calories"
                value={calories}
                onChangeText={setCalories}
                keyboardType="decimal-pad"
              />
              <InputField
                label="Serving size"
                value={servingLabel}
                onChangeText={setServingLabel}
              />
            </Tile>
            <PrimaryButton label="Next" onPress={() => setStep("macros")} />
          </>
        ) : (
          <>
            <Tile className="gap-4 p-5">
              <InputField
                label="Protein grams"
                value={protein}
                onChangeText={setProtein}
                keyboardType="decimal-pad"
              />
              <InputField
                label="Carb grams"
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="decimal-pad"
              />
              <InputField
                label="Fat grams"
                value={fat}
                onChangeText={setFat}
                keyboardType="decimal-pad"
              />
            </Tile>
            <PrimaryButton
              label="Save Food"
              onPress={async () => {
                await initializeNutritionStorage();
                await createCustomFood({
                  name,
                  servingLabel,
                  calories: toNumber(calories),
                  protein: toNumber(protein),
                  carbs: toNumber(carbs),
                  fat: toNumber(fat),
                });
                router.back();
              }}
            />
          </>
        )}
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

function toNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
