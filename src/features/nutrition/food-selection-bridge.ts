let pendingIngredientFoodId: string | null = null;

export function setPendingIngredientFood(foodId: string) {
  pendingIngredientFoodId = foodId;
}

export function consumePendingIngredientFood() {
  const value = pendingIngredientFoodId;
  pendingIngredientFoodId = null;
  return value;
}
