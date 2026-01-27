'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { logout } from '../lib/auth';
import { Sidebar } from '../components/Sidebar';
import { MdEdit, MdDelete, MdClose, MdWarning } from 'react-icons/md';
import React from 'react';

// 1. Types strictly matching your SQL schema
type InventoryItem = {
  ingredientID: number;
  name: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  costPerUnit: number;
  updatedAt: string;
};

export default function InventoryPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const activeNav = 'Inventory';

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Ingredient')
      .select('ingredientID, name, unit, currentStock, reorderLevel, costPerUnit, updatedAt')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error);
    } else {
      setInventoryItems(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSave = async (data: any) => {
    // We only include columns that EXIST in your SQL table
    const payload = {
      name: data.name,
      unit: data.unit,
      currentStock: Number(data.quantity),
      reorderLevel: Number(data.reorderLevel),
      costPerUnit: parseFloat(data.price),
      updatedAt: new Date().toISOString(),
    };

    try {
      let error;
      if (editItem) {
        const { error: updateError } = await supabase
          .from('Ingredient')
          .update(payload)
          .eq('ingredientID', editItem.ingredientID);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('Ingredient')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      await fetchInventory();
      setShowAddModal(false);
      setShowEditModal(false);
      setEditItem(null);
    } catch (err: any) {
      console.error("Database Error:", err);
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this ingredient?')) {
      await supabase.from('Ingredient').delete().eq('ingredientID', id);
      fetchInventory();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'}`}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

        <main className="space-y-5 p-5 md:p-7">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-card-border">
            <div className="flex items-center gap-3">
              <button onClick={() => setCollapsed((c) => !c)} className="grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-card-border">
                {collapsed ? '›' : '‹'}
              </button>
              <h1 className="text-lg font-semibold">Inventory Control</h1>
            </div>
          </header>

          <section className="rounded-xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-card-border">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">{inventoryItems.length}</span>
                <span className="text-sm text-text-muted">Total Ingredients</span>
              </div>
              <button onClick={() => setShowAddModal(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow">
                Add New Ingredient
              </button>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-card-border h-fit">
               <p className="text-sm font-semibold mb-4">Stock Overview</p>
               <div className="flex justify-between text-sm">
                  <span>Low Stock Items:</span>
                  <span className="text-red-500 font-bold">
                      {inventoryItems.filter(i => i.currentStock <= i.reorderLevel).length}
                  </span>
               </div>
            </div>

            <div className="space-y-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-card-border">
              {loading ? (
                <p className="p-10 text-center text-text-muted">Loading...</p>
              ) : (
                inventoryItems.map((item) => {
                  const isLowStock = item.currentStock <= item.reorderLevel;
                  return (
                    <div key={item.ingredientID} className="flex flex-col gap-3 rounded-lg bg-white px-3 py-3 shadow-sm ring-1 ring-card-border md:flex-row md:items-center">
                      <div className="flex flex-1 items-center gap-3">
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${isLowStock ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
                           {isLowStock ? <MdWarning size={24} /> : '📦'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="text-xs text-text-muted">
                            Stock: <span className={`font-bold ${isLowStock ? 'text-red-500' : 'text-primary'}`}>{item.currentStock} {item.unit}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-text-muted font-bold">Unit Cost</span>
                          <span>${item.costPerUnit.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] uppercase text-text-muted font-bold">Last Updated</span>
                          <span className="text-xs">{new Date(item.updatedAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditItem(item); setShowEditModal(true); }} className="p-2 rounded-full hover:bg-gray-100 text-text-muted"><MdEdit /></button>
                          <button onClick={() => handleDelete(item.ingredientID)} className="p-2 rounded-full hover:bg-red-50 text-primary"><MdDelete /></button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </main>
      </div>

      <AddIngredientModal
        open={showAddModal || showEditModal}
        title={showEditModal ? "Edit Ingredient" : "Add New Ingredient"}
        initialData={editItem}
        onClose={() => { setShowAddModal(false); setShowEditModal(false); setEditItem(null); }}
        onSave={handleSave}
      />
    </div>
  );
}

function AddIngredientModal({ open, onClose, onSave, title, initialData }: any) {
  const [formData, setFormData] = useState({
    name: '',
    quantity: 0,
    unit: 'pcs',
    reorderLevel: 5,
    price: '0.00',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        quantity: initialData.currentStock,
        unit: initialData.unit,
        reorderLevel: initialData.reorderLevel,
        price: initialData.costPerUnit.toString(),
      });
    } else {
      setFormData({ name: '', quantity: 0, unit: 'pcs', reorderLevel: 5, price: '0.00' });
    }
  }, [initialData, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg bg-white h-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose}><MdClose size={24} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold block mb-1">Ingredient Name</label>
            <input className="w-full border rounded-lg p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Flour" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">Current Stock</label>
              <input type="number" className="w-full border rounded-lg p-2" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">Unit</label>
              <input className="w-full border rounded-lg p-2" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="kg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">Reorder Level</label>
              <input type="number" className="w-full border rounded-lg p-2" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">Cost Per Unit</label>
              <input type="number" step="0.01" className="w-full border rounded-lg p-2" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
          </div>

          <div className="pt-6 flex gap-3">
             <button onClick={onClose} className="flex-1 border p-2 rounded-lg font-bold">Cancel</button>
             <button onClick={() => onSave(formData)} className="flex-1 bg-primary text-white p-2 rounded-lg font-bold">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}