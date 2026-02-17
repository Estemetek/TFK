'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { logout } from '../lib/auth';
import { Sidebar } from '../components/Sidebar';
import {
  MdGridView, MdLocalDining, MdFastfood,
  MdRiceBowl, MdLocalCafe, MdEdit, MdDelete, MdClose, MdImage,
} from 'react-icons/md';
import { RecipeModal } from '../components/RecipeModal';
import { MdReceiptLong } from 'react-icons/md';

// --- TYPES ---
type Category = {
  categoryID: number;
  categoryName: string;
  description: string;
};

type MenuItem = {
  menuItemID: number;
  name: string;
  description?: string;
  price: number;
  regularPrice: number;
  isAvailable: boolean;
  status: string;
  categoryID: number;
  imageUrl?: string;
  Category?: { categoryName: string };
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  UsersAccount?: { username: string }; // Joined data
};

type MenuType = 'Normal Menu' | 'Special Deals' | 'New Year Special' | 'Desserts and Drinks';

const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('chicken')) return <MdLocalDining className="h-6 w-6" />;
  if (n.includes('fries') || n.includes('sides')) return <MdFastfood className="h-6 w-6" />;
  if (n.includes('rice')) return <MdRiceBowl className="h-6 w-6" />;
  if (n.includes('bev') || n.includes('drink')) return <MdLocalCafe className="h-6 w-6" />;
  return <MdGridView className="h-6 w-6" />;
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
  const [selectedMenuType, setSelectedMenuType] = useState<MenuType>('Normal Menu');
  const [loading, setLoading] = useState(true);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [catForm, setCatForm] = useState({
    categoryName: '',
    description: ''
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItemID, setEditingItemID] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    regularPrice: '',
    categoryID: '',
    isAvailable: true,
    imageUrl: ''
  });

  // To edit recipe of menu item
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [activeRecipeItem, setActiveRecipeItem] = useState<MenuItem | null>(null);

  const handleRecipeClick = (item: MenuItem) => {
    setActiveRecipeItem(item);
    setIsRecipeOpen(true);
  };

  // 1. Open drawer and pre-fill data
  const handleEditClick = (item: MenuItem) => {
    setEditingItemID(item.menuItemID);
    setEditForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      regularPrice: item.regularPrice.toString(),
      categoryID: item.categoryID.toString(),
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || ''
    });
    setIsEditOpen(true);
  };

  // 2. Save changes to Supabase
  const handleUpdateItem = async () => {
    if (!editingItemID) return;

    // Get current user ID from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();

    setIsSubmitting(true);
    const { error } = await supabase
      .from('MenuItem')
      .update({
        name: editForm.name,
        description: editForm.description,
        price: parseFloat(editForm.price),
        regularPrice: parseFloat(editForm.regularPrice),
        categoryID: parseInt(editForm.categoryID),
        isAvailable: editForm.isAvailable,
        imageUrl: editForm.imageUrl,
        updatedBy: user?.id, // Track who is making this update
      })
      .eq('menuItemID', editingItemID);

    if (error) {
      alert(error.message);
    } else {
      setIsEditOpen(false);
      fetchAllData(); // Refresh the table
    }
    setIsSubmitting(false);
  };

  // Handle the Supabase insertion for adding a new category
  const handleAddCategory = async () => {
    if (!catForm.categoryName) {
      alert("Please enter a category name.");
      return;
    }

    setCategorySubmitting(true);
    const { error } = await supabase
      .from('Category')
      .insert([{ 
        categoryName: catForm.categoryName, 
        description: catForm.description 
      }]);

    if (error) {
      alert(error.message);
    } else {
      setIsCategoryOpen(false);
      setCatForm({ categoryName: '', description: '' });
      fetchAllData(); // Refresh the category list
    }
    setCategorySubmitting(false);
  };

  // Form & Drawer State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    regularPrice: '',
    categoryID: '',
    isAvailable: true,
    imageUrl: ''
  });

  const activeNav = 'Menu';

  /// --- Updated Data Fetching ---
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    
    // Fetch Menu Items with Category AND the User who updated it
    const [{ data: catData }, { data: menuData }] = await Promise.all([
    supabase.from('Category').select('*').order('categoryName'),
    supabase
      .from('MenuItem')
      .select('*, Category(categoryName), UsersAccount:updatedBy(username)')
      .order('name')
  ]);
    
    if (catData) setCategories(catData);
    if (menuData) setMenuItems(menuData as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- HANDLERS ---
  const handleLogout = async () => {
    await logout();
  };

  const handleAddItem = async () => {
    if (!form.name || !form.price || !form.categoryID) {
      alert("Please fill in Name, Price, and Category.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('MenuItem').insert([{
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      regularPrice: parseFloat(form.regularPrice || form.price),
      categoryID: parseInt(form.categoryID),
      isAvailable: form.isAvailable,
      imageUrl: form.imageUrl,
      status: 'Active'
    }]);

    if (error) {
      alert(error.message);
    } else {
      setIsAddOpen(false);
      setForm({ name: '', description: '', price: '', regularPrice: '', categoryID: '', isAvailable: true, imageUrl: '' });
      fetchAllData();
    }
    setIsSubmitting(false);
  };

  const filteredItems = menuItems.filter(item => 
    selectedCatID === 'all' || item.categoryID === selectedCatID
  );

  const menuTypes: MenuType[] = ['Normal Menu', 'Special Deals', 'New Year Special', 'Desserts and Drinks'];

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      <div className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'}`}>
        
        {/* Sidebar */}
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

        {/* Main Content */}
        <main className="space-y-5 p-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setCollapsed(!collapsed)} className="h-9 w-9 bg-white rounded-full shadow flex items-center justify-center text-lg font-bold">{collapsed ? '›' : '‹'}</button>
              <p className="text-xl font-bold">Menu</p>
            </div>
          </header>

          {/* Categories Section */}
          <section className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold">Categories</p>
              <button 
                onClick={() => setIsCategoryOpen(true)} // Add this line
                className="rounded-lg bg-[#b80f24] px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-primary-dark"
              >
                Add New Category
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              <div 
                onClick={() => setSelectedCatID('all')}
                className={`cursor-pointer min-w-35 rounded-xl p-4 shadow transition ${selectedCatID === 'all' ? 'bg-[#b80f24] text-white' : 'bg-[#E5E5E5] text-[#1E1E1E]'}`}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${selectedCatID === 'all' ? 'bg-white text-[#b80f24]' : 'bg-white text-[#b80f24]'}`}>
                    <MdGridView className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">All</p>
                    <p className="text-xs opacity-80">{menuItems.length} Items</p>
                  </div>
                </div>
              </div>
              {categories.map((c) => {
                const count = menuItems.filter(item => item.categoryID === c.categoryID).length;
                return (
                  <div 
                    key={c.categoryID}
                    onClick={() => setSelectedCatID(c.categoryID)}
                    className={`cursor-pointer min-w-35 rounded-xl p-4 shadow transition ${selectedCatID === c.categoryID ? 'bg-[#b80f24] text-white' : 'bg-[#E5E5E5] text-[#1E1E1E]'}`}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${selectedCatID === c.categoryID ? 'bg-white text-[#b80f24]' : 'bg-white text-[#b80f24]'}`}>
                        {getCategoryIcon(c.categoryName)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{c.categoryName}</p>
                        <p className="text-xs opacity-80">{count} Items</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Menu Items Section */}
          <section className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold">All Menu Items</p>
              <button 
                onClick={() => setIsAddOpen(true)}
                className="rounded-lg bg-[#b80f24] px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-primary-dark"
              >
                Add Menu Item
              </button>
            </div>

            {/* Menu Type Tabs */}
            <div className="mb-4 flex gap-2 border-b border-gray-200">
              {menuTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedMenuType(type)}
                  className={`px-4 py-2 text-xs font-bold transition ${
                    selectedMenuType === type
                      ? 'border-b-2 border-[#b80f24] text-[#b80f24] bg-[#b80f24]/5'
                      : 'text-gray-600 hover:text-[#b80f24]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-bold text-gray-600 uppercase">
                    {/* <th className="w-10 p-3">
                      <input type="checkbox" className="h-4 w-4 accent-[#b80f24]" />
                    </th> */}
                    <th className="p-3">Product</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Item ID</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Availability</th>
                    <th className="p-3">Actions done</th> {/* The audit trail */}
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.menuItemID} className="hover:bg-gray-50">
                      {/* <td className="p-3">
                        <input type="checkbox" className="h-4 w-4 accent-[#b80f24]" />
                      </td> */}
                      <td className="p-3">
                        <div className="h-12 w-12 rounded-lg bg-gray-200 overflow-hidden">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                              <MdImage className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-bold text-[#1E1E1E]">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.description || 'No description'}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        {/* Item ID COLUMN */}
                        <span className="text-sm font-semibold text-gray-700">#{item.menuItemID.toString().padStart(8, '0')}</span>
                      </td>
                      <td className="p-3">
                        {/* Stock COLUMN - STATIC DATA*/}
                        <span className="text-sm font-semibold text-gray-700">119 Items</span>
                      </td>
                      <td className="p-3">
                        {/* Category COLUMN */}
                        <span className="text-sm font-semibold text-gray-700">{item.Category?.categoryName || 'Uncategorized'}</span>
                      </td>
                      <td className="p-3">
                        {/* Price COLUMN */}
                        <span className="text-sm font-bold text-[#1E1E1E]">₱ {item.price.toFixed(2)}</span>
                      </td>
                      <td className="p-3">
                        {/* Availability COLUMN */}
                        <Availability value={item.isAvailable} />
                      </td>
                      {/* Actions Done COLUMN */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-[#1E1E1E]">
                            {item.UsersAccount?.username || 'Initial Setup'}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(item.updatedAt).toLocaleDateString()} at {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      {/* Actions COLUMN */}
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          {/* RECIPE BUTTON */}
                          <button 
                            onClick={() => handleRecipeClick(item)}
                            className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors"
                            title="Manage Recipe"
                          >
                            <MdReceiptLong className="h-4 w-4 text-blue-600" />
                          </button>

                          <button 
                            onClick={() => handleEditClick(item)} // Add this line
                            className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                          >
                            <MdEdit className="h-4 w-4 text-gray-700" />
                          </button>
                          <button className="h-8 w-8 rounded-lg bg-[#b80f24] text-white flex items-center justify-center shadow hover:bg-primary-dark">
                            <MdDelete className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-gray-500 text-sm">
                        No menu items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* --- ADD CATEGORY DRAWER --- */}
      <RightDrawer 
        open={isCategoryOpen} 
        title="Add New Category" 
        onClose={() => setIsCategoryOpen(false)}
      >
        <div className="space-y-5">
          <Field label="Category Name">
            <input
              value={catForm.categoryName}
              onChange={(e) => setCatForm({ ...catForm, categoryName: e.target.value })}
              placeholder="e.g. Main Course, Appetizers"
              className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Enter category description"
              rows={4}
              className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none resize-none"
            />
          </Field>

          <div className="pt-5 flex justify-end gap-3 border-t">
            <button 
              onClick={() => setIsCategoryOpen(false)} 
              className="px-6 py-2 text-xs font-bold text-[#6D6D6D]"
            >
              Cancel
            </button>
            <button 
              disabled={categorySubmitting}
              onClick={handleAddCategory}
              className="rounded-lg bg-[#b80f24] px-8 py-2 text-xs font-bold text-white shadow hover:bg-[#6d0f2a] disabled:opacity-50"
            >
              {categorySubmitting ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </div>
      </RightDrawer>

      {/* --- ADD MENU ITEM DRAWER --- */}
      <RightDrawer open={isAddOpen} title="Add New Menu Item" onClose={() => setIsAddOpen(false)}>
        <div className="space-y-5">
          <Field label="Product Image">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
                <MdImage className="h-10 w-10" />
              </div>
              {/* FOR MENU IMAGE*/}
              <Field label="Product Image">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="Paste image URL here"
                      className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none"
                    />
                    <p className="mt-1 text-[10px] text-gray-500">Paste a link to an image (e.g. from Unsplash or Pinterest)</p>
                  </div>
                </div>
              </Field>
            </div>
          </Field>

          <Field label="Item Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Taiwan Fried Chicken"
              className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter product description"
              rows={3}
              className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Price ($)">
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none"
              />
            </Field>
            <Field label="Regular Price ($)">
              <input
                type="number"
                value={form.regularPrice}
                onChange={(e) => setForm({ ...form, regularPrice: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none"
              />
            </Field>
          </div>

          <Field label="Category">
            <select
              value={form.categoryID}
              onChange={(e) => setForm({ ...form, categoryID: e.target.value })}
              className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none appearance-none"
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
                className="h-4 w-4 accent-[#b80f24]"
              />
              <span className="text-xs font-semibold text-[#6D6D6D]">Available for order</span>
            </div>
          </Field>

          <div className="pt-5 flex justify-end gap-3 border-t">
            <button onClick={() => setIsAddOpen(false)} className="px-6 py-2 text-xs font-bold text-[#6D6D6D]">Cancel</button>
            <button 
              disabled={isSubmitting}
              onClick={handleAddItem}
              className="rounded-lg bg-[#b80f24] px-8 py-2 text-xs font-bold text-white shadow hover:bg-[#6d0f2a] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </div>
      </RightDrawer>

      {/* --- EDIT MENU ITEM DRAWER --- */}
      <RightDrawer open={isEditOpen} title="Edit Menu Item" onClose={() => setIsEditOpen(false)}>
        <div className="space-y-5">
          <Field label="Product Image">
            <div className="flex flex-col gap-2">
              {editForm.imageUrl && (
                <img src={editForm.imageUrl} alt="Preview" className="h-32 w-full object-cover rounded-lg border" />
              )}
              <input
                type="text"
                value={editForm.imageUrl}
                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                placeholder="Paste image URL here"
                className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none"
              />
            </div>
          </Field>

          <Field label="Item Name">
            <input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Price (₱)">
              <input
                type="number"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none"
              />
            </Field>
            <Field label="Regular Price (₱)">
              <input
                type="number"
                value={editForm.regularPrice}
                onChange={(e) => setEditForm({ ...editForm, regularPrice: e.target.value })}
                className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none"
              />
            </Field>
          </div>

          <Field label="Category">
            <select
              value={editForm.categoryID}
              onChange={(e) => setEditForm({ ...editForm, categoryID: e.target.value })}
              className="w-full rounded-md bg-[#F3F3F3] px-3 py-3 text-xs outline-none"
            >
              {categories.map((c) => (
                <option key={c.categoryID} value={c.categoryID}>{c.categoryName}</option>
              ))}
            </select>
          </Field>

          <Field label="Availability">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editForm.isAvailable}
                onChange={(e) => setEditForm({ ...editForm, isAvailable: e.target.checked })}
                className="h-4 w-4 accent-[#b80f24]"
              />
              <span className="text-xs font-semibold text-[#6D6D6D]">In Stock / Available</span>
            </div>
          </Field>

          <div className="pt-5 flex justify-end gap-3 border-t">
            <button onClick={() => setIsEditOpen(false)} className="px-6 py-2 text-xs font-bold text-[#6D6D6D]">Cancel</button>
            <button 
              disabled={isSubmitting}
              onClick={handleUpdateItem}
              className="rounded-lg bg-[#b80f24] px-8 py-2 text-xs font-bold text-white shadow hover:bg-[#6d0f2a] disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Item'}
            </button>
          </div>
        </div>
      </RightDrawer>

      {/* --- RECIPE MODAL --- */}
      {isRecipeOpen && activeRecipeItem && (
        <RecipeModal 
          menuItem={activeRecipeItem} 
          onClose={() => {
            setIsRecipeOpen(false);
            setActiveRecipeItem(null);
          }} 
        />
      )}
    </div>
  );
}