export type SetType = "normal" | "failure" | "warmup" | "drop";
export type WeightUnit = "kg" | "lb";

export type WorkoutSet = {
  id: string;
  type: SetType;
  previous: string;
  enteredWeight: string;
  reps: string;
  weightPlaceholder?: string;
  repsPlaceholder?: string;
  completed: boolean;
  unit: WeightUnit;
  pulleyMultiplier: 1 | 0.5;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  routineNotes: string;
  sessionNotes: string;
  restTimerSeconds: number;
  benchmarks: {
    bestWeight: number;
    bestVolume: number;
    bestPr: number;
  };
  sets: WorkoutSet[];
};

export type WorkoutRoutine = {
  id: string;
  name: string;
  description?: string;
  exercisePreview: string[];
  exercises: WorkoutExercise[];
};

export type WorkoutSession = {
  id: string;
  name: string;
  sourceRoutineId?: string;
  startedAt: number;
  durationOverrideSeconds?: number;
  exercises: WorkoutExercise[];
  notes: string;
};

const routineExercises: WorkoutExercise[] = [
  {
    id: "incline-db",
    name: "Incline Dumbbell Press",
    routineNotes: "Focus on a full stretch and keep the top controlled.",
    sessionNotes: "Focus on a full stretch and keep the top controlled.",
    restTimerSeconds: 0,
    benchmarks: {
      bestWeight: 32,
      bestVolume: 320,
      bestPr: 40,
    },
    sets: [
      {
        id: "incline-set-1",
        type: "normal",
        previous: "30kg x 10",
        enteredWeight: "",
        reps: "",
        weightPlaceholder: "30",
        repsPlaceholder: "10",
        completed: false,
        unit: "kg",
        pulleyMultiplier: 1,
      },
      {
        id: "incline-set-2",
        type: "normal",
        previous: "30kg x 9",
        enteredWeight: "",
        reps: "",
        weightPlaceholder: "32",
        repsPlaceholder: "8",
        completed: false,
        unit: "kg",
        pulleyMultiplier: 1,
      },
      {
        id: "incline-set-3",
        type: "failure",
        previous: "28kg x 11",
        enteredWeight: "",
        reps: "",
        weightPlaceholder: "28",
        repsPlaceholder: "11",
        completed: false,
        unit: "kg",
        pulleyMultiplier: 1,
      },
    ],
  },
  {
    id: "lat-pulldown",
    name: "Wide Grip Lat Pulldown",
    routineNotes: "Pause at the chest and keep elbows driving down.",
    sessionNotes: "Pause at the chest and keep elbows driving down.",
    restTimerSeconds: 0,
    benchmarks: {
      bestWeight: 65,
      bestVolume: 720,
      bestPr: 87,
    },
    sets: [
      {
        id: "lat-set-1",
        type: "warmup",
        previous: "40kg x 12",
        enteredWeight: "",
        reps: "",
        weightPlaceholder: "42",
        repsPlaceholder: "12",
        completed: false,
        unit: "kg",
        pulleyMultiplier: 0.5,
      },
      {
        id: "lat-set-2",
        type: "normal",
        previous: "60kg x 10",
        enteredWeight: "",
        reps: "",
        weightPlaceholder: "62",
        repsPlaceholder: "10",
        completed: false,
        unit: "kg",
        pulleyMultiplier: 0.5,
      },
      {
        id: "lat-set-3",
        type: "drop",
        previous: "45kg x 12",
        enteredWeight: "",
        reps: "",
        weightPlaceholder: "48",
        repsPlaceholder: "12",
        completed: false,
        unit: "kg",
        pulleyMultiplier: 0.5,
      },
    ],
  },
];

export const mockRoutines: WorkoutRoutine[] = [
  {
    id: "push-a",
    name: "Push A",
    description: "Chest, shoulders, and triceps with a heavy first movement.",
    exercisePreview: [
      "Incline Dumbbell Press",
      "Seated Shoulder Press",
      "Cable Lateral Raise",
      "Triceps Pushdown",
    ],
    exercises: routineExercises,
  },
  {
    id: "pull-a",
    name: "Pull A",
    description: "Back and biceps with a strong top-set focus.",
    exercisePreview: [
      "Wide Grip Lat Pulldown",
      "Chest Supported Row",
      "Cable Curl",
      "Rear Delt Fly",
    ],
    exercises: [
      routineExercises[1],
      {
        ...routineExercises[0],
        id: "row-variation",
        name: "Chest Supported Row",
        routineNotes: "Drive elbows low and keep the chest glued to the pad.",
        sessionNotes: "Drive elbows low and keep the chest glued to the pad.",
      },
    ],
  },
];

export const exerciseCatalog = Array.from(
  new Set(
    mockRoutines.flatMap((routine) =>
      routine.exercises.map((exercise) => exercise.name),
    ),
  ),
).sort();

export function createEmptySession(): WorkoutSession {
  return {
    id: createId("session-empty"),
    name: "Empty Workout",
    startedAt: Date.now(),
    exercises: [],
    notes: "",
  };
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
