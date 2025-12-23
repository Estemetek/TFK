// app/inventory/page.tsx
// Inventory page (Inventory Dashboard + Add/Edit Inventory) — matches your updated UI style (gray panels + red accent)

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
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
  MdSearch,
} from 'react-icons/md';

type NavItem = { name: string; path?: string };

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

const StatusPill = ({
  active,
  label,
  count,
  onClick,
}: {
  active?: boolean;
  label: string;
  count?: number;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-[11px] font-extrabold transition ${
      active ? 'bg-[#B80F24] text-white shadow' : 'bg-[#E7E7E7] text-[#6D6D6D]'
    }`}
  >
    <span>{label}</span>
    {typeof count === 'number' && (
      <span className={`rounded-md px-2 py-1 text-[10px] font-extrabold ${active ? 'bg-white/15' : 'bg-white'}`}>
        {count}
      </span>
    )}
  </button>
);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-extrabold text-[#6D6D6D]">{children}</div>;
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl bg-[#E7E7E7] px-4 py-3 text-[11px] font-extrabold text-[#1E1E1E] outline-none placeholder:text-[#9B9B9B]"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange?: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full rounded-xl bg-[#E7E7E7] px-4 py-3 text-[11px] font-extrabold text-[#1E1E1E] outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

type ProductStatus = 'All' | 'Active' | 'Inactive' | 'Draft';

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  status: 'Active' | 'Inactive' | 'Draft';
  stockLabel: string;
  inStockQty: number;
  retailPrice: number;
  imageUrl?: string;
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function InventoryRow({
  item,
  onEdit,
}: {
  item: InventoryItem;
  onEdit?: () => void;
}) {
  return (
    <div className="grid grid-cols-[56px_1.2fr_0.8fr_0.8fr_0.8fr_0.6fr_64px] items-center gap-3 rounded-2xl bg-[#E7E7E7] p-3 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
      <div className="h-12 w-14 overflow-hidden rounded-xl bg-white shadow-inner">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] font-extrabold text-[#6D6D6D]">IMG</div>
        )}
      </div>

      <div>
        <div className="text-[12px] font-extrabold text-[#1E1E1E]">{item.name}</div>
        <div className="mt-1 text-[10px] font-extrabold text-[#6D6D6D]">
          Stocked Product : <span className="text-[#B80F24]">{item.inStockQty} In Stock</span>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-extrabold text-[#6D6D6D]">Status</div>
        <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">{item.status}</div>
      </div>

      <div>
        <div className="text-[10px] font-extrabold text-[#6D6D6D]">Category</div>
        <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">{item.category}</div>
      </div>

      <div>
        <div className="text-[10px] font-extrabold text-[#6D6D6D]">Retail Price</div>
        <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">{money(item.retailPrice)}</div>
      </div>

      <div className="justify-self-end">
        <button
          onClick={onEdit}
          className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-inner transition hover:-translate-y-0.5"
          aria-label="Edit inventory"
          title="Edit"
        >
          <MdEdit className="h-5 w-5 text-[#1E1E1E]" />
        </button>
      </div>

      <div className="justify-self-end">
        <button
          className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-inner transition hover:-translate-y-0.5"
          aria-label="Delete inventory"
          title="Delete"
        >
          <MdDelete className="h-5 w-5 text-[#B80F24]" />
        </button>
      </div>
    </div>
  );
}

function InventoryModal({
  open,
  mode,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: 'add' | 'edit';
  item?: InventoryItem;
  onClose: () => void;
  onSave: (draft: InventoryItem) => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? 'All');
  const [quantity, setQuantity] = useState(String(item?.inStockQty ?? 0));
  const [stock, setStock] = useState(item?.stockLabel ?? 'instock');
  const [status, setStatus] = useState<InventoryItem['status']>(item?.status ?? 'Active');
  const [price, setPrice] = useState(item ? String(item.retailPrice) : '');
  const [yesNo, setYesNo] = useState<'Yes' | 'No'>('Yes');

  // keep form synced when switching edit targets
  React.useEffect(() => {
    setName(item?.name ?? '');
    setCategory(item?.category ?? 'All');
    setQuantity(String(item?.inStockQty ?? 0));
    setStock(item?.stockLabel ?? 'instock');
    setStatus(item?.status ?? 'Active');
    setPrice(item ? String(item.retailPrice) : '');
    setYesNo('Yes');
  }, [item, open]);

  if (!open) return null;

  const title = mode === 'add' ? 'Add New Inventory' : 'Edit New Inventory';

  const draft: InventoryItem = {
    id: item?.id ?? crypto.randomUUID(),
    name: name || 'Inventory Item',
    category: category === 'All' ? 'Chicken' : category,
    status,
    stockLabel: stock,
    inStockQty: Number(quantity || '0'),
    retailPrice: Number(price || '0'),
    imageUrl: item?.imageUrl,
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="w-full max-w-5xl rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-extrabold text-[#1E1E1E]">{title}</div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-[#E7E7E7] shadow"
            aria-label="Close modal"
            title="Close"
          >
            <MdClose className="h-5 w-5 text-[#1E1E1E]" />
          </button>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left image */}
          <div className="space-y-3">
            <div
              className={`overflow-hidden rounded-2xl bg-[#E7E7E7] shadow-inner ${
                mode === 'add' ? 'h-[190px]' : 'h-[190px]'
              }`}
            >
              {mode === 'edit' && item?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[#6D6D6D]">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-inner">
                    <MdInventory2 className="h-8 w-8" />
                  </div>
                </div>
              )}
            </div>

            <button className="w-full text-center text-[10px] font-extrabold text-[#B80F24]">
              Change Profile Picture
            </button>
          </div>

          {/* Right form */}
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Name</FieldLabel>
                <Input value={name} onChange={setName} placeholder="Enter inventory name" />
              </div>

              <div className="space-y-2">
                <FieldLabel>Category</FieldLabel>
                <Select value={category} onChange={setCategory} options={['All', 'Chicken', 'Fries', 'Rice Meals', 'Beverage']} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Quantity</FieldLabel>
                <Select value={quantity} onChange={setQuantity} options={['0', '1', '5', '10', '20', '50']} />
              </div>

              <div className="space-y-2">
                <FieldLabel>Stock</FieldLabel>
                <Select value={stock} onChange={setStock} options={['instock', 'lowstock', 'outofstock']} />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel>Status</FieldLabel>
              <Select value={status} onChange={(v) => setStatus(v as InventoryItem['status'])} options={['Active', 'Inactive', 'Draft']} />
            </div>

            <div className="space-y-2">
              <FieldLabel>Price</FieldLabel>
              <Input value={price} onChange={setPrice} placeholder="Enter inventory price" />
            </div>

            {/* Yes/No (matches the UI in mock) */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-[11px] font-extrabold text-[#6D6D6D]">
                <input
                  type="radio"
                  name="yn"
                  checked={yesNo === 'Yes'}
                  onChange={() => setYesNo('Yes')}
                  className="h-4 w-4 accent-[#B80F24]"
                />
                Yes
              </label>
              <label className="flex items-center gap-2 text-[11px] font-extrabold text-[#6D6D6D]">
                <input
                  type="radio"
                  name="yn"
                  checked={yesNo === 'No'}
                  onChange={() => setYesNo('No')}
                  className="h-4 w-4 accent-[#B80F24]"
                />
                No
              </label>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => onSave(draft)}
                className="rounded-xl bg-[#B80F24] px-10 py-3 text-[11px] font-extrabold text-white shadow"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const activeNav = 'Inventory';

  const [status, setStatus] = useState<ProductStatus>('All');

  const items = useMemo<InventoryItem[]>(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        id: `inv-${i}`,
        name: 'Chicken Parmesan',
        category: 'Chicken',
        status: 'Active',
        stockLabel: 'instock',
        inStockQty: 10,
        retailPrice: 55,
        imageUrl: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=400&q=60',
      })),
    []
  );

  const counts = useMemo(() => {
    // simple UI counts (mocked like the design)
    return {
      All: 150,
      Active: 120,
      Inactive: 20,
      Draft: 10,
    };
  }, []);

  const [category, setCategory] = useState('All');
  const [stock, setStock] = useState('InStock');
  const [value, setValue] = useState('Litre');
  const [piece, setPiece] = useState('50');
  const [priceMin, setPriceMin] = useState('50');
  const [priceMax, setPriceMax] = useState('120');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editing, setEditing] = useState<InventoryItem | undefined>(undefined);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    } finally {
      router.push('/');
    }
  };

  const openAdd = () => {
    setModalMode('add');
    setEditing(undefined);
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setModalMode('edit');
    setEditing(item);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        }`}
      >
        {/* Sidebar */}
        <aside className="flex flex-col items-stretch gap-4 rounded-r-2xl bg-white px-3 py-5 shadow-md">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-extrabold text-[#B80F24] shadow ring-1 ring-black/5">
              TFK
            </div>
            {!collapsed && <span className="text-[12px] font-extrabold text-[#1E1E1E]">Taiwan Fried Kitchen</span>}
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
          {/* Top header */}
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
              <p className="text-[13px] font-extrabold text-[#1E1E1E]">Inventory</p>
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

          {/* Subheader + action */}
          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] font-extrabold text-[#1E1E1E]">
              <span className="text-[14px]">150</span> <span className="text-[#6D6D6D]">total products</span>
            </div>

            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-md bg-[#B80F24] px-4 py-2 text-[11px] font-extrabold text-white shadow"
            >
              <MdAdd className="h-4 w-4" />
              Add New Inventory
            </button>
          </section>

          {/* Body */}
          <section className="grid gap-4 lg:grid-cols-[340px_1fr]">
            {/* Left filters */}
            <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
              <div className="rounded-2xl bg-white p-4 shadow-inner">
                <div className="text-[11px] font-extrabold text-[#1E1E1E]">Product Status</div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <StatusPill
                    label="All"
                    count={counts.All}
                    active={status === 'All'}
                    onClick={() => setStatus('All')}
                  />
                  <StatusPill
                    label="Active"
                    count={counts.Active}
                    active={status === 'Active'}
                    onClick={() => setStatus('Active')}
                  />
                  <StatusPill
                    label="Inactive"
                    count={counts.Inactive}
                    active={status === 'Inactive'}
                    onClick={() => setStatus('Inactive')}
                  />
                  <StatusPill
                    label="Draft"
                    count={counts.Draft}
                    active={status === 'Draft'}
                    onClick={() => setStatus('Draft')}
                  />
                </div>

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <FieldLabel>Category</FieldLabel>
                    <Select value={category} onChange={setCategory} options={['All', 'Chicken', 'Fries', 'Rice Meals', 'Beverage']} />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>Stock</FieldLabel>
                    <Select value={stock} onChange={setStock} options={['InStock', 'LowStock', 'OutOfStock']} />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>Value</FieldLabel>
                    <Select value={value} onChange={setValue} options={['Litre', 'Gram', 'Piece']} />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>Piece / Item / Quantity</FieldLabel>
                    <Input value={piece} onChange={setPiece} placeholder="50" />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>Price</FieldLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <Input value={priceMin} onChange={setPriceMin} placeholder="50" />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-[#B80F24]">
                          $
                        </span>
                      </div>
                      <div className="relative">
                        <Input value={priceMax} onChange={setPriceMax} placeholder="120" />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-[#B80F24]">
                          $
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="mt-5 w-full rounded-xl bg-[#B80F24] px-4 py-3 text-[11px] font-extrabold text-white shadow">
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Right list */}
            <div className="space-y-3">
              {/* (Optional) tiny search bar like typical list screens */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow">
                  <MdSearch className="h-5 w-5 text-[#6D6D6D]" />
                  <input
                    placeholder="Search product..."
                    className="w-[260px] bg-transparent text-[11px] font-extrabold text-[#6D6D6D] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {items.map((it) => (
                  <InventoryRow key={it.id} item={it} onEdit={() => openEdit(it)} />
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Add/Edit modal */}
      <InventoryModal
        open={modalOpen}
        mode={modalMode}
        item={editing}
        onClose={() => setModalOpen(false)}
        onSave={() => setModalOpen(false)}
      />
    </div>
  );
}
