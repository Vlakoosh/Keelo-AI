import { createContext, useContext, useMemo, useState } from "react";

import type { WorkoutSession } from "@/features/workout/mock-data";

type ActiveWorkoutContextValue = {
  activeWorkout: WorkoutSession | null;
  setActiveWorkout: React.Dispatch<React.SetStateAction<WorkoutSession | null>>;
  discardActiveWorkout: () => void;
  lastEditedExerciseName: string;
  setLastEditedExerciseName: (name: string) => void;
  isActiveWorkoutVisible: boolean;
  setIsActiveWorkoutVisible: (isVisible: boolean) => void;
  resumeSignal: number;
  requestResume: () => void;
};

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(
  null,
);

export function ActiveWorkoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(
    null,
  );
  const [lastEditedExerciseName, setLastEditedExerciseName] = useState("");
  const [isActiveWorkoutVisible, setIsActiveWorkoutVisible] = useState(false);
  const [resumeSignal, setResumeSignal] = useState(0);

  const value = useMemo<ActiveWorkoutContextValue>(
    () => ({
      activeWorkout,
      setActiveWorkout,
      discardActiveWorkout: () => {
        setActiveWorkout(null);
        setLastEditedExerciseName("");
      },
      lastEditedExerciseName,
      setLastEditedExerciseName,
      isActiveWorkoutVisible,
      setIsActiveWorkoutVisible,
      resumeSignal,
      requestResume: () => setResumeSignal((current) => current + 1),
    }),
    [
      activeWorkout,
      isActiveWorkoutVisible,
      lastEditedExerciseName,
      resumeSignal,
    ],
  );

  return (
    <ActiveWorkoutContext.Provider value={value}>
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout() {
  const context = useContext(ActiveWorkoutContext);
  if (!context) {
    throw new Error(
      "useActiveWorkout must be used within ActiveWorkoutProvider",
    );
  }

  return context;
}
