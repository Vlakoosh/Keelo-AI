import * as SQLite from "expo-sqlite";

import {
  createEmptySession,
  exerciseCatalog,
  mockRoutines,
  type SetType,
  type WeightUnit,
  type WorkoutExercise,
  type WorkoutRoutine,
  type WorkoutSession
} from "@/features/workout/mock-data";
import { getWorkoutDurationSeconds } from "@/features/workout/session-utils";

type LatestExerciseSet = {
  previous: string;
  weightPlaceholder: string;
  repsPlaceholder: string;
  unit: WeightUnit;
  pulleyMultiplier: 1 | 0.5;
};

type ExerciseHistorySummary = {
  latestSets: LatestExerciseSet[];
  benchmarks: {
    bestWeight: number;
    bestVolume: number;
    bestPr: number;
  };
};

type ExerciseHistoryMap = Record<string, ExerciseHistorySummary>;

export type ExerciseCatalogItem = {
  id: string;
  name: string;
  equipment: string;
  muscle: string;
};

export type WorkoutHistoryItem = {
  id: string;
  name: string;
  exercisePreview: string[];
  durationSeconds: number;
  setCount: number;
  totalWeight: number;
  finishedAt: number;
};

export type WorkoutSessionDetail = WorkoutSession & {
  finishedAt: number;
};

const EXERCISE_SEED: ExerciseCatalogItem[] = [
  { id: "bench-press-barbell", name: "Bench Press", equipment: "Barbell", muscle: "Chest" },
  { id: "bench-press-dumbbell", name: "Bench Press", equipment: "Dumbbell", muscle: "Chest" },
  { id: "bent-over-row-barbell", name: "Bent Over Row", equipment: "Barbell", muscle: "Back" },
  { id: "incline-bench-press-dumbbell", name: "Incline Bench Press", equipment: "Dumbbell", muscle: "Chest" },
  { id: "incline-bench-press-barbell", name: "Incline Bench Press", equipment: "Barbell", muscle: "Chest" },
  { id: "pull-up-bodyweight", name: "Pull Up", equipment: "Bodyweight", muscle: "Back" },
  { id: "seated-cable-row-v-grip", name: "Seated Cable Row - V Grip", equipment: "Cable", muscle: "Back" },
  { id: "shoulder-press-barbell", name: "Shoulder Press", equipment: "Barbell", muscle: "Shoulders" },
  { id: "shoulder-press-dumbbell", name: "Shoulder Press", equipment: "Dumbbell", muscle: "Shoulders" },
  { id: "tricep-pushdown-cable", name: "Tricep Pushdown", equipment: "Cable", muscle: "Triceps" },
  { id: "lateral-raise-cable", name: "Lateral Raise", equipment: "Cable", muscle: "Shoulders" },
  { id: "tricep-extension-cable", name: "Tricep Extension", equipment: "Cable", muscle: "Triceps" },
  { id: "bicep-curl-barbell", name: "Bicep Curl", equipment: "Barbell", muscle: "Biceps" },
  { id: "rope-hammer-curl-cable", name: "Rope Hammer Curl", equipment: "Cable", muscle: "Biceps" },
  { id: "lat-pulldown-cable", name: "Lat Pulldown", equipment: "Cable", muscle: "Back" },
  { id: "kneeling-lat-pulldown-cable", name: "Kneeling Lat Pulldown", equipment: "Cable", muscle: "Back" },
  { id: "squat-barbell", name: "Squat", equipment: "Barbell", muscle: "Quads" },
  { id: "romanian-deadlift-barbell", name: "Romanian Deadlift", equipment: "Barbell", muscle: "Hamstrings" },
  { id: "leg-extensions-machine", name: "Leg Extensions", equipment: "Machine", muscle: "Quads" },
  { id: "seated-leg-curl-machine", name: "Seated Leg Curl", equipment: "Machine", muscle: "Hamstrings" }
];

const dbPromise = SQLite.openDatabaseAsync("keelo.db");

