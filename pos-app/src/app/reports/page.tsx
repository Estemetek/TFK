// app/reports/page.tsx
// Reports page (Reservation / Revenue / Staff) — matches your updated UI style (gray panels + red accent)
// Update: Added "Sales & EOD Report" tab + layout to match attached design

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { logout } from '../lib/auth';
import {
  MdDashboard,
  MdRestaurantMenu,
  MdPeople,
  MdInventory2,
  MdAssessment,
  MdShoppingCart,
  MdLogout,
  MdCalendarMonth,
} from 'react-icons/md';

type NavItem = { name: string; path?: string };

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <MdDashboard className="h-5 w-5" />,
  Menu: <MdRestaurantMenu className="h-5 w-5" />,
  'User Management': <MdPeople className="h-5 w-5" />,
  Inventory: <MdInventory2 className="h-5 w-5" />,
  Reports: <MdAssessment className="h-5 w-5" />,
  Order: <MdShoppingCart className="h-5 w-5" />,
};

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Menu', path: '/menu' },
  { name: 'User Management', path: '/staff' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Reports', path: '/reports' },
  { name: 'Order', path: '/order' },
];

const Tab = ({
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
    className={`rounded-md px-4 py-2 text-[11px] font-extrabold shadow transition ${
      active ? 'bg-[#B80F24] text-white' : 'bg-white text-[#6D6D6D]'
    }`}
  >
    {children}
  </button>
);

const StatusPill = ({
  active,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-md px-3 py-2 text-[11px] font-extrabold transition ${
      active ? 'bg-[#B80F24] text-white shadow' : 'bg-transparent text-[#6D6D6D]'
    }`}
  >
    {label}
  </button>
);

function Donut({ totalLabel, totalValue }: { totalLabel: string; totalValue: string }) {
  const r = 62;
  const c = 2 * Math.PI * r;

  const slices = [
    { pct: 0.36, color: '#FF4D8D' },
    { pct: 0.26, color: '#FF77B0' },
    { pct: 0.22, color: '#FF9EC8' },
    { pct: 0.16, color: '#FFD0E3' },
  ];

  let acc = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative grid place-items-center">
        <svg width="170" height="170" viewBox="0 0 170 170">
          <g transform="translate(85 85)">
            <circle r={r} fill="none" stroke="#F2F2F2" strokeWidth="18" />
            {slices.map((s, i) => {
              const dash = c * s.pct;
              const gap = c - dash;
              const offset = c * acc;
              acc += s.pct;
              return (
                <circle
                  key={i}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90)"
                />
              );
            })}
          </g>
        </svg>

        <div className="absolute text-center">
          <div className="text-[12px] font-extrabold text-[#6D6D6D]">{totalLabel}</div>
          <div className="mt-1 text-[18px] font-extrabold text-[#1E1E1E]">{totalValue}</div>
        </div>
      </div>

      <div className="space-y-3 text-[11px]">
        {[
          { label: 'Confirmed', color: '#FF4D8D' },
          { label: 'Awaited', color: '#FF77B0' },
          { label: 'Cancelled', color: '#FF9EC8' },
          { label: 'Failed', color: '#FFD0E3' },
        ].map((x) => (
          <div key={x.label} className="flex items-center gap-3">
            <span className="h-2.5 w-6 rounded-full" style={{ backgroundColor: x.color }} />
            <span className="font-extrabold text-[#6D6D6D]">{x.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineAreaChart() {
  return (
    <div className="rounded-2xl bg-[#E7E7E7] p-3">
      <div className="rounded-2xl bg-white p-3">
        <svg viewBox="0 0 760 220" className="h-48 w-full">
          <defs>
            <linearGradient id="areaFillReports" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(184, 15, 36, 0.25)" />
              <stop offset="100%" stopColor="rgba(184, 15, 36, 0.02)" />
            </linearGradient>
          </defs>

          {[30, 70, 110, 150, 190].map((y) => (
            <line key={y} x1="0" x2="760" y1={y} y2={y} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          ))}

          <path
            d="M 0 150 C 70 85, 140 175, 210 130 C 280 80, 350 150, 420 120 C 490 95, 560 165, 630 125 C 690 105, 725 145, 760 110 L 760 220 L 0 220 Z"
            fill="url(#areaFillReports)"
          />
          <path
            d="M 0 150 C 70 85, 140 175, 210 130 C 280 80, 350 150, 420 120 C 490 95, 560 165, 630 125 C 690 105, 725 145, 760 110"
            fill="none"
            stroke="#B80F24"
            strokeWidth="4"
          />

          <circle cx="520" cy="122" r="6" fill="#B80F24" />
          <circle cx="520" cy="122" r="10" fill="rgba(184,15,36,0.2)" />
        </svg>

        <div className="mt-2 flex justify-between px-1 text-[10px] font-bold text-[#6D6D6D]">
          {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

type ReportTab = 'Reservation Report' | 'Revenue Report' | 'Staff Report' | 'Sales & EOD Report' | 'Receipts';

function n2(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function money(n: number) {
  return `$${n2(n)}`;
}

// Format date/time in formal readable format
function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

// Receipt Modal Component
function ReceiptModal({ order, onClose }: { order: any; onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    alert('PDF download feature - integrate jsPDF or similar library');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition"
        >
          ✕
        </button>

        {/* Receipt Header */}
        <div className="bg-gradient-to-b from-[#B80F24] to-[#7E0012] px-8 py-6 text-center text-white">
          <div className="mb-2 flex justify-center">
            <img src="/TFK.png" alt="TFK Logo" className="h-16 w-16 rounded-full bg-white p-1 shadow-lg" />
          </div>
          <h2 className="text-[18px] font-extrabold">Taiwan Fried Kitchen</h2>
          <p className="text-[11px] font-bold opacity-90">Official Receipt</p>
        </div>

        {/* Receipt Body */}
        <div className="space-y-4 px-8 py-6">
          {/* Order Info */}
          <div className="border-b-2 border-dashed border-gray-300 pb-4">
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="font-bold text-gray-500">Order ID:</span>
              <span className="font-extrabold text-[#B80F24]">#{order.orderID}</span>
            </div>
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="font-bold text-gray-500">Date & Time:</span>
              <span className="font-extrabold text-gray-800">
                {formatDateTime(order.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-gray-500">Payment Method:</span>
              <span className="font-extrabold text-gray-800 uppercase">
                {order.paymentmethod === 'cash' && '💵 Cash'}
                {order.paymentmethod === 'gcash' && '📱 GCash'}
                {order.paymentmethod === 'bank' && '🏦 Bank Transfer'}
                {!order.paymentmethod && '💵 Cash'}
              </span>
            </div>
          </div>

          {/* Items List */}
          <div>
            <h3 className="mb-3 text-[12px] font-extrabold text-gray-700 uppercase">Order Items</h3>
            <div className="space-y-3">
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any, idx: number) => {
                  const itemTotal = Number(item.MenuItem?.price || 0) * item.quantity;
                  return (
                    <div key={idx} className="flex items-start justify-between border-b border-gray-100 pb-2">
                      <div className="flex-1">
                        <div className="text-[12px] font-extrabold text-gray-800">
                          {item.MenuItem?.name || 'Unknown Item'}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold text-gray-500">
                          ₱{Number(item.MenuItem?.price || 0).toFixed(2)} × {item.quantity}
                        </div>
                      </div>
                      <div className="text-[12px] font-extrabold text-gray-800">
                        ₱{itemTotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[11px] text-gray-500">No items</p>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t-2 border-gray-200 pt-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-gray-600">Subtotal:</span>
              <span className="font-extrabold text-gray-800">₱{Number(order.amount).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-gray-600">Amount Paid:</span>
              <span className="font-extrabold text-gray-800">₱{Number(order.amountPaid).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-gray-300 pt-2 text-[13px]">
              <span className="font-extrabold text-green-600">Change:</span>
              <span className="font-extrabold text-green-600">₱{Number(order.change).toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Message */}
          <div className="border-t-2 border-dashed border-gray-300 pt-4 text-center">
            <p className="text-[10px] font-bold text-gray-500">Thank you for your order!</p>
            <p className="mt-1 text-[9px] text-gray-400">
              This is an official receipt from Taiwan Fried Kitchen
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 border-t border-gray-200 bg-gray-50 px-8 py-4">
          <button
            onClick={handlePrint}
            className="flex-1 rounded-lg bg-[#B80F24] py-2.5 text-[11px] font-extrabold text-white transition hover:bg-[#7E0012]"
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex-1 rounded-lg border-2 border-[#B80F24] py-2.5 text-[11px] font-extrabold text-[#B80F24] transition hover:bg-[#B80F24] hover:text-white"
          >
            📄 Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const activeNav = 'Reports';

  const [tab, setTab] = useState<ReportTab>('Receipts');
  const [status, setStatus] = useState<'Confirmed' | 'Awaited' | 'Cancelled' | 'Failed'>('Confirmed');

  const [from, setFrom] = useState('2024-04-01');
  const [to, setTo] = useState('2024-08-08');

  // Receipts state
  const [receipts, setReceipts] = useState<any[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Fetch receipts when tab changes
  useEffect(() => {
    if (tab === 'Receipts') {
      fetchReceipts();
    }
  }, [tab]);

  const fetchReceipts = async () => {
    setReceiptsLoading(true);
    try {
      // Fetch orders with their items
      const { data: orders, error: orderErr } = await supabase
        .from('Order')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (orderErr) throw orderErr;

      // For each order, fetch its items
      const ordersWithItems = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: items } = await supabase
            .from('OrderItem')
            .select('*, MenuItem(name, price)')
            .eq('orderID', order.orderID);
          
          return {
            ...order,
            items: items || []
          };
        })
      );

      setReceipts(ordersWithItems);
      console.log('Orders with items fetched:', ordersWithItems);
    } catch (err: any) {
      console.error('Error fetching receipts:', err);
      alert(`Failed to fetch receipts: ${err.message || 'Unknown error'}`);
    } finally {
      setReceiptsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const leftCard = useMemo(() => {
    if (tab === 'Reservation Report') return { title: 'Total Reservation', label: 'Total', value: '192' };
    if (tab === 'Revenue Report') return { title: 'Total Revenue', label: 'Total', value: '1556$' };
    if (tab === 'Staff Report') return { title: 'Total Staff', label: 'Total', value: '50' };
    // Sales & EOD doesn't use donut/line cards (matches screenshot)
    return { title: 'Daily Sales Report', label: 'Total', value: '0' };
  }, [tab]);

  const reservationRows = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        id: `#123456${i}4`,
        customer: 'Watson Joyce',
        phone: '+1 (123) 123 4654',
        date: '28.03.2024',
        checkIn: '03 : 18 PM',
        checkOut: '05 : 00 PM',
        total: '$250.00',
      })),
    []
  );

  const revenueRows = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        sn: `0${i + 1}`,
        topFood: 'Chicken Parmesan',
        date: '28.03.2024',
        sellPrice: '$55.00',
        profit: '$7,985.00',
        margin: '15.00%',
        totalRevenue: '$8000.00',
      })),
    []
  );

  const staffRows = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        staffId: `#01${i}`,
        name: 'Watson Joyce',
        role: 'Manager',
        email: 'watsonjoyce112@gmail.com',
        phone: '+1 (123) 123 4654',
        salary: '$2200.00',
        timings: '9am to 6pm',
      })),
    []
  );

  // NEW: Sales & EOD report data (UI-only)
  const salesInfo = useMemo(
    () => ({
      salesperson: 'John Doe',
      date: 'November 10, 2025',
      taxPct: 0.08,
    }),
    []
  );

  const salesRows = useMemo(
    () => [
      { code: '001', item: 'ITEM A', unitPrice: 999.99, qty: 2 },
      { code: '002', item: 'ITEM B', unitPrice: 599.99, qty: 1 },
      { code: '003', item: 'ITEM C', unitPrice: 149.99, qty: 3 },
      { code: '004', item: 'ITEM D', unitPrice: 79.99, qty: 4 },
    ],
    []
  );

  const salesTotals = useMemo(() => {
    const sub = salesRows.reduce((a, r) => a + r.unitPrice * r.qty, 0);
    const tax = sub * salesInfo.taxPct;
    const total = sub + tax;
    return { sub, tax, total };
  }, [salesRows, salesInfo.taxPct]);

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      {/* Receipt Modal */}
      {selectedOrder && (
        <ReceiptModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}

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
              <p className="text-[13px] font-extrabold text-[#1E1E1E]">Reports</p>
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

          {/* Tabs + date + generate */}
          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tab active={tab === 'Reservation Report'} onClick={() => setTab('Reservation Report')}>
                Reservation Report
              </Tab>
              <Tab active={tab === 'Revenue Report'} onClick={() => setTab('Revenue Report')}>
                Revenue Report
              </Tab>
              <Tab active={tab === 'Staff Report'} onClick={() => setTab('Staff Report')}>
                Staff Report
              </Tab>
              {/* NEW TAB */}
              <Tab active={tab === 'Sales & EOD Report'} onClick={() => setTab('Sales & EOD Report')}>
                Sales &amp; EOD Report
              </Tab>
              <Tab active={tab === 'Receipts'} onClick={() => setTab('Receipts')}>
                Receipts
              </Tab>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow">
                <MdCalendarMonth className="h-5 w-5 text-[#6D6D6D]" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="bg-transparent text-[11px] font-extrabold text-[#6D6D6D] outline-none"
                />
                <span className="text-[11px] font-extrabold text-[#6D6D6D]">—</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="bg-transparent text-[11px] font-extrabold text-[#6D6D6D] outline-none"
                />
              </div>

              <button className="rounded-md bg-[#B80F24] px-4 py-2 text-[11px] font-extrabold text-white shadow">
                Generate Report
              </button>
            </div>
          </section>

          {/* Receipts Tab */}
          {tab === 'Receipts' && (
            <section className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
              <div className="rounded-t-2xl bg-[#B80F24] px-6 py-4 flex items-center justify-between">
                <div className="text-[14px] font-extrabold text-white">Order Receipts</div>
              </div>

              {receiptsLoading ? (
                <div className="px-6 py-12 text-center text-[12px] text-[#6D6D6D]">Loading receipts...</div>
              ) : receipts.length === 0 ? (
                <div className="px-6 py-12 text-center text-[12px] text-[#6D6D6D]">No receipts found</div>
              ) : (
                <div className="divide-y divide-black/5">
                  {receipts.map((order, idx) => (
                    <div
                      key={order.orderID}
                      onClick={() => setSelectedOrder(order)}
                      className={`cursor-pointer px-6 py-4 transition hover:bg-gray-100 ${
                        idx % 2 === 0 ? 'bg-[#F7F7F7]' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="grid grid-cols-4 gap-4 flex-1">
                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Order ID</div>
                            <div className="text-[12px] font-extrabold text-[#1E1E1E]">#{order.orderID}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Date &amp; Time</div>
                            <div className="text-[11px] font-bold text-[#6D6D6D]">
                              {formatDateTime(order.createdAt)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Total Amount</div>
                            <div className="text-[12px] font-extrabold text-[#1E1E1E]">
                              ₱{Number(order.amount).toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Change</div>
                            <div className="text-[12px] font-extrabold text-green-600">
                              ₱{Number(order.change).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Sales & EOD Report layout (matches screenshot) */}
          {tab === 'Sales & EOD Report' ? (
            <section className="rounded-2xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
              {/* red header bar */}
              <div className="flex items-center justify-between rounded-t-2xl bg-[#7E0012] px-6 py-4">
                <div className="text-[13px] font-extrabold text-white">Daily Sales Report</div>

                <div className="text-right text-[10px] font-extrabold text-white/90">
                  <div>Salesperson: {salesInfo.salesperson}</div>
                  <div>Date: {salesInfo.date}</div>
                </div>
              </div>

              {/* content row */}
              <div className="grid gap-4 p-5 lg:grid-cols-[1fr_260px]">
                {/* table */}
                <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                  <div className="grid grid-cols-[80px_1fr_120px_70px_140px_80px_120px_140px] gap-2 px-4 py-3 text-[10px] font-extrabold text-[#6D6D6D]">
                    <div>Code</div>
                    <div>Item</div>
                    <div className="text-right">Unit Price</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Subtotal</div>
                    <div className="text-right">Tax %</div>
                    <div className="text-right">Tax</div>
                    <div className="text-right">Total</div>
                  </div>

                  <div className="divide-y divide-black/5">
                    {salesRows.map((r, i) => {
                      const subtotal = r.unitPrice * r.qty;
                      const tax = subtotal * salesInfo.taxPct;
                      const total = subtotal + tax;

                      return (
                        <div
                          key={r.code}
                          className={`grid grid-cols-[80px_1fr_120px_70px_140px_80px_120px_140px] gap-2 px-4 py-3 text-[11px] font-extrabold ${
                            i % 2 === 0 ? 'bg-[#F7F7F7]' : 'bg-white'
                          }`}
                        >
                          <div className="text-[#1E1E1E]">{r.code}</div>
                          <div className="text-[#1E1E1E]">{r.item}</div>
                          <div className="text-right text-[#1E1E1E]">{money(r.unitPrice)}</div>
                          <div className="text-right text-[#1E1E1E]">{r.qty}</div>
                          <div className="text-right text-[#1E1E1E]">{money(subtotal)}</div>
                          <div className="text-right text-[#1E1E1E]">{Math.round(salesInfo.taxPct * 100)}%</div>
                          <div className="text-right text-[#1E1E1E]">{money(tax)}</div>
                          <div className="text-right text-[#1E1E1E]">{money(total)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* right totals card */}
                <div className="h-fit rounded-xl bg-[#7E0012] p-4 text-white shadow">
                  <div className="space-y-3 text-[10px] font-extrabold">
                    <div className="flex items-center justify-between">
                      <span>Sales Amount:</span>
                      <span>{money(salesTotals.sub)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Sales Tax:</span>
                      <span>{money(salesTotals.tax)}</span>
                    </div>
                    <div className="mt-3 border-t border-white/25 pt-3 flex items-center justify-between">
                      <span>Total Sales:</span>
                      <span>{money(salesTotals.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-10" />
            </section>
          ) : (
            <>
              {/* Existing charts row */}
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  <p className="mb-3 text-[14px] font-extrabold text-[#1E1E1E]">{leftCard.title}</p>
                  <Donut totalLabel={leftCard.label} totalValue={leftCard.value} />
                </div>

                <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {(['Confirmed', 'Awaited', 'Cancelled', 'Failed'] as const).map((s) => (
                      <StatusPill key={s} label={s} active={status === s} onClick={() => setStatus(s)} />
                    ))}
                  </div>
                  <LineAreaChart />
                </div>
              </section>

              {/* Existing bottom table/list */}
              <section className="overflow-hidden rounded-2xl bg-[#E7E7E7] shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                {tab === 'Reservation Report' && (
                  <>
                    <div className="grid grid-cols-6 gap-2 px-4 py-3 text-[10px] font-extrabold text-[#B80F24]">
                      <div>Reservation ID</div>
                      <div>Customer Name</div>
                      <div>Phone number</div>
                      <div>Reservation Date</div>
                      <div>Check In / Check Out</div>
                      <div className="text-right">Total</div>
                    </div>

                    <div className="divide-y divide-black/5">
                      {reservationRows.map((r, idx) => (
                        <div
                          key={r.id}
                          className={`grid grid-cols-6 gap-2 px-4 py-4 text-[11px] ${
                            idx % 2 === 0 ? 'bg-[#DCDCDC]' : 'bg-[#E7E7E7]'
                          }`}
                        >
                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Reservation ID</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.id}</div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Customer Name</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.customer}</div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Phone number</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.phone}</div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Reservation Date</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.date}</div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Check In</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.checkIn}</div>
                            <div className="mt-1 text-[10px] font-extrabold text-[#B80F24]">Check Out</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.checkOut}</div>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Total</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.total}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {tab === 'Revenue Report' && (
                  <>
                    <div className="grid grid-cols-7 gap-2 px-4 py-3 text-[10px] font-extrabold text-[#B80F24]">
                      <div>S.No</div>
                      <div>Top Selling Food</div>
                      <div>Revenue By Date</div>
                      <div>Sell Price</div>
                      <div>Profit</div>
                      <div>Profit Margin</div>
                      <div className="text-right">Total Revenue</div>
                    </div>

                    <div className="divide-y divide-black/5">
                      {revenueRows.map((r, idx) => (
                        <div
                          key={r.sn + idx}
                          className={`grid grid-cols-7 gap-2 px-4 py-4 text-[11px] ${
                            idx % 2 === 0 ? 'bg-[#DCDCDC]' : 'bg-[#E7E7E7]'
                          }`}
                        >
                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">S.No</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.sn}</div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Top Selling Food</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.topFood}</div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Revenue By Date</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.date}</div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Sell Price</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.sellPrice}</div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Profit</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.profit}</div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Profit Margin</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.margin}</div>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] font-extrabold text-[#B80F24]">Total Revenue</div>
                            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{r.totalRevenue}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {tab === 'Staff Report' && (
                  <>
                    <div className="grid grid-cols-7 gap-2 px-4 py-3 text-[10px] font-extrabold text-[#B80F24]">
                      <div>ID</div>
                      <div>Name</div>
                      <div>Email</div>
                      <div>Phone</div>
                      <div>Role</div>
                      <div>Salary</div>
                      <div className="text-right">Timings</div>
                    </div>

                    <div className="divide-y divide-black/5">
                      {staffRows.map((r, idx) => (
                        <div
                          key={r.staffId + idx}
                          className={`grid grid-cols-7 gap-2 px-4 py-4 text-[11px] ${
                            idx % 2 === 0 ? 'bg-[#DCDCDC]' : 'bg-[#E7E7E7]'
                          }`}
                        >
                          <div className="font-extrabold text-[#1E1E1E]">{r.staffId}</div>
                          <div className="font-extrabold text-[#1E1E1E]">{r.name}</div>
                          <div className="font-extrabold text-[#1E1E1E]">{r.email}</div>
                          <div className="font-extrabold text-[#1E1E1E]">{r.phone}</div>
                          <div className="font-extrabold text-[#1E1E1E]">{r.role}</div>
                          <div className="font-extrabold text-[#1E1E1E]">{r.salary}</div>
                          <div className="text-right font-extrabold text-[#1E1E1E]">{r.timings}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}