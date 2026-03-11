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
  MdChecklist,
  MdTrendingUp,
  MdWarningAmber,
} from 'react-icons/md';

/* ----------------------------- Types ----------------------------- */

type NavItem = { name: string; path?: string };

type ReportTab = 'Sales & EOD Report' | 'Receipts' | 'Purchase Transactions';

type InventoryAuditRow = {
  auditID?: number;
  ingredientID: number;
  systemStock: number;
  physicalStock: number;
  variance: number;
  recordedBy?: string | null;
  createdAt?: string;
  Ingredient?: {
    name: string;
    unit: string;
  } | null;
};

type OrderRow = {
  orderID: number;
  amount: number;
  change: number;
  amountPaid?: number;
  paymentmethod?: string;
  status?: string;
  createdAt?: string;
  items?: any[];
};

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

function fmtQty(n: any) {
  return Number(n || 0).toFixed(2);
}

function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '---';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    });
  } catch (error) {
    return dateString;
  }
}

function formatDateOnly(dateString: string | undefined | null): string {
  if (!dateString) return '---';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila',
    });
  } catch {
    return dateString;
  }
}

function toLocalDateInput(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
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
    type="button"
  >
    {children}
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

/* ----------------------------- Receipt Modal ----------------------------- */

function ReceiptModal({ order, onClose, onVoid }: { order: any; onClose: () => void; onVoid: () => void }) {
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
            type="button"
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
            <div className="mt-1 text-[9px] font-bold text-black/35">
              This is an official receipt from Taiwan Fried Kitchen.
            </div>
          </div>
        </div>

        <div className="border-t border-black/5 bg-white px-6 py-4">
          <div className="flex gap-2">
            <button onClick={handlePrint} className={classNames(BTN_PRIMARY, 'flex-1')} type="button">
              <MdPrint className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className={classNames(
                BTN_SUBTLE,
                'flex-1 border-[#B80F24] text-[#B80F24] hover:bg-[#B80F24] hover:text-white hover:border-[#B80F24]'
              )}
              type="button"
            >
              <MdDownload className="h-4 w-4" />
              Download
            </button>
            <button
              className={classNames(
                BTN_SUBTLE,
                'flex-1 border-[#B80F24] text-[#B80F24] hover:bg-[#B80F24] hover:text-white hover:border-[#B80F24]'
              )}
              onClick={async () => {
                if (!window.confirm('Are you sure you want to void this receipt?')) return;
                await supabase.from('Order').update({ status: 'voided' }).eq('orderID', order.orderID);
                onVoid();
                onClose();
              }}
              type="button"
            >
              <MdCancel className="h-4 w-4" />
              Void Receipt
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

  const [receipts, setReceipts] = useState<OrderRow[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const [receiptQuery, setReceiptQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'gcash' | 'bank'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');

  const [eodRows, setEodRows] = useState<InventoryAuditRow[]>([]);
  const [eodLoading, setEodLoading] = useState(false);
  const [eodDate, setEodDate] = useState<string>(toLocalDateInput(new Date()));
  const [eodQuery, setEodQuery] = useState('');
  const [eodPage, setEodPage] = useState(1);
  const EOD_PAGE_SIZE = 10;

  useEffect(() => {
    if (tab === 'Receipts') fetchReceipts();
    if (tab === 'Purchase Transactions') fetchPurchases();
    if (tab === 'Sales & EOD Report') {
      fetchReceipts();
      fetchEodAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === 'Sales & EOD Report') {
      fetchEodAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eodDate]);

  useEffect(() => {
    setEodPage(1);
  }, [eodQuery, eodDate]);

  useEffect(() => {
    const channel = supabase
      .channel('eod-audit-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'InventoryAudit' }, () => {
        fetchEodAudit();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eodDate]);

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

  const fetchEodAudit = async () => {
    setEodLoading(true);

    try {
      const start = new Date(`${eodDate}T00:00:00`);
      const end = new Date(`${eodDate}T23:59:59.999`);

      const { data, error } = await supabase
        .from('InventoryAudit')
        .select(`
          auditID,
          ingredientID,
          systemStock,
          physicalStock,
          variance,
          recordedBy,
          createdAt,
          Ingredient(name, unit)
        `)
        .gte('createdAt', start.toISOString())
        .lte('createdAt', end.toISOString())
        .order('createdAt', { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map((row: any) => ({
        ...row,
        Ingredient: Array.isArray(row.Ingredient) && row.Ingredient.length > 0 ? row.Ingredient[0] : null,
      }));

      setEodRows(transformedData as InventoryAuditRow[]);
    } catch (err: any) {
      console.error('Error fetching EOD audit:', err);
      alert(`Failed to fetch EOD audit: ${err.message || 'Unknown error'}`);
    } finally {
      setEodLoading(false);
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
      const created = new Date(o.createdAt || '');

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
    const totalSales = receiptsView
      .filter((r) => r.status !== 'voided')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalChange = receiptsView
      .filter((r) => r.status !== 'voided')
      .reduce((sum, r) => sum + Number(r.change || 0), 0);
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

  const eodRowsView = useMemo(() => {
    const q = eodQuery.trim().toLowerCase();

    return (eodRows || []).filter((row) => {
      const name = row.Ingredient?.name?.toLowerCase() || '';
      const unit = row.Ingredient?.unit?.toLowerCase() || '';
      const matchQuery =
        !q ||
        name.includes(q) ||
        unit.includes(q) ||
        String(row.ingredientID).includes(q) ||
        String(row.systemStock).includes(q) ||
        String(row.physicalStock).includes(q) ||
        String(row.variance).includes(q);

      return matchQuery;
    });
  }, [eodRows, eodQuery]);

  const eodTotalPages = Math.max(1, Math.ceil(eodRowsView.length / EOD_PAGE_SIZE));
  const eodRowsPage = eodRowsView.slice((eodPage - 1) * EOD_PAGE_SIZE, eodPage * EOD_PAGE_SIZE);

  const salesEodOrdersForDate = useMemo(() => {
    return (receipts || []).filter((order) => {
      if (!order.createdAt) return false;
      const localDate = toLocalDateInput(new Date(order.createdAt));
      return localDate === eodDate && order.status !== 'voided';
    });
  }, [receipts, eodDate]);

  const salesEodSummary = useMemo(() => {
    const totalSales = salesEodOrdersForDate.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const totalChange = salesEodOrdersForDate.reduce((sum, order) => sum + Number(order.change || 0), 0);
    const totalOrders = salesEodOrdersForDate.length;

    const totalItemsSold = salesEodOrdersForDate.reduce((sum, order) => {
      return sum + (order.items || []).reduce((itemSum: number, it: any) => itemSum + Number(it.quantity || 0), 0);
    }, 0);

    const totalAuditedItems = eodRowsView.length;
    const totalSystemStock = eodRowsView.reduce((sum, row) => sum + Number(row.systemStock || 0), 0);
    const totalPhysicalStock = eodRowsView.reduce((sum, row) => sum + Number(row.physicalStock || 0), 0);

    const totalUsed = eodRowsView.reduce((sum, row) => {
      const used = Number(row.systemStock || 0) - Number(row.physicalStock || 0);
      return used > 0 ? sum + used : sum;
    }, 0);

    const totalVariance = eodRowsView.reduce((sum, row) => sum + Number(row.variance || 0), 0);
    const overages = eodRowsView.filter((row) => Number(row.variance || 0) > 0).length;
    const shortages = eodRowsView.filter((row) => Number(row.variance || 0) < 0).length;

    return {
      totalSales,
      totalChange,
      totalOrders,
      totalItemsSold,
      totalAuditedItems,
      totalSystemStock,
      totalPhysicalStock,
      totalUsed,
      totalVariance,
      overages,
      shortages,
    };
  }, [salesEodOrdersForDate, eodRowsView]);

  const leftCard = useMemo(() => {
    return { title: 'Daily Sales Report', label: 'Total', value: '0' };
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      {selectedOrder && <ReceiptModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onVoid={fetchReceipts} />}

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
                  type="button"
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
              type="button"
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
                type="button"
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
                type="button"
              >
                AC
              </button>
            </div>
          </header>

          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tab active={tab === 'Sales & EOD Report'} onClick={() => setTab('Sales & EOD Report')}>
                Sales &amp; EOD Report
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
                    className={BTN_SUBTLE}
                    type="button"
                  >
                    Clear
                  </button>
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
                        <div key={purchase.purchaseID} className="px-6 py-4 bg-white hover:bg-[#FAFAFA] transition">
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
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] font-extrabold text-[#6D6D6D]">
                                  {items.length} item{items.length !== 1 ? 's' : ''}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-black/20" />
                                <span className="text-[10px] font-bold text-black/40 truncate">
                                  {preview || 'No items'}
                                  {items.length > 2 ? '…' : ''}
                                </span>
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
                        </div>
                      );
                    })}
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
                  </div>

                  <button
                    onClick={() => {
                      setReceiptQuery('');
                      setPaymentFilter('all');
                      setDateFilter('all');
                    }}
                    className={BTN_SUBTLE}
                    type="button"
                  >
                    Clear
                  </button>
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
                  <div className="hidden md:grid grid-cols-[140px_1.4fr_120px_160px_160px_120px] gap-3 px-6 py-3 text-[10px] font-extrabold text-[#6D6D6D] bg-white">
                    <div>Order</div>
                    <div>Date & Items</div>
                    <div>Status</div>
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
                          <div className="hidden md:grid grid-cols-[140px_1.4fr_120px_160px_160px_120px] gap-3 items-center">
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
                            <div>
                              <StatusChip status={order.status === 'voided' ? 'Voided' : 'Completed'} />
                            </div>
                            <div className="flex items-center gap-3">
                              <Chip label={`${p.emoji} ${p.label}`} tone={p.tone} />
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
                                  <StatusChip status={order.status === 'voided' ? 'Voided' : 'Completed'} />
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
                              <button className={classNames(BTN_PRIMARY, 'w-full')} onClick={() => setSelectedOrder(order)} type="button">
                                <MdVisibility className="h-4 w-4" />
                                View Receipt
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}

          {tab === 'Sales & EOD Report' && (
            <section className="space-y-4">
              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
                <div className="flex flex-col gap-4 bg-[#7E0012] px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[16px] font-extrabold text-white">Sales & EOD Report</div>
                    <div className="mt-1 text-[11px] font-bold text-white/85">
                      Connected daily summary from Orders and InventoryAudit
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[220px_auto] md:items-end">
                    <div>
                      <div className="mb-1 text-[10px] font-extrabold text-white/85">Select Date</div>
                      <input
                        type="date"
                        value={eodDate}
                        onChange={(e) => setEodDate(e.target.value)}
                        className="w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-[12px] font-extrabold text-[#1E1E1E] shadow-sm focus:outline-none focus:ring-4 focus:ring-white/20"
                      />
                    </div>

                    <button
                      onClick={fetchEodAudit}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-[11px] font-extrabold text-[#7E0012] shadow hover:bg-[#F7F7F7]"
                      type="button"
                    >
                      <MdChecklist className="h-4 w-4" />
                      Refresh EOD
                    </button>
                  </div>
                </div>

                <div className="bg-[#F7F7F7] px-6 py-4 border-b border-black/5">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <SummaryCard
                      title="Total Sales"
                      value={fmtMoneyPhp(salesEodSummary.totalSales)}
                      subtitle={`${salesEodSummary.totalOrders} completed order(s)`}
                      icon={<MdTrendingUp className="h-5 w-5" />}
                    />
                    <SummaryCard
                      title="Items Sold"
                      value={String(salesEodSummary.totalItemsSold)}
                      subtitle="Total item quantity from orders"
                      icon={<MdReceiptLong className="h-5 w-5" />}
                    />
                    <SummaryCard
                      title="Audited Items"
                      value={String(salesEodSummary.totalAuditedItems)}
                      subtitle="Rows from InventoryAudit"
                      icon={<MdChecklist className="h-5 w-5" />}
                    />
                    <SummaryCard
                      title="Total Used"
                      value={fmtQty(salesEodSummary.totalUsed)}
                      subtitle="System minus physical"
                      icon={<MdInventory2 className="h-5 w-5" />}
                    />
                    <SummaryCard
                      title="Variance"
                      value={fmtQty(salesEodSummary.totalVariance)}
                      subtitle={`${salesEodSummary.overages} overage(s), ${salesEodSummary.shortages} shortage(s)`}
                      icon={<MdWarningAmber className="h-5 w-5" />}
                      danger={salesEodSummary.totalVariance !== 0}
                    />
                  </div>
                </div>

                <div className="px-6 py-5">
                  <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
                    <div className="relative">
                      <MdSearch className="absolute left-3 top-5 -translate-y-1/2 text-[#6D6D6D]" size={18} />
                      <input
                        value={eodQuery}
                        onChange={(e) => setEodQuery(e.target.value)}
                        placeholder="Search ingredient, unit, stock, or variance..."
                        className={classNames(INPUT, 'pl-10')}
                      />
                    </div>

                    <div className="rounded-xl bg-[#F7F7F7] px-4 py-3 ring-1 ring-black/5">
                      <div className="text-[10px] font-extrabold text-[#6D6D6D]">Report Date</div>
                      <div className="mt-1 text-[13px] font-extrabold text-[#1E1E1E]">
                        {formatDateOnly(`${eodDate}T00:00:00`)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/10 shadow-sm">
                      <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 bg-[#FAFAFA] px-5 py-4 text-[10px] font-extrabold uppercase tracking-wide text-[#6D6D6D] border-b border-black/5">
                        <div>Ingredient</div>
                        <div className="text-right">System</div>
                        <div className="text-right">Physical</div>
                        <div className="text-right">Used</div>
                        <div className="text-right">Variance</div>
                      </div>

                      {eodLoading ? (
                        <div className="px-6 py-14 text-center text-[12px] font-bold text-[#6D6D6D]">Loading EOD audit data...</div>
                      ) : eodRowsView.length === 0 ? (
                        <div className="px-6 py-14 text-center">
                          <div className="text-[13px] font-extrabold text-[#1E1E1E]">No EOD audit data found</div>
                          <div className="mt-1 text-[11px] font-bold text-[#6D6D6D]">
                            No InventoryAudit records were found for this selected date.
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="divide-y divide-black/5">
                            {eodRowsPage.map((row, index) => {
                            const system = Number(row.systemStock || 0);
                            const physical = Number(row.physicalStock || 0);
                            const used = system - physical;
                            const variance = Number(row.variance || 0);

                            return (
                              <div
                                key={`${row.auditID || row.ingredientID}-${index}`}
                                className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 px-5 py-4 text-[12px] font-bold hover:bg-[#FAFAFA]"
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-extrabold text-[#1E1E1E]">
                                    {row.Ingredient?.name || `Ingredient #${row.ingredientID}`}
                                  </div>
                                  <div className="mt-1 text-[10px] text-[#6D6D6D] font-extrabold">
                                    Unit: {row.Ingredient?.unit || '—'}
                                  </div>
                                </div>

                                <div className="text-right text-[#1E1E1E]">{fmtQty(system)}</div>
                                <div className="text-right text-[#1E1E1E]">{fmtQty(physical)}</div>
                                <div className={classNames('text-right', used > 0 ? 'text-[#B80F24]' : 'text-[#6D6D6D]')}>
                                  {fmtQty(used)}
                                </div>
                                <div
                                  className={classNames(
                                    'text-right font-extrabold',
                                    variance > 0
                                      ? 'text-amber-600'
                                      : variance < 0
                                      ? 'text-red-600'
                                      : 'text-[#6D6D6D]'
                                  )}
                                >
                                  {variance > 0 ? '+' : ''}
                                  {fmtQty(variance)}
                                </div>
                              </div>
                            );
                          })}
                          </div>
                          <div className="flex items-center justify-between border-t border-black/5 px-5 py-3 bg-[#FAFAFA]">
                            <span className="text-[11px] font-bold text-[#6D6D6D]">
                              Showing {Math.min((eodPage - 1) * EOD_PAGE_SIZE + 1, eodRowsView.length)}–{Math.min(eodPage * EOD_PAGE_SIZE, eodRowsView.length)} of {eodRowsView.length}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                disabled={eodPage === 1}
                                onClick={() => setEodPage((p) => p - 1)}
                                className="rounded-lg px-3 py-1.5 text-[11px] font-extrabold bg-white ring-1 ring-black/10 disabled:opacity-40 hover:bg-black/5 transition"
                                type="button"
                              >
                                Previous
                              </button>
                              <span className="text-[11px] font-extrabold text-[#1E1E1E]">
                                {eodPage} / {eodTotalPages}
                              </span>
                              <button
                                disabled={eodPage === eodTotalPages}
                                onClick={() => setEodPage((p) => p + 1)}
                                className="rounded-lg px-3 py-1.5 text-[11px] font-extrabold bg-white ring-1 ring-black/10 disabled:opacity-40 hover:bg-black/5 transition"
                                type="button"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl bg-[#7E0012] p-6 text-white shadow-[0_18px_30px_rgba(0,0,0,0.15)] ring-1 ring-black/10">
                        <div className="text-[13px] font-extrabold">Daily Sales Snapshot</div>

                        <div className="mt-4 space-y-4 text-[12px] font-extrabold">
                          <div className="flex items-center justify-between">
                            <span className="text-white/90">Sales Amount</span>
                            <span>{fmtMoneyPhp(salesEodSummary.totalSales)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-white/90">Total Change</span>
                            <span>{fmtMoneyPhp(salesEodSummary.totalChange)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-white/90">Completed Orders</span>
                            <span>{salesEodSummary.totalOrders}</span>
                          </div>

                          <div className="mt-4 border-t border-white/20 pt-4 flex items-center justify-between">
                            <span className="text-white">Items Sold</span>
                            <span className="text-[16px]">{salesEodSummary.totalItemsSold}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/10 shadow-sm">
                        <div className="text-[13px] font-extrabold text-[#1E1E1E]">EOD Inventory Summary</div>

                        <div className="mt-4 space-y-3 text-[11px] font-extrabold">
                          <div className="flex items-center justify-between">
                            <span className="text-[#6D6D6D]">System Stock Total</span>
                            <span className="text-[#1E1E1E]">{fmtQty(salesEodSummary.totalSystemStock)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[#6D6D6D]">Physical Stock Total</span>
                            <span className="text-[#1E1E1E]">{fmtQty(salesEodSummary.totalPhysicalStock)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[#6D6D6D]">Used Today</span>
                            <span className="text-[#B80F24]">{fmtQty(salesEodSummary.totalUsed)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[#6D6D6D]">Overages</span>
                            <span className="text-amber-600">{salesEodSummary.overages}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[#6D6D6D]">Shortages</span>
                            <span className="text-red-600">{salesEodSummary.shortages}</span>
                          </div>

                          <div className="border-t border-black/10 pt-3 flex items-center justify-between">
                            <span className="text-[#1E1E1E]">Net Variance</span>
                            <span
                              className={classNames(
                                salesEodSummary.totalVariance > 0
                                  ? 'text-amber-600'
                                  : salesEodSummary.totalVariance < 0
                                  ? 'text-red-600'
                                  : 'text-[#1E1E1E]'
                              )}
                            >
                              {salesEodSummary.totalVariance > 0 ? '+' : ''}
                              {fmtQty(salesEodSummary.totalVariance)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#F7F7F7] p-5 ring-1 ring-black/5">
                        <div className="text-[12px] font-extrabold text-[#1E1E1E]">Notes</div>
                        <div className="mt-2 text-[11px] font-bold leading-5 text-[#6D6D6D]">
                          This report is based on the selected date. Sales are pulled from the Order table and inventory results
                          are pulled from InventoryAudit.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/10 shadow-sm">
                    <div className="border-b border-black/5 bg-[#FAFAFA] px-5 py-4">
                      <div className="text-[12px] font-extrabold text-[#1E1E1E]">Orders for Selected Date</div>
                      <div className="mt-1 text-[10px] font-bold text-[#6D6D6D]">
                        Connected daily sales entries from the Order table
                      </div>
                    </div>

                    {salesEodOrdersForDate.length === 0 ? (
                      <div className="px-6 py-10 text-center text-[11px] font-bold text-[#6D6D6D]">
                        No completed orders found for this date.
                      </div>
                    ) : (
                      <div className="divide-y divide-black/5">
                        {salesEodOrdersForDate.map((order) => {
                          const p = paymentMeta(order.paymentmethod);
                          return (
                            <div
                              key={order.orderID}
                              className="grid gap-3 px-5 py-4 md:grid-cols-[120px_1fr_140px_140px_120px] md:items-center hover:bg-[#FAFAFA]"
                            >
                              <div>
                                <div className="text-[10px] font-extrabold text-[#B80F24]">Order</div>
                                <div className="text-[12px] font-extrabold text-[#1E1E1E]">#{order.orderID}</div>
                              </div>

                              <div>
                                <div className="text-[10px] font-extrabold text-[#B80F24]">Date & Time</div>
                                <div className="text-[11px] font-bold text-[#6D6D6D]">{formatDateTime(order.createdAt)}</div>
                              </div>

                              <div>
                                <div className="text-[10px] font-extrabold text-[#B80F24]">Payment</div>
                                <div className="mt-1">
                                  <Chip label={`${p.emoji} ${p.label}`} tone={p.tone} />
                                </div>
                              </div>

                              <div className="md:text-right">
                                <div className="text-[10px] font-extrabold text-[#B80F24]">Total</div>
                                <div className="text-[12px] font-extrabold text-[#1E1E1E]">{fmtMoneyPhp(order.amount)}</div>
                              </div>

                              <div className="md:text-right">
                                <button
                                  className={classNames(BTN_PRIMARY, 'w-full md:w-auto')}
                                  onClick={() => setSelectedOrder(order)}
                                  type="button"
                                >
                                  <MdVisibility className="h-4 w-4" />
                                  View
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab !== 'Sales & EOD Report' && tab !== 'Receipts' && tab !== 'Purchase Transactions' && (
            <>
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  <p className="mb-3 text-[14px] font-extrabold text-[#1E1E1E]">{leftCard.title}</p>
                  <Donut totalLabel={leftCard.label} totalValue={leftCard.value} />
                </div>
                <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  <LineAreaChart />
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  danger = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-black/5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#6D6D6D]">{title}</div>
          <div className={classNames('mt-2 text-[18px] font-extrabold', danger ? 'text-[#B80F24]' : 'text-[#1E1E1E]')}>
            {value}
          </div>
          <div className="mt-1 text-[10px] font-bold text-[#6D6D6D]">{subtitle}</div>
        </div>

        <div
          className={classNames(
            'grid h-10 w-10 place-items-center rounded-xl ring-1',
            danger
              ? 'bg-[#FDECEC] text-[#B80F24] ring-[#F4B8B8]'
              : 'bg-[#F7F7F7] text-[#7E0012] ring-black/5'
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}