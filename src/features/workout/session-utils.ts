import type { WorkoutSession } from "@/features/workout/mock-data";

export function getWorkoutDurationSeconds(session: WorkoutSession, now = Date.now()) {
  if (typeof session.durationOverrideSeconds === "number") {
    return Math.max(0, session.durationOverrideSeconds);
  }

  return Math.max(0, Math.floor((now - session.startedAt) / 1000));
}
