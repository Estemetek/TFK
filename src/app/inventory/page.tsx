'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Sidebar } from '../components/Sidebar';
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
/** keep your palette via CSS vars: bg-background, text-foreground, primary, ring-card-border, text-text-muted */

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
  'hover:bg-black/[0.03] focus:ring-black/10';

const BTN_DANGER =
  BTN_BASE +
  ' bg-red-600 text-white ring-0 shadow-sm ' +
  'hover:bg-red-700 focus:ring-red-200';

const CHIP_BASE =
  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-card-border';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function InventoryPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('Inventory');

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState(0);
  const [restockUnitCost, setRestockUnitCost] = useState(0);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name-asc');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [showOnlyLow, setShowOnlyLow] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Ingredient')
      .select('ingredientID, name, unit, currentStock, reorderLevel, costPerUnit, updatedAt')
      .order('name', { ascending: true });

    if (error) console.error('Error fetching inventory:', error);
    setInventoryItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const lowStockItems = useMemo(
    () => inventoryItems.filter((i) => i.currentStock <= i.reorderLevel),
    [inventoryItems]
  );

  const totalValueEstimate = useMemo(() => {
    return inventoryItems.reduce((sum, i) => sum + i.currentStock * i.costPerUnit, 0);
  }, [inventoryItems]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = inventoryItems;

    if (q) {
      arr = arr.filter((i) => i.name.toLowerCase().includes(q) || i.unit.toLowerCase().includes(q));
    }
    if (showOnlyLow) {
      arr = arr.filter((i) => i.currentStock <= i.reorderLevel);
    }

    const sorted = [...arr].sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'stock-asc':
          return a.currentStock - b.currentStock;
        case 'stock-desc':
          return b.currentStock - a.currentStock;
        case 'updated-desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [inventoryItems, query, showOnlyLow, sort]);

  const handleRestock = async (ingredient: InventoryItem, quantity: number, unitCost: number) => {
    if (!ingredient || quantity <= 0 || unitCost <= 0) return;

    setLoading(true);
    try {
      const { data: purchase, error: purchaseError } = await supabase
        .from('Purchase')
        .insert([{ totalCost: quantity * unitCost }])
        .select()
        .single();
      if (purchaseError) throw purchaseError;

      // COMMENT OUT NI PARA DILI MAG DOBLE ANG IN TRANSACTION:

      // const { error: itemError } = await supabase.from('PurchaseItem').insert([
      //   {
      //     purchaseID: purchase.purchaseID,
      //     ingredientID: ingredient.ingredientID,
      //     quantity,
      //     cost: unitCost,
      //     // createdAt: new Date().toISOString(),
      //   },
      // ]);
      // if (itemError) throw itemError;

      // const { error: txError } = await supabase.from('InventoryTransaction').insert([
      //   {
      //     ingredientID: ingredient.ingredientID,
      //     type: 'IN',
      //     quantity,
      //     referenceNo: purchase.purchaseID.toString(),
      //   },
      // ]);
      // if (txError) throw txError;

      // const { error: updError } = await supabase
      //   .from('Ingredient')
      //   .update({
      //     currentStock: ingredient.currentStock + quantity,
      //     costPerUnit: unitCost,
      //     updatedAt: new Date().toISOString(),
      //   })
      //   .eq('ingredientID', ingredient.ingredientID);
      // if (updError) throw updError;

      await fetchInventory();
      setShowRestockModal(false);
      setRestockItem(null);
      setRestockQuantity(0);
      setRestockUnitCost(0);
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
            reorderLevel: formData.reorderLevel,
            costPerUnit: parseFloat(formData.price),
            updatedAt: new Date().toISOString(),
          })
          .eq('ingredientID', editItem.ingredientID);
      } else {
        const { error } = await supabase
          .from('Ingredient')
          .insert({
            name: formData.name,
            unit: formData.unit,
            reorderLevel: formData.reorderLevel,
            costPerUnit: parseFloat(formData.price),
            currentStock: 0,
            updatedAt: new Date().toISOString(),
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

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this ingredient?')) {
      await supabase.from('Ingredient').delete().eq('ingredientID', id);
      await fetchInventory();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* subtle modern background without changing palette */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(0,0,0,0.05),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_0%_30%,rgba(0,0,0,0.04),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_100%_30%,rgba(0,0,0,0.04),transparent)]" />
      </div>

      <div
        className={cn(
          'grid min-h-screen transition-[grid-template-columns] duration-200',
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        )}
      >
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

        <main className="min-w-0 space-y-5 p-5 md:p-7">
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

                <div className="flex items-center gap-2">
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

          <section className="grid gap-4 lg:grid-cols-3">
            <StatCard title="Total Ingredients" value={inventoryItems.length} subtitle="All items currently tracked" />
            <StatCard
              title="Low Stock Items"
              value={lowStockItems.length}
              subtitle="Needs attention based on reorder level"
              accent="danger"
            />
            <StatCard
              title="Inventory Value (Est.)"
              value={`$${totalValueEstimate.toFixed(2)}`}
              subtitle="Based on current stock × unit cost"
            />
          </section>

          <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className={cn(SURFACE, 'p-4 h-fit')}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Stock Overview</p>
                <span className={cn(CHIP_BASE, 'bg-white')}>
                  <MdTune size={16} className="text-text-muted" />
                  {lowStockItems.length} alerts
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {lowStockItems.length === 0 ? (
                  <div className={cn(CARD, 'p-4')}>
                    <p className="text-sm font-semibold">All good</p>
                    <p className="text-xs text-text-muted mt-1">No ingredients are below reorder level.</p>
                  </div>
                ) : (
                  lowStockItems.slice(0, 8).map((item) => (
                    <div key={item.ingredientID} className={cn(CARD, 'p-3 hover:shadow-md')}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{item.name}</p>
                          <p className="text-xs text-text-muted">
                            {item.currentStock} {item.unit} • reorder at {item.reorderLevel}
                          </p>
                        </div>

                        <button
                          className={cn(BTN_PRIMARY, 'px-3 py-1.5 text-xs')}
                          onClick={() => {
                            setRestockItem(item);
                            setRestockQuantity(0);
                            setRestockUnitCost(Number(item.costPerUnit || 0));
                            setShowRestockModal(true);
                          }}
                        >
                          Restock
                        </button>
                      </div>

                      <StockBar current={item.currentStock} target={item.reorderLevel} />
                    </div>
                  ))
                )}
              </div>

              {lowStockItems.length > 8 && (
                <p className="mt-3 text-xs text-text-muted">Showing 8 of {lowStockItems.length} low-stock items.</p>
              )}
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
                      onDelete={() => handleDelete(item.ingredientID)}
                      onRestock={() => {
                        setRestockItem(item);
                        setRestockQuantity(0);
                        setRestockUnitCost(Number(item.costPerUnit || 0));
                        setShowRestockModal(true);
                      }}
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
                      onDelete={() => handleDelete(item.ingredientID)}
                      onRestock={() => {
                        setRestockItem(item);
                        setRestockQuantity(0);
                        setRestockUnitCost(Number(item.costPerUnit || 0));
                        setShowRestockModal(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <RestockModal
        open={showRestockModal}
        ingredient={restockItem}
        quantity={restockQuantity}
        setQuantity={setRestockQuantity}
        unitCost={restockUnitCost}
        setUnitCost={setRestockUnitCost}
        onClose={() => {
          setShowRestockModal(false);
          setRestockItem(null);
          setRestockQuantity(0);
          setRestockUnitCost(0);
        }}
        onRestock={() => restockItem && handleRestock(restockItem, restockQuantity, restockUnitCost)}
        loading={loading}
      />

      <AddIngredientModal
        open={showAddModal || showEditModal}
        title={showEditModal ? 'Edit Ingredient' : 'Add New Ingredient'}
        initialData={editItem}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditItem(null);
        }}
        onSave={handleSave}
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
  const safeTarget = Math.max(target, 1);
  const pct = Math.max(0, Math.min(100, Math.round((current / safeTarget) * 100)));
  const isLow = current <= target;

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
  onRestock,
}: {
  item: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
  onRestock: () => void;
}) {
  const isLowStock = item.currentStock <= item.reorderLevel;

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
              {item.currentStock} {item.unit}
            </span>
            <span className="mx-2 text-text-muted/60">•</span>
            Reorder at <span className="font-semibold">{item.reorderLevel}</span>
          </p>

          <div className="mt-2 max-w-sm">
            <StockBar current={item.currentStock} target={item.reorderLevel} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-between gap-3 md:justify-end">
        <div className="grid grid-cols-2 gap-5 md:flex md:items-center md:gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Unit Cost</p>
            <p className="text-sm font-semibold">${Number(item.costPerUnit || 0).toFixed(2)}</p>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Last Updated</p>
            <p className="text-sm font-semibold">{new Date(item.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isLowStock && (
            <button onClick={onRestock} className={cn(BTN_PRIMARY, 'px-3 py-2 text-xs')}>
              Restock
            </button>
          )}

          <IconButton onClick={onEdit} label="Edit">
            <MdEdit size={18} />
          </IconButton>
          <IconButton onClick={onDelete} label="Delete" danger>
            <MdDelete size={18} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function InventoryCard({
  item,
  onEdit,
  onDelete,
  onRestock,
}: {
  item: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
  onRestock: () => void;
}) {
  const isLowStock = item.currentStock <= item.reorderLevel;

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
            {item.currentStock} {item.unit} • reorder at {item.reorderLevel}
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
        <StockBar current={item.currentStock} target={item.reorderLevel} />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Unit Cost</p>
          <p className="text-sm font-semibold">${Number(item.costPerUnit || 0).toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-text-muted font-bold">Updated</p>
          <p className="text-sm font-semibold">{new Date(item.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onRestock}
          className={cn(
            'flex-1 rounded-xl px-3 py-2 text-xs font-semibold border-2 transition focus:outline-none focus:ring-4',
            isLowStock
              ? 'bg-primary text-white border-transparent hover:brightness-95 focus:ring-primary/20'
              : 'bg-white border-black/15 hover:bg-black/3 focus:ring-black/10'
          )}
        >
          Restock
        </button>
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

/* ----------------------------- Restock Modal ----------------------------- */

function RestockModal({
  open,
  ingredient,
  quantity,
  setQuantity,
  unitCost,
  setUnitCost,
  onClose,
  onRestock,
  loading,
}: any) {
  if (!open || !ingredient) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl ring-2 ring-card-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 pb-4 border-b">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-muted">Restock</p>
              <h3 className="text-lg font-semibold">{ingredient.name}</h3>
              <p className="text-xs text-text-muted mt-1">
                Current: <span className="font-semibold">{ingredient.currentStock}</span> {ingredient.unit} • Reorder:{' '}
                <span className="font-semibold">{ingredient.reorderLevel}</span>
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
              <input className={INPUT_DISABLED} value={ingredient.name} disabled />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Current Stock">
                <input className={INPUT_DISABLED} value={ingredient.currentStock} disabled />
              </Field>
              <Field label="Unit">
                <input className={INPUT_DISABLED} value={ingredient.unit} disabled />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Reorder Level">
                <input className={INPUT_DISABLED} value={ingredient.reorderLevel} disabled />
              </Field>
              <Field label="Unit Cost">
                <input
                  className={INPUT_BASE}
                  type="number"
                  value={unitCost}
                  min={0.01}
                  step={0.01}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  placeholder="Enter unit cost"
                />
              </Field>
            </div>

            <Field label="Add Quantity">
              <input
                type="number"
                className={INPUT_BASE}
                value={quantity}
                min={1}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="Enter quantity to add"
                autoFocus
              />
            </Field>

            <div className={cn(CARD, 'p-4')}>
              <p className="text-xs text-text-muted">Estimated added cost</p>
              <p className="text-lg font-semibold mt-1">
                ${(Number(quantity || 0) * Number(unitCost || 0)).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t flex gap-3">
            <button onClick={onClose} className={BTN_NEUTRAL}>
              Cancel
            </button>
            <button
              onClick={() => {
                if (quantity > 0 && unitCost > 0 && !loading) onRestock();
              }}
              className={cn(BTN_PRIMARY, 'disabled:opacity-60')}
              disabled={quantity <= 0 || unitCost <= 0 || loading}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
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
                <input type="number" className={INPUT_DISABLED} value={formData.quantity} disabled />
              </Field>
              <Field label="Unit">
                <input
                  className={INPUT_BASE}
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="kg / pcs / bottle"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Reorder Level">
                <input
                  type="number"
                  className={INPUT_BASE}
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: parseFloat(e.target.value) })}
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