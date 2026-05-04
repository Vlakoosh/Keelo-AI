import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { BottomPopup } from "@/components/bottom-popup";
import { EmptyState, Tile } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { PrimaryButton } from "@/components/primary-button";
import {
  EXERCISE_EQUIPMENT_OPTIONS,
  MUSCLE_GROUP_OPTIONS,
} from "@/features/workout/exercise-catalog";
import { setPendingExerciseSelection } from "@/features/workout/add-exercise-bridge";
import {
  createCustomExercise,
  deleteCustomExercise,
  type ExerciseCatalogItem,
  initializeWorkoutStorage,
  loadExerciseFilters,
  loadRecentManualExercises,
  recordManualExerciseAdd,
  searchExerciseCatalog,
} from "@/features/workout/storage";
import { useAppTheme } from "@/theme/theme-provider";

type Sheet =
  | { type: "none" }
  | { type: "equipment" }
  | { type: "muscle" }
  | { type: "create" }
  | { type: "manage"; exercise: ExerciseCatalogItem };

const DEFAULT_CREATE_EQUIPMENT = "Dumbbell";
const DEFAULT_CREATE_MUSCLE = "Chest";

export default function AddExerciseScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [search, setSearch] = useState("");
  const [equipment, setEquipment] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>({ type: "none" });
  const [results, setResults] = useState<ExerciseCatalogItem[]>([]);
  const [recents, setRecents] = useState<ExerciseCatalogItem[]>([]);
  const [filters, setFilters] = useState<{
    equipment: string[];
    muscle: string[];
  }>({
    equipment: [],
    muscle: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingExercise, setIsSavingExercise] = useState(false);
  const [isDeletingExercise, setIsDeletingExercise] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEquipment, setCreateEquipment] = useState<string>(
    DEFAULT_CREATE_EQUIPMENT,
  );
  const [createPrimaryMuscle, setCreatePrimaryMuscle] = useState<string>(
    DEFAULT_CREATE_MUSCLE,
  );
  const [createSecondaryMuscles, setCreateSecondaryMuscles] = useState<
    string[]
  >([]);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      await initializeWorkoutStorage();
      const [nextFilters, nextRecents] = await Promise.all([
        loadExerciseFilters(),
        loadRecentManualExercises(),
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
      const nextResults = await searchExerciseCatalog(
        search,
        equipment ?? undefined,
        muscle ?? undefined,
      );
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
    [recents, results, showRecents],
  );

  async function refreshLibrary() {
    const [nextFilters, nextRecents, nextResults] = await Promise.all([
      loadExerciseFilters(),
      loadRecentManualExercises(),
      searchExerciseCatalog(
        search,
        equipment ?? undefined,
        muscle ?? undefined,
      ),
    ]);

    setFilters(nextFilters);
    setRecents(nextRecents);
    setResults(nextResults);
  }

  async function handleSelectExercise(exercise: ExerciseCatalogItem) {
    await recordManualExerciseAdd(exercise.id);
    setPendingExerciseSelection(exercise.id);
    router.back();
  }

  function resetCreateForm() {
    setCreateName("");
    setCreateEquipment(DEFAULT_CREATE_EQUIPMENT);
    setCreatePrimaryMuscle(DEFAULT_CREATE_MUSCLE);
    setCreateSecondaryMuscles([]);
  }

  async function handleCreateExercise() {
    if (!createName.trim()) {
      Alert.alert("Create exercise", "Add a name before saving.");
      return;
    }

    setIsSavingExercise(true);
    try {
      const exerciseId = await createCustomExercise({
        name: createName,
        equipment: createEquipment,
        primaryMuscle: createPrimaryMuscle,
        secondaryMuscles: createSecondaryMuscles,
      });

      await refreshLibrary();
      resetCreateForm();
      setSheet({ type: "none" });
      await handleSelectExercise({
        id: exerciseId,
        name: createName.trim(),
        equipment: createEquipment,
        muscle: createPrimaryMuscle,
        primaryMuscles: [createPrimaryMuscle],
        secondaryMuscles: createSecondaryMuscles,
        metadata: { global: false },
      });
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Create exercise",
        error instanceof Error
          ? error.message
          : "Unable to create that exercise right now.",
      );
    } finally {
      setIsSavingExercise(false);
    }
  }

  async function handleDeleteExercise(exercise: ExerciseCatalogItem) {
    setIsDeletingExercise(true);
    try {
      await deleteCustomExercise(exercise.id);
      await refreshLibrary();
      setSheet({ type: "none" });
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Delete exercise",
        error instanceof Error
          ? error.message
          : "Unable to delete that exercise right now.",
      );
    } finally {
      setIsDeletingExercise(false);
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.canvas }}>
      <PageHeader
        title="Add Exercise"
        onBack={() => router.back()}
        rightSlot={
          <Pressable
            onPress={() => {
              resetCreateForm();
              setSheet({ type: "create" });
            }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: theme.primaryAccent }}
            >
              Create
            </Text>
          </Pressable>
        }
      />
      <View className="px-5 pt-5">
        <View
          className="flex-row items-center gap-3 rounded-card px-4 py-3"
          style={{ backgroundColor: theme.card }}
        >
          <Ionicons name="search-outline" size={18} color={theme.iconMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises"
            placeholderTextColor={theme.textMuted}
            className="flex-1 py-0 text-base"
            style={{ color: theme.text }}
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
        <Text
          className="mb-4 text-lg font-semibold"
          style={{ color: theme.text }}
        >
          {showRecents ? "Recent Exercises" : "Results"}
        </Text>
        {isLoading ? (
          <Text className="text-sm" style={{ color: theme.textMuted }}>
            Loading exercises...
          </Text>
        ) : visibleExercises.length === 0 ? (
          <EmptyState
            title={showRecents ? "No recent exercises" : "No matching exercises"}
            description={
              showRecents
                ? "Your manually added exercises will show up here."
                : "Try a different search or filter combination."
            }
            icon="barbell-outline"
          />
        ) : (
          <View className="gap-3">
            {visibleExercises.map((exercise) => (
              <Tile
                key={exercise.id}
                className="flex-row items-center gap-4 p-4"
              >
                <Pressable
                  onPress={() => {
                    void handleSelectExercise(exercise);
                  }}
                  className="flex-1 flex-row items-center gap-4"
                >
                  <View
                    className="h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.cardMuted }}
                  >
                    <Ionicons
                      name="barbell-outline"
                      size={20}
                      color={theme.text}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.text }}
                    >
                      {exercise.name} ({exercise.equipment})
                    </Text>
                    <Text
                      className="mt-1 text-sm"
                      style={{ color: theme.textMuted }}
                    >
                      {exercise.primaryMuscles.join(", ")}
                    </Text>
                    {exercise.secondaryMuscles.length > 0 ? (
                      <Text
                        className="mt-1 text-xs"
                        style={{ color: theme.textMuted }}
                      >
                        Secondary: {exercise.secondaryMuscles.join(", ")}
                      </Text>
                    ) : null}
                    <Text
                      className="mt-1 text-xs"
                      style={{ color: theme.textMuted }}
                    >
                      {exercise.metadata.global ? "Built in" : "Custom"}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setSheet({ type: "manage", exercise })}
                  className="h-10 w-10 items-center justify-center"
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={18}
                    color={theme.text}
                  />
                </Pressable>
              </Tile>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomPopup
        visible={sheet.type !== "none"}
        title={
          sheet.type === "equipment"
            ? "Equipment"
            : sheet.type === "muscle"
              ? "Muscle"
              : sheet.type === "create"
                ? "Create Exercise"
                : sheet.type === "manage"
                  ? "Exercise Options"
                  : ""
        }
        subtitle={
          sheet.type === "create"
            ? "Keep the muscle groups broad so progress tracking stays simple."
            : sheet.type === "manage"
              ? sheet.exercise.metadata.global
                ? "Built-in exercises stay with the app and cannot be deleted."
                : "Custom exercises can be removed from the catalog."
              : undefined
        }
        onClose={() => setSheet({ type: "none" })}
      >
        {sheet.type === "equipment" ? (
          <SelectList
            options={filters.equipment}
            selected={equipment}
            onSelect={(value) => {
              setEquipment(value);
              setSheet({ type: "none" });
            }}
            onClear={() => {
              setEquipment(null);
              setSheet({ type: "none" });
            }}
          />
        ) : null}
        {sheet.type === "muscle" ? (
          <SelectList
            options={filters.muscle}
            selected={muscle}
            onSelect={(value) => {
              setMuscle(value);
              setSheet({ type: "none" });
            }}
            onClear={() => {
              setMuscle(null);
              setSheet({ type: "none" });
            }}
          />
        ) : null}
        {sheet.type === "create" ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-5 pb-2"
          >
            <View className="gap-2">
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.text }}
              >
                Exercise name
              </Text>
              <View
                className="rounded-card px-4 py-3"
                style={{ backgroundColor: theme.input }}
              >
                <TextInput
                  value={createName}
                  onChangeText={setCreateName}
                  placeholder="e.g. Cable Crunch"
                  placeholderTextColor={theme.textMuted}
                  className="py-0 text-base"
                  style={{ color: theme.text }}
                />
              </View>
            </View>

            <OptionGroup
              title="Equipment"
              options={[...EXERCISE_EQUIPMENT_OPTIONS]}
              selected={[createEquipment]}
              onToggle={(value) => setCreateEquipment(value)}
              singleSelect
            />

            <OptionGroup
              title="Primary muscle"
              options={[...MUSCLE_GROUP_OPTIONS]}
              selected={[createPrimaryMuscle]}
              onToggle={(value) => {
                setCreatePrimaryMuscle(value);
                setCreateSecondaryMuscles((current) =>
                  current.filter((item) => item !== value),
                );
              }}
              singleSelect
            />

            <OptionGroup
              title="Secondary muscles"
              options={[...MUSCLE_GROUP_OPTIONS].filter(
                (option) => option !== createPrimaryMuscle,
              )}
              selected={createSecondaryMuscles}
              onToggle={(value) =>
                setCreateSecondaryMuscles((current) =>
                  current.includes(value)
                    ? current.filter((item) => item !== value)
                    : [...current, value],
                )
              }
            />

            <PrimaryButton
              label={isSavingExercise ? "Saving..." : "Save and add"}
              onPress={() => {
                if (!isSavingExercise) {
                  void handleCreateExercise();
                }
              }}
            />
          </ScrollView>
        ) : null}
        {sheet.type === "manage" ? (
          <View className="gap-5">
            <View className="gap-2">
              <Text
                className="text-lg font-semibold"
                style={{ color: theme.text }}
              >
                {sheet.exercise.name} ({sheet.exercise.equipment})
              </Text>
              <Text className="text-sm" style={{ color: theme.muted }}>
                Primary: {sheet.exercise.primaryMuscles.join(", ")}
              </Text>
              <Text className="text-sm" style={{ color: theme.muted }}>
                Secondary:{" "}
                {sheet.exercise.secondaryMuscles.length > 0
                  ? sheet.exercise.secondaryMuscles.join(", ")
                  : "None"}
              </Text>
              <Text className="text-sm" style={{ color: theme.muted }}>
                Type: {sheet.exercise.metadata.global ? "Built in" : "Custom"}
              </Text>
            </View>

            {sheet.exercise.metadata.global ? (
              <PrimaryButton
                label="Keep exercise"
                variant="secondary"
                onPress={() => setSheet({ type: "none" })}
              />
            ) : (
              <PrimaryButton
                label={
                  isDeletingExercise ? "Deleting..." : "Delete custom exercise"
                }
                variant="danger"
                onPress={() => {
                  if (isDeletingExercise) {
                    return;
                  }

                  Alert.alert(
                    "Delete exercise",
                    `Delete ${sheet.exercise.name} (${sheet.exercise.equipment}) from the catalog?`,
                    [
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          void handleDeleteExercise(sheet.exercise);
                        },
                      },
                    ],
                  );
                }}
              />
            )}
          </View>
        ) : null}
      </BottomPopup>
    </View>
  );
}

