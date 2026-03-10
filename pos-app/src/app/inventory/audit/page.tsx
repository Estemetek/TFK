"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient'; // Adjust based on your path
import { useRouter } from 'next/navigation';
import { MdArrowBack, MdSave } from 'react-icons/md';

export default function EODAuditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [auditCounts, setAuditCounts] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch current ingredients to get the "System Stock"
  useEffect(() => {
    const fetchIngredients = async () => {
      const { data, error } = await supabase
        .from('Ingredient')
        .select('ingredientID, name, currentStock, unit')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching ingredients:', error);
      } else {
        setIngredients(data || []);
        // Initialize the auditCounts state with the current system stock as a default
        const initialCounts: any = {};
        data?.forEach(item => {
          initialCounts[item.ingredientID] = item.currentStock;
        });
        setAuditCounts(initialCounts);
      }
      setLoading(false);
    };

    fetchIngredients();
  }, []);

  const handleInputChange = (id: string, value: string) => {
    setAuditCounts(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  // 2. The Bulk Insert Function
  const handleSubmitAudit = async () => {
    setIsSubmitting(true);
    try {
      // Get current user ID (recordedBy)
      const { data: { user } } = await supabase.auth.getUser();

      // Prepare the rows for InventoryAudit
      const auditRows = ingredients.map(item => {
        const physical = auditCounts[item.ingredientID];
        const system = item.currentStock;
        return {
          ingredientID: item.ingredientID,
          systemStock: system,
          physicalStock: physical,
          variance: physical - system, // The trigger will also re-calc this, but good to send
          recordedBy: user?.id
        };
      });

      // Insert into Supabase
      const { error } = await supabase
        .from('InventoryAudit')
        .insert(auditRows);

      if (error) throw error;

      alert("EOD Audit successfully submitted. Inventory updated!");
      router.push('/inventory'); // Redirect back to main inventory
    } catch (err: any) {
      alert("Audit failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading Audit Sheet...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-black">
          <MdArrowBack /> Back to Inventory
        </button>
        <h1 className="text-2xl font-bold">Manual EOD Stock Audit</h1>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-xs font-semibold uppercase">Ingredient</th>
              <th className="p-4 text-xs font-semibold uppercase text-center">System Stock</th>
              <th className="p-4 text-xs font-semibold uppercase w-40">Physical Count</th>
              <th className="p-4 text-xs font-semibold uppercase text-right">Used Today</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ingredients.map((item) => {
              // MATH FIX: System - Physical = How much we used up
              const consumption = item.currentStock - (auditCounts[item.ingredientID] || 0);
              
              return (
                <tr key={item.ingredientID}>
                  <td className="p-4 font-medium">
                    {item.name}
                  </td>
                  <td className="p-4 text-center text-gray-500">
                    {item.currentStock} <span className="text-[10px]">{item.unit}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                        value={auditCounts[item.ingredientID]}
                        onChange={(e) => handleInputChange(item.ingredientID, e.target.value)}
                      />
                      <span className="text-xs text-gray-400 w-8">{item.unit}</span>
                    </div>
                  </td>
                  <td className={`p-4 text-right font-bold ${consumption > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {/* Displaying the consumption + the unit */}
                    {consumption.toFixed(2)} 
                    <span className="ml-1 text-[10px] font-normal uppercase">{item.unit}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-end">
        <button 
          onClick={handleSubmitAudit}
          disabled={isSubmitting}
          className="bg-black text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-800 disabled:bg-gray-400"
        >
          <MdSave /> {isSubmitting ? 'Finalizing Audit...' : 'Finalize & Submit EOD Audit'}
        </button>
      </div>
    </div>
  );
}