import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MdClose, MdDelete, MdAdd } from 'react-icons/md';

export function RecipeModal({ menuItem, onClose, onRecipeChange }: { menuItem: any, onClose: () => void, onRecipeChange?: () => void }) {
  const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  // REMOVED: const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    fetchData();
  }, [menuItem]);

  async function fetchData() {
    // 1. Get all possible ingredients for the dropdown
    const { data: ingredients } = await supabase.from('Ingredient').select('*').order('name');
    setAvailableIngredients(ingredients || []);

    // 2. FIXED QUERY: Removed quantityRequired
    const { data: recipe, error } = await supabase
      .from('MenuIngredient')
      .select(`
        menuIngredientID,
        note,
        Ingredient (name, unit)
      `)
      .eq('menuItemID', menuItem.menuItemID);
    
    if (error) console.error("Error fetching recipe:", error);
    setRecipeItems(recipe || []);
  }

  async function addIngredient() {
    if (!selectedIngredientId) return;

    // FIXED INSERT: Removed quantityRequired
    const { error } = await supabase.from('MenuIngredient').insert([{
      menuItemID: menuItem.menuItemID,
      ingredientID: parseInt(selectedIngredientId),
      // note: "Standard" (optional: you could add a note input later)
    }]);

    if (error) alert(error.message);
    else {
      setSelectedIngredientId(''); // Reset selection
      await fetchData();
      if (onRecipeChange) await onRecipeChange();
    }
  }

  async function removeIngredient(id: number) {
    await supabase.from('MenuIngredient').delete().eq('menuIngredientID', id);
    await fetchData();
    if (onRecipeChange) await onRecipeChange();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Recipe for {menuItem.name}</h2>
          <button onClick={onClose}><MdClose size={24} /></button>
        </div>

        {/* Simplified Add Section: No Quantity Input */}
        <div className="grid grid-cols-4 gap-2 mb-6 bg-gray-50 p-3 rounded-lg">
          <select
            className="border p-2 rounded-lg text-sm col-span-3"
            value={selectedIngredientId}
            onChange={(e) => setSelectedIngredientId(e.target.value)}
          >
            <option value="">Select Ingredient to link to dish...</option>
            {availableIngredients.map(ing => (
              <option key={ing.ingredientID} value={ing.ingredientID}>
                {ing.name} ({ing.unit})
              </option>
            ))}
          </select>
          
          <button
            onClick={addIngredient}
            className="bg-black text-white rounded-lg flex items-center justify-center gap-2 font-bold disabled:bg-gray-300"
            disabled={!selectedIngredientId}
          >
            <MdAdd /> Add
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
                className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
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