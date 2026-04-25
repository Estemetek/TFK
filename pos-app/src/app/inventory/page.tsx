'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Sidebar } from '../components/Sidebar';
import { useRouter } from 'next/navigation';
import {
  MdEdit,
  MdDelete,
  MdClose,
  MdWarning,
  MdSearch,
  MdTune,
  MdViewAgenda,
  MdGridView,
  MdArrowDropDown,
  MdRefresh,
  MdChecklist,
  MdAddShoppingCart,
  MdInfoOutline,
} from 'react-icons/md';
import React from 'react';

type InventoryItem = {
  ingredientID: number;
  name: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  costPerUnit: number;
  updatedAt: string;
};

type SortKey = 'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc' | 'updated-desc';

/* ----------------------------- Modern UI Tokens ----------------------------- */

const INPUT_BASE =
  'w-full rounded-xl bg-white px-3 py-2 text-sm ' +
  'border-2 border-black/15 ' +
  'shadow-[0_1px_0_rgba(0,0,0,0.06)] ' +
  'placeholder:text-text-muted/80 ' +
  'focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 ' +
  'transition';

const INPUT_DISABLED =
  'w-full rounded-xl bg-black/5 px-3 py-2 text-sm ' +
  'border-2 border-black/10 text-foreground/80 ' +
  'shadow-[0_1px_0_rgba(0,0,0,0.05)]';

const SURFACE =
  'rounded-2xl bg-white/70 shadow-sm ring-1 ring-card-border ' +
  'backdrop-blur supports-[backdrop-filter]:bg-white/60';

const CARD =
  'rounded-2xl bg-white shadow-sm ring-1 ring-card-border ' +
  'transition will-change-transform';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ' +
  'ring-1 ring-black/10 shadow-[0_1px_0_rgba(0,0,0,0.06)] ' +
  'transition active:scale-[0.99] focus:outline-none focus:ring-4';

const BTN_PRIMARY =
  BTN_BASE +
  ' bg-primary text-white ring-0 shadow-sm ' +
  'hover:brightness-95 focus:ring-primary/20';

const BTN_NEUTRAL =
  BTN_BASE +
  ' bg-white text-foreground ring-1 ring-card-border ' +
  'hover:bg-black/3 focus:ring-black/10';

const BTN_DANGER =
  BTN_BASE +
  ' bg-red-600 text-white ring-0 shadow-sm ' +
  'hover:bg-red-700 focus:ring-red-200';

const CHIP_BASE =
  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-card-border';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function wholeNumber(value: number | string | null | undefined) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

const DEFAULT_UNIT_OPTIONS = ['pcs', 'kg', 'g', 'mg', 'ml', 'l', 'pack', 'bottle'];

