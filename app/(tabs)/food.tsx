import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function FoodScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Nutrition"
      title="Food is set up for serious daily tracking."
      description="The starter structure is ready for meals, custom foods, recipes, favorites, recents, and scanning entry points."
      highlights={[
        "Fast food logging and reusable entries",
        "Recipes with servings and cooked-weight support",
        "Barcode and nutrition-label scan flows"
      ]}
    />
  );
}
