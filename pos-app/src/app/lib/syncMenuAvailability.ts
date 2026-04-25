import { supabase as defaultSupabase } from './supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

// Sync: a menu item is available if:
// 1. It has at least one ingredient linked
// 2. ALL linked ingredients have stock > reorderLevel
export async function syncMenuAvailability(supabaseClient?: SupabaseClient) {
  // Use service role client if provided (from backend), otherwise use default anon client
  const supabase = supabaseClient || defaultSupabase;
  
  console.log('🔄 [SYNC START] Starting syncMenuAvailability...');
  const timestamp = new Date().toISOString();
  
  const { data: menuItems, error: menuError } = await supabase
    .from('MenuItem')
    .select('menuItemID, name');
  
  if (menuError) {
    console.error('❌ [SYNC ERROR] Failed to fetch menu items:', menuError);
    return;
  }
  
  if (!menuItems || menuItems.length === 0) {
    console.warn('⚠️ [SYNC WARNING] No menu items found');
    return;
  }
  
  console.log(`📋 [SYNC INFO] Processing ${menuItems.length} menu items at ${timestamp}`);

  await Promise.all(
    menuItems.map(async (menu) => {
      console.log(`\n📍 [ITEM] Processing: ${menu.name} (ID: ${menu.menuItemID}, Type: ${typeof menu.menuItemID})`);
      
      // Keep as number - database column is BIGINT type
      const menuIdValue = menu.menuItemID;
      console.log(`🔍 [DEBUG] Using menuIdValue: ${menuIdValue} (type: ${typeof menuIdValue})`);
      console.log(`🔍 [QUERY DEBUG] Attempting MenuIngredient query with WHERE menuItemID = ${menuIdValue}`);
      
      // Get all ingredients for this menu item
      const { data: recipeIngredients, error: recipeError } = await supabase
        .from('MenuIngredient')
        .select('ingredientID')
        .eq('menuItemID', menuIdValue);

      if (recipeError) {
        console.error(`❌ [RECIPE ERROR] Failed to fetch ingredients for ${menu.name}:`, recipeError);
        return;
      }

      // If no ingredients, mark unavailable
      if (!recipeIngredients || recipeIngredients.length === 0) {
        console.log(`📭 [NO INGREDIENTS] ${menu.name} has NO ingredients - Marking UNAVAILABLE`);
        console.log(`🔍 [UPDATE DEBUG 1] Attempting UPDATE MenuItem WHERE menuItemID = ${menuIdValue}`);
        console.log(`🔍 [UPDATE DEBUG 1] Setting isAvailable = false`);
        
        const { data: updateData, error: updateError } = await supabase
          .from('MenuItem')
          .update({ isAvailable: false })
          .eq('menuItemID', menuIdValue)
          .select();
        
        console.log(`🔍 [UPDATE RESPONSE 1] Error:`, updateError, `Data:`, updateData);
        
        if (updateError) {
          console.error(`❌ [UPDATE ERROR] Failed to mark ${menu.name} unavailable:`, updateError);
        } else if (!updateData || updateData.length === 0) {
          console.error(`❌ [UPDATE FAILED] No rows matched for ${menu.name} (ID: ${menuIdValue})`);
        } else {
          console.log(`✅ [UPDATED] ${menu.name} marked as UNAVAILABLE (no ingredients)`);
        }
        return;
      }

      console.log(`🔗 [INGREDIENTS FOUND] ${menu.name} has ${recipeIngredients.length} ingredient(s)`);
      console.log(`🔍 [DEBUG] Recipe ingredient IDs:`, recipeIngredients.map(r => r.ingredientID));

      // Check all ingredients have sufficient stock
      const ingredientIds = recipeIngredients.map(r => r.ingredientID);
      const { data: ingredients, error: ingredientError } = await supabase
        .from('Ingredient')
        .select('ingredientID, name, currentStock, reorderLevel')
        .in('ingredientID', ingredientIds);

      if (ingredientError) {
        console.error(`❌ [INGREDIENT FETCH ERROR] Failed to fetch ingredient details:`, ingredientError);
        return;
      }

      if (!ingredients || ingredients.length === 0) {
        console.warn(`⚠️ [EMPTY INGREDIENTS] No ingredient data returned for ${menu.name}`);
        console.warn(`🔍 [DEBUG] Tried to fetch IDs: ${ingredientIds.join(', ')}, but got no results`);
        console.log(`🔍 [UPDATE DEBUG 2] Attempting UPDATE MenuItem WHERE menuItemID = ${menuIdValue}`);
        console.log(`🔍 [UPDATE DEBUG 2] Setting isAvailable = false`);
        
        const { data: updateData, error: updateError } = await supabase
          .from('MenuItem')
          .update({ isAvailable: false })
          .eq('menuItemID', menuIdValue)
          .select();
        
        console.log(`🔍 [UPDATE RESPONSE 2] Error:`, updateError, `Data:`, updateData);
        
        if (updateError) {
          console.error(`❌ [UPDATE ERROR] Failed to update ${menu.name}:`, updateError);
        } else if (!updateData || updateData.length === 0) {
          console.error(`❌ [UPDATE FAILED] No rows matched for ${menu.name} (ID: ${menuIdValue})`);
        } else {
          console.log(`✅ [UPDATED] ${menu.name} marked as UNAVAILABLE (empty ingredients data)`);
        }
        return;
      }

      // Log each ingredient's stock status with details
      console.log(`📊 [INGREDIENT CHECK] Checking stock for ${menu.name}:`);
      ingredients.forEach(ing => {
        const isOk = ing.currentStock > ing.reorderLevel;
        const comparison = `${ing.currentStock} > ${ing.reorderLevel}`;
        console.log(`  📦 ${ing.name}: currentStock=${ing.currentStock}, reorderLevel=${ing.reorderLevel}, comparison: ${comparison} = ${isOk ? '✅ TRUE (OK)' : '❌ FALSE (LOW)'}`);
      });

      // Product is available only if ALL ingredients have stock > reorderLevel
      const allStockOk = ingredients.every(ing => ing.currentStock > ing.reorderLevel);
      
      console.log(`📊 [STOCK CHECK] ${menu.name}: ${allStockOk ? '✅ ALL INGREDIENTS OK' : '❌ SOME INGREDIENTS LOW'}`);
      console.log(`🔍 [DEBUG] About to update menuItemID=${menuIdValue} to isAvailable=${allStockOk}`);
      console.log(`🔍 [UPDATE DEBUG 3] Attempting UPDATE MenuItem WHERE menuItemID = ${menuIdValue}`);
      console.log(`🔍 [UPDATE DEBUG 3] Setting isAvailable = ${allStockOk}`);

      const { data: updateData, error: updateError } = await supabase
        .from('MenuItem')
        .update({ isAvailable: allStockOk })
        .eq('menuItemID', menuIdValue)
        .select();

      console.log(`🔍 [UPDATE RESPONSE 3] Error:`, updateError, `Data:`, updateData);

      if (updateError) {
        console.error(`❌ [UPDATE ERROR] Failed to update ${menu.name} availability:`, updateError);
      } else if (!updateData || updateData.length === 0) {
        console.error(`❌ [UPDATE FAILED] No rows matched for ${menu.name} (ID: ${menu.menuItemID}). Check if menuItemID type matches!`);
        console.log(`🔍 [DEBUG] updateData:`, updateData);
      } else {
        const status = allStockOk ? 'IN STOCK' : 'UNAVAILABLE';
        console.log(`✅ [UPDATED] ${menu.name} marked as ${status}`);
        console.log(`🔍 [DEBUG] Update response:`, updateData[0]);
      }
    })
  );
  
  console.log('\n✨ [SYNC END] syncMenuAvailability completed at', new Date().toISOString());
}

