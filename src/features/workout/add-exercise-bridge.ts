let pendingExerciseId: string | null = null;

export function setPendingExerciseSelection(exerciseId: string) {
  pendingExerciseId = exerciseId;
}

export function consumePendingExerciseSelection() {
  const value = pendingExerciseId;
  pendingExerciseId = null;
  return value;
}
