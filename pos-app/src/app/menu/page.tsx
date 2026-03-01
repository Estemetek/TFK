'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { logout } from '../lib/auth';
import { Sidebar } from '../components/Sidebar';
import {
  MdGridView,
  MdLocalDining,
  MdFastfood,
  MdRiceBowl,
  MdLocalCafe,
  MdEdit,
  MdDelete,
  MdClose,
  MdImage,
  MdSearch,
  MdTune,
  MdReceiptLong,
  MdCheckCircle,
  MdCancel,
} from 'react-icons/md';
import { RecipeModal } from '../components/RecipeModal';
import { syncMenuAvailability } from '../lib/syncMenuAvailability';

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
  UsersAccount?: { username: string };
};

type MenuType = 'Normal Menu' | 'Special Deals' | 'New Year Special' | 'Desserts and Drinks';

const PRIMARY = '#b80f24';
const PRIMARY_DARK = '#6d0f2a';
const BG = '#F3F3F3';
const TEXT = '#1E1E1E';

const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('chicken')) return <MdLocalDining className="h-6 w-6" />;
  if (n.includes('fries') || n.includes('sides')) return <MdFastfood className="h-6 w-6" />;
  if (n.includes('rice')) return <MdRiceBowl className="h-6 w-6" />;
  if (n.includes('bev') || n.includes('drink')) return <MdLocalCafe className="h-6 w-6" />;
  return <MdGridView className="h-6 w-6" />;
};

const AvailabilityPill = ({ value }: { value: boolean }) => (
  <span
    className={[
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold',
      value ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
    ].join(' ')}
  >
    {value ? <MdCheckCircle className="h-4 w-4" /> : <MdCancel className="h-4 w-4" />}
    {value ? 'In Stock' : 'Unavailable'}
  </span>
);

function RightDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);

    // basic focus
    setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button');
      el?.focus();
    }, 0);

    // lock scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full justify-end">
        <div
          ref={panelRef}
          className="h-full w-full max-w-2xl rounded-l-[28px] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between px-6 pt-6">
            <p className="text-sm font-extrabold" style={{ color: TEXT }}>
              {title}
            </p>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-[#E7E7E7] text-[#1E1E1E] shadow"
              aria-label="Close"
            >
              <MdClose className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 h-px w-full bg-black/10" />
          <div className="h-[calc(100%-84px)] overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-extrabold" style={{ color: TEXT }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-xl bg-[#F3F3F3] px-3 py-3 text-xs outline-none ring-1 ring-transparent',
        'focus:ring-2 focus:ring-[#b80f24]/35',
        props.className || '',
      ].join(' ')}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        'w-full rounded-xl bg-[#F3F3F3] px-3 py-3 text-xs outline-none resize-none ring-1 ring-transparent',
        'focus:ring-2 focus:ring-[#b80f24]/35',
        props.className || '',
      ].join(' ')}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        'w-full rounded-xl bg-[#F3F3F3] px-3 py-3 text-xs outline-none appearance-none ring-1 ring-transparent',
        'focus:ring-2 focus:ring-[#b80f24]/35',
        props.className || '',
      ].join(' ')}
    />
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
  className,
  type = 'button',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        'rounded-xl px-5 py-2.5 text-xs font-extrabold text-white shadow',
        'transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed',
        className || '',
      ].join(' ')}
      style={{ backgroundColor: PRIMARY }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_DARK;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-5 py-2.5 text-xs font-extrabold text-[#6D6D6D] hover:bg-black/5 transition"
      type="button"
    >
      {children}
    </button>
  );
}

