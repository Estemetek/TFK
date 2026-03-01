import { supabase } from './supabaseClient';

// Strict sync: menu item is unavailable if NO ingredients or ANY ingredient is out of stock or not enough for recipe
export async function syncMenuAvailability() {
  // Fetch all menu items
  const { data: menuItems, error: menuError } = await supabase
    .from('MenuItem')
    .select('menuItemID');
  if (menuError) {
    console.error('Error fetching menu items:', menuError);
    return;
  }

  for (const menu of menuItems) {
    // Get all recipe ingredients for this menu item
    const { data: recipeIngredients, error: recipeError } = await supabase
      .from('MenuIngredient')
      .select('ingredientID, quantityRequired')
      .eq('menuItemID', menu.menuItemID);

    let anyOutOfStock = false;
    if (!recipeIngredients || recipeIngredients.length === 0) {
      anyOutOfStock = true;
    } else {
      for (const recipeIng of recipeIngredients) {
        const { data: ingredientData, error: ingError } = await supabase
          .from('Ingredient')
          .select('currentStock')
          .eq('ingredientID', recipeIng.ingredientID)
          .single();
        // Check for required quantity
        if (ingError || !ingredientData || ingredientData.currentStock < (recipeIng.quantityRequired ?? 1)) {
          anyOutOfStock = true;
          break;
        }
      }
    }
    await supabase
      .from('MenuItem')
      .update({ isAvailable: !anyOutOfStock })
      .eq('menuItemID', menu.menuItemID);
  }
}
