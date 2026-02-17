import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MdClose, MdDelete, MdAdd } from 'react-icons/md';

export function RecipeModal({ menuItem, onClose }: { menuItem: any, onClose: () => void }) {
  const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    fetchData();
  }, [menuItem]);

  async function fetchData() {
    // 1. Get all possible ingredients for the dropdown
    const { data: ingredients } = await supabase.from('Ingredient').select('*');
    setAvailableIngredients(ingredients || []);

    // 2. Get the current "Recipe" for this specific menu item
    const { data: recipe } = await supabase
      .from('MenuIngredient')
      .select(`
        menuIngredientID,
        quantityRequired,
        Ingredient (name, unit)
      `)
      .eq('menuItemID', menuItem.menuItemID);
    setRecipeItems(recipe || []);
  }

  async function addIngredient() {
    if (!selectedIngredientId || quantity <= 0) return;

    const { error } = await supabase.from('MenuIngredient').insert([{
      menuItemID: menuItem.menuItemID,
      ingredientID: parseInt(selectedIngredientId),
      quantityRequired: quantity
    }]);

    if (error) alert(error.message);
    else {
      setQuantity(0);
      fetchData(); // Refresh list
    }
  }

  async function removeIngredient(id: number) {
    await supabase.from('MenuIngredient').delete().eq('menuIngredientID', id);
    fetchData();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Recipe for {menuItem.name}</h2>
          <button onClick={onClose}><MdClose size={24} /></button>
        </div>

        {/* Add New Ingredient to Recipe */}
        <div className="grid grid-cols-3 gap-2 mb-6 bg-gray-50 p-3 rounded-lg">
          <select 
            className="border p-2 rounded-lg text-sm col-span-1"
            value={selectedIngredientId}
            onChange={(e) => setSelectedIngredientId(e.target.value)}
          >
            <option value="">Select Ingredient...</option>
            {availableIngredients.map(ing => (
              <option key={ing.ingredientID} value={ing.ingredientID}>{ing.name} ({ing.unit})</option>
            ))}
          </select>
          <input 
            type="number" 
            placeholder="Qty" 
            className="border p-2 rounded-lg text-sm"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value))}
          />
          <button 
            onClick={addIngredient}
            className="bg-primary text-white rounded-lg flex items-center justify-center gap-2 font-bold"
          >
            <MdAdd /> Add
          </button>
        </div>

        {/* Current Recipe List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {recipeItems.length === 0 && <p className="text-center text-text-muted py-4 text-sm">No ingredients added yet.</p>}
          {recipeItems.map((item) => (
            <div key={item.menuIngredientID} className="flex justify-between items-center border-b py-2 text-sm">
              <span>
                <span className="font-bold">{item.Ingredient?.name}</span>: {item.quantityRequired} {item.Ingredient?.unit}
              </span>
              <button onClick={() => removeIngredient(item.menuIngredientID)} className="text-primary hover:bg-red-50 p-1 rounded">
                <MdDelete size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}