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
  MdSearch,
  MdArrowDropDown,
  MdReceiptLong,
  MdPayments,
  MdCalendarMonth,
  MdVisibility,
  MdClose,
  MdDownload,
  MdPrint,
  MdReceipt,
  MdFilterList,
  MdCheckCircle,
  MdHourglassTop,
  MdCancel,
} from 'react-icons/md';

/* ----------------------------- Types ----------------------------- */

type NavItem = { name: string; path?: string };

type ReportTab =
  | 'Reservation Report'
  | 'Revenue Report'
  | 'Staff Report'
  | 'Sales & EOD Report'
  | 'Receipts'
  | 'Purchase Transactions';

/* ----------------------------- Theme Helpers ----------------------------- */

const UI = {
  red: '#B80F24',
  redDark: '#7E0012',
  bg: '#F3F3F3',
  gray: '#E7E7E7',
  text: '#1E1E1E',
  muted: '#6D6D6D',
};

const INPUT =
  'w-full rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-[#1E1E1E] ' +
  'border-2 border-black/10 shadow-sm placeholder:text-black/35 ' +
  'focus:outline-none focus:border-[#B80F24] focus:ring-4 focus:ring-[#B80F24]/15';

const SELECT =
  'w-full appearance-none rounded-xl bg-white px-3 py-2 pr-10 text-[12px] font-extrabold ' +
  'border-2 border-black/10 shadow-sm ' +
  'hover:bg-black/[0.02] focus:outline-none focus:border-[#B80F24] focus:ring-4 focus:ring-[#B80F24]/15';

const BTN =
  'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-extrabold ' +
  'transition active:scale-[0.99] focus:outline-none focus-visible:ring-4';

const BTN_PRIMARY = `${BTN} bg-[#B80F24] text-white shadow hover:bg-[#7E0012] focus-visible:ring-[#B80F24]/20`;
const BTN_SUBTLE =
  `${BTN} bg-white text-[#1E1E1E] border-2 border-black/10 shadow-sm ` +
  `hover:bg-black/[0.02] hover:border-black/20 focus-visible:ring-[#B80F24]/15`;

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

function fmtMoneyPhp(n: any) {
  const v = Number(n || 0);
  return `₱${v.toFixed(2)}`;
}

function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '---';

  try {
    const date = new Date(dateString);
    
    // Check if the date is actually valid before formatting
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleString('en-PH', { // Ph time
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila', // Force UTC+8
    });
  } catch (error) {
    return dateString;
  }
}

function paymentMeta(pm?: string) {
  const x = (pm || 'cash').toLowerCase();
  if (x === 'gcash') return { tone: 'gcash' as const, label: 'GCash', emoji: '📱' };
  if (x === 'bank') return { tone: 'bank' as const, label: 'Bank', emoji: '🏦' };
  return { tone: 'cash' as const, label: 'Cash', emoji: '💵' };
}

function Chip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'cash' | 'gcash' | 'bank';
}) {
  const map = {
    neutral: 'bg-[#F2F2F2] text-[#6D6D6D] ring-1 ring-black/5',
    cash: 'bg-[#FFF7E6] text-[#8A5A00] ring-1 ring-[#F0D9A6]',
    gcash: 'bg-[#EAF4FF] text-[#0B4A8A] ring-1 ring-[#B7D7FF]',
    bank: 'bg-[#EAFBF3] text-[#0F6A3C] ring-1 ring-[#BEEAD2]',
  } as const;

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold',
        map[tone]
      )}
    >
      {label}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const cfg =
    s === 'completed'
      ? {
          cls: 'bg-[#EAFBF3] text-[#0F6A3C] ring-1 ring-[#BEEAD2]',
          icon: <MdCheckCircle className="h-4 w-4" />,
        }
      : s === 'pending'
      ? {
          cls: 'bg-[#FFF7E6] text-[#8A5A00] ring-1 ring-[#F0D9A6]',
          icon: <MdHourglassTop className="h-4 w-4" />,
        }
      : {
          cls: 'bg-[#FDECEC] text-[#8A1C1C] ring-1 ring-[#F4B8B8]',
          icon: <MdCancel className="h-4 w-4" />,
        };

  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold',
        cfg.cls
      )}
    >
      {cfg.icon}
      {status}
    </span>
  );
}

/* ----------------------------- Sidebar Data ----------------------------- */

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

/* ----------------------------- Small UI Primitives ----------------------------- */

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
    className={classNames(
      'rounded-md px-4 py-2 text-[11px] font-extrabold shadow transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B80F24]/15',
      active ? 'bg-[#B80F24] text-white hover:bg-[#7E0012]' : 'bg-white text-[#6D6D6D] hover:bg-black/0.02'
    )}
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
    className={classNames(
      'rounded-md px-3 py-2 text-[11px] font-extrabold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B80F24]/15',
      active ? 'bg-[#B80F24] text-white shadow hover:bg-[#7E0012]' : 'bg-transparent text-[#6D6D6D] hover:bg-white'
    )}
  >
    {label}
  </button>
);

