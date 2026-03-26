import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function AiScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Assistant"
      title="AI is staged as a later convenience layer."
      description="The tab exists from day one so the product shape is clear, while the core app remains fully useful without it."
      highlights={[
        "Local-context analysis and summaries",
        "Recipe and workout suggestions",
        "Structured draft actions with confirmation"
      ]}
    />
  );
}
