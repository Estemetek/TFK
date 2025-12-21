// inventory page
'use client';

import { useState } from 'react';
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
  MdEdit,
  MdDelete,
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

type NavItem = {
  name: string;
  path?: string;
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
  { name: 'Menu' },
  { name: 'Staff' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Reports' },
  { name: 'Order' },
];

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

  const inventoryItems: InventoryItem[] = [
    { id: 'inv-1', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
    { id: 'inv-2', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
    { id: 'inv-3', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
    { id: 'inv-4', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
    { id: 'inv-5', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
    { id: 'inv-6', name: 'Chicken Parmesan', stocked: '10 In Stock', status: 'Active', category: 'Chicken', price: '$55.00' },
  ];

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
        <aside className="flex flex-col items-stretch gap-4 rounded-r-2xl bg-surface px-3 py-5 shadow-md">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-bold text-primary shadow">
              TFK
            </div>
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
                  className={`flex items-center rounded-xl ring-1 ring-card-border transition hover:-translate-y-0.5 hover:shadow ${
                    collapsed ? 'h-14 w-14 self-center bg-card justify-center gap-0' : 'h-12 w-full bg-card px-2 gap-3'
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-full ${
                      isActive ? 'bg-primary text-white' : 'bg-white text-text-muted'
                    } shadow-inner`}
                  >
                    {iconMap[item.name]}
                  </span>
                  {!collapsed && (
                    <span
                      className={`text-xs font-semibold ${
                        isActive ? 'text-foreground' : 'text-text-muted'
                      }`}
                    >
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
              className={`ring-1 ring-card-border transition hover:shadow ${
                collapsed
                  ? 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-dark text-white'
                  : 'flex w-full items-center gap-3 rounded-xl bg-card px-2 py-2'
              }`}
              aria-label="Logout"
              title="Logout"
            >
              <span
                className={`grid h-10 w-10 place-items-center rounded-full ${
                  collapsed ? 'bg-surface-dark text-white' : 'bg-white text-text-muted'
                } shadow-inner`}
              >
                <MdLogout className="h-5 w-5" />
              </span>
              {!collapsed && (
                <span className="text-xs font-semibold text-text-muted">Logout</span>
              )}
            </button>
          </div>
        </aside>

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
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark">
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
                        <button className="grid h-8 w-8 place-items-center rounded-full border border-card-border text-text-muted hover:bg-card">
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
    </div>
  );
}
