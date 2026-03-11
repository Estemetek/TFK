import { supabase } from './supabaseClient';

// Sync: menu item is available if it has at least one ingredient linked to its recipe
export async function syncMenuAvailability() {
  const { data: menuItems, error: menuError } = await supabase
    .from('MenuItem')
    .select('menuItemID');
  if (menuError) {
    console.error('Error fetching menu items:', menuError);
    return;
  }

  await Promise.all(
    menuItems.map(async (menu) => {
      const { count, error: recipeError } = await supabase
        .from('MenuIngredient')
        .select('menuIngredientID', { count: 'exact', head: true })
        .eq('menuItemID', menu.menuItemID);

      const hasIngredients = !recipeError && (count ?? 0) > 0;

      await supabase
        .from('MenuItem')
        .update({ isAvailable: hasIngredients })
        .eq('menuItemID', menu.menuItemID);
    })
  );
}
