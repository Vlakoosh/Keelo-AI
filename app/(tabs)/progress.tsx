import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function ProgressScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Progress"
      title="Progress is ready to unify the data story."
      description="This tab can grow into bodyweight trends, consistency views, and workout or nutrition summaries without changing the shell."
      highlights={[
        "Bodyweight and adherence trends",
        "Workout frequency and PR history",
        "A home for richer analytics later"
      ]}
    />
  );
}
