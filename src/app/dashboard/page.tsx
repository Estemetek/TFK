// app/dashboard/page.tsx (or wherever your DashboardPage is)
//dashboard
'use client';

import React, { useState } from 'react';
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
} from 'react-icons/md';

type Metric = {
  label: string;
  value: string;
  note: string;
};

type Dish = {
  id: string;
  name: string;
  subtitle: string;
  status: 'In Stock' | 'Out of stock';
  price: string;
};

type NavItem = {
  name: string;
  path?: string;
};

const SparkBars = ({ values }: { values: number[] }) => (
  <div className="flex h-12 items-end gap-1">
    {values.map((v, idx) => (
      <div
        key={`${v}-${idx}`}
        className="w-[6px] rounded-sm"
        style={{ height: `${v}%`, backgroundColor: '#7CC9A6' }}
      />
    ))}
  </div>
);

const DishRow = ({ dish }: { dish: Dish }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 shadow-[0_8px_16px_rgba(0,0,0,0.06)]">
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 overflow-hidden rounded-xl bg-[#F1F1F1]">
        <div className="h-full w-full bg-gradient-to-br from-[#FFD9D9] via-[#F3F3F3] to-[#D9D9FF]" />
      </div>

      <div className="leading-tight">
        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{dish.name}</p>
        <p className="text-[10px] font-semibold text-[#8A8A8A]">{dish.subtitle}</p>
      </div>
    </div>

    <div className="text-right">
      <p
        className={`text-[10px] font-extrabold ${
          dish.status === 'In Stock' ? 'text-[#1E8E5A]' : 'text-[#D61F2C]'
        }`}
      >
        {dish.status}
      </p>
      <p className="text-[11px] font-extrabold text-[#6D6D6D]">{dish.price}</p>
    </div>
  </div>
);

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

export default function DashboardPage() {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const router = useRouter();
  const activeNav = 'Dashboard';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore in demo
    } finally {
      router.push('/');
    }
  };

  const metrics: Metric[] = [
    { label: 'Daily Sales', value: '$2k', note: '9 February 2024' },
    { label: 'Monthly Revenue', value: '$55k', note: '1 Jan - 1 Feb' },
    { label: 'Table Occupancy', value: '25 Tables', note: 'Active floor' },
    { label: 'Registered Users', value: '128', note: 'Static demo' },
  ];

  const dishesLeft: Dish[] = [
    { id: 'left-1', name: 'Chicken Parmesan', subtitle: 'Serving: 01 person', status: 'In Stock', price: '$55.00' },
    { id: 'left-2', name: 'Chicken Parmesan', subtitle: 'Serving: 01 person', status: 'In Stock', price: '$55.00' },
    { id: 'left-3', name: 'Chicken Parmesan', subtitle: 'Serving: 01 person', status: 'Out of stock', price: '$55.00' },
    { id: 'left-4', name: 'Chicken Parmesan', subtitle: 'Serving: 01 person', status: 'In Stock', price: '$55.00' },
  ];

  const dishesRight: Dish[] = [
    { id: 'right-1', name: 'Chicken Parmesan', subtitle: 'Order: #55.00', status: 'In Stock', price: '$55.00' },
    { id: 'right-2', name: 'Chicken Parmesan', subtitle: 'Order: #55.00', status: 'In Stock', price: '$110.00' },
    { id: 'right-3', name: 'Chicken Parmesan', subtitle: 'Order: #55.00', status: 'Out of stock', price: '$55.00' },
    { id: 'right-4', name: 'Chicken Parmesan', subtitle: 'Order: #55.00', status: 'In Stock', price: '$56.00' },
  ];

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        }`}
      >
        {/* Sidebar (keep your existing layout, just let it sit on gray bg) */}
        <aside className="flex flex-col items-stretch gap-4 rounded-r-2xl bg-white px-3 py-5 shadow-md">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-extrabold text-[#B80F24] shadow ring-1 ring-black/5">
              TFK
            </div>
            {!collapsed && (
              <span className="text-[12px] font-extrabold text-[#1E1E1E]">Taiwan Fried Kitchen</span>
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
          {/* Top header like photo */}
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
              <div>
                <p className="text-[13px] font-extrabold text-[#1E1E1E]">Dashboard</p>
              </div>
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

          {/* Metrics row */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-[#6B6B6B]">{metric.label}</p>
                    <p className="mt-1 text-[22px] font-extrabold text-[#1E1E1E]">{metric.value}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#8A8A8A]">{metric.note}</p>
                  </div>

                  <button
                    className="grid h-8 w-8 place-items-center rounded-full bg-[#B80F24] text-white shadow"
                    aria-label="More"
                  >
                    +
                  </button>
                </div>

                <div className="mt-3">
                  <SparkBars values={[15, 30, 20, 40, 25, 45, 35]} />
                </div>
              </div>
            ))}
          </section>

          {/* Popular dishes */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-extrabold text-[#1E1E1E]">Popular Dishes</h2>
                <button className="text-[11px] font-extrabold text-[#B80F24] hover:underline">See All</button>
              </div>
              <div className="flex flex-col gap-3">
                {dishesLeft.map((dish) => (
                  <DishRow key={dish.id} dish={dish} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-extrabold text-[#1E1E1E]">Popular Dishes</h2>
                <button className="text-[11px] font-extrabold text-[#B80F24] hover:underline">See All</button>
              </div>
              <div className="flex flex-col gap-3">
                {dishesRight.map((dish) => (
                  <DishRow key={dish.id} dish={dish} />
                ))}
              </div>
            </div>
          </section>

          {/* Overview like photo */}
          <section className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-extrabold text-[#1E1E1E]">Overview</p>
                <div className="mt-2 flex items-center gap-6 text-[11px] font-bold text-[#6D6D6D]">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-4 rounded-full bg-[#B80F24]" />
                    Sales
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-4 rounded-full bg-[#B80F24]/25" />
                    Revenue
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="rounded-md bg-[#B80F24] px-4 py-2 text-[11px] font-extrabold text-white shadow">
                  Monthly
                </button>
                <button className="rounded-md bg-transparent px-4 py-2 text-[11px] font-extrabold text-[#6D6D6D]">
                  Daily
                </button>
                <button className="rounded-md bg-transparent px-4 py-2 text-[11px] font-extrabold text-[#6D6D6D]">
                  Weekly
                </button>
                <button className="ml-2 rounded-md bg-white px-4 py-2 text-[11px] font-extrabold text-[#B80F24] shadow">
                  Export
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-[#DCDCDC] p-3">
              <div className="rounded-2xl bg-white p-3">
                <svg viewBox="0 0 760 200" className="h-[220px] w-full">
                  <defs>
                    <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(184, 15, 36, 0.25)" />
                      <stop offset="100%" stopColor="rgba(184, 15, 36, 0.02)" />
                    </linearGradient>
                  </defs>

                  {/* grid */}
                  {[20, 60, 100, 140, 180].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      x2="760"
                      y1={y}
                      y2={y}
                      stroke="rgba(0,0,0,0.08)"
                      strokeWidth="1"
                    />
                  ))}

                  {/* area */}
                  <path
                    d="M 0 140 C 70 70, 140 170, 210 120 C 280 60, 350 140, 420 110 C 490 80, 560 150, 630 115 C 690 90, 725 135, 760 95 L 760 200 L 0 200 Z"
                    fill="url(#areaFill)"
                  />
                  {/* line */}
                  <path
                    d="M 0 140 C 70 70, 140 170, 210 120 C 280 60, 350 140, 420 110 C 490 80, 560 150, 630 115 C 690 90, 725 135, 760 95"
                    fill="none"
                    stroke="#B80F24"
                    strokeWidth="4"
                  />

                  {/* highlight dot */}
                  <circle cx="520" cy="118" r="6" fill="#B80F24" />
                  <circle cx="520" cy="118" r="10" fill="rgba(184,15,36,0.2)" />
                </svg>

                <div className="mt-2 flex justify-between px-1 text-[10px] font-bold text-[#6D6D6D]">
                  {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