// ✨ Solution 2: Targeted sync - only sync specific menu items that use a given ingredient
export async function syncSpecificMenuItems(
  menuItemIds: number[],
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || defaultSupabase;
  
  if (!menuItemIds || menuItemIds.length === 0) {
    console.log('⏭️ [TARGETED SYNC] No menu items to sync');
    return;
  }

  console.log(`🎯 [TARGETED SYNC START] Syncing ${menuItemIds.length} specific menu item(s) at ${new Date().toISOString()}`);

  const { data: menuItems, error: menuError } = await supabase
    .from('MenuItem')
    .select('menuItemID, name')
    .in('menuItemID', menuItemIds);

  if (menuError) {
    console.error('❌ [TARGETED SYNC ERROR]', menuError);
    return;
  }

  if (!menuItems || menuItems.length === 0) {
    console.warn('⚠️ [TARGETED SYNC] No menu items found');
    return;
  }

  // Use same sync logic as full sync, but only for these items
  await Promise.all(
    menuItems.map(async (menu) => {
      const menuIdValue = menu.menuItemID;

      const { data: recipeIngredients, error: recipeError } = await supabase
        .from('MenuIngredient')
        .select('ingredientID')
        .eq('menuItemID', menuIdValue);

      if (recipeError) {
        console.error(`❌ [TARGETED SYNC] Recipe error for ${menu.name}:`, recipeError);
        return;
      }

      if (!recipeIngredients || recipeIngredients.length === 0) {
        const { error: updateError } = await supabase
          .from('MenuItem')
          .update({ isAvailable: false })
          .eq('menuItemID', menuIdValue);
        
        if (!updateError) {
          console.log(`✅ [TARGETED SYNC] ${menu.name} marked UNAVAILABLE (no ingredients)`);
        }
        return;
      }

      const ingredientIds = recipeIngredients.map((r) => r.ingredientID);
      const { data: ingredients, error: ingredientError } = await supabase
        .from('Ingredient')
        .select('ingredientID, name, currentStock, reorderLevel')
        .in('ingredientID', ingredientIds);

      if (ingredientError) {
        console.error(`❌ [TARGETED SYNC] Ingredient error for ${menu.name}:`, ingredientError);
        return;
      }

      if (!ingredients || ingredients.length === 0) {
        const { error: updateError } = await supabase
          .from('MenuItem')
          .update({ isAvailable: false })
          .eq('menuItemID', menuIdValue);
        
        if (!updateError) {
          console.log(`✅ [TARGETED SYNC] ${menu.name} marked UNAVAILABLE (no ingredient data)`);
        }
        return;
      }

      const allStockOk = ingredients.every((ing) => ing.currentStock > ing.reorderLevel);
      const { error: updateError } = await supabase
        .from('MenuItem')
        .update({ isAvailable: allStockOk })
        .eq('menuItemID', menuIdValue);

      if (!updateError) {
        const status = allStockOk ? 'IN STOCK' : 'UNAVAILABLE';
        console.log(`✅ [TARGETED SYNC] ${menu.name} marked ${status}`);
      }
    })
  );

  console.log(`\n✨ [TARGETED SYNC END] Completed at ${new Date().toISOString()}`);
}
