import { supabase } from './supabaseClient';

// Sync: a menu item is available if it has at least one ingredient linked to its recipe.
// Stock levels are checked at checkout time, not here.
export async function syncMenuAvailability() {
  const { data: menuItems, error: menuError } = await supabase
    .from('MenuItem')
    .select('menuItemID');
  if (menuError || !menuItems) return;

  const { data: recipeRows, error: recipeError } = await supabase
    .from('MenuIngredient')
    .select('menuItemID');
  if (recipeError) return;

  // Build a set of menuItemIDs that have at least one ingredient linked
  const withRecipe = new Set(recipeRows.map((r) => r.menuItemID));

  await Promise.all(
    menuItems.map(async (menu) => {
      const isAvailable = withRecipe.has(menu.menuItemID);
      await supabase
        .from('MenuItem')
        .update({ isAvailable })
        .eq('menuItemID', menu.menuItemID);
    })
  );
}
