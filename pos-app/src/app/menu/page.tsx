'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import {
  MdDashboard,
  MdRestaurantMenu,
  MdPeople,
  MdInventory2,
  MdAssessment,
  MdShoppingCart,
  MdLogout,
  MdGridView,
  MdLocalDining,
  MdFastfood,
  MdRiceBowl,
  MdLocalCafe,
  MdMoreVert,
  MdEdit,
  MdDelete,
  MdClose,
  MdImage,
} from 'react-icons/md';

type NavItem = { name: string; path?: string };

type Category = {
  id: string;
  label: string;
  items: number;
  menu: string;
  description: string;
  iconKey: 'all' | 'fries' | 'chicken' | 'rice' | 'bev' | 'pizza' | 'burger';
  active?: boolean;
};

type MenuItem = {
  id: string;
  name: string;
  description: string;
  itemId: string;
  stock: string;
  category: string;
  price: string;
  availability: 'In Stock' | 'Out of stock';
};

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <MdDashboard className="h-5 w-5" />,
  Menu: <MdRestaurantMenu className="h-5 w-5" />,
  Staff: <MdPeople className="h-5 w-5" />,
  Inventory: <MdInventory2 className="h-5 w-5" />,
  Reports: <MdAssessment className="h-5 w-5" />,
  Order: <MdShoppingCart className="h-5 w-5" />,
};

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Menu', path: '/menu' },
  { name: 'Staff', path: '/staff' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Reports', path: '/reports' },
  { name: 'Order', path: '/order' },
];

const categoryIcon: Record<Category['iconKey'], React.ReactNode> = {
  all: <MdGridView className="h-5 w-5" />,
  fries: <MdFastfood className="h-5 w-5" />,
  chicken: <MdLocalDining className="h-5 w-5" />,
  rice: <MdRiceBowl className="h-5 w-5" />,
  bev: <MdLocalCafe className="h-5 w-5" />,
  pizza: <span className="text-[18px]">🍕</span>,
  burger: <span className="text-[18px]">🍔</span>,
};