function SelectList({
  options,
  selected,
  onSelect,
  onClear,
}: {
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <View className="gap-3">
      <FilterOption label="All" active={selected === null} onPress={onClear} />
      {options.map((option) => (
        <FilterOption
          key={option}
          label={option}
          active={selected === option}
          onPress={() => onSelect(option)}
        />
      ))}
    </View>
  );
}

function OptionGroup({
  title,
  options,
  selected,
  onToggle,
  singleSelect = false,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  singleSelect?: boolean;
}) {
  const { theme } = useAppTheme();

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold" style={{ color: theme.text }}>
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => onToggle(option)}
              className="rounded-card px-4 py-3"
              style={{
                backgroundColor: active ? theme.primaryAccent : theme.cardMuted,
                minWidth: singleSelect ? "48%" : undefined,
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: active ? theme.textOnAccent : theme.text }}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FilterButton({
  label,
  onPress,
  active,
}: {
  label: string;
  onPress: () => void;
  active: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      className="rounded-card px-4 py-3"
      style={{
        backgroundColor: active ? theme.primaryAccent : theme.card,
      }}
    >
      <Text className="text-sm font-semibold" style={{ color: active ? theme.textOnAccent : theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      className="rounded-card px-4 py-4"
      style={{
        backgroundColor: active ? theme.primaryAccent : theme.cardMuted,
      }}
    >
      <Text className="text-sm font-semibold" style={{ color: active ? theme.textOnAccent : theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
