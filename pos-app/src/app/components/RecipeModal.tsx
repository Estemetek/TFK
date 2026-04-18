import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MdClose, MdDelete, MdAdd } from 'react-icons/md';

export function RecipeModal({ menuItem, onClose, onRecipeChange, canEdit = true }: { menuItem: any, onClose: () => void, onRecipeChange?: () => void, canEdit?: boolean }) {
  const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    console.log(`🔍 [MODAL] Opening recipe for: ${menuItem.name} (ID: ${menuItem.menuItemID})`);
    fetchData();
  }, [menuItem]);

  async function fetchData() {
    try {
      console.log(`📥 [FETCH] Fetching data for ${menuItem.name}...`);
      
      // 1. Get all possible ingredients for the dropdown
      const { data: ingredients, error: ingredientError } = await supabase
        .from('Ingredient')
        .select('*')
        .order('name');
      
      if (ingredientError) {
        console.error('❌ [FETCH ERROR] Failed to fetch ingredients:', ingredientError);
        setErrorMessage('Failed to load ingredients');
        return;
      }
      
      console.log(`✅ [INGREDIENTS] Loaded ${ingredients?.length || 0} ingredients`);
      setAvailableIngredients(ingredients || []);

      // 2. Fetch current recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('MenuIngredient')
        .select(`
          menuIngredientID,
          note,
          Ingredient (name, unit)
        `)
        .eq('menuItemID', menuItem.menuItemID);
      
      if (recipeError) {
        console.error('❌ [RECIPE ERROR] Failed to fetch recipe:', recipeError);
        setErrorMessage('Failed to load recipe');
        return;
      }
      
      console.log(`📋 [RECIPE] ${menuItem.name} has ${recipe?.length || 0} linked ingredients:`, recipe);
      setRecipeItems(recipe || []);
      setErrorMessage('');
    } catch (error) {
      console.error('❌ [FETCH EXCEPTION]', error);
      setErrorMessage('An unexpected error occurred');
    }
  }

  async function addIngredient() {
    if (!selectedIngredientId) {
      console.warn('⚠️ [ADD] No ingredient selected');
      return;
    }

    const ingredientName = availableIngredients.find(i => String(i.ingredientID) === selectedIngredientId)?.name || 'Unknown';
    
    setIsLoading(true);
    console.log(`➕ [ADD] Adding ingredient ${ingredientName} (ID: ${selectedIngredientId}) to ${menuItem.name}...`);

    const { error } = await supabase.from('MenuIngredient').insert([{
      menuItemID: menuItem.menuItemID,
      ingredientID: parseInt(selectedIngredientId),
    }]);

    if (error) {
      console.error('❌ [ADD ERROR] Failed to add ingredient:', error);
      setErrorMessage(`Error adding ingredient: ${error.message}`);
      setIsLoading(false);
      return;
    }

    console.log(`✅ [ADD SUCCESS] ${ingredientName} added to ${menuItem.name}`);
    setSelectedIngredientId('');
    
    // Refresh the recipe list
    await fetchData();
    
    // Notify parent to sync availability
    if (onRecipeChange) {
      console.log('🔄 [CALLBACK] Calling onRecipeChange for availability sync...');
      await onRecipeChange();
    }
    
    setIsLoading(false);
  }

  async function removeIngredient(id: number) {
    const ingredient = recipeItems.find(r => r.menuIngredientID === id);
    const ingredientName = ingredient?.Ingredient?.name || 'Unknown';
    
    setIsLoading(true);
    console.log(`🗑️ [REMOVE] Removing ingredient ${ingredientName} (MenuIngredientID: ${id}) from ${menuItem.name}...`);

    const { error: deleteError } = await supabase
      .from('MenuIngredient')
      .delete()
      .eq('menuIngredientID', id);

    if (deleteError) {
      console.error('❌ [DELETE ERROR] Failed to remove ingredient:', deleteError);
      setErrorMessage(`Error removing ingredient: ${deleteError.message}`);
      setIsLoading(false);
      return;
    }

    console.log(`✅ [DELETE SUCCESS] ${ingredientName} removed from database`);

    // Add a small delay to ensure DB transaction completes
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('⏳ [DELAY] Waited 500ms for DB transaction to complete');

    // Refresh the recipe list
    await fetchData();
    
    // Notify parent to sync availability
    if (onRecipeChange) {
      console.log('🔄 [CALLBACK] Calling onRecipeChange for availability sync...');
      await onRecipeChange();
    }
    
    setIsLoading(false);
    console.log('✨ [REMOVE COMPLETE] Recipe update cycle finished');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Recipe for {menuItem.name}</h2>
          <button onClick={onClose} disabled={isLoading}><MdClose size={24} /></button>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ❌ {errorMessage}
          </div>
        )}

        {/* Add Section with Stock Display */}
        <div className="grid grid-cols-4 gap-2 mb-6 bg-gray-50 p-3 rounded-lg">
          <select
            className="border p-2 rounded-lg text-sm col-span-3"
            value={selectedIngredientId}
            onChange={(e) => setSelectedIngredientId(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select Ingredient to link to dish...</option>
            {availableIngredients.map(ing => {
              const isOutOfStock = ing.currentStock === 0;
              const isLowStock = ing.currentStock <= ing.reorderLevel && ing.currentStock > 0;
              let stockLabel = `${ing.name} (${ing.unit})`;
              if (isOutOfStock) {
                stockLabel += ` - OUT OF STOCK`;
              } else if (isLowStock) {
                stockLabel += ` - LOW STOCK (${ing.currentStock}/${ing.reorderLevel})`;
              } else {
                stockLabel += ` [${ing.currentStock}]`;
              }
              return (
                <option 
                  key={ing.ingredientID} 
                  value={ing.ingredientID}
                  disabled={isOutOfStock}
                >
                  {stockLabel}
                </option>
              );
            })}
          </select>
          
          <button
            onClick={addIngredient}
            className="bg-black text-white rounded-lg flex items-center justify-center gap-2 font-bold disabled:bg-gray-300"
            disabled={!selectedIngredientId || isLoading || !canEdit}
          >
            <MdAdd /> {isLoading ? 'Wait...' : 'Add'}
          </button>
        </div>

        {/* Current Recipe List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {recipeItems.length === 0 && (
            <p className="text-center text-gray-500 py-4 text-sm italic">
              No ingredients linked. Item will appear as "Not Available".
            </p>
          )}
          {recipeItems.map((item) => (
            <div key={item.menuIngredientID} className="flex justify-between items-center border-b py-2 text-sm">
              <span className="font-medium text-gray-700">
                {item.Ingredient?.name} <span className="text-gray-400 text-xs italic">({item.Ingredient?.unit})</span>
              </span>
              <button 
                onClick={() => removeIngredient(item.menuIngredientID)} 
                className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors disabled:opacity-50"
                disabled={isLoading || !canEdit}
              >
                <MdDelete size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}