/* ----------------------------- Donut + Line (unchanged) ----------------------------- */

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

/* ----------------------------- Receipt Modal (enhanced) ----------------------------- */

function ReceiptModal({ order, onClose }: { order: any; onClose: () => void }) {
  const pm = paymentMeta(order?.paymentmethod);

  const subtotal = Number(order?.amount || 0);
  const paid = Number(order?.amountPaid || 0);
  const change = Number(order?.change || 0);

  const items = Array.isArray(order?.items) ? order.items : [];

  const handlePrint = () => window.print();
  const handleDownloadPDF = () => alert('PDF download feature - integrate jsPDF or similar library');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div
        className="relative max-h-[92vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-linear-to-b from-[#B80F24] to-[#7E0012] px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20 transition hover:bg-white/25"
            aria-label="Close"
          >
            <MdClose className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <img src="/TFK.png" alt="TFK Logo" className="h-12 w-12 rounded-2xl bg-white p-1 shadow" />
            <div>
              <div className="text-[14px] font-extrabold">Taiwan Fried Kitchen</div>
              <div className="text-[10px] font-bold text-white/85">Official Receipt</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
              <div className="text-[10px] font-extrabold text-white/80">Order</div>
              <div className="text-[12px] font-extrabold">#{order?.orderID}</div>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
              <div className="text-[10px] font-extrabold text-white/80">Payment</div>
              <div className="text-[12px] font-extrabold">
                {pm.emoji} {pm.label}
              </div>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15 text-right">
              <div className="text-[10px] font-extrabold text-white/80">Total</div>
              <div className="text-[12px] font-extrabold">{fmtMoneyPhp(subtotal)}</div>
            </div>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-auto px-6 py-5">
          <div className="rounded-2xl bg-[#F7F7F7] p-4 ring-1 ring-black/5">
            <div className="text-[10px] font-extrabold text-[#6D6D6D]">Date & Time</div>
            <div className="mt-1 text-[12px] font-extrabold text-[#1E1E1E]">{formatDateTime(order?.createdAt)}</div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-extrabold text-[#1E1E1E] uppercase">Items</div>
              <div className="text-[10px] font-extrabold text-[#6D6D6D]">{items.length} line(s)</div>
            </div>

            <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
              {items.length === 0 ? (
                <div className="px-4 py-6 text-center text-[11px] font-bold text-[#6D6D6D]">No items</div>
              ) : (
                <div className="divide-y divide-black/5">
                  {items.map((it: any, idx: number) => {
                    const price = Number(it?.MenuItem?.price || 0);
                    const qty = Number(it?.quantity || 0);
                    const line = price * qty;

                    return (
                      <div key={idx} className="px-4 py-3 hover:bg-black/0.015 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[12px] font-extrabold text-[#1E1E1E] truncate">
                              {it?.MenuItem?.name || 'Unknown Item'}
                            </div>
                            <div className="mt-1 text-[10px] font-bold text-[#6D6D6D]">
                              {fmtMoneyPhp(price)} × {qty}
                            </div>
                          </div>
                          <div className="text-[12px] font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(line)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-[#F7F7F7] p-4 ring-1 ring-black/5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-[#6D6D6D]">Subtotal</span>
                <span className="font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-[#6D6D6D]">Amount Paid</span>
                <span className="font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(paid)}</span>
              </div>
              <div className="mt-2 border-t border-dashed border-black/15 pt-2 flex items-center justify-between">
                <span className="text-[12px] font-extrabold text-green-700">Change</span>
                <span className="text-[12px] font-extrabold text-green-700">{fmtMoneyPhp(change)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center">
            <div className="text-[10px] font-extrabold text-[#6D6D6D]">Thank you for your order!</div>
            <div className="mt-1 text-[9px] font-bold text-black/35">This is an official receipt from Taiwan Fried Kitchen.</div>
          </div>
        </div>

        <div className="border-t border-black/5 bg-white px-6 py-4">
          <div className="flex gap-2">
            <button onClick={handlePrint} className={classNames(BTN_PRIMARY, 'flex-1')}>
              <MdPrint className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className={classNames(
                BTN_SUBTLE,
                'flex-1 border-[#B80F24] text-[#B80F24] hover:bg-[#B80F24] hover:text-white hover:border-[#B80F24]'
              )}
            >
              <MdDownload className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Main Page ----------------------------- */

export default function ReportsPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const activeNav = 'Reports';

  const [tab, setTab] = useState<ReportTab>('Receipts');

  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const [purchaseQuery, setPurchaseQuery] = useState('');
  const [purchaseDateFilter, setPurchaseDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [purchaseMin, setPurchaseMin] = useState('');
  const [purchaseMax, setPurchaseMax] = useState('');

  const [status, setStatus] = useState<'Confirmed' | 'Awaited' | 'Cancelled' | 'Failed'>('Confirmed');

  const [receipts, setReceipts] = useState<any[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const [receiptQuery, setReceiptQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'gcash' | 'bank'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');

  useEffect(() => {
    if (tab === 'Receipts') fetchReceipts();
    if (tab === 'Purchase Transactions') fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const fetchPurchases = async () => {
    setPurchasesLoading(true);
    try {
      const { data: purchasesData, error: purchaseErr } = await supabase
        .from('Purchase')
        .select('*')
        .order('createdAt', { ascending: false });
      if (purchaseErr) throw purchaseErr;

      const purchasesWithItems = await Promise.all(
        (purchasesData || []).map(async (purchase) => {
          const { data: items, error: itemsErr } = await supabase
            .from('PurchaseItem')
            .select('*, Ingredient(name, unit)')
            .eq('purchaseID', purchase.purchaseID);
          if (itemsErr) console.error('Error fetching items:', itemsErr);
          return { ...purchase, items: items || [] };
        })
      );

      setPurchases(purchasesWithItems);
    } catch (err: any) {
      console.error('Error fetching purchases:', err);
      alert(`Failed to fetch purchase transactions: ${err.message || 'Unknown error'}`);
    } finally {
      setPurchasesLoading(false);
    }
  };

  const fetchReceipts = async () => {
    setReceiptsLoading(true);
    try {
      const { data: orders, error: orderErr } = await supabase.from('Order').select('*').order('createdAt', { ascending: false });

      if (orderErr) throw orderErr;

      const ordersWithItems = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: items } = await supabase.from('OrderItem').select('*, MenuItem(name, price)').eq('orderID', order.orderID);
          return { ...order, items: items || [] };
        })
      );

      setReceipts(ordersWithItems);
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

  const receiptsView = useMemo(() => {
    const q = receiptQuery.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    return (receipts || []).filter((o) => {
      const created = new Date(o.createdAt);

      const matchQuery =
        !q ||
        String(o.orderID).includes(q) ||
        formatDateTime(o.createdAt).toLowerCase().includes(q) ||
        (o.items || []).some((it: any) => (it.MenuItem?.name || '').toLowerCase().includes(q));

      const pm = (o.paymentmethod || 'cash').toLowerCase();
      const matchPay = paymentFilter === 'all' ? true : pm === paymentFilter;

      const matchDate =
        dateFilter === 'all'
          ? true
          : dateFilter === 'today'
          ? created >= startOfToday
          : dateFilter === '7d'
          ? created >= daysAgo(7)
          : created >= daysAgo(30);

      return matchQuery && matchPay && matchDate;
    });
  }, [receipts, receiptQuery, paymentFilter, dateFilter]);

  const receiptsTotals = useMemo(() => {
    const totalSales = receiptsView.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalChange = receiptsView.reduce((sum, r) => sum + Number(r.change || 0), 0);
    return { count: receiptsView.length, totalSales, totalChange };
  }, [receiptsView]);

  const purchasesView = useMemo(() => {
    const q = purchaseQuery.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    const min = purchaseMin.trim() === '' ? null : Number(purchaseMin);
    const max = purchaseMax.trim() === '' ? null : Number(purchaseMax);

    return (purchases || []).filter((p) => {
      const created = new Date(p.createdAt);

      const itemsText = (p.items || [])
        .map((it: any) => `${it?.Ingredient?.name || ''} ${it?.Ingredient?.unit || ''}`.toLowerCase())
        .join(' ');

      const matchQuery =
        !q ||
        String(p.purchaseID).includes(q) ||
        formatDateTime(p.createdAt).toLowerCase().includes(q) ||
        String(p.totalCost ?? '').toLowerCase().includes(q) ||
        itemsText.includes(q);

      const matchDate =
        purchaseDateFilter === 'all'
          ? true
          : purchaseDateFilter === 'today'
          ? created >= startOfToday
          : purchaseDateFilter === '7d'
          ? created >= daysAgo(7)
          : created >= daysAgo(30);

      const cost = Number(p.totalCost || 0);
      const matchMin = min == null || (!Number.isNaN(min) && cost >= min);
      const matchMax = max == null || (!Number.isNaN(max) && cost <= max);

      return matchQuery && matchDate && matchMin && matchMax;
    });
  }, [purchases, purchaseQuery, purchaseDateFilter, purchaseMin, purchaseMax]);

  const purchasesTotals = useMemo(() => {
    const totalCost = purchasesView.reduce((sum, p) => sum + Number(p.totalCost || 0), 0);
    const totalItems = purchasesView.reduce((sum, p) => sum + Number((p.items || []).length), 0);
    return { count: purchasesView.length, totalCost, totalItems };
  }, [purchasesView]);

  const leftCard = useMemo(() => {
    if (tab === 'Reservation Report') return { title: 'Total Reservation', label: 'Total', value: '192' };
    if (tab === 'Revenue Report') return { title: 'Total Revenue', label: 'Total', value: '1556$' };
    if (tab === 'Staff Report') return { title: 'Total Staff', label: 'Total', value: '50' };
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

  const n2 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n: number) => `$${n2(n)}`;

  const salesTotals = useMemo(() => {
    const sub = salesRows.reduce((a, r) => a + r.unitPrice * r.qty, 0);
    const tax = sub * salesInfo.taxPct;
    const total = sub + tax;
    return { sub, tax, total };
  }, [salesRows, salesInfo.taxPct]);

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      {selectedOrder && <ReceiptModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      <div
        className={classNames(
          'grid min-h-screen transition-[grid-template-columns] duration-200',
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        )}
      >
        <aside className="flex flex-col items-stretch gap-4 rounded-r-2xl bg-surface px-3 py-5 shadow-md">
          <div className="mb-2 flex items-center gap-3 px-2">
            <img src="/TFK.png" alt="TFK Logo" className="h-12 w-12 rounded-full shadow" />
            {!collapsed && <span className="text-sm font-semibold text-foreground">Taiwan Fried Kitchen</span>}
          </div>

          <nav className={classNames('flex w-full flex-col gap-2', collapsed && 'items-center')}>
            {navItems.map((item) => {
              const isActive = item.name === activeNav;
              return (
                <button
                  key={item.name}
                  onClick={() => item.path && router.push(item.path)}
                  className={classNames(
                    'flex items-center rounded-2xl transition hover:-translate-y-0.5 hover:shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B80F24]/15',
                    collapsed ? 'h-14 w-14 self-center justify-center gap-0 bg-[#F2F2F2]' : 'h-12 w-full gap-3 bg-[#F2F2F2] px-2'
                  )}
                >
                  <span
                    className={classNames(
                      'grid h-10 w-10 place-items-center rounded-full shadow-inner transition',
                      isActive ? 'bg-[#B80F24] text-white' : 'bg-white text-[#6D6D6D]'
                    )}
                  >
                    {iconMap[item.name]}
                  </span>

                  {!collapsed && (
                    <span className={classNames('text-[12px] font-extrabold', isActive ? 'text-[#1E1E1E]' : 'text-[#6D6D6D]')}>
                      {item.name}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className={classNames('mt-auto', !collapsed && 'px-2')}>
            <button
              onClick={handleLogout}
              className={classNames(
                'transition hover:shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B80F24]/15',
                collapsed
                  ? 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#B80F24] text-white'
                  : 'flex w-full items-center gap-3 rounded-2xl bg-[#F2F2F2] px-2 py-2'
              )}
              aria-label="Logout"
              title="Logout"
            >
              <span
                className={classNames(
                  'grid h-10 w-10 place-items-center rounded-full shadow-inner',
                  collapsed ? 'bg-[#B80F24] text-white' : 'bg-white text-[#6D6D6D]'
                )}
              >
                <MdLogout className="h-5 w-5" />
              </span>
              {!collapsed && <span className="text-[12px] font-extrabold text-[#6D6D6D]">Logout</span>}
            </button>
          </div>
        </aside>

        <main className="space-y-4 p-4 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                aria-label="Toggle sidebar"
                onClick={() => setCollapsed((c) => !c)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#E7E7E7] text-[#1E1E1E] shadow transition hover:bg-black/0.03 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B80F24]/15"
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
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[12px] font-extrabold text-[#B80F24] shadow transition hover:bg-black/0.02 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B80F24]/15"
                aria-label="Open profile"
              >
                AC
              </button>
            </div>
          </header>

          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tab active={tab === 'Revenue Report'} onClick={() => setTab('Revenue Report')}>
                Revenue Report
              </Tab>
              <Tab active={tab === 'Receipts'} onClick={() => setTab('Receipts')}>
                Receipts
              </Tab>
              <Tab active={tab === 'Purchase Transactions'} onClick={() => setTab('Purchase Transactions')}>
                Purchase Transactions
              </Tab>
            </div>
          </section>

          {tab === 'Purchase Transactions' && (
            <section className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
              <div className="rounded-t-2xl bg-[#B80F24] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/15">
                    <MdReceipt className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-[14px] font-extrabold text-white">Purchase Transactions</div>
                    <div className="text-[10px] font-bold text-white/80">Review purchases and item breakdown</div>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-3">
                  <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    <div className="text-[10px] font-extrabold text-white/80">Purchases</div>
                    <div className="text-[12px] font-extrabold text-white">{purchasesTotals.count}</div>
                  </div>
                  <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    <div className="text-[10px] font-extrabold text-white/80">Total Cost</div>
                    <div className="text-[12px] font-extrabold text-white">{fmtMoneyPhp(purchasesTotals.totalCost)}</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#F7F7F7] px-6 py-4 border-b border-black/5">
                <div className="grid gap-3 md:grid-cols-[1fr_160px_140px_140px_auto] items-end">
                  <div className="relative">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6D6D6D]" size={18} />
                    <input
                      value={purchaseQuery}
                      onChange={(e) => setPurchaseQuery(e.target.value)}
                      placeholder="Search by Purchase ID, date/time, cost, or ingredient..."
                      className={classNames(INPUT, 'pl-10')}
                    />
                  </div>

                  <div className="relative">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold text-[#6D6D6D]">
                      <MdCalendarMonth className="h-4 w-4" />
                      Date
                    </div>
                    <select value={purchaseDateFilter} onChange={(e) => setPurchaseDateFilter(e.target.value as any)} className={SELECT}>
                      <option value="all">All time</option>
                      <option value="today">Today</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                    </select>
                    <MdArrowDropDown className="pointer-events-none absolute right-3 top-38px text-[#6D6D6D]" size={22} />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold text-[#6D6D6D]">
                      <MdFilterList className="h-4 w-4" />
                      Min Cost
                    </div>
                    <input
                      value={purchaseMin}
                      onChange={(e) => setPurchaseMin(e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className={INPUT}
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold text-[#6D6D6D]">
                      <MdFilterList className="h-4 w-4" />
                      Max Cost
                    </div>
                    <input
                      value={purchaseMax}
                      onChange={(e) => setPurchaseMax(e.target.value)}
                      inputMode="decimal"
                      placeholder="9999"
                      className={INPUT}
                    />
                  </div>

                  <button
                    onClick={() => {
                      setPurchaseQuery('');
                      setPurchaseDateFilter('all');
                      setPurchaseMin('');
                      setPurchaseMax('');
                    }}
                    className={classNames(BTN_SUBTLE, 'h-42px')}
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-3 flex md:hidden gap-2">
                  <div className="flex-1 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
                    <div className="text-[10px] font-extrabold text-[#6D6D6D]">Purchases</div>
                    <div className="text-[12px] font-extrabold text-[#1E1E1E]">{purchasesTotals.count}</div>
                  </div>
                  <div className="flex-1 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
                    <div className="text-[10px] font-extrabold text-[#6D6D6D]">Total Cost</div>
                    <div className="text-[12px] font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(purchasesTotals.totalCost)}</div>
                  </div>
                </div>
              </div>

              {purchasesLoading ? (
                <div className="px-6 py-14 text-center text-[12px] font-bold text-[#6D6D6D]">Loading purchase transactions...</div>
              ) : purchasesView.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="text-[13px] font-extrabold text-[#1E1E1E]">No purchase transactions found</div>
                  <div className="mt-1 text-[11px] font-bold text-[#6D6D6D]">Try adjusting search, date, or cost filters.</div>
                </div>
              ) : (
                <>
                  {/* ✅ Desktop header row (CENTER Total Cost + Items) */}
                  <div className="hidden md:grid grid-cols-[160px_1.1fr_160px_1.6fr] gap-3 px-6 py-3 text-[10px] font-extrabold text-[#6D6D6D] bg-white">
                    <div>Purchase</div>
                    <div>Date</div>
                    <div className="text-center">Total Cost</div>
                    <div className="text-center">Items</div>
                  </div>

                  <div className="divide-y divide-black/5">
                    {purchasesView.map((purchase: any) => {
                      const items = Array.isArray(purchase.items) ? purchase.items : [];
                      const preview = items
                        .slice(0, 2)
                        .map((it: any) => it?.Ingredient?.name)
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <div key={purchase.purchaseID} className={classNames('px-6 py-4 bg-white hover:bg-[#FAFAFA] transition')}>
                          {/* ✅ Desktop row (CENTER Total Cost + Items) */}
                          <div className="hidden md:grid grid-cols-[160px_1.1fr_160px_1.6fr] gap-3 items-start">
                            <div>
                              <div className="text-[10px] font-extrabold text-[#B80F24]">Purchase ID</div>
                              <div className="text-[13px] font-extrabold text-[#1E1E1E]">#{purchase.purchaseID}</div>
                              <div className="mt-2">
                                <StatusChip status={purchase.status || 'Completed'} />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="text-[10px] font-extrabold text-[#B80F24]">Date &amp; Time</div>
                              <div className="text-[11px] font-bold text-[#6D6D6D] truncate">{formatDateTime(purchase.createdAt)}</div>
                              <div className="mt-1 text-[10px] font-extrabold text-[#6D6D6D]">
                                {items.length} item line(s)
                                {preview ? (
                                  <>
                                    <span className="mx-2 text-black/20">•</span>
                                    <span className="font-bold text-black/40">
                                      {preview}
                                      {items.length > 2 ? '…' : ''}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-col items-center text-center">
                              <div className="text-[10px] font-extrabold text-[#B80F24]">Total Cost</div>
                              <div className="text-[13px] font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(purchase.totalCost || 0)}</div>
                            </div>

                            <div className="text-[11px] font-normal text-[#1E1E1E] text-center">
                              {items.length > 0 ? (
                                <ul className="list-disc list-inside w-fit mx-auto">
                                  {items.map((item: any, i: number) => (
                                    <li key={i} className="mb-1">
                                      <span className="font-extrabold">{item.Ingredient?.name || 'Unknown'}</span>
                                      {item.quantity ? ` × ${item.quantity}` : ''}
                                      {item.Ingredient?.unit ? ` ${item.Ingredient.unit}` : ''}
                                      {item.cost ? ` @ ${fmtMoneyPhp(item.cost)}` : ''}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-gray-500">No items</span>
                              )}
                            </div>
                          </div>

                          {/* Mobile */}
                          <div className="md:hidden">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-extrabold text-[#B80F24]">Purchase #{purchase.purchaseID}</div>
                                <div className="mt-1 text-[11px] font-bold text-[#6D6D6D]">{formatDateTime(purchase.createdAt)}</div>
                                <div className="mt-2 flex items-center gap-2">
                                  <StatusChip status={purchase.status || 'Completed'} />
                                  <span className="text-[10px] font-extrabold text-[#6D6D6D]">{items.length} item(s)</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-[10px] font-extrabold text-[#B80F24]">Total Cost</div>
                                <div className="text-[13px] font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(purchase.totalCost || 0)}</div>
                              </div>
                            </div>

                            <div className="mt-3 rounded-2xl bg-white ring-1 ring-black/5 p-3">
                              <div className="text-[10px] font-extrabold text-[#B80F24] mb-2">Items</div>
                              {items.length > 0 ? (
                                <ul className="list-disc ml-4 text-[11px]">
                                  {items.map((item: any, i: number) => (
                                    <li key={i} className="mb-1">
                                      <span className="font-extrabold">{item.Ingredient?.name || 'Unknown'}</span>
                                      {item.quantity ? ` × ${item.quantity}` : ''}
                                      {item.Ingredient?.unit ? ` ${item.Ingredient.unit}` : ''}
                                      {item.cost ? ` @ ${fmtMoneyPhp(item.cost)}` : ''}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-[11px] font-bold text-[#6D6D6D]">No items</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-[#F7F7F7] px-6 py-4 border-t border-black/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] font-bold text-[#6D6D6D]">
                      Showing <span className="font-extrabold text-[#1E1E1E]">{purchasesView.length}</span> purchase(s)
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
                        <div className="text-[10px] font-extrabold text-[#6D6D6D]">Item Lines</div>
                        <div className="text-[12px] font-extrabold text-[#1E1E1E]">{purchasesTotals.totalItems}</div>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
                        <div className="text-[10px] font-extrabold text-[#6D6D6D]">Total Cost</div>
                        <div className="text-[12px] font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(purchasesTotals.totalCost)}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {tab === 'Receipts' && (
            <section className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
              <div className="rounded-t-2xl bg-[#B80F24] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/15">
                    <MdReceiptLong className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-[14px] font-extrabold text-white">Order Receipts</div>
                    <div className="text-[10px] font-bold text-white/80">Click a row to open the official receipt</div>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-3">
                  <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    <div className="text-[10px] font-extrabold text-white/80">Receipts</div>
                    <div className="text-[12px] font-extrabold text-white">{receiptsTotals.count}</div>
                  </div>
                  <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    <div className="text-[10px] font-extrabold text-white/80">Total Sales</div>
                    <div className="text-[12px] font-extrabold text-white">{fmtMoneyPhp(receiptsTotals.totalSales)}</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#F7F7F7] px-6 py-4 border-b border-black/5">
                <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto] items-end">
                  <div className="relative">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6D6D6D]" size={18} />
                    <input
                      value={receiptQuery}
                      onChange={(e) => setReceiptQuery(e.target.value)}
                      placeholder="Search by Order ID, date/time, or item name..."
                      className={classNames(INPUT, 'pl-10')}
                    />
                  </div>

                  <div className="relative">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold text-[#6D6D6D]">
                      <MdPayments className="h-4 w-4" />
                      Payment
                    </div>
                    <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as any)} className={SELECT}>
                      <option value="all">All</option>
                      <option value="cash">Cash</option>
                      <option value="gcash">GCash</option>
                      <option value="bank">Bank</option>
                    </select>
                    <MdArrowDropDown className="pointer-events-none absolute right-3 top-38px text-[#6D6D6D]" size={22} />
                  </div>

                  <div className="relative">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold text-[#6D6D6D]">
                      <MdCalendarMonth className="h-4 w-4" />
                      Date
                    </div>
                    <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)} className={SELECT}>
                      <option value="all">All time</option>
                      <option value="today">Today</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                    </select>
                    <MdArrowDropDown className="pointer-events-none absolute right-3 top-38px text-[#6D6D6D]" size={22} />
                  </div>

                  <button
                    onClick={() => {
                      setReceiptQuery('');
                      setPaymentFilter('all');
                      setDateFilter('all');
                    }}
                    className={classNames(BTN_SUBTLE, 'h-42px')}
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-3 flex md:hidden gap-2">
                  <div className="flex-1 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
                    <div className="text-[10px] font-extrabold text-[#6D6D6D]">Receipts</div>
                    <div className="text-[12px] font-extrabold text-[#1E1E1E]">{receiptsTotals.count}</div>
                  </div>
                  <div className="flex-1 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
                    <div className="text-[10px] font-extrabold text-[#6D6D6D]">Total Sales</div>
                    <div className="text-[12px] font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(receiptsTotals.totalSales)}</div>
                  </div>
                </div>
              </div>

              {receiptsLoading ? (
                <div className="px-6 py-14 text-center text-[12px] font-bold text-[#6D6D6D]">Loading receipts...</div>
              ) : receiptsView.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="text-[13px] font-extrabold text-[#1E1E1E]">No receipts found</div>
                  <div className="mt-1 text-[11px] font-bold text-[#6D6D6D]">Try adjusting search, payment, or date filters.</div>
                </div>
              ) : (
                <>
                  <div className="hidden md:grid grid-cols-[140px_1.4fr_160px_160px_120px] gap-3 px-6 py-3 text-[10px] font-extrabold text-[#6D6D6D] bg-white">
                    <div>Order</div>
                    <div>Date & Items</div>
                    <div>Payment</div>
                    <div className="text-right">Total</div>
                    <div className="text-right">Change</div>
                  </div>

                  <div className="divide-y divide-black/5">
                    {receiptsView.map((order: any) => {
                      const p = paymentMeta(order.paymentmethod);
                      const itemsQty = (order.items || []).reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);
                      const topItems = (order.items || [])
                        .slice(0, 2)
                        .map((it: any) => it.MenuItem?.name)
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <div
                          key={order.orderID}
                          onClick={() => setSelectedOrder(order)}
                          className="group cursor-pointer px-6 py-4 bg-white transition hover:bg-[#FAFAFA]"
                        >
                          <div className="hidden md:grid grid-cols-[140px_1.4fr_160px_160px_120px] gap-3 items-center">
                            <div>
                              <div className="text-[10px] font-extrabold text-[#B80F24]">Order ID</div>
                              <div className="text-[13px] font-extrabold text-[#1E1E1E]">#{order.orderID}</div>
                            </div>

                            <div className="min-w-0">
                              <div className="text-[10px] font-extrabold text-[#B80F24]">Date &amp; Time</div>
                              <div className="text-[11px] font-bold text-[#6D6D6D] truncate">{formatDateTime(order.createdAt)}</div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] font-extrabold text-[#6D6D6D]">
                                  {itemsQty} item{itemsQty !== 1 ? 's' : ''}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-black/20" />
                                <span className="text-[10px] font-bold text-black/40 truncate">
                                  {topItems || 'No items'}
                                  {(order.items || []).length > 2 ? '…' : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <Chip label={`${p.emoji} ${p.label}`} tone={p.tone} />
                              <button
                                className={classNames(BTN_SUBTLE, 'px-3 py-2 opacity-0 group-hover:opacity-100')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                }}
                              >
                                <MdVisibility className="h-4 w-4" />
                                View
                              </button>
                            </div>

                            <div className="text-right">
                              <div className="text-[10px] font-extrabold text-[#B80F24]">Total</div>
                              <div className="text-[13px] font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(order.amount)}</div>
                            </div>

                            <div className="text-right">
                              <div className="text-[10px] font-extrabold text-[#B80F24]">Change</div>
                              <div className="text-[13px] font-extrabold text-green-600">{fmtMoneyPhp(order.change)}</div>
                            </div>
                          </div>

                          <div className="md:hidden">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-extrabold text-[#B80F24]">Order #{order.orderID}</div>
                                <div className="mt-1 text-[11px] font-bold text-[#6D6D6D]">{formatDateTime(order.createdAt)}</div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Chip label={`${p.emoji} ${p.label}`} tone={p.tone} />
                                  <span className="text-[10px] font-extrabold text-[#6D6D6D]">
                                    {itemsQty} item{itemsQty !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-[10px] font-extrabold text-[#B80F24]">Total</div>
                                <div className="text-[13px] font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(order.amount)}</div>
                                <div className="mt-2 text-[10px] font-extrabold text-[#B80F24]">Change</div>
                                <div className="text-[12px] font-extrabold text-green-600">{fmtMoneyPhp(order.change)}</div>
                              </div>
                            </div>

                            <div className="mt-3">
                              <button className={classNames(BTN_PRIMARY, 'w-full')} onClick={() => setSelectedOrder(order)}>
                                <MdVisibility className="h-4 w-4" />
                                View Receipt
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-[#F7F7F7] px-6 py-4 border-t border-black/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] font-bold text-[#6D6D6D]">
                      Showing <span className="font-extrabold text-[#1E1E1E]">{receiptsView.length}</span> receipt(s)
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
                        <div className="text-[10px] font-extrabold text-[#6D6D6D]">Total Change</div>
                        <div className="text-[12px] font-extrabold text-green-600">{fmtMoneyPhp(receiptsTotals.totalChange)}</div>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
                        <div className="text-[10px] font-extrabold text-[#6D6D6D]">Total Sales</div>
                        <div className="text-[12px] font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(receiptsTotals.totalSales)}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {tab === 'Sales & EOD Report' ? (
            <section className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
              <div className="flex items-center justify-between bg-[#7E0012] px-8 py-6">
                <div className="text-[16px] font-extrabold text-white">Daily Sales Report</div>

                <div className="text-right text-[11px] font-extrabold text-white/90 leading-5">
                  <div>Salesperson: {salesInfo.salesperson}</div>
                  <div>Date: {salesInfo.date}</div>
                </div>
              </div>

              <div className="px-8 py-6">
                <div className="grid gap-5 lg:grid-cols-[1fr_330px] items-start">
                  <div className="rounded-2xl bg-white ring-1 ring-black/10 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-[90px_1fr_140px_90px_160px_90px_140px_160px] gap-3 px-6 py-4 text-[11px] font-extrabold text-[#6D6D6D] bg-[#FAFAFA] border-b border-black/5">
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
                            className={classNames(
                              'grid grid-cols-[90px_1fr_140px_90px_160px_90px_140px_160px] gap-3 px-6 py-5 text-[12px] font-extrabold',
                              i % 2 === 0 ? 'bg-white' : 'bg-[#FCFCFC]',
                              'hover:bg-black/0.02 transition'
                            )}
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

                  <div className="rounded-2xl bg-[#7E0012] p-6 text-white shadow-[0_18px_30px_rgba(0,0,0,0.15)] ring-1 ring-black/10">
                    <div className="space-y-4 text-[12px] font-extrabold">
                      <div className="flex items-center justify-between">
                        <span className="text-white/90">Sales Amount:</span>
                        <span className="text-[14px]">{money(salesTotals.sub)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-white/90">Sales Tax:</span>
                        <span className="text-[14px]">{money(salesTotals.tax)}</span>
                      </div>

                      <div className="mt-4 border-t border-white/25 pt-4 flex items-center justify-between">
                        <span className="text-white">Total Sales:</span>
                        <span className="text-[16px]">{money(salesTotals.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-10" />
              </div>
            </section>
          ) : (
            <>
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
                          className={classNames(
                            'grid grid-cols-6 gap-2 px-4 py-4 text-[11px]',
                            idx % 2 === 0 ? 'bg-[#DCDCDC]' : 'bg-[#E7E7E7]'
                          )}
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
                          className={classNames(
                            'grid grid-cols-7 gap-2 px-4 py-4 text-[11px]',
                            idx % 2 === 0 ? 'bg-[#DCDCDC]' : 'bg-[#E7E7E7]'
                          )}
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
                          className={classNames(
                            'grid grid-cols-7 gap-2 px-4 py-4 text-[11px]',
                            idx % 2 === 0 ? 'bg-[#DCDCDC]' : 'bg-[#E7E7E7]'
                          )}
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