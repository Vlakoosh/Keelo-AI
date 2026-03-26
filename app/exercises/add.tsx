import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { BottomPopup } from "@/components/bottom-popup";
import { PageHeader } from "@/components/page-header";
import { setPendingExerciseSelection } from "@/features/workout/add-exercise-bridge";
import {
  type ExerciseCatalogItem,
  initializeWorkoutStorage,
  loadExerciseFilters,
  loadRecentManualExercises,
  recordManualExerciseAdd,
  searchExerciseCatalog
} from "@/features/workout/storage";

type FilterSheet =
  | { type: "none" }
  | { type: "equipment" }
  | { type: "muscle" };

export default function AddExerciseScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [equipment, setEquipment] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [sheet, setSheet] = useState<FilterSheet>({ type: "none" });
  const [results, setResults] = useState<ExerciseCatalogItem[]>([]);
  const [recents, setRecents] = useState<ExerciseCatalogItem[]>([]);
  const [filters, setFilters] = useState<{ equipment: string[]; muscle: string[] }>({
    equipment: [],
    muscle: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      await initializeWorkoutStorage();
      const [nextFilters, nextRecents] = await Promise.all([
        loadExerciseFilters(),
        loadRecentManualExercises()
      ]);

      if (!active) {
        return;
      }

      setFilters(nextFilters);
      setRecents(nextRecents);
      setIsLoading(false);
    }

    void loadInitialData().catch((error) => {
      console.error(error);
      if (active) {
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadResults() {
      const nextResults = await searchExerciseCatalog(search, equipment ?? undefined, muscle ?? undefined);
      if (active) {
        setResults(nextResults);
      }
    }

    void loadResults().catch((error) => console.error(error));

    return () => {
      active = false;
    };
  }, [equipment, muscle, search]);

  const showRecents = search.trim().length === 0 && !equipment && !muscle;
  const visibleExercises = useMemo(
    () => (showRecents ? recents : results),
    [recents, results, showRecents]
  );

  async function handleSelectExercise(exercise: ExerciseCatalogItem) {
    await recordManualExerciseAdd(exercise.id);
    setPendingExerciseSelection(exercise.id);
    router.back();
  }

  return (
    <View className="flex-1 bg-background">
      <PageHeader
        title="Add Exercise"
        onBack={() => router.back()}
        rightSlot={
          <Pressable onPress={() => Alert.alert("Create exercise", "Custom exercise creation is next.")}>
            <Text className="text-base font-semibold text-text">Create</Text>
          </Pressable>
        }
      />
      <View className="px-5 pt-5">
        <View className="flex-row items-center gap-3 border-b border-border pb-3">
          <Ionicons name="search-outline" size={18} color="#A3A3A3" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises"
            placeholderTextColor="#737373"
            className="flex-1 py-0 text-base text-text"
          />
        </View>
        <View className="mt-4 flex-row gap-3">
          <FilterButton
            label={equipment ? `Equipment: ${equipment}` : "Equipment"}
            onPress={() => setSheet({ type: "equipment" })}
            active={Boolean(equipment)}
          />
          <FilterButton
            label={muscle ? `Muscle: ${muscle}` : "Muscle"}
            onPress={() => setSheet({ type: "muscle" })}
            active={Boolean(muscle)}
          />
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-6">
        <Text className="mb-4 text-lg font-semibold text-text">
          {showRecents ? "Recent Exercises" : "Results"}
        </Text>
        {isLoading ? (
          <Text className="text-sm text-muted">Loading exercises...</Text>
        ) : visibleExercises.length === 0 ? (
          <Text className="text-sm leading-6 text-muted">
            {showRecents
              ? "Your manually added exercises will show up here."
              : "No exercises match that search yet."}
          </Text>
        ) : (
          <View className="gap-1">
            {visibleExercises.map((exercise) => (
              <Pressable
                key={exercise.id}
                onPress={() => {
                  void handleSelectExercise(exercise);
                }}
                className="flex-row items-center gap-4 border-b border-border py-4"
              >
                <View className="h-12 w-12 items-center justify-center rounded-full border border-border">
                  <Ionicons name="barbell-outline" size={20} color="#FAFAFA" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-text">
                    {exercise.name} {exercise.equipment === "Bodyweight" ? "" : `(${exercise.equipment})`}
                  </Text>
                  <Text className="mt-1 text-sm text-muted">{exercise.muscle}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomPopup
        visible={sheet.type !== "none"}
        title={sheet.type === "equipment" ? "Equipment" : "Muscle"}
        onClose={() => setSheet({ type: "none" })}
      >
        <View className="gap-3">
          <FilterOption
            label="All"
            active={(sheet.type === "equipment" ? equipment : muscle) === null}
            onPress={() => {
              if (sheet.type === "equipment") {
                setEquipment(null);
              }
              if (sheet.type === "muscle") {
                setMuscle(null);
              }
              setSheet({ type: "none" });
            }}
          />
          {(sheet.type === "equipment" ? filters.equipment : filters.muscle).map((option) => (
            <FilterOption
              key={option}
              label={option}
              active={(sheet.type === "equipment" ? equipment : muscle) === option}
              onPress={() => {
                if (sheet.type === "equipment") {
                  setEquipment(option);
                }
                if (sheet.type === "muscle") {
                  setMuscle(option);
                }
                setSheet({ type: "none" });
              }}
            />
          ))}
        </View>
      </BottomPopup>
    </View>
  );
}

function FilterButton({
  label,
  onPress,
  active
}: {
  label: string;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-card border px-4 py-3 ${active ? "border-white" : "border-white"}`}
    >
      <Text className="text-sm font-semibold text-text">{label}</Text>
    </Pressable>
  );
}

function FilterOption({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-card border px-4 py-4 ${active ? "border-white bg-surface" : "border-white"}`}
    >
      <Text className="text-sm font-semibold text-text">{label}</Text>
    </Pressable>
  );
}
