'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { Sidebar } from '../components/Sidebar';
import {
  MdGridView, MdLocalDining, MdFastfood,
  MdRiceBowl, MdLocalCafe, MdEdit, MdDelete, MdClose, MdImage,
} from 'react-icons/md';

// --- TYPES ---
type Category = {
  categoryID: number;
  categoryName: string;
  description: string;
};

type MenuItem = {
  menuItemID: number;
  name: string;
  price: number;
  regularPrice: number;
  isAvailable: boolean;
  status: string;
  categoryID: number;
  Category?: { categoryName: string };
};

const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('chicken')) return <MdLocalDining className="h-5 w-5" />;
  if (n.includes('fries') || n.includes('sides')) return <MdFastfood className="h-5 w-5" />;
  if (n.includes('rice')) return <MdRiceBowl className="h-5 w-5" />;
  if (n.includes('bev') || n.includes('drink')) return <MdLocalCafe className="h-5 w-5" />;
  return <MdGridView className="h-5 w-5" />;
};

// --- SUB-COMPONENTS ---
const Availability = ({ value }: { value: boolean }) => (
  <span className={`text-[11px] font-extrabold ${value ? 'text-[#1E8E5A]' : 'text-[#D61F2C]'}`}>
    {value ? 'In Stock' : 'Out of Stock'}
  </span>
);

function RightDrawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60">
      <div className="absolute inset-0 bg-black/60 transition-opacity duration-200" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full justify-end">
        <div 
          className="h-full w-full max-w-2xl rounded-l-[28px] bg-white shadow-2xl transition-transform duration-300 ease-out"
          style={{
            transform: open ? 'translateX(0)' : 'translateX(100%)',
          }}
        >
          <div className="flex items-center justify-between px-6 pt-6">
            <p className="text-sm font-extrabold text-[#1E1E1E]">{title}</p>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-[#E7E7E7] text-[#1E1E1E] shadow">
              <MdClose className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 h-px w-full bg-black/10" />
          <div className="h-[calc(100%-76px)] overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-extrabold text-[#1E1E1E]">{label}</p>
      {children}
    </div>
  );
}