const Pill = ({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-md px-3 py-2 text-[11px] font-extrabold shadow transition ${
      active ? 'bg-[#B80F24] text-white' : 'bg-white text-[#6D6D6D]'
    }`}
  >
    {children}
  </button>
);

const Availability = ({ value }: { value: MenuItem['availability'] }) => {
  const isIn = value === 'In Stock';
  return (
    <span className={`text-[11px] font-extrabold ${isIn ? 'text-[#1E8E5A]' : 'text-[#D61F2C]'}`}>
      {value}
    </span>
  );
};

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full justify-end">
        <div className="h-full w-full max-w-[520px] rounded-l-[28px] bg-white shadow-2xl">
          <div className="flex items-center justify-between px-6 pt-6">
            <p className="text-[14px] font-extrabold text-[#1E1E1E]">{title}</p>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#E7E7E7] text-[#1E1E1E] shadow"
              aria-label="Close"
              title="Close"
            >
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-extrabold text-[#1E1E1E]">{label}</p>
      {children}
    </div>
  );
}

export default function MenuPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const activeNav = 'Menu';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    } finally {
      router.push('/');
    }
  };

  const [categories, setCategories] = useState<Category[]>([
    {
      id: 'cat-all',
      label: 'All',
      items: 116,
      menu: 'Normal Menu',
      description: 'All menu items.',
      iconKey: 'all',
      active: true,
    },
    {
      id: 'cat-fries',
      label: 'Fries',
      items: 15,
      menu: 'Normal Menu',
      description: 'Fries and sides.',
      iconKey: 'fries',
    },
    {
      id: 'cat-chicken',
      label: 'Chicken',
      items: 10,
      menu: 'Normal Menu',
      description: 'Chicken specialties.',
      iconKey: 'chicken',
    },
    {
      id: 'cat-rice',
      label: 'Rice Meals',
      items: 18,
      menu: 'Normal Menu',
      description: 'Rice meals and bowls.',
      iconKey: 'rice',
    },
    {
      id: 'cat-bev',
      label: 'Beverage',
      items: 12,
      menu: 'Deserts and Drinks',
      description: 'Drinks and beverages.',
      iconKey: 'bev',
    },
  ]);

  const tabs = ['Normal Menu', 'Special Deals', 'New Year Special', 'Deserts and Drinks'] as const;
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Normal Menu');

  const rows: MenuItem[] = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        id: `row-${i + 1}`,
        name: 'Chicken Parmesan',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing.',
        itemId: '#22314644',
        stock: '19 items',
        category: 'Chicken',
        price: '$55.00',
        availability: 'In Stock',
      })),
    []
  );

  // Drawer states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [addForm, setAddForm] = useState({
    iconKey: 'pizza' as Category['iconKey'],
    label: '',
    menu: 'Normal Menu',
    description: '',
  });

  const [editForm, setEditForm] = useState({
    id: '',
    iconKey: 'pizza' as Category['iconKey'],
    label: 'Pizza',
    menu: 'Fajita',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur semper velit id eros commodo ornare.',
  });

  const iconCycle: Category['iconKey'][] = ['pizza', 'burger', 'fries', 'chicken', 'rice', 'bev', 'all'];

  const cycleIcon = (current: Category['iconKey']) => {
    const idx = iconCycle.indexOf(current);
    return iconCycle[(idx + 1) % iconCycle.length];
  };

  const openEditFor = (c: Category) => {
    setEditForm({
      id: c.id,
      iconKey: c.iconKey,
      label: c.label,
      menu: c.menu || 'Fajita',
      description: c.description || '',
    });
    setEditOpen(true);
  };

  const saveAdd = () => {
    const id = `cat-${Date.now()}`; // client-only; safe (drawer action)
    setCategories((prev) => [
      ...prev.map((x) => ({ ...x, active: false })),
      {
        id,
        label: addForm.label || 'New Category',
        items: 0,
        menu: addForm.menu,
        description: addForm.description,
        iconKey: addForm.iconKey,
        active: true,
      },
    ]);
    setAddOpen(false);
    setAddForm({ iconKey: 'pizza', label: '', menu: 'Normal Menu', description: '' });
  };

  const saveEdit = () => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editForm.id
          ? {
              ...c,
              iconKey: editForm.iconKey,
              label: editForm.label,
              menu: editForm.menu,
              description: editForm.description,
            }
          : c
      )
    );
    setEditOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        }`}
      >
        {/* Sidebar */}
        <aside className="flex flex-col items-stretch gap-4 rounded-r-2xl bg-surface px-3 py-5 shadow-md">
          <div className="mb-2 flex items-center gap-3 px-2">
            <img src="/TFK.png" alt="TFK Logo" className="h-12 w-12 rounded-full shadow" />
            {!collapsed && (
              <span className="text-sm font-semibold text-foreground">Taiwan Fried Kitchen</span>
            )}
            </div>
          <nav className={`flex w-full flex-col gap-2 ${collapsed ? 'items-center' : ''}`}>
            {navItems.map((item) => {
              const isActive = item.name === activeNav;
              return (
                <button
                  key={item.name}
                  onClick={() => item.path && router.push(item.path)}
                  className={`flex items-center rounded-2xl transition hover:-translate-y-0.5 hover:shadow ${
                    collapsed
                      ? 'h-14 w-14 self-center justify-center gap-0 bg-[#F2F2F2]'
                      : 'h-12 w-full gap-3 bg-[#F2F2F2] px-2'
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-full shadow-inner ${
                      isActive ? 'bg-[#B80F24] text-white' : 'bg-white text-[#6D6D6D]'
                    }`}
                  >
                    {iconMap[item.name]}
                  </span>

                  {!collapsed && (
                    <span className={`text-[12px] font-extrabold ${isActive ? 'text-[#1E1E1E]' : 'text-[#6D6D6D]'}`}>
                      {item.name}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className={`mt-auto ${collapsed ? '' : 'px-2'}`}>
            <button
              onClick={handleLogout}
              className={`transition hover:shadow ${
                collapsed
                  ? 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#B80F24] text-white'
                  : 'flex w-full items-center gap-3 rounded-2xl bg-[#F2F2F2] px-2 py-2'
              }`}
              aria-label="Logout"
              title="Logout"
            >
              <span
                className={`grid h-10 w-10 place-items-center rounded-full shadow-inner ${
                  collapsed ? 'bg-[#B80F24] text-white' : 'bg-white text-[#6D6D6D]'
                }`}
              >
                <MdLogout className="h-5 w-5" />
              </span>
              {!collapsed && <span className="text-[12px] font-extrabold text-[#6D6D6D]">Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="space-y-4 p-4 md:p-6">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                aria-label="Toggle sidebar"
                onClick={() => setCollapsed((c) => !c)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#E7E7E7] text-[#1E1E1E] shadow"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? '›' : '‹'}
              </button>
              <p className="text-[13px] font-extrabold text-[#1E1E1E]">Menu</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[14px]">🔔</span>
              <button
                onClick={() => router.push('/profile')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[12px] font-extrabold text-[#B80F24] shadow"
                aria-label="Open profile"
              >
                AC
              </button>
            </div>
          </header>

          {/* Categories + Add Category button */}
          <section className="rounded-2xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-extrabold text-[#1E1E1E]">Categories</p>

              <button
                onClick={() => setAddOpen(true)}
                className="rounded-md bg-[#B80F24] px-4 py-2 text-[12px] font-extrabold text-white shadow"
              >
                Add New Category
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className={`relative rounded-2xl p-3 shadow transition ${
                    c.active ? 'bg-[#B80F24] text-white' : 'bg-[#E7E7E7] text-[#1E1E1E]'
                  }`}
                >
                  <button
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-xl bg-white/70 text-[#6D6D6D] shadow hover:bg-white"
                    aria-label="Edit category"
                    title="Edit category"
                    onClick={() => openEditFor(c)}
                  >
                    <MdMoreVert className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() =>
                      setCategories((prev) => prev.map((x) => ({ ...x, active: x.id === c.id })))
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-xl shadow-inner ${
                          c.active ? 'bg-white/15 text-white' : 'bg-white text-[#B80F24]'
                        }`}
                      >
                        {categoryIcon[c.iconKey]}
                      </span>

                      <div className="pr-8">
                        <p className={`text-[12px] font-extrabold ${c.active ? 'text-white' : 'text-[#1E1E1E]'}`}>
                          {c.label}
                        </p>
                        <p className={`text-[10px] font-semibold ${c.active ? 'text-white/80' : 'text-[#6D6D6D]'}`}>
                          {c.items} items
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Special menu all items (kept same as your previous) */}
          <section className="rounded-2xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] font-extrabold text-[#1E1E1E]">Special menu all items</p>

              <button className="rounded-md bg-[#B80F24] px-4 py-2 text-[12px] font-extrabold text-white shadow">
                Add Menu Item
              </button>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              {tabs.map((t) => (
                <Pill key={t} active={t === activeTab} onClick={() => setActiveTab(t)}>
                  {t}
                </Pill>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
              <div className="grid grid-cols-[34px_1.2fr_120px_90px_100px_90px_120px_90px] gap-0 border-b border-black/5 bg-[#F7F7F7] px-3 py-3 text-[10px] font-extrabold text-[#6D6D6D]">
                <div className="flex items-center justify-center">
                  <input type="checkbox" className="h-3 w-3 accent-[#B80F24]" />
                </div>
                <div>Product</div>
                <div>Item ID</div>
                <div>Stock</div>
                <div>Category</div>
                <div>Price</div>
                <div>Availability</div>
                <div className="text-right">Action</div>
              </div>

              <div className="divide-y divide-black/5">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[34px_1.2fr_120px_90px_100px_90px_120px_90px] items-center px-3 py-3 text-[11px]"
                  >
                    <div className="flex items-center justify-center">
                      <input type="checkbox" className="h-3 w-3 accent-[#B80F24]" />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-xl bg-[#F1F1F1]">
                        <div className="h-full w-full bg-gradient-to-br from-[#FFD9D9] via-[#F3F3F3] to-[#D9D9FF]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-extrabold text-[#1E1E1E]">{r.name}</p>
                        <p className="truncate text-[10px] font-semibold text-[#8A8A8A]">{r.description}</p>
                      </div>
                    </div>

                    <div className="font-extrabold text-[#6D6D6D]">{r.itemId}</div>
                    <div className="font-extrabold text-[#6D6D6D]">{r.stock}</div>
                    <div className="font-extrabold text-[#6D6D6D]">{r.category}</div>
                    <div className="font-extrabold text-[#1E1E1E]">{r.price}</div>

                    <div>
                      <Availability value={r.availability} />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button className="grid h-8 w-8 place-items-center rounded-full bg-[#F3F3F3] text-[#6D6D6D] shadow hover:bg-[#EDEDED]">
                        <MdEdit className="h-4 w-4" />
                      </button>
                      <button className="grid h-8 w-8 place-items-center rounded-full bg-[#B80F24] text-white shadow hover:opacity-95">
                        <MdDelete className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* ADD CATEGORY DRAWER */}
      <RightDrawer open={addOpen} title="Add New Category" onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          {/* Icon box */}
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-[120px] w-[140px] place-items-center rounded-xl bg-[#D9D9D9] shadow-inner">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-white/60 text-[#6D6D6D]">
                <MdImage className="h-6 w-6" />
              </div>
            </div>

            <p className="text-[10px] font-semibold text-[#6D6D6D]">Select icon here</p>

            <button
              onClick={() => setAddForm((p) => ({ ...p, iconKey: cycleIcon(p.iconKey) }))}
              className="text-[11px] font-extrabold text-[#B80F24] hover:underline"
            >
              Change Icon
            </button>
          </div>

          <Field label="Category Name">
            <input
              value={addForm.label}
              onChange={(e) => setAddForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Enter Category name"
              className="w-full rounded-md bg-[#D9D9D9] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] placeholder:text-[#8A8A8A] outline-none"
            />
          </Field>

          <Field label="Select Menu">
            <select
              value={addForm.menu}
              onChange={(e) => setAddForm((p) => ({ ...p, menu: e.target.value }))}
              className="w-full rounded-md bg-[#D9D9D9] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] outline-none"
            >
              {tabs.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <textarea
              value={addForm.description}
              onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="write your category description here"
              className="min-h-[120px] w-full resize-none rounded-md bg-[#D9D9D9] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] placeholder:text-[#8A8A8A] outline-none"
            />
          </Field>

          <div className="mt-2 flex items-center justify-end gap-4">
            <button
              onClick={() => setAddOpen(false)}
              className="text-[12px] font-extrabold text-[#1E1E1E] hover:opacity-80"
            >
              Cancel
            </button>
            <button
              onClick={saveAdd}
              className="rounded-md bg-[#B80F24] px-6 py-2 text-[12px] font-extrabold text-white shadow hover:opacity-95"
            >
              Save
            </button>
          </div>
        </div>
      </RightDrawer>

      {/* EDIT CATEGORY DRAWER */}
      <RightDrawer open={editOpen} title="Edit New Category" onClose={() => setEditOpen(false)}>
        <div className="space-y-4">
          {/* Icon box */}
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-[120px] w-[140px] place-items-center rounded-xl bg-[#D9D9D9] shadow-inner">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-white">
                <span className="text-[#B80F24]">{categoryIcon[editForm.iconKey]}</span>
              </div>
            </div>

            <button
              onClick={() => setEditForm((p) => ({ ...p, iconKey: cycleIcon(p.iconKey) }))}
              className="text-[11px] font-extrabold text-[#B80F24] hover:underline"
            >
              Change Icon
            </button>
          </div>

          <Field label="Category Name">
            <input
              value={editForm.label}
              onChange={(e) => setEditForm((p) => ({ ...p, label: e.target.value }))}
              className="w-full rounded-md bg-[#D9D9D9] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] outline-none"
            />
          </Field>

          <Field label="Select Menu">
            <select
              value={editForm.menu}
              onChange={(e) => setEditForm((p) => ({ ...p, menu: e.target.value }))}
              className="w-full rounded-md bg-[#D9D9D9] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] outline-none"
            >
              {/* screenshot shows Fajita; keep it available too */}
              <option value="Fajita">Fajita</option>
              {tabs.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              className="min-h-[140px] w-full resize-none rounded-md bg-[#D9D9D9] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] outline-none"
            />
          </Field>

          <div className="mt-2 flex items-center justify-end gap-4">
            <button
              onClick={() => setEditOpen(false)}
              className="text-[12px] font-extrabold text-[#1E1E1E] hover:opacity-80"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="rounded-md bg-[#B80F24] px-6 py-2 text-[12px] font-extrabold text-white shadow hover:opacity-95"
            >
              Save
            </button>
          </div>
        </div>
      </RightDrawer>
    </div>
  );
}