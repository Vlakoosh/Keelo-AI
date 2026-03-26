import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function TodayScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Dashboard"
      title="Today keeps the app grounded."
      description="This tab is ready for calories, protein, workout status, quick actions, streaks, and recent wins."
      highlights={[
        "Daily calories and protein progress",
        "Workout status and quick-start actions",
        "Streaks, PRs, and momentum signals"
      ]}
    />
  );
}