// --- MAIN PAGE ---
export default function MenuPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCatID, setSelectedCatID] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);

  // Form & Drawer State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    price: '',
    regularPrice: '',
    categoryID: '',
    isAvailable: true
  });

  const activeNav = 'Menu';

  // --- DATA FETCHING ---
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    // Fetch Categories
    const { data: catData } = await supabase.from('Category').select('*').order('categoryName');
    if (catData) setCategories(catData);

    // Fetch Menu Items
    const { data: menuData } = await supabase
      .from('MenuItem')
      .select('*, Category ( categoryName )')
      .order('name');
    if (menuData) setMenuItems(menuData as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- HANDLERS ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddItem = async () => {
    if (!form.name || !form.price || !form.categoryID) {
      alert("Please fill in Name, Price, and Category.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('MenuItem').insert([{
      name: form.name,
      price: parseFloat(form.price),
      regularPrice: parseFloat(form.regularPrice || form.price),
      categoryID: parseInt(form.categoryID),
      isAvailable: form.isAvailable,
      status: 'Active'
    }]);

    if (error) {
      alert(error.message);
    } else {
      setIsAddOpen(false);
      setForm({ name: '', price: '', regularPrice: '', categoryID: '', isAvailable: true });
      fetchAllData();
    }
    setIsSubmitting(false);
  };

  const filteredItems = menuItems.filter(item => 
    selectedCatID === 'all' || item.categoryID === selectedCatID
  );

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      <div className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'}`}>
        
        {/* Sidebar */}
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

        {/* Main Content */}
        <main className="space-y-4 p-4 md:p-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 bg-white rounded-full shadow">{collapsed ? '›' : '‹'}</button>
              <p className="text-[13px] font-semibold">Menu Management</p>
            </div>
          </header>

          {/* Categories Section */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-extrabold">Categories</p>
              <button className="rounded-md bg-[#B80F24] px-4 py-2 text-[12px] font-extrabold text-white shadow">Add Category</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
               <div 
                onClick={() => setSelectedCatID('all')}
                className={`cursor-pointer min-w-35 rounded-2xl p-3 shadow transition ${selectedCatID === 'all' ? 'bg-[#B80F24] text-white' : 'bg-[#E7E7E7]'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-[#B80F24]"><MdGridView /></span>
                  <div>
                    <p className="text-[12px] font-extrabold">All Items</p>
                    <p className="text-[10px] opacity-70">{menuItems.length} items</p>
                  </div>
                </div>
              </div>
              {categories.map((c) => (
                <div 
                  key={c.categoryID}
                  onClick={() => setSelectedCatID(c.categoryID)}
                  className={`cursor-pointer min-w-35 rounded-2xl p-3 shadow transition ${selectedCatID === c.categoryID ? 'bg-[#B80F24] text-white' : 'bg-[#E7E7E7]'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-[#B80F24]">{getCategoryIcon(c.categoryName)}</span>
                    <div>
                      <p className="text-[12px] font-extrabold">{c.categoryName}</p>
                      <p className="text-[10px] opacity-70">Category</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Menu Items Table */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-extrabold">Products</p>
              <button 
                onClick={() => setIsAddOpen(true)}
                className="rounded-md bg-[#B80F24] px-4 py-2 text-[12px] font-extrabold text-white shadow"
              >
                Add Menu Item
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-black/5">
              <div className="grid grid-cols-[1.5fr_100px_120px_100px_100px_120px_100px] gap-4 bg-[#F7F7F7] px-4 py-3 text-[10px] font-extrabold text-[#6D6D6D] uppercase">
                <div>Product Name</div>
                <div>Item ID</div>
                <div>Category</div>
                <div>Price</div>
                <div>Reg. Price</div>
                <div>Status</div>
                <div className="text-right">Action</div>
              </div>

              <div className="divide-y divide-black/5">
                {filteredItems.map((item) => (
                  <div key={item.menuItemID} className="grid grid-cols-[1.5fr_100px_120px_100px_100px_120px_100px] items-center px-4 py-4 text-[11px]">
                    <div className="font-extrabold text-[#1E1E1E]">{item.name}</div>
                    <div className="font-semibold text-[#6D6D6D]">#{item.menuItemID}</div>
                    <div className="font-semibold text-[#6D6D6D]">{item.Category?.categoryName || 'Uncategorized'}</div>
                    <div className="font-extrabold text-[#B80F24]">${item.price.toFixed(2)}</div>
                    <div className="font-semibold text-[#8A8A8A] line-through">${item.regularPrice.toFixed(2)}</div>
                    <div><Availability value={item.isAvailable} /></div>
                    <div className="flex justify-end gap-2">
                      <button className="h-7 w-7 rounded-full bg-[#F3F3F3] flex items-center justify-center shadow hover:bg-gray-200"><MdEdit className="h-3.5 w-3.5" /></button>
                      <button className="h-7 w-7 rounded-full bg-[#B80F24] text-white flex items-center justify-center shadow hover:bg-red-700"><MdDelete className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="p-10 text-center text-[#8A8A8A] text-[12px]">No menu items found.</div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* --- ADD MENU ITEM DRAWER --- */}
      <RightDrawer open={isAddOpen} title="Add New Menu Item" onClose={() => setIsAddOpen(false)}>
        <div className="space-y-5">
          <Field label="Item Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Taiwan Fried Chicken"
              className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-[12px] outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Price ($)">
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-[12px] outline-none"
              />
            </Field>
            <Field label="Regular Price ($)">
              <input
                type="number"
                value={form.regularPrice}
                onChange={(e) => setForm({ ...form, regularPrice: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-[12px] outline-none"
              />
            </Field>
          </div>

          <Field label="Category">
            <select
              value={form.categoryID}
              onChange={(e) => setForm({ ...form, categoryID: e.target.value })}
              className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-[12px] outline-none appearance-none"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.categoryID} value={c.categoryID}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Availability">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                className="h-4 w-4 accent-[#B80F24]"
              />
              <span className="text-[12px] font-semibold text-[#6D6D6D]">Available for order</span>
            </div>
          </Field>

          <div className="pt-5 flex justify-end gap-3 border-t">
            <button onClick={() => setIsAddOpen(false)} className="px-6 py-2 text-[12px] font-bold text-[#6D6D6D]">Cancel</button>
            <button 
              disabled={isSubmitting}
              onClick={handleAddItem}
              className="rounded-md bg-[#B80F24] px-8 py-2 text-[12px] font-extrabold text-white shadow hover:bg-[#a00d1f] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </div>
      </RightDrawer>
    </div>
  );
}