export default function InventoryPage() {
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });
  const [activeNav, setActiveNav] = useState('Inventory');

  // Persist collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  }, [collapsed]);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkRestockModal, setShowBulkRestockModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name-asc');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [showOnlyLow, setShowOnlyLow] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const [currentUserID, setCurrentUserID] = useState<string | null>(null);
  const [menuIngredientUnits, setMenuIngredientUnits] = useState<string[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserID(user?.id ?? null);
    };
    getUser();
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Ingredient')
      .select('ingredientID, name, unit, currentStock, reorderLevel, costPerUnit, updatedAt')
      .order('name', { ascending: true });

    if (error) console.error('Error fetching inventory:', error);

    const normalized = (data || []).map((item) => ({
      ...item,
      currentStock: parseFloat(Number(item.currentStock).toFixed(2)),
      reorderLevel: parseFloat(Number(item.reorderLevel).toFixed(2)),
    }));

    setInventoryItems(normalized);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const fetchMenuIngredientUnits = useCallback(async () => {
    const { data, error } = await supabase
      .from('MenuIngredient')
      .select('Ingredient!inner(unit)');

    if (error) {
      console.error('Error fetching menu ingredient units:', error);
      return;
    }

    const units = Array.from(
      new Set(
        (data || [])
          .map((row: any) => row?.Ingredient?.unit)
          .filter((unit: unknown): unit is string => typeof unit === 'string')
          .map((unit) => unit.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    setMenuIngredientUnits(units);
  }, []);

  useEffect(() => {
    fetchMenuIngredientUnits();
  }, [fetchMenuIngredientUnits]);

  const unitOptions = useMemo(() => {
    const merged = [
      ...DEFAULT_UNIT_OPTIONS,
      ...menuIngredientUnits,
      ...inventoryItems.map((item) => item.unit).filter(Boolean),
    ];

    return Array.from(
      new Set(
        merged
          .map((unit) => unit.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [menuIngredientUnits, inventoryItems]);

  const lowStockItems = useMemo(
    () => inventoryItems.filter((i) => wholeNumber(i.currentStock) <= wholeNumber(i.reorderLevel)),
    [inventoryItems]
  );

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = inventoryItems;

    if (q) {
      arr = arr.filter((i) => i.name.toLowerCase().includes(q) || i.unit.toLowerCase().includes(q));
    }
    if (showOnlyLow) {
      arr = arr.filter((i) => wholeNumber(i.currentStock) <= wholeNumber(i.reorderLevel));
    }

    const sorted = [...arr].sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'stock-asc':
          return wholeNumber(a.currentStock) - wholeNumber(b.currentStock);
        case 'stock-desc':
          return wholeNumber(b.currentStock) - wholeNumber(a.currentStock);
        case 'updated-desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [inventoryItems, query, showOnlyLow, sort]);

  // Bulk restock: items is an array of { ingredient, quantity, unitCost }
  const handleBulkRestock = async (
    items: Array<{ ingredient: InventoryItem; quantity: number; unitCost: number }>,
    supplier: string
  ) => {
    if (!currentUserID) {
      alert('Unable to record restock: no logged-in user found. Please refresh and try again.');
      return;
    }

    const validItems = items.filter((r) => wholeNumber(r.quantity) > 0 && r.unitCost > 0);
    if (validItems.length === 0) return;

    setLoading(true);
    try {
      const totalCost = validItems.reduce(
        (sum, r) => sum + wholeNumber(r.quantity) * r.unitCost,
        0
      );

      const { data: purchase, error: purchaseError } = await supabase
        .from('Purchase')
        .insert([{ totalCost, updatedBy: currentUserID, supplier: supplier.trim() || null }])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      const purchaseItems = validItems.map((r) => ({
        purchaseID: purchase.purchaseID,
        ingredientID: r.ingredient.ingredientID,
        quantity: wholeNumber(r.quantity),
        cost: r.unitCost,
      }));

      const { error: itemError } = await supabase.from('PurchaseItem').insert(purchaseItems);
      if (itemError) throw itemError;

      // Update each ingredient's stock and unit cost
      await Promise.all(
        validItems.map((r) =>
          supabase
            .from('Ingredient')
            .update({
              currentStock: wholeNumber(r.ingredient.currentStock) + wholeNumber(r.quantity),
              costPerUnit: r.unitCost,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUserID,
            })
            .eq('ingredientID', r.ingredient.ingredientID)
        )
      );

      await fetchInventory();
      setShowBulkRestockModal(false);
    } catch (err: any) {
      alert('Restock failed: ' + err.message);
    }
    setLoading(false);
  };

  const handleSave = async (formData: any) => {
    try {
      if (editItem) {
        await supabase
          .from('Ingredient')
          .update({
            name: formData.name,
            unit: formData.unit,
            reorderLevel: wholeNumber(formData.reorderLevel),
            costPerUnit: parseFloat(formData.price),
            updatedAt: new Date().toISOString(),
            updatedBy: currentUserID,
          })
          .eq('ingredientID', editItem.ingredientID);

      } else {
        // Creating new ingredient - no menu items use it yet
        const { error } = await supabase
          .from('Ingredient')
          .insert({
            name: formData.name,
            unit: formData.unit,
            reorderLevel: wholeNumber(formData.reorderLevel),
            costPerUnit: parseFloat(formData.price),
            currentStock: 0,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUserID,
          })
          .select()
          .single();

        if (error) throw error;
      }

      await fetchInventory();
      setShowAddModal(false);
      setShowEditModal(false);
      setEditItem(null);
    } catch (err: any) {
      console.error('Database Error:', err);
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleDeleteClick = (item: InventoryItem) => {
    setDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('Ingredient').delete().eq('ingredientID', deleteTarget.ingredientID);
    await fetchInventory();
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(0,0,0,0.05),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_0%_30%,rgba(0,0,0,0.04),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_100%_30%,rgba(0,0,0,0.04),transparent)]" />
      </div>

      <div
        className={cn(
          'grid h-screen transition-[grid-template-columns] duration-200',
          collapsed ? 'grid-cols-[96px_1fr]' : 'grid-cols-[256px_1fr]'
        )}
      >
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

        <main className="min-w-0 h-screen overflow-y-auto space-y-5 p-5 md:p-7">
          <header className="sticky top-0 z-20 -mx-5 md:-mx-7 px-5 md:px-7 pb-3 pt-4 bg-background/70 backdrop-blur">
            <div className={cn(SURFACE, 'px-4 py-3')}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-card-border hover:bg-black/3 transition"
                    aria-label="Toggle sidebar"
                  >
                    {collapsed ? '›' : '‹'}
                  </button>

                  <div className="leading-tight">
                    <p className="text-[11px] uppercase tracking-wide text-text-muted">Inventory</p>
                    <h1 className="text-lg font-semibold">Inventory Control</h1>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={fetchInventory}
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-xl bg-white ring-1 ring-card-border',
                      'hover:bg-black/3 transition focus:outline-none focus:ring-4 focus:ring-black/10'
                    )}
                    aria-label="Refresh"
                    title="Refresh"
                  >
                    <MdRefresh size={20} className={cn(loading && 'animate-spin')} />
                  </button>

                  <button
                    onClick={() => router.push('/inventory/audit')}
                    className={BTN_NEUTRAL}
                    title="Go to End of Day Audit"
                  >
                    <MdChecklist size={18} />
                    EOD Audit
                  </button>

                  <button
                    onClick={() => setShowBulkRestockModal(true)}
                    className={BTN_NEUTRAL}
                    title="Restock Ingredients"
                  >
                    <MdAddShoppingCart size={18} />
                    Restock
                  </button>

                  <button onClick={() => setShowAddModal(true)} className={BTN_PRIMARY}>
                    Add New Ingredient
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
                <div className="relative">
                  <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search ingredient or unit..."
                    className={cn(INPUT_BASE, 'pl-10')}
                  />
                </div>

                <button
                  onClick={() => setShowOnlyLow((v) => !v)}
                  className={cn(
                    BTN_BASE,
                    'px-3 py-2',
                    showOnlyLow
                      ? 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100/70 focus:ring-red-200'
                      : 'bg-white text-foreground ring-1 ring-card-border hover:bg-black/3 focus:ring-black/10'
                  )}
                >
                  <MdWarning size={18} />
                  Low stock only
                </button>

                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className={cn(
                      'w-full appearance-none rounded-xl bg-white px-3 py-2 pr-9 text-sm font-semibold',
                      'border-2 border-black/15 shadow-[0_1px_0_rgba(0,0,0,0.06)]',
                      'hover:bg-black/3 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition'
                    )}
                  >
                    <option value="name-asc">Name (A–Z)</option>
                    <option value="name-desc">Name (Z–A)</option>
                    <option value="stock-desc">Stock (High–Low)</option>
                    <option value="stock-asc">Stock (Low–High)</option>
                    <option value="updated-desc">Recently Updated</option>
                  </select>
                  <MdArrowDropDown
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"
                    size={22}
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setView('list')}
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-xl border-2 transition focus:outline-none focus:ring-4',
                      view === 'list'
                        ? 'bg-primary text-white border-transparent hover:brightness-95 focus:ring-primary/20'
                        : 'bg-white border-black/10 hover:bg-black/3 focus:ring-black/10'
                    )}
                    aria-label="List view"
                  >
                    <MdViewAgenda size={20} />
                  </button>
                  <button
                    onClick={() => setView('grid')}
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-xl border-2 transition focus:outline-none focus:ring-4',
                      view === 'grid'
                        ? 'bg-primary text-white border-transparent hover:brightness-95 focus:ring-primary/20'
                        : 'bg-white border-black/10 hover:bg-black/3 focus:ring-black/10'
                    )}
                    aria-label="Grid view"
                  >
                    <MdGridView size={20} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={cn(CHIP_BASE, 'bg-white')}>
                  <span className="text-text-muted">Results</span>
                  <span className="font-bold">{filteredSorted.length}</span>
                </span>
                <span className={cn(CHIP_BASE, 'bg-white')}>
                  <span className="text-text-muted">Alerts</span>
                  <span className="font-bold text-red-600">{lowStockItems.length}</span>
                </span>
              </div>
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-2">
            <StatCard title="Total Ingredients" value={inventoryItems.length} subtitle="All items currently tracked" />
            <StatCard
              title="Low Stock Items"
              value={lowStockItems.length}
              subtitle="Needs attention based on reorder level"
              accent="danger"
            />
          </section>

          <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className={cn(SURFACE, 'p-4 h-fit')}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Stock Overview</p>
                <span className={cn(CHIP_BASE, 'bg-white')}>
                  <MdTune size={16} className="text-text-muted" />
                  {lowStockItems.length} items
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {lowStockItems.length === 0 ? (
                  <div className={cn(CARD, 'p-4')}>
                    <p className="text-sm font-semibold">No low stock ingredients</p>
                    <p className="text-xs text-text-muted mt-1">All ingredients are above reorder level.</p>
                  </div>
                ) : (
                  lowStockItems.map((item) => {
                    let stockDisplay = '';
                    let shortageMsg = '';
                    if (wholeNumber(item.currentStock) <= 0) {
                      stockDisplay = `Out of stock`;
                      shortageMsg = 'Restock soon to avoid shortages!';
                    } else {
                      stockDisplay = `${parseFloat(Number(item.currentStock).toFixed(2))} ${item.unit} left`;
                      shortageMsg = 'Restock soon to avoid shortages!';
                    }
                    return (
                      <div key={item.ingredientID} className={cn(CARD, 'p-3 flex flex-col gap-1')}>
                        <div className="flex items-center gap-3">
                          <MdWarning className="text-red-600" size={20} />
                          <span className="text-sm font-semibold truncate">{item.name}</span>
                          <span className="text-xs text-text-muted ml-auto">
                            {stockDisplay} (Reorder at {parseFloat(Number(item.reorderLevel).toFixed(2))})
                          </span>
                        </div>
                        <span className="text-xs text-red-600 mt-1">{shortageMsg}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className={cn(SURFACE, 'p-3')}>
              {loading ? (
                <div className="p-4 space-y-3">
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : filteredSorted.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold">No results</p>
                  <p className="text-xs text-text-muted mt-1">Try changing your search or filters.</p>
                </div>
              ) : view === 'grid' ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredSorted.map((item) => (
                    <InventoryCard
                      key={item.ingredientID}
                      item={item}
                      onEdit={() => {
                        setEditItem(item);
                        setShowEditModal(true);
                      }}
                      onDelete={() => handleDeleteClick(item)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSorted.map((item) => (
                    <InventoryRow
                      key={item.ingredientID}
                      item={item}
                      onEdit={() => {
                        setEditItem(item);
                        setShowEditModal(true);
                      }}
                      onDelete={() => handleDeleteClick(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <BulkRestockModal
        open={showBulkRestockModal}
        ingredients={inventoryItems}
        onClose={() => setShowBulkRestockModal(false)}
        onSubmit={handleBulkRestock}
        loading={loading}
      />

      <AddIngredientModal
        open={showAddModal || showEditModal}
        title={showEditModal ? 'Edit Ingredient' : 'Add New Ingredient'}
        initialData={editItem}
        unitOptions={unitOptions}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditItem(null);
        }}
        onSave={handleSave}
      />

      <DeleteConfirmModal
        open={showDeleteConfirm}
        item={deleteTarget}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

/* ----------------------------- UI Components ----------------------------- */

function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  accent?: 'danger';
}) {
  return (
    <div className={cn(SURFACE, 'p-4')}>
      <p className="text-[11px] uppercase tracking-wide text-text-muted">{title}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className={cn('text-2xl font-semibold', accent === 'danger' && 'text-red-600')}>{value}</p>
        <div
          className={cn(
            'h-10 w-10 rounded-2xl grid place-items-center ring-1 ring-card-border',
            accent === 'danger' ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'
          )}
        >
          {accent === 'danger' ? <MdWarning size={20} /> : '📦'}
        </div>
      </div>
      <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
    </div>
  );
}

function StockBar({ current, target }: { current: number; target: number }) {
  const safeTarget = Math.max(wholeNumber(target), 1);
  const pct = Math.max(0, Math.min(100, Math.round((wholeNumber(current) / safeTarget) * 100)));
  const isLow = wholeNumber(current) <= wholeNumber(target);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span>Stock health</span>
        <span className={cn('font-semibold', isLow ? 'text-red-600' : 'text-primary')}>{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-black/5 ring-1 ring-card-border overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-[width]', isLow ? 'bg-red-500' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InventoryRow({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stock = parseFloat(Number(item.currentStock).toFixed(2));
  const reorder = parseFloat(Number(item.reorderLevel).toFixed(2));
  const isLowStock = stock <= reorder;

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 md:flex-row md:items-center',
        'rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-card-border',
        'hover:shadow-md hover:-translate-y-px transition'
      )}
    >
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div
          className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center ring-1 ring-card-border',
            isLowStock ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'
          )}
        >
          {isLowStock ? <MdWarning size={22} /> : '📦'}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{item.name}</p>
            {isLowStock && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                Low stock
              </span>
            )}
          </div>

          <p className="text-xs text-text-muted mt-0.5">
            Stock:{' '}
            <span className={cn('font-semibold', isLowStock ? 'text-red-600' : 'text-primary')}>
              {stock.toFixed(2)} {item.unit}
            </span>
            <span className="mx-2 text-text-muted/60">•</span>
            Reorder at <span className="font-semibold">{reorder}</span>
          </p>

          <div className="mt-2 max-w-sm">
            <StockBar current={stock} target={reorder} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-between gap-3 md:justify-end">
        <div className="grid grid-cols-2 gap-5 md:flex md:items-center md:gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Unit Cost</p>
            <p className="text-sm font-semibold">₱{Number(item.costPerUnit || 0).toFixed(2)}</p>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Last Updated</p>
            <p className="text-sm font-semibold">{new Date(item.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
        <IconButton onClick={onEdit} label="Edit">
          <MdEdit size={18} />
        </IconButton>
        <IconButton onClick={onDelete} label="Delete" danger>
          <MdDelete size={18} />
        </IconButton>
      </div>
    </div>
  );
}

function InventoryCard({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stock = wholeNumber(item.currentStock);
  const reorder = wholeNumber(item.reorderLevel);
  const isLowStock = stock <= reorder;

  return (
    <div className={cn(CARD, 'p-4 hover:shadow-md hover:-translate-y-px transition')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{item.name}</p>
            {isLowStock && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                Low
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {stock} {item.unit} • reorder at {reorder}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <IconButton onClick={onEdit} label="Edit">
            <MdEdit size={18} />
          </IconButton>
          <IconButton onClick={onDelete} label="Delete" danger>
            <MdDelete size={18} />
          </IconButton>
        </div>
      </div>

      <div className="mt-3">
        <StockBar current={stock} target={reorder} />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Unit Cost</p>
          <p className="text-sm font-semibold">₱{Number(item.costPerUnit || 0).toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Updated</p>
          <p className="text-sm font-semibold">{new Date(item.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'grid h-10 w-10 place-items-center rounded-xl border-2 transition focus:outline-none focus:ring-4 active:scale-[0.99]',
        danger
          ? 'text-red-600 border-red-200 hover:bg-red-50 focus:ring-red-200'
          : 'text-text-muted border-black/10 hover:bg-black/3 focus:ring-black/10'
      )}
    >
      {children}
    </button>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-card-border animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-black/10" />
        <div className="flex-1">
          <div className="h-3 w-40 rounded bg-black/10" />
          <div className="mt-2 h-3 w-28 rounded bg-black/10" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-black/10" />
      </div>
      <div className="mt-4 h-2 w-full rounded bg-black/10" />
    </div>
  );
}

/* ----------------------------- Bulk Restock Modal ----------------------------- */

type RestockRow = { quantity: string; unitCost: string };

function BulkRestockModal({
  open,
  ingredients,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  ingredients: InventoryItem[];
  onClose: () => void;
  onSubmit: (items: Array<{ ingredient: InventoryItem; quantity: number; unitCost: number }>, supplier: string) => void;
  loading: boolean;
}) {
  const [rows, setRows] = useState<Record<number, RestockRow>>({});
  const [query, setQuery] = useState('');
  const [supplier, setSupplier] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset rows when modal opens
  useEffect(() => {
    if (open) {
      const initial: Record<number, RestockRow> = {};
      ingredients.forEach((ing) => {
        initial[ing.ingredientID] = {
          quantity: '',
          unitCost: Number(ing.costPerUnit || 0).toFixed(2),
        };
      });
      setRows(initial);
      setQuery('');
      setSupplier('');
      setShowConfirm(false);
    }
  }, [open, ingredients]);

  const filteredIngredients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter(
      (i) => i.name.toLowerCase().includes(q) || i.unit.toLowerCase().includes(q)
    );
  }, [ingredients, query]);

  const filledItems = useMemo(
    () =>
      ingredients.filter((ing) => {
        const r = rows[ing.ingredientID];
        return r && wholeNumber(r.quantity) > 0 && parseFloat(r.unitCost) > 0;
      }),
    [ingredients, rows]
  );

  const totalCost = useMemo(
    () =>
      filledItems.reduce((sum, ing) => {
        const r = rows[ing.ingredientID];
        return sum + wholeNumber(r.quantity) * parseFloat(r.unitCost || '0');
      }, 0),
    [filledItems, rows]
  );

  const handleChange = (
    id: number,
    field: 'quantity' | 'unitCost',
    value: string
  ) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleConfirmSubmit = () => {
    const items = filledItems.map((ing) => ({
      ingredient: ing,
      quantity: wholeNumber(rows[ing.ingredientID].quantity),
      unitCost: parseFloat(rows[ing.ingredientID].unitCost),
    }));
    onSubmit(items, supplier);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl ring-2 ring-card-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-card-border shrink-0">
              <MdAddShoppingCart size={22} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-muted">Purchase Order</p>
              <h3 className="text-lg font-semibold">Restock Ingredients</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Enter quantities and costs for the ingredients you want to restock. Leave blank to skip.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border-2 border-black/10 hover:bg-black/3 transition focus:outline-none focus:ring-4 focus:ring-black/10 shrink-0"
            aria-label="Close"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Supplier + Search */}
        <div className="px-6 py-3 border-b shrink-0 space-y-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Supplier
            </label>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. SM Supermarket, Gaisano Mall…"
              className={INPUT_BASE}
            />
          </div>
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ingredient or unit..."
              className={cn(INPUT_BASE, 'pl-10')}
            />
          </div>
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1.5fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-3 border-b bg-black/3 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted shrink-0">
          <div>Ingredient</div>
          <div className="text-center">Current Stock</div>
          <div>Qty to Add</div>
          <div>Unit Cost (₱)</div>
          <div className="text-right">Subtotal</div>
        </div>

        {/* Scrollable rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-black/5">
          {filteredIngredients.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold">No ingredients found</p>
              <p className="text-xs text-text-muted mt-1">Try changing your search keyword.</p>
            </div>
          ) : (
            filteredIngredients.map((item) => {
              const r = rows[item.ingredientID] ?? { quantity: '', unitCost: '0.00' };
              const qty = wholeNumber(r.quantity);
              const cost = parseFloat(r.unitCost || '0');
              const subtotal = qty > 0 && cost > 0 ? qty * cost : 0;
              const isLow = wholeNumber(item.currentStock) <= wholeNumber(item.reorderLevel);
              const hasFill = qty > 0;

              return (
                <div
                  key={item.ingredientID}
                  className={cn(
                    'grid gap-3 px-4 py-3 md:grid-cols-[1.5fr_0.6fr_0.8fr_0.8fr_0.8fr] md:px-5 md:items-center',
                    hasFill && 'bg-primary/[0.03]'
                  )}
                >
                  {/* Name */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                      {isLow && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-200">
                          Low
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">Unit: <span className="font-medium">{item.unit}</span></p>
                  </div>

                  {/* Current stock */}
                  <div className="flex items-center md:justify-center">
                    <div className="rounded-xl bg-black/5 px-3 py-2 text-sm font-semibold ring-1 ring-card-border">
                      {parseFloat(Number(item.currentStock).toFixed(2))}{' '}
                      <span className="text-[10px] font-medium uppercase text-text-muted">{item.unit}</span>
                    </div>
                  </div>

                  {/* Qty to add */}
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted md:hidden">
                      Qty to Add
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      placeholder="0"
                      className={INPUT_BASE}
                      value={r.quantity}
                      onChange={(e) => handleChange(item.ingredientID, 'quantity', e.target.value)}
                      onKeyDown={(e) => {
                        if (['.', ',', '-', 'e', 'E', '+'].includes(e.key)) e.preventDefault();
                      }}
                    />
                  </div>

                  {/* Unit cost */}
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted md:hidden">
                      Unit Cost (₱)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      inputMode="decimal"
                      placeholder="0.00"
                      className={INPUT_BASE}
                      value={r.unitCost}
                      onChange={(e) => handleChange(item.ingredientID, 'unitCost', e.target.value)}
                      onKeyDown={(e) => {
                        if ([',', '-', 'e', 'E', '+'].includes(e.key)) e.preventDefault();
                      }}
                    />
                  </div>

                  {/* Subtotal */}
                  <div className="flex items-center justify-between md:justify-end">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted md:hidden">Subtotal</span>
                    <span className={cn('text-sm font-semibold', subtotal > 0 ? 'text-primary' : 'text-text-muted')}>
                      {subtotal > 0 ? `₱${subtotal.toFixed(2)}` : '—'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer summary + actions */}
        <div className="px-6 py-4 border-t bg-white shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Items to Restock</p>
                <p className="text-lg font-semibold">{filledItems.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Total Purchase Cost</p>
                <p className="text-lg font-semibold text-primary">₱{totalCost.toFixed(2)}</p>
              </div>
            </div>
            {filledItems.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 ring-1 ring-primary/20">
                <MdInfoOutline size={16} className="text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {filledItems.length} ingredient{filledItems.length !== 1 ? 's' : ''} will be updated
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className={BTN_NEUTRAL} disabled={loading}>
              Cancel
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className={cn(BTN_PRIMARY, 'flex-1 justify-center disabled:opacity-60')}
              disabled={filledItems.length === 0 || loading}
            >
              <MdAddShoppingCart size={18} />
              {loading ? 'Processing...' : `Confirm Restock (${filledItems.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm overlay */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-primary mb-4">
              <div className="p-2 bg-primary/10 rounded-xl">
                <MdInfoOutline size={24} />
              </div>
              <h2 className="text-xl font-bold text-foreground">Confirm Restock</h2>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              You are about to add stock for <strong>{filledItems.length} ingredient{filledItems.length !== 1 ? 's' : ''}</strong> with a total purchase cost of{' '}
              <strong>₱{totalCost.toFixed(2)}</strong>.
            </p>
            <div className="mt-5 space-y-2 bg-black/5 p-4 rounded-2xl border border-black/5 max-h-48 overflow-y-auto">
              {filledItems.map((ing) => {
                const r = rows[ing.ingredientID];
                return (
                  <div key={ing.ingredientID} className="flex justify-between text-xs font-medium">
                    <span className="text-text-muted truncate mr-3">{ing.name}</span>
                    <span>+{wholeNumber(r.quantity)} {ing.unit} @ ₱{parseFloat(r.unitCost).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className={BTN_NEUTRAL}
                disabled={loading}
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmSubmit}
                className={BTN_PRIMARY}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-text-muted">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/* --------------------------- Add/Edit Side Sheet -------------------------- */

function AddIngredientModal({ open, onClose, onSave, title, initialData, unitOptions }: any) {
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
        quantity: wholeNumber(initialData.currentStock),
        unit: initialData.unit,
        reorderLevel: wholeNumber(initialData.reorderLevel),
        price: initialData.costPerUnit.toString(),
      });
    } else {
      setFormData({ name: '', quantity: 0, unit: 'pcs', reorderLevel: 5, price: '0.00' });
    }
  }, [initialData, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl ring-2 ring-card-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 pb-4 border-b">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-muted">{initialData ? 'Edit' : 'Add'}</p>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-xs text-text-muted mt-1">
                {initialData ? 'Update ingredient details.' : 'Add a new ingredient with zero starting stock.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-xl border-2 border-black/10',
                'hover:bg-black/3 transition focus:outline-none focus:ring-4 focus:ring-black/10'
              )}
              aria-label="Close"
            >
              <MdClose size={22} />
            </button>
          </div>

          <div className="mt-5 space-y-4 flex-1 overflow-auto pr-1">
            <Field label="Ingredient Name">
              <input
                className={INPUT_BASE}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Flour"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Current Stock">
                <input type="number" className={INPUT_DISABLED} value={wholeNumber(formData.quantity)} disabled />
              </Field>
              <Field label="Unit">
                <select
                  className={INPUT_BASE}
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  {unitOptions.map((unit: string) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Reorder Level">
                <input
                  type="number"
                  className={INPUT_BASE}
                  value={formData.reorderLevel}
                  min={0}
                  step={1}
                  inputMode="numeric"
                  onChange={(e) => setFormData({ ...formData, reorderLevel: wholeNumber(e.target.value) })}
                  onKeyDown={(e) => {
                    if (['.', ',', '-', 'e', 'E', '+'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Field>
              <Field label="Cost Per Unit">
                <input
                  type="number"
                  step="0.01"
                  className={INPUT_BASE}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </Field>
            </div>

            <div className={cn(CARD, 'px-4 py-4 border-2 border-black/10')}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Tip</p>
              <p className="mt-1 text-sm text-foreground">
                Stock is updated via <span className="font-semibold">Restock</span>, not when adding a new ingredient.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t flex gap-3">
            <button onClick={onClose} className={BTN_NEUTRAL}>
              Cancel
            </button>
            <button onClick={() => onSave(formData)} className={BTN_PRIMARY}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  open,
  item,
  onClose,
  onConfirm,
}: {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div className={cn(CARD, 'w-full max-w-sm p-6')} onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-50 ring-1 ring-red-200 flex items-center justify-center mb-4">
            <MdDelete className="text-3xl text-red-600" />
          </div>

          <h3 className="text-lg font-semibold text-foreground">Delete Ingredient?</h3>
          <p className="text-sm text-text-muted mt-2">
            You are about to delete <span className="font-semibold text-foreground">"{item.name}"</span>.
            This action cannot be undone.
          </p>
        </div>

        <div className={cn(SURFACE, 'mt-5 p-4 space-y-2')}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Ingredient</span>
            <span className="text-sm font-semibold text-foreground">{item.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Current Stock</span>
            <span className="text-sm font-semibold text-foreground">
              {parseFloat(Number(item.currentStock).toFixed(2))} {item.unit}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-black/5 pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Unit Cost</span>
            <span className="text-sm font-semibold text-foreground">
              ₱{Number(item.costPerUnit || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <button onClick={onConfirm} className={cn(BTN_PRIMARY, 'w-full justify-center py-3')}>
            <MdDelete size={18} />
            YES, DELETE IT
          </button>
          <button onClick={onClose} className={cn(BTN_NEUTRAL, 'w-full justify-center py-3')}>
            GO BACK
          </button>
        </div>
      </div>
    </div>
  );
}