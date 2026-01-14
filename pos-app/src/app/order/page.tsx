// app/order/page.tsx
// Orders page (Orders Dashboard + Payment Processing) — matches your updated UI style (gray panels + red accent)
// Update: Added "Void Transaction" button + Void Request Details modal (matches attached design)

'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { Sidebar } from '../components/Sidebar';
import {
  MdRestaurantMenu,
  MdShoppingCart,
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
  MdQrCode2,
  MdPayments,
  MdCreditCard,
  MdAccountBalanceWallet,
  MdArrowBackIosNew,
} from 'react-icons/md';

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

const Chip = ({
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

type OrderStatus = 'Ready to serve' | 'In Process' | 'In the kitchen' | 'Completed';

function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = 'bg-white text-[#1E1E1E]';

  const dot =
    status === 'Ready to serve'
      ? 'bg-emerald-500'
      : status === 'In Process'
      ? 'bg-amber-400'
      : status === 'In the kitchen'
      ? 'bg-rose-500'
      : 'bg-emerald-500';

  return (
    <span className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-[10px] font-extrabold shadow ${tone}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function MiniCategoryCard({
  label,
  items,
  active,
  onClick,
}: {
  label: string;
  items: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex h-21 w-28 flex-col justify-between rounded-2xl px-3 py-3 text-left shadow transition ${
        active ? 'bg-[#E7E7E7]' : 'bg-[#E7E7E7] hover:-translate-y-0.5'
      }`}
      title={label}
    >
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-inner">
          <MdRestaurantMenu className={`h-5 w-5 ${active ? 'text-[#B80F24]' : 'text-[#6D6D6D]'}`} />
        </span>
        <span className="text-[10px] font-extrabold text-[#6D6D6D]">{items} items</span>
      </div>
      <div className="text-[12px] font-extrabold text-[#1E1E1E]">{label}</div>
    </button>
  );
}

type LineItem = { name: string; qty: number; price: number };

type Order = {
  id: string;
  table: string;
  customer: string;
  createdAt: string;
  status: OrderStatus;
  items: LineItem[];
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function calcSubtotal(items: LineItem[]) {
  return items.reduce((a, x) => a + x.qty * x.price, 0);
}

function calcTax(subtotal: number, pct = 0.05) {
  return subtotal * pct;
}

function ReceiptPanel({
  order,
  onEdit,
  onSendKitchen,
  onPay,
}: {
  order: Order;
  onEdit?: () => void;
  onSendKitchen?: () => void;
  onPay?: () => void;
}) {
  const subtotal = calcSubtotal(order.items);
  const tax = calcTax(subtotal, 0.05);
  const total = subtotal + tax;

  return (
    <div className="h-full rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[13px] font-extrabold text-[#1E1E1E]">{order.table}</div>
          <div className="mt-0.5 text-[11px] font-extrabold text-[#6D6D6D]">{order.customer}</div>
        </div>

        <button
          onClick={onEdit}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-inner"
          aria-label="Edit order"
          title="Edit order"
        >
          <MdEdit className="h-5 w-5 text-[#6D6D6D]" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {order.items.map((x, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl bg-[#DCDCDC] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#B80F24] text-[10px] font-extrabold text-white shadow">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="text-[11px] font-extrabold text-[#1E1E1E]">{x.name}</div>
                <div className="text-[10px] font-extrabold text-[#6D6D6D]">x {x.qty}</div>
              </div>
            </div>
            <div className="text-[11px] font-extrabold text-[#1E1E1E]">{money(x.qty * x.price)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-white p-3 shadow-inner">
        <div className="flex items-center justify-between text-[11px] font-extrabold text-[#6D6D6D]">
          <span>Subtotal</span>
          <span className="text-[#1E1E1E]">{money(subtotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] font-extrabold text-[#6D6D6D]">
          <span>Tax 5%</span>
          <span className="text-[#1E1E1E]">{money(tax)}</span>
        </div>
        <div className="mt-3 border-t border-black/10 pt-3 flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-[#6D6D6D]">Total</span>
          <span className="text-[13px] font-extrabold text-[#1E1E1E]">{money(total)}</span>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="text-[11px] font-extrabold text-[#6D6D6D]">Payment Method</div>

        <div className="mx-auto mt-2 grid w-28 place-items-center rounded-2xl bg-white p-3 shadow-inner">
          <MdQrCode2 className="h-10 w-10 text-[#1E1E1E]" />
          <div className="mt-2 text-[10px] font-extrabold text-[#6D6D6D]">Scan QR Code</div>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <button
          onClick={onSendKitchen}
          className="rounded-xl bg-[#B80F24] px-4 py-3 text-[11px] font-extrabold text-white shadow"
        >
          Send To Kitchen
        </button>
        <button
          onClick={onPay}
          className="rounded-xl bg-white px-4 py-3 text-[11px] font-extrabold text-[#B80F24] shadow"
        >
          Open Payment
        </button>
      </div>
    </div>
  );
}

function PaymentModal({
  open,
  order,
  tip,
  setTip,
  paymentMethod,
  setPaymentMethod,
  onClose,
  onComplete,
}: {
  open: boolean;
  order: Order;
  tip: string;
  setTip: (v: string) => void;
  paymentMethod: 'Cash' | 'Debit Card' | 'E-Wallet';
  setPaymentMethod: (v: 'Cash' | 'Debit Card' | 'E-Wallet') => void;
  onClose: () => void;
  onComplete: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const subtotal = calcSubtotal(order.items);
  const tax = calcTax(subtotal, 0.05);
  const tipVal = Number(tip || '0');
  const total = subtotal + tax + (Number.isFinite(tipVal) ? tipVal : 0);

  const press = (k: string) => {
    if (k === 'x') return setTip(tip.slice(0, -1));
    if (k === 'clear') return setTip('');
    if (!/^\d$/.test(k)) return;
    const next = (tip + k).replace(/^0+(\d)/, '$1');
    setTip(next);
  };

  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'x'];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="w-full max-w-5xl rounded-3xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#E7E7E7] shadow"
              aria-label="Close payment"
              title="Close"
            >
              <MdClose className="h-5 w-5 text-[#1E1E1E]" />
            </button>
            <div className="text-[13px] font-extrabold text-[#1E1E1E]">Payment Processing</div>
          </div>
          <div className="text-[11px] font-extrabold text-[#6D6D6D]">
            {order.table} • {order.customer}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Left: receipt */}
          <div className="rounded-2xl bg-[#E7E7E7] p-3">
            <div className="rounded-2xl bg-white p-3 shadow-inner">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[13px] font-extrabold text-[#1E1E1E]">{order.table}</div>
                  <div className="text-[11px] font-extrabold text-[#6D6D6D]">{order.customer}</div>
                </div>
                <button className="grid h-9 w-9 place-items-center rounded-xl bg-[#E7E7E7]" aria-label="Edit">
                  <MdEdit className="h-5 w-5 text-[#6D6D6D]" />
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {order.items.map((x, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-[#F2F2F2] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#B80F24] text-[10px] font-extrabold text-white shadow">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="text-[11px] font-extrabold text-[#1E1E1E]">
                        {x.name} <span className="text-[#6D6D6D]">x {x.qty}</span>
                      </div>
                    </div>
                    <div className="text-[11px] font-extrabold text-[#1E1E1E]">{money(x.qty * x.price)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-[#F2F2F2] p-3">
                <div className="flex items-center justify-between text-[11px] font-extrabold text-[#6D6D6D]">
                  <span>Subtotal</span>
                  <span className="text-[#1E1E1E]">{money(subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-extrabold text-[#6D6D6D]">
                  <span>Tax 5%</span>
                  <span className="text-[#1E1E1E]">{money(tax)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-extrabold text-[#6D6D6D]">
                  <span>Tip</span>
                  <span className="text-[#1E1E1E]">{money(Number(tip || '0'))}</span>
                </div>
                <div className="mt-3 border-t border-black/10 pt-3 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#6D6D6D]">Total</span>
                  <span className="text-[13px] font-extrabold text-[#1E1E1E]">{money(total)}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[11px] font-extrabold text-[#6D6D6D]">Payment Method</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('Cash')}
                    className={`rounded-xl px-3 py-3 text-[10px] font-extrabold shadow-inner ${
                      paymentMethod === 'Cash' ? 'bg-[#B80F24] text-white' : 'bg-[#E7E7E7] text-[#6D6D6D]'
                    }`}
                  >
                    <div className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-xl bg-white/80">
                      <MdPayments className="h-5 w-5 text-[#1E1E1E]" />
                    </div>
                    Cash
                  </button>

                  <button
                    onClick={() => setPaymentMethod('Debit Card')}
                    className={`rounded-xl px-3 py-3 text-[10px] font-extrabold shadow-inner ${
                      paymentMethod === 'Debit Card' ? 'bg-[#B80F24] text-white' : 'bg-[#E7E7E7] text-[#6D6D6D]'
                    }`}
                  >
                    <div className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-xl bg-white/80">
                      <MdCreditCard className="h-5 w-5 text-[#1E1E1E]" />
                    </div>
                    Debit Card
                  </button>

                  <button
                    onClick={() => setPaymentMethod('E-Wallet')}
                    className={`rounded-xl px-3 py-3 text-[10px] font-extrabold shadow-inner ${
                      paymentMethod === 'E-Wallet' ? 'bg-[#B80F24] text-white' : 'bg-[#E7E7E7] text-[#6D6D6D]'
                    }`}
                  >
                    <div className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-xl bg-white/80">
                      <MdAccountBalanceWallet className="h-5 w-5 text-[#1E1E1E]" />
                    </div>
                    E-Wallet
                  </button>
                </div>
              </div>

              <button
                onClick={onComplete}
                className="mt-4 w-full rounded-xl bg-[#B80F24] px-4 py-3 text-[11px] font-extrabold text-white shadow"
              >
                Order Completed
              </button>
            </div>
          </div>

          {/* Right: tip keypad */}
          <div className="rounded-2xl bg-[#E7E7E7] p-4">
            <div className="rounded-2xl bg-white p-4 shadow-inner">
              <div className="text-center">
                <div className="text-[13px] font-extrabold text-[#1E1E1E]">Tips Amount</div>
                <div className="mt-3 text-[26px] font-extrabold text-[#1E1E1E]">{money(Number(tip || '0'))}</div>
              </div>

              <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-3">
                {keypad.slice(0, 9).map((k) => (
                  <button
                    key={k}
                    onClick={() => press(k)}
                    className="h-16 rounded-2xl bg-[#E7E7E7] text-[16px] font-extrabold text-[#1E1E1E] shadow transition hover:-translate-y-0.5"
                  >
                    {k}
                  </button>
                ))}

                <button
                  onClick={() => press('clear')}
                  className="h-16 rounded-2xl bg-white text-[11px] font-extrabold text-[#B80F24] shadow"
                >
                  CLEAR
                </button>

                <button
                  onClick={() => press('0')}
                  className="h-16 rounded-2xl bg-[#E7E7E7] text-[16px] font-extrabold text-[#1E1E1E] shadow transition hover:-translate-y-0.5"
                >
                  0
                </button>

                <button
                  onClick={() => press('x')}
                  className="h-16 rounded-2xl bg-[#E7E7E7] text-[16px] font-extrabold text-[#1E1E1E] shadow transition hover:-translate-y-0.5"
                  aria-label="Backspace"
                  title="Backspace"
                >
                  x
                </button>
              </div>

              <div className="mx-auto mt-5 flex max-w-sm items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[11px] font-extrabold text-[#6D6D6D]">
                  <input type="checkbox" className="h-4 w-4 accent-[#B80F24]" />
                  Print Receipts
                </label>

                <button
                  onClick={onClose}
                  className="rounded-xl bg-[#B80F24] px-6 py-3 text-[11px] font-extrabold text-white shadow"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-right text-[10px] font-extrabold text-[#6D6D6D]">Tip keypad + receipt panel (UI only)</div>
      </div>
    </div>
  );
}

/** NEW: Void Request Details modal (matches screenshot) */
function VoidRequestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 transition-opacity duration-200">
      <div 
        className="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl transition-transform duration-300 ease-out"
        style={{
          transform: open ? 'scale(1)' : 'scale(0.95)',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[13px] font-extrabold text-[#1E1E1E]">Void Request Details</div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-extrabold text-white shadow">
              Approved
            </span>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#E7E7E7] shadow"
              aria-label="Close"
              title="Close"
            >
              <MdClose className="h-5 w-5 text-[#1E1E1E]" />
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-[10px] font-extrabold text-[#6D6D6D]">Request ID</div>
              <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">VR-2025-11001</div>
            </div>

            <div>
              <div className="text-[10px] font-extrabold text-[#6D6D6D]">Date of Request</div>
              <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">2025-11-10</div>
            </div>

            <div>
              <div className="text-[10px] font-extrabold text-[#6D6D6D]">Original Transaction Date</div>
              <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">2025-11-08</div>
            </div>

            <div>
              <div className="text-[10px] font-extrabold text-[#6D6D6D]">Transaction ID</div>
              <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">TRN-123456789</div>
            </div>

            <div>
              <div className="text-[10px] font-extrabold text-[#6D6D6D]">Amount</div>
              <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">$150.00</div>
            </div>

            <div>
              <div className="text-[10px] font-extrabold text-[#6D6D6D]">Reason for Void</div>
              <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">Duplicate transaction.</div>
            </div>

            <div>
              <div className="text-[10px] font-extrabold text-[#6D6D6D]">Requested By</div>
              <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">Jane Doe</div>
            </div>

            <div>
              <div className="text-[10px] font-extrabold text-[#6D6D6D]">Manager&#39;s Approval</div>
              <div className="mt-1 text-[11px] font-extrabold text-[#1E1E1E]">John Smith</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ViewMode = 'Orders Dashboard' | 'Orders List';

export default function OrderPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const activeNav = 'Order';

  const [view, setView] = useState<ViewMode>('Orders Dashboard');

  const categories = useMemo(
    () => [
      { key: 'Fries', label: 'Fries', items: 15 },
      { key: 'Chicken', label: 'Chicken', items: 10 },
      { key: 'Rice Meals', label: 'Rice Meals', items: 18 },
      { key: 'Beverage', label: 'Beverage', items: 12 },
    ],
    []
  );
  const [activeCategory, setActiveCategory] = useState(categories[0].key);

  const orders = useMemo<Order[]>(
    () => [
      {
        id: '01',
        table: 'Table 01',
        customer: 'Watson Joyce',
        createdAt: '4 : 48 PM',
        status: 'Ready to serve',
        items: [
          { name: 'Xian Ji Pai', qty: 2, price: 55 },
          { name: 'Chicken Pops', qty: 2, price: 55 },
          { name: 'Large Fries', qty: 1, price: 20 },
          { name: 'Iced Tea', qty: 1, price: 10 },
        ],
      },
      {
        id: '02',
        table: 'Table 02',
        customer: 'Watson Joyce',
        createdAt: '4 : 48 PM',
        status: 'In Process',
        items: [
          { name: 'Chicken Parmesan', qty: 2, price: 55 },
          { name: 'Chicken Parmesan', qty: 2, price: 55 },
        ],
      },
      {
        id: '03',
        table: 'Table 03',
        customer: 'Watson Joyce',
        createdAt: '4 : 48 PM',
        status: 'In the kitchen',
        items: [
          { name: 'Xian Ji Pai', qty: 1, price: 55 },
          { name: 'Chicken Pops', qty: 1, price: 55 },
          { name: 'Large Fries', qty: 1, price: 20 },
          { name: 'Iced Tea', qty: 1, price: 10 },
        ],
      },
      {
        id: '04',
        table: 'Table 04',
        customer: 'Watson Joyce',
        createdAt: '4 : 48 PM',
        status: 'Completed',
        items: [
          { name: 'Xian Ji Pai', qty: 1, price: 55 },
          { name: 'Chicken Pops', qty: 1, price: 55 },
          { name: 'Large Fries', qty: 1, price: 20 },
          { name: 'Iced Tea', qty: 1, price: 10 },
        ],
      },
      {
        id: '05',
        table: 'Table 05',
        customer: 'Watson Joyce',
        createdAt: '4 : 48 PM',
        status: 'Ready to serve',
        items: [
          { name: 'Xian Ji Pai', qty: 1, price: 55 },
          { name: 'Chicken Pops', qty: 2, price: 55 },
        ],
      },
      {
        id: '06',
        table: 'Table 06',
        customer: 'Watson Joyce',
        createdAt: '4 : 48 PM',
        status: 'In Process',
        items: [
          { name: 'Xian Ji Pai', qty: 2, price: 55 },
          { name: 'Chicken Pops', qty: 1, price: 55 },
          { name: 'Large Fries', qty: 1, price: 20 },
        ],
      },
    ],
    []
  );

  const [selectedOrderId, setSelectedOrderId] = useState<Order['id']>(orders[0].id);
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? orders[0],
    [orders, selectedOrderId]
  );

  // Orders list controls
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [q, setQ] = useState('');

  const filteredOrders = useMemo(() => {
    const base = orders.filter((o) => {
      const matchesStatus = statusFilter === 'All' ? true : o.status === statusFilter;
      const hay = `${o.id} ${o.table} ${o.customer} ${o.status}`.toLowerCase();
      const matchesQuery = q.trim() ? hay.includes(q.toLowerCase()) : true;
      return matchesStatus && matchesQuery;
    });
    return base;
  }, [orders, statusFilter, q]);

  // Payment modal
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [tip, setTip] = useState('2');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Debit Card' | 'E-Wallet'>('E-Wallet');

  // NEW: Void modal
  const [voidOpen, setVoidOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    } finally {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        }`}
      >
        {/* Sidebar */}
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

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
              <p className="text-[13px] font-extrabold text-[#1E1E1E]">Orders</p>
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

          {/* View tabs */}
          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tab active={view === 'Orders Dashboard'} onClick={() => setView('Orders Dashboard')}>
                Orders Dashboard
              </Tab>
              <Tab active={view === 'Orders List'} onClick={() => setView('Orders List')}>
                Payment Processing
              </Tab>
            </div>

            {view === 'Orders List' && (
              <div className="flex flex-wrap items-center gap-2">
                <button className="flex items-center gap-2 rounded-md bg-[#B80F24] px-4 py-2 text-[11px] font-extrabold text-white shadow">
                  <MdAdd className="h-4 w-4" />
                  Add New Order
                </button>

                <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow">
                  <MdSearch className="h-5 w-5 text-[#6D6D6D]" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search a name, order or etc."
                    className="w-60 bg-transparent text-[11px] font-extrabold text-[#6D6D6D] outline-none"
                  />
                </div>
              </div>
            )}
          </section>

          {/* DASHBOARD VIEW */}
          {view === 'Orders Dashboard' && (
            <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
              {/* Left side */}
              <div className="space-y-4">
                {/* Categories row */}
                <div className="flex flex-wrap items-center gap-3">
                  {categories.map((c) => (
                    <MiniCategoryCard
                      key={c.key}
                      label={c.label}
                      items={c.items}
                      active={activeCategory === c.key}
                      onClick={() => setActiveCategory(c.key)}
                    />
                  ))}
                </div>

                {/* Orders grid */}
                <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-[12px] font-extrabold text-[#1E1E1E]">Orders</div>
                    <button
                      onClick={() => setView('Orders List')}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-extrabold text-[#6D6D6D] shadow"
                    >
                      <MdArrowBackIosNew className="h-4 w-4 rotate-180" />
                      View List
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedOrderId(orders[i % orders.length].id)}
                        className="rounded-2xl bg-white p-3 text-left shadow transition hover:-translate-y-0.5"
                      >
                        <div className="text-[10px] font-extrabold text-[#6D6D6D]">Order → Kitchen</div>
                        <div className="mt-1 text-[12px] font-extrabold text-[#1E1E1E]">Roasted Chicken</div>
                        <div className="mt-1 text-[11px] font-extrabold text-[#6D6D6D]">$55.00</div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold text-[#6D6D6D]">01</span>
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#E7E7E7] shadow-inner">
                              <MdShoppingCart className="h-4 w-4 text-[#6D6D6D]" />
                            </span>
                          </div>
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#B80F24] text-white shadow">
                            +
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right side receipt */}
              <ReceiptPanel order={selectedOrder} onEdit={() => {}} onSendKitchen={() => {}} onPay={() => setPaymentOpen(true)} />
            </section>
          )}

          {/* ORDERS LIST (Payment Processing entry) */}
          {view === 'Orders List' && (
            <section className="space-y-4">
              {/* Filters row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 rounded-2xl bg-[#E7E7E7] p-2 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  <Chip active={statusFilter === 'All'} label="All" onClick={() => setStatusFilter('All')} />
                  {(['Ready to serve', 'In Process', 'In the kitchen', 'Completed'] as OrderStatus[]).map((s) => (
                    <Chip key={s} active={statusFilter === s} label={s} onClick={() => setStatusFilter(s)} />
                  ))}
                </div>

                <button
                  onClick={() => setView('Orders Dashboard')}
                  className="rounded-xl bg-white px-4 py-2 text-[11px] font-extrabold text-[#6D6D6D] shadow"
                >
                  Back to Dashboard
                </button>
              </div>

              {/* Cards grid */}
              <div className="grid gap-4 lg:grid-cols-3">
                {filteredOrders.map((o) => (
                  <div key={o.id} className="rounded-2xl bg-[#E7E7E7] p-3 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                    <div className="rounded-2xl bg-white p-3 shadow-inner">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#B80F24] text-[12px] font-extrabold text-white shadow">
                            {o.id}
                          </span>
                          <div>
                            <div className="text-[12px] font-extrabold text-[#1E1E1E]">{o.customer}</div>
                            <div className="text-[10px] font-extrabold text-[#6D6D6D]">
                              {o.table} • Order #{o.id}00
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>

                      <div className="mt-3 text-[10px] font-extrabold text-[#6D6D6D]">{`Wednesday, 28, 2024`}</div>
                      <div className="mt-1 text-[10px] font-extrabold text-[#6D6D6D]">{o.createdAt}</div>

                      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 text-[10px] font-extrabold text-[#6D6D6D]">
                        <div>Qty</div>
                        <div className="text-right">Price</div>

                        {o.items.slice(0, 4).map((x, i) => (
                          <React.Fragment key={i}>
                            <div className="flex items-center justify-between">
                              <span className="text-[#1E1E1E]">{String(x.qty).padStart(2, '0')}</span>
                              <span className="ml-3 truncate">{x.name}</span>
                            </div>
                            <div className="text-right text-[#1E1E1E]">{money(x.qty * x.price)}</div>
                          </React.Fragment>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-[10px] font-extrabold text-[#6D6D6D]">SubTotal</div>
                        <div className="text-[12px] font-extrabold text-[#1E1E1E]">{money(calcSubtotal(o.items))}</div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button className="grid h-10 place-items-center rounded-xl bg-[#E7E7E7] shadow-inner">
                          <MdEdit className="h-5 w-5 text-[#6D6D6D]" />
                        </button>
                        <button className="grid h-10 place-items-center rounded-xl bg-[#E7E7E7] shadow-inner">
                          <MdDelete className="h-5 w-5 text-[#6D6D6D]" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderId(o.id);
                            setPaymentOpen(true);
                          }}
                          className="rounded-xl bg-[#B80F24] px-3 text-[11px] font-extrabold text-white shadow"
                        >
                          Pay Bill
                        </button>
                      </div>

                      {/* NEW: Void Transaction button (full-width) */}
                      <button
                        onClick={() => {
                          setSelectedOrderId(o.id);
                          setVoidOpen(true);
                        }}
                        className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-[11px] font-extrabold text-[#B80F24] shadow"
                      >
                        Void Transaction
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Payment Processing Modal */}
      <PaymentModal
        open={paymentOpen}
        order={selectedOrder}
        tip={tip}
        setTip={setTip}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onClose={() => setPaymentOpen(false)}
        onComplete={() => setPaymentOpen(false)}
      />

      {/* NEW: Void Request Details Modal */}
      <VoidRequestModal open={voidOpen} onClose={() => setVoidOpen(false)} />
    </div>
  );
}