// --- MAIN PAGE ---
export default function MenuPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCatID, setSelectedCatID] = useState<number | 'all'>('all');

  const menuTypes: MenuType[] = ['Normal Menu', 'Special Deals', 'New Year Special', 'Desserts and Drinks'];
  const [selectedMenuType, setSelectedMenuType] = useState<MenuType>('Normal Menu');

  const [loading, setLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'in' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'updated_desc'>('name');

  // Drawers
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [catForm, setCatForm] = useState({ categoryName: '', description: '' });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingItemID, setEditingItemID] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    regularPrice: '',
    categoryID: '',
    isAvailable: false, // default to out of stock, sync logic will update
    imageUrl: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    regularPrice: '',
    categoryID: '',
    isAvailable: true,
    imageUrl: '',
  });

  // Recipe modal
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [activeRecipeItem, setActiveRecipeItem] = useState<MenuItem | null>(null);

  const activeNav = 'Menu';

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    const [{ data: catData, error: catErr }, { data: menuData, error: menuErr }] = await Promise.all([
      supabase.from('Category').select('*').order('categoryName'),
      supabase
        .from('MenuItem')
        .select('*, Category(categoryName), UsersAccount:updatedBy(username)')
        .order('name'),
    ]);

    if (catErr) console.error(catErr);
    if (menuErr) console.error(menuErr);

    if (catData) setCategories(catData as Category[]);
    if (menuData) setMenuItems((menuData as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function runSyncAndFetch() {
      await syncMenuAvailability();
      await fetchAllData();
    }
    runSyncAndFetch();
  }, [fetchAllData]);

  const handleLogout = async () => {
    await logout();
  };

  const categoryCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of menuItems) {
      if (item.status?.toLowerCase() === 'archived') continue;
      map.set(item.categoryID, (map.get(item.categoryID) || 0) + 1);
    }
    return map;
  }, [menuItems]);

  const visibleItems = useMemo(() => {
    // base (exclude archived)
    let items = menuItems.filter((i) => (i.status || '').toLowerCase() !== 'archived');

    // category filter
    if (selectedCatID !== 'all') items = items.filter((i) => i.categoryID === selectedCatID);

    // menu type filter (best-effort)
    // If your DB already uses status like "Special Deals", it will filter correctly.
    // Otherwise, "Normal Menu" will show all active items.
    if (selectedMenuType !== 'Normal Menu') items = items.filter((i) => i.status === selectedMenuType);

    // search
    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter((i) => {
        const cat = i.Category?.categoryName?.toLowerCase() || '';
        return (
          i.name.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          cat.includes(q) ||
          String(i.menuItemID).includes(q)
        );
      });
    }

    // availability
    if (availabilityFilter === 'in') items = items.filter((i) => i.isAvailable);
    if (availabilityFilter === 'out') items = items.filter((i) => !i.isAvailable);

    // sort
    const sorted = [...items];
    sorted.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'updated_desc') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return 0;
    });

    return sorted;
  }, [menuItems, selectedCatID, selectedMenuType, query, availabilityFilter, sortBy]);

  const openAddDrawer = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      regularPrice: '',
      categoryID: '',
      isAvailable: false, // default to out of stock, sync logic will update
      imageUrl: '',
    });
    setIsAddOpen(true);
  };

  const handleAddCategory = async () => {
    if (!catForm.categoryName.trim()) {
      alert('Please enter a category name.');
      return;
    }

    setCategorySubmitting(true);
    const { error } = await supabase.from('Category').insert([
      { categoryName: catForm.categoryName.trim(), description: catForm.description.trim() },
    ]);

    if (error) {
      alert(error.message);
    } else {
      setIsCategoryOpen(false);
      setCatForm({ categoryName: '', description: '' });
      fetchAllData();
    }
    setCategorySubmitting(false);
  };

  const handleAddItem = async () => {
    if (!form.name.trim() || !form.price || !form.categoryID) {
      alert('Please fill in Name, Price, and Category.');
      return;
    }

    const price = Number(form.price);
    const regular = form.regularPrice ? Number(form.regularPrice) : price;

    if (Number.isNaN(price) || Number.isNaN(regular)) {
      alert('Please enter valid prices.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('MenuItem').insert([
      {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        regularPrice: regular,
        categoryID: Number(form.categoryID),
        isAvailable: false, // default to out of stock, sync logic will update
        imageUrl: form.imageUrl.trim() || null,
        status: 'Active',
      },
    ]);

    if (error) {
      alert(error.message);
    } else {
      setIsAddOpen(false);
      fetchAllData();
    }
    setIsSubmitting(false);
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingItemID(item.menuItemID);
    setEditForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price ?? ''),
      regularPrice: String(item.regularPrice ?? ''),
      categoryID: String(item.categoryID ?? ''),
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItemID) return;

    const price = Number(editForm.price);
    const regular = Number(editForm.regularPrice);

    if (!editForm.name.trim() || !editForm.categoryID) {
      alert('Name and Category are required.');
      return;
    }
    if (Number.isNaN(price) || Number.isNaN(regular)) {
      alert('Please enter valid prices.');
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('MenuItem')
      .update({
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        price,
        regularPrice: regular,
        categoryID: Number(editForm.categoryID),
        // isAvailable is managed by sync logic, not editable here
        imageUrl: editForm.imageUrl.trim() || null,
        updatedBy: user?.id,
      })
      .eq('menuItemID', editingItemID);

    if (error) {
      alert(error.message);
    } else {
      setIsEditOpen(false);
      setEditingItemID(null);
      fetchAllData();
    }
    setIsSubmitting(false);
  };

  const handleDeleteItem = async (item: MenuItem) => {
    const ok = confirm(`Archive "${item.name}"?\n\nThis will hide it from the list (you can unarchive later if you implement it).`);
    if (!ok) return;

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('MenuItem')
      .update({
        status: 'Archived',
        isAvailable: false,
        updatedBy: user?.id,
      })
      .eq('menuItemID', item.menuItemID);

    if (error) {
      alert(error.message);
    } else {
      fetchAllData();
    }
    setIsSubmitting(false);
  };

  const handleRecipeClick = (item: MenuItem) => {
    setActiveRecipeItem(item);
    setIsRecipeOpen(true);
  };

  const totalVisibleCount = useMemo(() => menuItems.filter((i) => (i.status || '').toLowerCase() !== 'archived').length, [menuItems]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, color: TEXT }}>
      <div
        className={[
          'grid min-h-screen transition-[grid-template-columns] duration-200',
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]',
        ].join(' ')}
      >
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

        <main className="space-y-5 p-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="h-10 w-10 rounded-full bg-white shadow flex items-center justify-center text-lg font-bold hover:bg-black/5 transition"
                aria-label="Toggle sidebar"
              >
                {collapsed ? '›' : '‹'}
              </button>
              <div>
                <p className="text-xl font-extrabold">Menu</p>
                <p className="text-xs text-black/45">Manage categories, items, pricing, and availability.</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-white px-4 py-2 text-xs font-extrabold shadow hover:bg-black/5 transition"
              type="button"
            >
              Logout
            </button>
          </header>

          {/* Categories */}
          <section className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold">Categories</p>
                <p className="text-xs text-black/45">Tap a category to filter items.</p>
              </div>

              <div className="flex items-center gap-2">
                <PrimaryButton onClick={() => setIsCategoryOpen(true)}>Add New Category</PrimaryButton>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {/* All */}
              <button
                type="button"
                onClick={() => setSelectedCatID('all')}
                className={[
                  'min-w-150px text-left rounded-2xl p-4 shadow-sm ring-1 transition',
                  selectedCatID === 'all'
                    ? 'bg-[#b80f24] text-white ring-[#b80f24]'
                    : 'bg-[#F7F7F7] text-[#1E1E1E] ring-black/5 hover:bg-black/0.03',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      'h-12 w-12 rounded-2xl grid place-items-center',
                      selectedCatID === 'all' ? 'bg-white text-[#b80f24]' : 'bg-white text-[#b80f24]',
                    ].join(' ')}
                  >
                    <MdGridView className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">All</p>
                    <p className={['text-xs', selectedCatID === 'all' ? 'text-white/85' : 'text-black/45'].join(' ')}>
                      {totalVisibleCount} Items
                    </p>
                  </div>
                </div>
              </button>

              {categories.map((c) => {
                const count = categoryCounts.get(c.categoryID) || 0;
                const active = selectedCatID === c.categoryID;

                return (
                  <button
                    key={c.categoryID}
                    type="button"
                    onClick={() => setSelectedCatID(c.categoryID)}
                    className={[
                      'min-w-170px text-left rounded-2xl p-4 shadow-sm ring-1 transition',
                      active
                        ? 'bg-[#b80f24] text-white ring-[#b80f24]'
                        : 'bg-[#F7F7F7] text-[#1E1E1E] ring-black/5 hover:bg-black/0.03',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-white text-[#b80f24] grid place-items-center">
                        {getCategoryIcon(c.categoryName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold truncate">{c.categoryName}</p>
                        <p className={['text-xs', active ? 'text-white/85' : 'text-black/45'].join(' ')}>
                          {count} Items
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Items */}
          <section className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-extrabold">All Menu Items</p>
                <p className="text-xs text-black/45">Search, filter, and manage menu items.</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-[320px]">
                  <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-black/40" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, description, category, or ID…"
                    className="w-full rounded-xl bg-[#F3F3F3] pl-10 pr-3 py-3 text-xs outline-none ring-1 ring-transparent focus:ring-2 focus:ring-[#b80f24]/35"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-[#F3F3F3] px-3 py-2">
                    <MdTune className="h-5 w-5 text-black/40" />
                    <select
                      value={availabilityFilter}
                      onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                      className="bg-transparent text-xs font-bold outline-none"
                    >
                      <option value="all">All</option>
                      <option value="in">In Stock</option>
                      <option value="out">Out of Stock</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-[#F3F3F3] px-3 py-2">
                    <span className="text-xs font-extrabold text-black/50">Sort</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent text-xs font-bold outline-none"
                    >
                      <option value="name">Name</option>
                      <option value="price_asc">Price (Low)</option>
                      <option value="price_desc">Price (High)</option>
                      <option value="updated_desc">Recently Updated</option>
                    </select>
                  </div>

                  <PrimaryButton onClick={openAddDrawer}>Add Menu Item</PrimaryButton>
                </div>
              </div>
            </div>

            {/* Menu Type Tabs */}
            <div className="mb-4 flex gap-2 overflow-x-auto border-b border-black/10">
              {menuTypes.map((type) => {
                const active = selectedMenuType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedMenuType(type)}
                    className={[
                      'px-4 py-2 text-xs font-extrabold whitespace-nowrap transition',
                      active ? 'border-b-2 text-[#b80f24] bg-[#b80f24]/5' : 'text-black/50 hover:text-[#b80f24]',
                    ].join(' ')}
                    style={active ? { borderColor: PRIMARY } : undefined}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-black/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-980px">
                  <thead className="bg-[#FAFAFA]">
                    <tr className="text-left text-[11px] font-extrabold text-black/55 uppercase">
                      <th className="p-3">Product</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Item ID</th>
                      <th className="p-3">Stock</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Availability</th>
                      <th className="p-3">Actions done</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-black/10">
                    {loading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="p-3">
                            <div className="h-12 w-12 rounded-xl bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-44 rounded bg-black/10" />
                            <div className="mt-2 h-3 w-64 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-24 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-20 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-24 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-16 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-7 w-24 rounded-full bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-28 rounded bg-black/10" />
                            <div className="mt-2 h-3 w-36 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="ml-auto flex gap-2 justify-end">
                              <div className="h-8 w-8 rounded-xl bg-black/10" />
                              <div className="h-8 w-8 rounded-xl bg-black/10" />
                              <div className="h-8 w-8 rounded-xl bg-black/10" />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : visibleItems.length ? (
                      visibleItems.map((item) => (
                        <tr key={item.menuItemID} className="hover:bg-black/0.02">
                          <td className="p-3">
                            <div className="h-12 w-12 rounded-xl bg-black/5 overflow-hidden ring-1 ring-black/10">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-black/30">
                                  <MdImage className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-[#1E1E1E] truncate">{item.name}</p>
                              <p className="text-xs text-black/45 truncate">{item.description || 'No description'}</p>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="text-sm font-extrabold text-black/65">
                              #{item.menuItemID.toString().padStart(8, '0')}
                            </span>
                          </td>

                          <td className="p-3">
                            {/* If you have a real stock column later, wire it here */}
                            <span className="text-sm font-extrabold text-black/65">119 Items</span>
                          </td>

                          <td className="p-3">
                            <span className="text-sm font-extrabold text-black/65">
                              {item.Category?.categoryName || 'Uncategorized'}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-extrabold text-[#1E1E1E]">₱ {Number(item.price).toFixed(2)}</span>
                              {Number(item.regularPrice) > Number(item.price) && (
                                <span className="text-[11px] font-bold text-black/40 line-through">
                                  ₱ {Number(item.regularPrice).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <AvailabilityPill value={item.isAvailable} />
                          </td>

                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-extrabold text-[#1E1E1E]">
                                {item.UsersAccount?.username || 'Initial Setup'}
                              </span>
                              <span className="text-[10px] text-black/45">
                                {new Date(item.updatedAt).toLocaleDateString()} at{' '}
                                {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleRecipeClick(item)}
                                className="h-9 w-9 rounded-xl bg-blue-50 grid place-items-center hover:bg-blue-100 transition"
                                title="Manage Recipe"
                              >
                                <MdReceiptLong className="h-4 w-4 text-blue-600" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEditClick(item)}
                                className="h-9 w-9 rounded-xl bg-black/5 grid place-items-center hover:bg-black/10 transition"
                                title="Edit"
                              >
                                <MdEdit className="h-4 w-4 text-black/70" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
                                className="h-9 w-9 rounded-xl grid place-items-center text-white shadow transition active:scale-[0.99] disabled:opacity-50"
                                style={{ backgroundColor: PRIMARY }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_DARK;
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
                                }}
                                title="Archive"
                                disabled={isSubmitting}
                              >
                                <MdDelete className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-10 text-center text-black/50 text-sm font-bold">
                          No menu items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#FAFAFA] border-t border-black/10">
                <p className="text-xs font-bold text-black/45">
                  Showing <span className="text-black/70">{visibleItems.length}</span> item(s)
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setAvailabilityFilter('all');
                    setSortBy('name');
                    setSelectedCatID('all');
                    setSelectedMenuType('Normal Menu');
                  }}
                  className="text-xs font-extrabold text-[#b80f24] hover:underline"
                >
                  Reset filters
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* --- ADD CATEGORY DRAWER --- */}
      <RightDrawer open={isCategoryOpen} title="Add New Category" onClose={() => setIsCategoryOpen(false)}>
        <div className="space-y-5">
          <Field label="Category Name">
            <TextInput
              value={catForm.categoryName}
              onChange={(e) => setCatForm({ ...catForm, categoryName: e.target.value })}
              placeholder="e.g. Main Course, Appetizers"
            />
          </Field>

          <Field label="Description">
            <TextArea
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Enter category description"
              rows={4}
            />
          </Field>

          <div className="pt-5 flex justify-end gap-2 border-t border-black/10">
            <GhostButton onClick={() => setIsCategoryOpen(false)}>Cancel</GhostButton>
            <PrimaryButton disabled={categorySubmitting} onClick={handleAddCategory}>
              {categorySubmitting ? 'Saving...' : 'Save Category'}
            </PrimaryButton>
          </div>
        </div>
      </RightDrawer>

      {/* --- ADD MENU ITEM DRAWER --- */}
      <RightDrawer open={isAddOpen} title="Add New Menu Item" onClose={() => setIsAddOpen(false)}>
        <div className="space-y-5">
          <Field label="Product Image (URL)">
            <div className="grid grid-cols-[96px_1fr] gap-4 items-start">
              <div className="h-24 w-24 rounded-2xl bg-black/5 ring-1 ring-black/10 overflow-hidden grid place-items-center text-black/30">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <MdImage className="h-10 w-10" />
                )}
              </div>
              <div>
                <TextInput
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="Paste image URL here"
                />
                <p className="mt-1 text-[10px] text-black/45">
                  Tip: use a direct image link (ending in .jpg/.png) if your preview doesn’t load.
                </p>
              </div>
            </div>
          </Field>

          <Field label="Item Name">
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Taiwan Fried Chicken"
            />
          </Field>

          <Field label="Description">
            <TextArea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter product description"
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Price (₱)">
              <TextInput
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </Field>
            <Field label="Regular Price (₱)">
              <TextInput
                inputMode="decimal"
                value={form.regularPrice}
                onChange={(e) => setForm({ ...form, regularPrice: e.target.value })}
                placeholder="0.00"
              />
            </Field>
          </div>

          <Field label="Category">
            <Select value={form.categoryID} onChange={(e) => setForm({ ...form, categoryID: e.target.value })}>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.categoryID} value={c.categoryID}>
                  {c.categoryName}
                </option>
              ))}
            </Select>
          </Field>

          <div className="pt-5 flex justify-end gap-2 border-t border-black/10">
            <GhostButton onClick={() => setIsAddOpen(false)}>Cancel</GhostButton>
            <PrimaryButton disabled={isSubmitting} onClick={handleAddItem}>
              {isSubmitting ? 'Saving...' : 'Save Item'}
            </PrimaryButton>
          </div>
        </div>
      </RightDrawer>

      {/* --- EDIT MENU ITEM DRAWER --- */}
      <RightDrawer open={isEditOpen} title="Edit Menu Item" onClose={() => setIsEditOpen(false)}>
        <div className="space-y-5">
          <Field label="Product Image (URL)">
            <div className="space-y-2">
              <div className="h-32 w-full rounded-2xl bg-black/5 ring-1 ring-black/10 overflow-hidden grid place-items-center text-black/30">
                {editForm.imageUrl ? (
                  <img src={editForm.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <MdImage className="h-10 w-10" />
                )}
              </div>
              <TextInput
                type="text"
                value={editForm.imageUrl}
                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                placeholder="Paste image URL here"
              />
            </div>
          </Field>

          <Field label="Item Name">
            <TextInput value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </Field>

          <Field label="Description">
            <TextArea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Price (₱)">
              <TextInput
                inputMode="decimal"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
              />
            </Field>
            <Field label="Regular Price (₱)">
              <TextInput
                inputMode="decimal"
                value={editForm.regularPrice}
                onChange={(e) => setEditForm({ ...editForm, regularPrice: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Category">
            <Select value={editForm.categoryID} onChange={(e) => setEditForm({ ...editForm, categoryID: e.target.value })}>
              {categories.map((c) => (
                <option key={c.categoryID} value={c.categoryID}>
                  {c.categoryName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Availability">
            <span className="text-xs font-bold text-black/50">In Stock / Available</span>
          </Field>

          <div className="pt-5 flex justify-end gap-2 border-t border-black/10">
            <GhostButton onClick={() => setIsEditOpen(false)}>Cancel</GhostButton>
            <PrimaryButton disabled={isSubmitting} onClick={handleUpdateItem}>
              {isSubmitting ? 'Updating...' : 'Update Item'}
            </PrimaryButton>
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
          onRecipeChange={async () => {
            await syncMenuAvailability();
            fetchAllData();
          }}
        />
      )}
    </div>
  );
}