export async function initializeWorkoutStorage() {
  const db = await dbPromise;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS workout_routines (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_routine_exercises (
      id TEXT PRIMARY KEY NOT NULL,
      routine_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      notes TEXT,
      exercise_order INTEGER NOT NULL,
      rest_timer_seconds INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workout_routine_sets (
      id TEXT PRIMARY KEY NOT NULL,
      routine_exercise_id TEXT NOT NULL,
      set_order INTEGER NOT NULL,
      set_type TEXT NOT NULL,
      weight_unit TEXT NOT NULL,
      pulley_multiplier REAL NOT NULL,
      target_weight TEXT,
      target_reps TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      source_routine_id TEXT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_session_exercises (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      notes TEXT,
      rest_timer_seconds INTEGER NOT NULL,
      exercise_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_session_sets (
      id TEXT PRIMARY KEY NOT NULL,
      session_exercise_id TEXT NOT NULL,
      set_order INTEGER NOT NULL,
      set_type TEXT NOT NULL,
      previous_label TEXT NOT NULL,
      weight_value REAL NOT NULL,
      weight_unit TEXT NOT NULL,
      pulley_multiplier REAL NOT NULL,
      reps INTEGER NOT NULL,
      completed INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercise_catalog (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      equipment TEXT NOT NULL,
      muscle TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manual_exercise_adds (
      id TEXT PRIMARY KEY NOT NULL,
      exercise_catalog_id TEXT NOT NULL,
      added_at INTEGER NOT NULL
    );
  `);

  const routineCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM workout_routines"
  );
  const exerciseCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM exercise_catalog"
  );
  const routineSetCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM workout_routine_sets"
  );

  if ((routineCount?.count ?? 0) === 0) {
    await seedWorkoutRoutines();
    await seedWorkoutHistory();
  }

  if ((exerciseCount?.count ?? 0) === 0) {
    await seedExerciseCatalog();
  }

  const routineExerciseColumns = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM pragma_table_info('workout_routine_exercises')"
  );
  if (!routineExerciseColumns.some((column) => column.name === "rest_timer_seconds")) {
    await db.execAsync(
      "ALTER TABLE workout_routine_exercises ADD COLUMN rest_timer_seconds INTEGER NOT NULL DEFAULT 0"
    );
  }

  if ((routineSetCount?.count ?? 0) === 0 && (routineCount?.count ?? 0) > 0) {
    await backfillRoutineTemplates();
  }
}

export async function loadWorkoutRoutines() {
  const db = await dbPromise;
  const routines = await db.getAllAsync<{
    id: string;
    name: string;
    description: string | null;
  }>("SELECT id, name, description FROM workout_routines ORDER BY name ASC");

  const exercises = await db.getAllAsync<{
    id: string;
    routine_id: string;
    exercise_name: string;
    notes: string | null;
    exercise_order: number;
    rest_timer_seconds: number;
  }>(
    `SELECT id, routine_id, exercise_name, notes, exercise_order, rest_timer_seconds
     FROM workout_routine_exercises
     ORDER BY routine_id, exercise_order`
  );

  const sets = await db.getAllAsync<{
    routine_exercise_id: string;
    set_order: number;
    set_type: SetType;
    weight_unit: WeightUnit;
    pulley_multiplier: number;
    target_weight: string | null;
    target_reps: string | null;
  }>(
    `SELECT routine_exercise_id, set_order, set_type, weight_unit, pulley_multiplier, target_weight, target_reps
     FROM workout_routine_sets
     ORDER BY routine_exercise_id, set_order`
  );

  const historyMap = await getExerciseHistoryMap();

  return routines.map<WorkoutRoutine>((routine) => {
    const routineExercises = exercises
      .filter((exercise) => exercise.routine_id === routine.id)
      .map((exercise) =>
        createSessionExerciseFromHistoryAndRoutine(
          exercise.exercise_name,
          exercise.notes ?? "",
          historyMap[exercise.exercise_name],
          exercise.rest_timer_seconds,
          sets
            .filter((set) => set.routine_exercise_id === exercise.id)
            .map((set) => ({
              type: set.set_type,
              unit: set.weight_unit,
              pulleyMultiplier: Number(set.pulley_multiplier) === 0.5 ? 0.5 : 1,
              targetWeight: set.target_weight ?? "",
              targetReps: set.target_reps ?? ""
            }))
        )
      );

    return {
      id: routine.id,
      name: routine.name,
      description: routine.description ?? undefined,
      exercisePreview: routineExercises.map((exercise) => exercise.name),
      exercises: routineExercises
    };
  });
}

export async function loadWorkoutHistory(limit = 12) {
  const db = await dbPromise;
  const sessions = await db.getAllAsync<{
    id: string;
    name: string;
    started_at: number;
    finished_at: number;
  }>(
    `SELECT id, name, started_at, finished_at
     FROM workout_sessions
     ORDER BY finished_at DESC
     LIMIT ?`,
    limit
  );

  if (sessions.length === 0) {
    return [] satisfies WorkoutHistoryItem[];
  }

  const exercises = await db.getAllAsync<{
    session_id: string;
    exercise_name: string;
    exercise_order: number;
  }>(
    `SELECT session_id, exercise_name, exercise_order
     FROM workout_session_exercises
     WHERE session_id IN (${sessions.map(() => "?").join(", ")})
     ORDER BY session_id, exercise_order ASC`,
    ...sessions.map((session) => session.id)
  );

  const sets = await db.getAllAsync<{
    session_id: string;
    set_type: SetType;
    weight_value: number;
    pulley_multiplier: number;
    reps: number;
    completed: number;
  }>(
    `SELECT se.session_id, ss.set_type, ss.weight_value, ss.pulley_multiplier, ss.reps, ss.completed
     FROM workout_session_sets ss
     JOIN workout_session_exercises se ON se.id = ss.session_exercise_id
     WHERE se.session_id IN (${sessions.map(() => "?").join(", ")})`,
    ...sessions.map((session) => session.id)
  );

  return sessions.map<WorkoutHistoryItem>((session) => {
    const sessionExercises = exercises
      .filter((exercise) => exercise.session_id === session.id)
      .map((exercise) => exercise.exercise_name);
    const sessionSets = sets.filter((set) => set.session_id === session.id);
    const setCount = sessionSets.filter(
      (set) =>
        set.completed === 1 && (set.set_type === "normal" || set.set_type === "failure")
    ).length;
    const totalWeight = sessionSets.reduce((sum, set) => {
      if (set.completed !== 1 || (set.set_type !== "normal" && set.set_type !== "failure")) {
        return sum;
      }

      return sum + Number(set.weight_value) * Number(set.pulley_multiplier) * Number(set.reps);
    }, 0);

    return {
      id: session.id,
      name: session.name,
      exercisePreview: sessionExercises,
      durationSeconds: Math.max(0, Math.floor((session.finished_at - session.started_at) / 1000)),
      setCount,
      totalWeight,
      finishedAt: session.finished_at
    };
  });
}

export async function loadWorkoutSessionById(sessionId: string) {
  const db = await dbPromise;
  const session = await db.getFirstAsync<{
    id: string;
    name: string;
    source_routine_id: string | null;
    started_at: number;
    finished_at: number;
    notes: string | null;
  }>(
    `SELECT id, name, source_routine_id, started_at, finished_at, notes
     FROM workout_sessions
     WHERE id = ?`,
    sessionId
  );

  if (!session) {
    return null;
  }

  const exercises = await db.getAllAsync<{
    id: string;
    exercise_name: string;
    notes: string | null;
    rest_timer_seconds: number;
    exercise_order: number;
  }>(
    `SELECT id, exercise_name, notes, rest_timer_seconds, exercise_order
     FROM workout_session_exercises
     WHERE session_id = ?
     ORDER BY exercise_order`,
    sessionId
  );

  const sets = await db.getAllAsync<{
    session_exercise_id: string;
    set_order: number;
    set_type: SetType;
    previous_label: string;
    weight_value: number;
    weight_unit: WeightUnit;
    pulley_multiplier: number;
    reps: number;
    completed: number;
  }>(
    `SELECT session_exercise_id, set_order, set_type, previous_label, weight_value, weight_unit, pulley_multiplier, reps, completed
     FROM workout_session_sets
     WHERE session_exercise_id IN (${exercises.map(() => "?").join(", ") || "''"})
     ORDER BY session_exercise_id, set_order`,
    ...exercises.map((exercise) => exercise.id)
  );

  const historyMap = await getExerciseHistoryMap();

  return {
    id: session.id,
    name: session.name,
    sourceRoutineId: session.source_routine_id ?? undefined,
    startedAt: session.started_at,
    finishedAt: session.finished_at,
    notes: session.notes ?? "",
    exercises: exercises.map<WorkoutExercise>((exercise) => {
      const benchmarks = historyMap[exercise.exercise_name]?.benchmarks ?? {
        bestWeight: 0,
        bestVolume: 0,
        bestPr: 0
      };

      return {
        id: exercise.id,
        name: exercise.exercise_name,
        routineNotes: exercise.notes ?? "",
        sessionNotes: exercise.notes ?? "",
        restTimerSeconds: exercise.rest_timer_seconds,
        benchmarks,
        sets: sets
          .filter((set) => set.session_exercise_id === exercise.id)
          .map((set) => ({
            id: `${exercise.id}-${set.set_order}`,
            type: set.set_type,
            previous: set.previous_label,
            enteredWeight: trimNumber(set.weight_value),
            reps: String(set.reps),
            completed: set.completed === 1,
            unit: set.weight_unit,
            pulleyMultiplier: Number(set.pulley_multiplier) === 0.5 ? 0.5 : 1
          }))
      };
    })
  } satisfies WorkoutSessionDetail;
}

export async function updateWorkoutSessionMeta(sessionId: string, values: { name: string; notes: string }) {
  const db = await dbPromise;
  await db.runAsync(
    "UPDATE workout_sessions SET name = ?, notes = ? WHERE id = ?",
    values.name || "Untitled Workout",
    values.notes || null,
    sessionId
  );
}

export async function deleteWorkoutSession(sessionId: string) {
  const db = await dbPromise;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const exercises = await txn.getAllAsync<{ id: string }>(
      "SELECT id FROM workout_session_exercises WHERE session_id = ?",
      sessionId
    );

    for (const exercise of exercises) {
      await txn.runAsync(
        "DELETE FROM workout_session_sets WHERE session_exercise_id = ?",
        exercise.id
      );
    }

    await txn.runAsync("DELETE FROM workout_session_exercises WHERE session_id = ?", sessionId);
    await txn.runAsync("DELETE FROM workout_sessions WHERE id = ?", sessionId);
  });
}

export async function createSessionFromRoutine(routineId: string) {
  const routines = await loadWorkoutRoutines();
  const routine = routines.find((item) => item.id === routineId);

  if (!routine) {
    return createEmptySession();
  }

  return {
    id: createId("session"),
    name: routine.name,
    sourceRoutineId: routine.id,
    startedAt: Date.now(),
    notes: routine.description ?? "",
    exercises: structuredClone(routine.exercises)
  } satisfies WorkoutSession;
}

export async function loadWorkoutRoutineById(routineId: string) {
  const routines = await loadWorkoutRoutines();
  return routines.find((routine) => routine.id === routineId) ?? null;
}

export async function createWorkoutRoutine(routine: {
  name: string;
  description: string;
  exercises: WorkoutExercise[];
}) {
  const db = await dbPromise;
  const routineId = createId("routine");

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      "INSERT INTO workout_routines (id, name, description) VALUES (?, ?, ?)",
      routineId,
      routine.name || "Untitled Routine",
      routine.description || null
    );

    for (const [exerciseIndex, exercise] of routine.exercises.entries()) {
      const routineExerciseId = createId("routine-exercise");
      await txn.runAsync(
        `INSERT INTO workout_routine_exercises
          (id, routine_id, exercise_name, notes, exercise_order, rest_timer_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`,
        routineExerciseId,
        routineId,
        exercise.name,
        "",
        exerciseIndex,
        exercise.restTimerSeconds
      );

      for (const [setIndex, set] of exercise.sets.entries()) {
        await txn.runAsync(
          `INSERT INTO workout_routine_sets
            (id, routine_exercise_id, set_order, set_type, weight_unit, pulley_multiplier, target_weight, target_reps)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          createId("routine-set"),
          routineExerciseId,
          setIndex,
          set.type,
          set.unit,
          set.pulleyMultiplier,
          set.enteredWeight || null,
          set.reps || null
        );
      }
    }
  });

  return routineId;
}

export async function updateWorkoutRoutine(
  routineId: string,
  routine: {
    name: string;
    description: string;
    exercises: WorkoutExercise[];
  }
) {
  const db = await dbPromise;

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      "UPDATE workout_routines SET name = ?, description = ? WHERE id = ?",
      routine.name || "Untitled Routine",
      routine.description || null,
      routineId
    );

    const existingExercises = await txn.getAllAsync<{ id: string }>(
      "SELECT id FROM workout_routine_exercises WHERE routine_id = ?",
      routineId
    );

    for (const exercise of existingExercises) {
      await txn.runAsync(
        "DELETE FROM workout_routine_sets WHERE routine_exercise_id = ?",
        exercise.id
      );
    }

    await txn.runAsync("DELETE FROM workout_routine_exercises WHERE routine_id = ?", routineId);

    for (const [exerciseIndex, exercise] of routine.exercises.entries()) {
      const routineExerciseId = createId("routine-exercise");
      await txn.runAsync(
        `INSERT INTO workout_routine_exercises
          (id, routine_id, exercise_name, notes, exercise_order, rest_timer_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`,
        routineExerciseId,
        routineId,
        exercise.name,
        "",
        exerciseIndex,
        exercise.restTimerSeconds
      );

      for (const [setIndex, set] of exercise.sets.entries()) {
        await txn.runAsync(
          `INSERT INTO workout_routine_sets
            (id, routine_exercise_id, set_order, set_type, weight_unit, pulley_multiplier, target_weight, target_reps)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          createId("routine-set"),
          routineExerciseId,
          setIndex,
          set.type,
          set.unit,
          set.pulleyMultiplier,
          set.enteredWeight || null,
          set.reps || null
        );
      }
    }
  });
}

export async function duplicateWorkoutRoutine(routineId: string) {
  const routine = await loadWorkoutRoutineById(routineId);
  if (!routine) {
    return null;
  }

  return createWorkoutRoutine({
    name: `${routine.name} Copy`,
    description: routine.description ?? "",
    exercises: structuredClone(routine.exercises)
  });
}

export async function deleteWorkoutRoutine(routineId: string) {
  const db = await dbPromise;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const existingExercises = await txn.getAllAsync<{ id: string }>(
      "SELECT id FROM workout_routine_exercises WHERE routine_id = ?",
      routineId
    );

    for (const exercise of existingExercises) {
      await txn.runAsync(
        "DELETE FROM workout_routine_sets WHERE routine_exercise_id = ?",
        exercise.id
      );
    }

    await txn.runAsync("DELETE FROM workout_routine_exercises WHERE routine_id = ?", routineId);
    await txn.runAsync("DELETE FROM workout_routines WHERE id = ?", routineId);
  });
}

export async function createExerciseFromCatalog(exerciseName: string) {
  const historyMap = await getExerciseHistoryMap();
  return createSessionExerciseFromHistory(exerciseName, "", historyMap[exerciseName]);
}

export async function createExerciseFromCatalogId(exerciseId: string) {
  const db = await dbPromise;
  const row = await db.getFirstAsync<ExerciseCatalogItem>(
    "SELECT id, name, equipment, muscle FROM exercise_catalog WHERE id = ?",
    exerciseId
  );

  if (!row) {
    throw new Error(`Exercise not found for id: ${exerciseId}`);
  }

  const historyMap = await getExerciseHistoryMap();
  return createSessionExerciseFromHistory(
    formatExerciseLabel(row.name, row.equipment),
    "",
    historyMap[formatExerciseLabel(row.name, row.equipment)] ?? historyMap[row.name]
  );
}

export async function saveWorkoutSession(session: WorkoutSession) {
  const db = await dbPromise;
  const finishedAt = session.startedAt + getWorkoutDurationSeconds(session) * 1000;

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO workout_sessions (id, name, source_routine_id, started_at, finished_at, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      session.id,
      session.name,
      session.sourceRoutineId ?? null,
      session.startedAt,
      finishedAt,
      session.notes
    );

    for (const [exerciseIndex, exercise] of session.exercises.entries()) {
      const sessionExerciseId = createId("session-exercise");

      await txn.runAsync(
        `INSERT INTO workout_session_exercises
          (id, session_id, exercise_name, notes, rest_timer_seconds, exercise_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        sessionExerciseId,
        session.id,
        exercise.name,
        exercise.sessionNotes,
        exercise.restTimerSeconds,
        exerciseIndex
      );

      for (const [setIndex, set] of exercise.sets.entries()) {
        const weightValue = Number(set.enteredWeight || set.weightPlaceholder || 0);
        const repsValue = Number(set.reps || set.repsPlaceholder || 0);

        await txn.runAsync(
          `INSERT INTO workout_session_sets
            (id, session_exercise_id, set_order, set_type, previous_label, weight_value, weight_unit, pulley_multiplier, reps, completed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          createId("session-set"),
          sessionExerciseId,
          setIndex,
          set.type,
          set.previous,
          weightValue,
          set.unit,
          set.pulleyMultiplier,
          repsValue,
          set.completed ? 1 : 0
        );
      }
    }
  });
}

export async function loadExerciseCatalog() {
  const db = await dbPromise;
  const rows = await db.getAllAsync<{ exercise_name: string }>(
    `SELECT DISTINCT exercise_name FROM (
      SELECT exercise_name FROM workout_routine_exercises
      UNION ALL
      SELECT exercise_name FROM workout_session_exercises
    )
    ORDER BY exercise_name ASC`
  );

  if (rows.length === 0) {
    return exerciseCatalog;
  }

  return rows.map((row) => row.exercise_name);
}

export async function searchExerciseCatalog(search: string, equipment?: string, muscle?: string) {
  const db = await dbPromise;
  const searchTerm = `%${search.trim().toLowerCase()}%`;

  return db.getAllAsync<ExerciseCatalogItem>(
    `SELECT id, name, equipment, muscle
     FROM exercise_catalog
     WHERE lower(name || ' ' || equipment) LIKE ?
       AND (? IS NULL OR equipment = ?)
       AND (? IS NULL OR muscle = ?)
     ORDER BY name ASC, equipment ASC`,
    searchTerm,
    equipment ?? null,
    equipment ?? null,
    muscle ?? null,
    muscle ?? null
  );
}

export async function loadRecentManualExercises(limit = 8) {
  const db = await dbPromise;

  return db.getAllAsync<ExerciseCatalogItem>(
    `SELECT ec.id, ec.name, ec.equipment, ec.muscle
     FROM manual_exercise_adds mea
     JOIN exercise_catalog ec ON ec.id = mea.exercise_catalog_id
     GROUP BY ec.id
     ORDER BY MAX(mea.added_at) DESC
     LIMIT ?`,
    limit
  );
}

export async function loadExerciseFilters() {
  const db = await dbPromise;
  const [equipmentRows, muscleRows] = await Promise.all([
    db.getAllAsync<{ equipment: string }>(
      "SELECT DISTINCT equipment FROM exercise_catalog ORDER BY equipment ASC"
    ),
    db.getAllAsync<{ muscle: string }>(
      "SELECT DISTINCT muscle FROM exercise_catalog ORDER BY muscle ASC"
    )
  ]);

  return {
    equipment: equipmentRows.map((row) => row.equipment),
    muscle: muscleRows.map((row) => row.muscle)
  };
}

export async function recordManualExerciseAdd(exerciseId: string) {
  const db = await dbPromise;
  await db.runAsync(
    "INSERT INTO manual_exercise_adds (id, exercise_catalog_id, added_at) VALUES (?, ?, ?)",
    createId("manual-exercise"),
    exerciseId,
    Date.now()
  );
}

async function seedWorkoutRoutines() {
  const db = await dbPromise;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const routine of mockRoutines) {
      await txn.runAsync(
        "INSERT INTO workout_routines (id, name, description) VALUES (?, ?, ?)",
        routine.id,
        routine.name,
        routine.description ?? null
      );

      for (const [exerciseIndex, exercise] of routine.exercises.entries()) {
        const routineExerciseId = createId("routine-exercise");
        await txn.runAsync(
          `INSERT INTO workout_routine_exercises
            (id, routine_id, exercise_name, notes, exercise_order, rest_timer_seconds)
           VALUES (?, ?, ?, ?, ?, ?)`,
          routineExerciseId,
          routine.id,
          exercise.name,
          exercise.routineNotes,
          exerciseIndex,
          exercise.restTimerSeconds
        );

        for (const [setIndex, set] of exercise.sets.entries()) {
          await txn.runAsync(
            `INSERT INTO workout_routine_sets
              (id, routine_exercise_id, set_order, set_type, weight_unit, pulley_multiplier, target_weight, target_reps)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            createId("routine-set"),
            routineExerciseId,
            setIndex,
            set.type,
            set.unit,
            set.pulleyMultiplier,
            set.enteredWeight || set.weightPlaceholder || null,
            set.reps || set.repsPlaceholder || null
          );
        }
      }
    }
  });
}

