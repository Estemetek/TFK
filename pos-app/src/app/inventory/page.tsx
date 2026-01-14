// inventory page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { Sidebar } from '../components/Sidebar';
import {
  MdEdit,
  MdDelete,
  MdClose,
} from 'react-icons/md';

import React from 'react';

type InventoryItem = {
  id: string;
  name: string;
  stocked: string;
  status: 'Active' | 'Inactive' | 'Draft';
  category: string;
  price: string;
};

export default function InventoryPage() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const activeNav = 'Inventory';

  const statusFilters = [
    { label: 'All', count: 150 },
    { label: 'Active', count: 120 },
    { label: 'Inactive', count: 10 },
    { label: 'Draft', count: 10 },
  ];

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
    { id: 'inv-1', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
    { id: 'inv-2', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
    { id: 'inv-3', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
    { id: 'inv-4', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
    { id: 'inv-5', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
    { id: 'inv-6', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore errors in demo
    } finally {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        }`}
      >
        {/* Sidebar */}
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

        {/* Main Content */}
        <main className="space-y-5 p-5 md:p-7">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-card-border">
            <div className="flex items-center gap-3">
              <button
                aria-label="Toggle sidebar"
                onClick={() => setCollapsed((c) => !c)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white text-foreground ring-1 ring-card-border transition hover:bg-card"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? '›' : '‹'}
              </button>
              <h1 className="text-lg font-semibold text-foreground">Inventory</h1>
            </div>
            <div className="flex items-center gap-3 text-text-muted">
              <span className="text-sm">🔔</span>
              <span className="text-sm">⚙️</span>
              <button
                onClick={() => router.push('/profile')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-primary shadow ring-1 ring-card-border"
                aria-label="Open profile"
              >
                AC
              </button>
            </div>
          </header>

          {/* Summary */}
          <section className="rounded-xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-card-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-2 text-foreground">
                <span className="text-xl font-semibold">150</span>
                <span className="text-sm text-text-muted">total products</span>
              </div>
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark"
                onClick={() => setShowAddModal(true)}
              >
                Add New Inventory
              </button>
            </div>
          </section>

          {/* Filters + list */}
          <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
            {/* Filters */}
            <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-card-border">
              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Product Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {statusFilters.map((status) => (
                      <button
                        key={status.label}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold ${
                          status.label === 'All'
                            ? 'border-primary/60 bg-white text-primary shadow'
                            : 'border-card-border bg-white text-text-muted'
                        }`}
                      >
                        <span>{status.label}</span>
                        <span className="text-xs font-bold">{status.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Category</label>
                  <button className="flex w-full items-center justify-between rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-text-muted">
                    <span>All</span>
                    <span>▾</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Stock</label>
                  <button className="flex w-full items-center justify-between rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-text-muted">
                    <span>InStock</span>
                    <span>▾</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Value</label>
                  <button className="flex w-full items-center justify-between rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-text-muted">
                    <span>Litre</span>
                    <span>▾</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Piece / Item / Quantity</label>
                  <input
                    placeholder="50"
                    className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-text-muted"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Price</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="50"
                      className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-text-muted"
                    />
                    <input
                      placeholder="120"
                      className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-text-muted"
                    />
                  </div>
                </div>

                <button className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark">
                  Reset Filters
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-card-border">
              <div className="flex items-center justify-between px-3 py-2">
                <h2 className="text-base font-semibold text-foreground">Inventory</h2>
              </div>

              <div className="space-y-2">
                {inventoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg bg-white px-3 py-3 shadow-sm ring-1 ring-card-border md:flex-row md:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 rounded-lg bg-linear-to-br from-primary/80 via-primary-dark/50 to-surface-dark shadow" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-text-muted">
                          Stocked Product : <span className="text-primary font-semibold">{item.stocked}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Status</span>
                        <span className="text-primary">{item.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Category</span>
                        <span>{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Retail Price</span>
                        <span className="text-foreground font-semibold">{item.price}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="grid h-8 w-8 place-items-center rounded-full border border-card-border text-text-muted hover:bg-card"
                          onClick={() => {
                            setEditItem(item);
                            setShowEditModal(true);
                          }}
                        >
                          <MdEdit className="h-4 w-4" />
                        </button>
                        <button className="grid h-8 w-8 place-items-center rounded-full border border-card-border text-primary hover:bg-card">
                          <MdDelete className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      <AddInventoryModal
        open={showAddModal}
        title="Add New Inventory"
        onClose={() => setShowAddModal(false)}
        onSave={(data) => {
          const newItem: InventoryItem = {
            id: `inv-${Date.now()}`,
            name: data.name,
            stocked: `${data.quantity} In Stock`,
            status: data.status,
            category: data.category,
            price: `$${Number(data.price || 0).toFixed(2)}`,
          };
          setInventoryItems((prev) => [newItem, ...prev]);
          setShowAddModal(false);
        }}
      />

      <AddInventoryModal
        open={showEditModal}
        title="Edit Inventory"
        initialData={
          editItem
            ? {
                name: editItem.name,
                category: editItem.category,
                quantity: Number.parseInt(editItem.stocked) || 0,
                stock: editItem.stocked.toLowerCase().includes('in stock') ? 'InStock' : 'OutOfStock',
                status: editItem.status,
                price: editItem.price.replace('$', ''),
                featured: true,
              }
            : undefined
        }
        onClose={() => {
          setShowEditModal(false);
          setEditItem(null);
        }}
        onSave={(data) => {
          if (!editItem) return;
          setInventoryItems((prev) =>
            prev.map((it) =>
              it.id === editItem.id
                ? {
                    ...it,
                    name: data.name,
                    stocked: `${data.quantity} In Stock`,
                    status: data.status,
                    category: data.category,
                    price: `$${Number(data.price || 0).toFixed(2)}`,
                  }
                : it
            )
          );
          setShowEditModal(false);
          setEditItem(null);
        }}
      />
    </div>
  );
}

function AddInventoryModal({
  open,
  onClose,
  onSave,
  title = 'Add New Inventory',
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    category: string;
    quantity: number;
    stock: 'InStock' | 'OutOfStock';
    status: 'Active' | 'Inactive' | 'Draft';
    price: string;
    featured: boolean;
    imageFile?: File | null;
  }) => void;
  title?: string;
  initialData?: Partial<{
    name: string;
    category: string;
    quantity: number;
    stock: 'InStock' | 'OutOfStock';
    status: 'Active' | 'Inactive' | 'Draft';
    price: string;
    featured: boolean;
  }>;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('All');
  const [quantity, setQuantity] = useState<number>(10);
  const [stock, setStock] = useState<'InStock' | 'OutOfStock'>('InStock');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Draft'>('Active');
  const [price, setPrice] = useState<string>('55.00');
  const [featured, setFeatured] = useState<boolean>(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  React.useEffect(() => {
    if (open && initialData) {
      setName(initialData.name ?? '');
      setCategory(initialData.category ?? 'All');
      setQuantity(initialData.quantity ?? 0);
      setStock(initialData.stock ?? 'InStock');
      setStatus(initialData.status ?? 'Active');
      setPrice(initialData.price ?? '');
      setFeatured(initialData.featured ?? true);
    }
  }, [open, initialData]);

  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const save = () => {
    onSave({ name, category, quantity, stock, status, price, featured, imageFile: file });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-200"
      onClick={onClose}
    >
      {/* Right-side drawer */}
      <div
        className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto rounded-l-2xl bg-white shadow-xl ring-1 ring-card-border transition-transform duration-300 ease-out"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-card text-text-muted ring-1 ring-card-border hover:bg-white"
            onClick={onClose}
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 mt-4 grid place-items-center px-5">
          <label className="relative grid h-28 w-28 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-card-border bg-white text-text-muted hover:border-primary">
            {preview ? (
              <img src={preview} alt="Preview" className="h-28 w-28 rounded-xl object-cover" />
            ) : (
              <span className="text-xs">Upload</span>
            )}
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={handleFile} />
          </label>
          <button
            className="mt-2 text-xs font-semibold text-primary hover:text-primary-dark"
            onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}
          >
            Change Profile Picture
          </button>
        </div>

        <div className="grid gap-3 px-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">Name</label>
              <input
                className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm"
                placeholder="Enter inventory name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">Category</label>
              <select
                className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>All</option>
                <option>Chicken</option>
                <option>Beef</option>
                <option>Seafood</option>
                <option>Drinks</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">Quantity</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm"
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">Stock</label>
              <select
                className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm"
                value={stock}
                onChange={(e) => setStock(e.target.value as 'InStock' | 'OutOfStock')}
              >
                <option value="InStock">InStock</option>
                <option value="OutOfStock">OutOfStock</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Status</label>
            <select
              className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive' | 'Draft')}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Price</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm"
              placeholder="55.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-foreground">Featured</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="featured" checked={featured} onChange={() => setFeatured(true)} />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="featured" checked={!featured} onChange={() => setFeatured(false)} />
              No
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-card-border px-5 py-4">
          <button
            className="rounded-lg bg-card px-4 py-2 text-sm font-semibold text-text-muted ring-1 ring-card-border hover:bg-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark"
            onClick={save}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
