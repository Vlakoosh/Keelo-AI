type PendingExerciseMode =
  | { type: "add" }
  | { type: "replace"; targetExerciseId: string };

export type PendingExerciseSelection =
  | { type: "add"; exerciseId: string }
  | { type: "replace"; exerciseId: string; targetExerciseId: string };

let pendingMode: PendingExerciseMode = { type: "add" };
let pendingSelection: PendingExerciseSelection | null = null;

export function setPendingExerciseAddMode() {
  pendingMode = { type: "add" };
}

export function setPendingExerciseReplacement(targetExerciseId: string) {
  pendingMode = { type: "replace", targetExerciseId };
}

export function setPendingExerciseSelection(exerciseId: string) {
  pendingSelection =
    pendingMode.type === "replace"
      ? {
          type: "replace",
          exerciseId,
          targetExerciseId: pendingMode.targetExerciseId,
        }
      : {
          type: "add",
          exerciseId,
        };
  pendingMode = { type: "add" };
}

export function consumePendingExerciseSelection() {
  const value = pendingSelection;
  pendingSelection = null;
  return value;
}