async function seedWorkoutHistory() {
  const seededSession: WorkoutSession = {
    id: createId("seed-session"),
    name: "Starter Lift Log",
    startedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    notes: "Seeded history for local exercise reminders.",
    exercises: structuredClone(mockRoutines[0].exercises).map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({
        ...set,
        enteredWeight: set.weightPlaceholder ?? "",
        reps: set.repsPlaceholder ?? "",
        completed: true
      }))
    }))
  };

  await saveWorkoutSession(seededSession);
}

async function seedExerciseCatalog() {
  const db = await dbPromise;
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const exercise of EXERCISE_SEED) {
      await txn.runAsync(
        "INSERT INTO exercise_catalog (id, name, equipment, muscle) VALUES (?, ?, ?, ?)",
        exercise.id,
        exercise.name,
        exercise.equipment,
        exercise.muscle
      );
    }
  });
}

async function backfillRoutineTemplates() {
  const db = await dbPromise;
  const routineExercises = await db.getAllAsync<{
    id: string;
    routine_id: string;
    exercise_name: string;
  }>("SELECT id, routine_id, exercise_name FROM workout_routine_exercises");

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const routineExercise of routineExercises) {
      const mockRoutine = mockRoutines.find((routine) => routine.id === routineExercise.routine_id);
      const mockExercise = mockRoutine?.exercises.find((exercise) => exercise.name === routineExercise.exercise_name);
      if (!mockExercise) {
        continue;
      }

      await txn.runAsync(
        "UPDATE workout_routine_exercises SET rest_timer_seconds = ? WHERE id = ?",
        mockExercise.restTimerSeconds,
        routineExercise.id
      );

      for (const [setIndex, set] of mockExercise.sets.entries()) {
        await txn.runAsync(
          `INSERT INTO workout_routine_sets
            (id, routine_exercise_id, set_order, set_type, weight_unit, pulley_multiplier, target_weight, target_reps)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          createId("routine-set"),
          routineExercise.id,
          setIndex,
          set.type,
          set.unit,
          set.pulleyMultiplier,
          set.enteredWeight || set.weightPlaceholder || null,
          set.reps || set.repsPlaceholder || null
        );
      }
    }
  });
}

function formatExerciseLabel(name: string, equipment: string) {
  if (equipment === "Bodyweight") {
    return name;
  }

  return `${name} (${equipment})`;
}

async function getExerciseHistoryMap() {
  const db = await dbPromise;

  const benchmarkRows = await db.getAllAsync<{
    exercise_name: string;
    weight_value: number;
    reps: number;
    pulley_multiplier: number;
  }>(
    `SELECT se.exercise_name, ss.weight_value, ss.reps, ss.pulley_multiplier
     FROM workout_session_sets ss
     JOIN workout_session_exercises se ON se.id = ss.session_exercise_id
     WHERE ss.completed = 1`
  );

  const latestRows = await db.getAllAsync<{
    exercise_name: string;
    session_id: string;
    started_at: number;
    set_order: number;
    set_type: SetType;
    weight_value: number;
    weight_unit: WeightUnit;
    pulley_multiplier: number;
    reps: number;
  }>(
    `SELECT
        se.exercise_name,
        se.session_id,
        s.started_at,
        ss.set_order,
        ss.set_type,
        ss.weight_value,
        ss.weight_unit,
        ss.pulley_multiplier,
        ss.reps
      FROM workout_session_sets ss
      JOIN workout_session_exercises se ON se.id = ss.session_exercise_id
      JOIN workout_sessions s ON s.id = se.session_id
      WHERE ss.completed = 1
      ORDER BY se.exercise_name ASC, s.started_at DESC, ss.set_order ASC`
  );

  const benchmarks: ExerciseHistoryMap = {};

  benchmarkRows.forEach((row) => {
    const effectiveWeight = Number(row.weight_value) * Number(row.pulley_multiplier);
    const volume = effectiveWeight * Number(row.reps);
    const pr = effectiveWeight * (1 + Number(row.reps) / 30);
    const current = benchmarks[row.exercise_name] ?? {
      latestSets: [],
      benchmarks: {
        bestWeight: 0,
        bestVolume: 0,
        bestPr: 0
      }
    };

    current.benchmarks.bestWeight = Math.max(current.benchmarks.bestWeight, effectiveWeight);
    current.benchmarks.bestVolume = Math.max(current.benchmarks.bestVolume, volume);
    current.benchmarks.bestPr = Math.max(current.benchmarks.bestPr, pr);
    benchmarks[row.exercise_name] = current;
  });

  const seenLatestSession = new Map<string, string>();

  latestRows.forEach((row) => {
    const current = benchmarks[row.exercise_name] ?? {
      latestSets: [],
      benchmarks: {
        bestWeight: 0,
        bestVolume: 0,
        bestPr: 0
      }
    };

    const trackedSessionId = seenLatestSession.get(row.exercise_name);
    if (!trackedSessionId) {
      seenLatestSession.set(row.exercise_name, row.session_id);
    }

    if (seenLatestSession.get(row.exercise_name) !== row.session_id) {
      return;
    }

    current.latestSets.push({
      previous: `${trimNumber(row.weight_value)}${row.weight_unit} x ${row.reps}`,
      weightPlaceholder: trimNumber(row.weight_value),
      repsPlaceholder: String(row.reps),
      unit: row.weight_unit,
      pulleyMultiplier: Number(row.pulley_multiplier) === 0.5 ? 0.5 : 1
    });

    benchmarks[row.exercise_name] = current;
  });

  return benchmarks;
}

function createSessionExerciseFromHistory(
  exerciseName: string,
  notes: string,
  history?: ExerciseHistorySummary
): WorkoutExercise {
  return createSessionExerciseFromHistoryAndRoutine(exerciseName, notes, history, 0, []);
}

function createSessionExerciseFromHistoryAndRoutine(
  exerciseName: string,
  notes: string,
  history: ExerciseHistorySummary | undefined,
  restTimerSeconds: number,
  routineSets: Array<{
    type: SetType;
    unit: WeightUnit;
    pulleyMultiplier: 1 | 0.5;
    targetWeight: string;
    targetReps: string;
  }>
): WorkoutExercise {
  const latestSets = history?.latestSets ?? [];
  const setCount = routineSets.length || latestSets.length || 3;

  return {
    id: createId("exercise"),
    name: exerciseName,
    routineNotes: notes,
    sessionNotes: notes,
    restTimerSeconds,
    benchmarks: history?.benchmarks ?? {
      bestWeight: 0,
      bestVolume: 0,
      bestPr: 0
    },
    sets: Array.from({ length: setCount }, (_, index) => {
      const latestSet = latestSets[index];
      const routineSet = routineSets[index];
      return {
        id: createId("set"),
        type: routineSet?.type ?? "normal",
        previous: latestSet?.previous ?? "No data",
        enteredWeight: "",
        reps: "",
        weightPlaceholder: latestSet?.weightPlaceholder ?? routineSet?.targetWeight ?? "",
        repsPlaceholder: latestSet?.repsPlaceholder ?? routineSet?.targetReps ?? "",
        completed: false,
        unit: latestSet?.unit ?? routineSet?.unit ?? "kg",
        pulleyMultiplier: latestSet?.pulleyMultiplier ?? routineSet?.pulleyMultiplier ?? 1
      };
    })
  };
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function trimNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}
