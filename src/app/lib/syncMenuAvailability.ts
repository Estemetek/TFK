import { supabase } from './supabaseClient';

// Sync: a menu item is available if:
// 1. It has at least one ingredient linked
// 2. ALL linked ingredients have stock > reorderLevel
export async function syncMenuAvailability() {
  const { data: menuItems, error: menuError } = await supabase
    .from('MenuItem')
    .select('menuItemID');
  if (menuError || !menuItems) return;

  await Promise.all(
    menuItems.map(async (menu) => {
      // Get all ingredients for this menu item
      const { data: recipeIngredients } = await supabase
        .from('MenuIngredient')
        .select('ingredientID')
        .eq('menuItemID', menu.menuItemID);

      // If no ingredients, mark unavailable
      if (!recipeIngredients || recipeIngredients.length === 0) {
        await supabase
          .from('MenuItem')
          .update({ isAvailable: false })
          .eq('menuItemID', menu.menuItemID);
        return;
      }

      // Check all ingredients have sufficient stock
      const ingredientIds = recipeIngredients.map(r => r.ingredientID);
      const { data: ingredients } = await supabase
        .from('Ingredient')
        .select('ingredientID, currentStock, reorderLevel')
        .in('ingredientID', ingredientIds);

      // Product is available only if ALL ingredients have stock > reorderLevel
      const allStockOk = ingredients?.every(ing => ing.currentStock > ing.reorderLevel) ?? false;

      await supabase
        .from('MenuItem')
        .update({ isAvailable: allStockOk })
        .eq('menuItemID', menu.menuItemID);
    })
  );
}
