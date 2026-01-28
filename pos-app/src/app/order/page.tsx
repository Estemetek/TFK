// app/order/page.tsx
// Orders page - Schema-compliant POS system
// Uses: orders, order_items, menu_items tables only

'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../components/Sidebar';
import {
  MdEdit,
  MdClose,
  MdQrCode2,
  MdPayments,
  MdCreditCard,
  MdAccountBalanceWallet,
  MdAdd,
  MdRemove,
} from 'react-icons/md';


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

// Schema-based types
type MenuItem = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  category: 'Meals' | 'Add Ons' | 'Snacks';
  created_at: string;
  updated_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  created_at?: string;
};

type Order = {
  id: string;
  amount: number;
  amount_paid: number;
  change: number;
  created_at: string;
  updated_at?: string;
  items: OrderItem[];
  table_number?: number; // UI-only: which table this order belongs to
};

function money(n: number) {
  return `₱${n.toFixed(2)}`;
}

function calcSubtotal(items: OrderItem[], menuItems: MenuItem[]) {
  return items.reduce((a, x) => {
    const menuItem = menuItems.find(m => m.id === x.menu_item_id);
    return a + (menuItem ? x.quantity * menuItem.price : 0);
  }, 0);
}

function calcTax(subtotal: number, pct = 0.05) {
  return subtotal * pct;
}

function ReceiptPanel({
  order,
  menuItems,
  onEdit,
  onSendKitchen,
  onPay,
}: {
  order: Order;
  menuItems: MenuItem[];
  onEdit?: () => void;
  onSendKitchen?: () => void;
  onPay?: () => void;
}) {
  const subtotal = calcSubtotal(order.items, menuItems);
  const tax = calcTax(subtotal, 0.05);
  const total = subtotal + tax;

  return (
    <div className="h-full rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[13px] font-extrabold text-[#1E1E1E]">Order #{order.id}</div>
          <div className="mt-0.5 text-[11px] font-extrabold text-[#6D6D6D]">{order.created_at}</div>
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
        {order.items.map((x, i) => {
          const menuItem = menuItems.find(m => m.id === x.menu_item_id);
          return (
            <div key={x.id} className="flex items-center justify-between rounded-xl bg-[#DCDCDC] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#B80F24] text-[10px] font-extrabold text-white shadow">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div className="text-[11px] font-extrabold text-[#1E1E1E]">{menuItem?.name || 'Unknown Item'}</div>
                  <div className="text-[10px] font-extrabold text-[#6D6D6D]">x {x.quantity}</div>
                </div>
              </div>
              <div className="text-[11px] font-extrabold text-[#1E1E1E]">
                {menuItem ? money(x.quantity * menuItem.price) : '$0.00'}
              </div>
            </div>
          );
        })}
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

        {/* Payment Details - Schema Fields */}
        {order.amount_paid > 0 && (
          <div className="mt-3 border-t border-black/10 pt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-[#6D6D6D]">
              <span>Amount Paid</span>
              <span className="text-[#1E1E1E]">{money(order.amount_paid)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-600">
              <span>Change</span>
              <span>{money(order.change)}</span>
            </div>
          </div>
        )}
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

function AddItemsModal({
  open,
  order,
  menuItems,
  onClose,
  onAddItems,
}: {
  open: boolean;
  order: Order;
  menuItems: MenuItem[];
  onClose: () => void;
  onAddItems: (items: OrderItem[]) => void;
}) {
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<string>('Meals');

  // Only use Meals, Add Ons, Snacks as categories
  const categories = useMemo(() => {
    const cats = ['Meals', 'Add Ons', 'Snacks'] as const;
    return cats.map(cat => ({ name: cat, count: menuItems.filter(item => item.category === cat).length }));
  }, [menuItems]);

  // Filter items by selected category
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  const handleAddItem = (menuItemId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      newCart.set(menuItemId, (newCart.get(menuItemId) ?? 0) + 1);
      return newCart;
    });
  };

  const handleRemoveItem = (menuItemId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const qty = newCart.get(menuItemId) ?? 0;
      if (qty <= 1) {
        newCart.delete(menuItemId);
      } else {
        newCart.set(menuItemId, qty - 1);
      }
      return newCart;
    });
  };

  const handleConfirmItems = () => {
    const newItems: OrderItem[] = Array.from(cart.entries()).map(([menuItemId, quantity], idx) => ({
      id: `oi-${order.id}-${idx}`,
      order_id: order.id,
      menu_item_id: menuItemId,
      quantity,
      created_at: new Date().toISOString(),
    }));
    onAddItems(newItems);
    setCart(new Map());
    onClose();
  };

  const subtotal = Array.from(cart.entries()).reduce((a, [menuItemId, qty]) => {
    const menuItem = menuItems.find(m => m.id === menuItemId);
    return a + (menuItem ? qty * menuItem.price : 0);
  }, 0);

  const tax = calcTax(subtotal, 0.05);
  const total = subtotal + tax;
  const hasItems = cart.size > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="w-full max-w-6xl rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#E7E7E7] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[14px] font-extrabold text-[#1E1E1E]">
              Add Items to Order #{order.id}
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow"
              aria-label="Close"
            >
              <MdClose className="h-5 w-5 text-[#1E1E1E]" />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-extrabold whitespace-nowrap transition shadow-sm ${
                  selectedCategory === cat.name
                    ? 'bg-[#B80F24] text-white'
                    : 'bg-white text-[#6D6D6D] hover:bg-[#F5F5F5]'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  selectedCategory === cat.name
                    ? 'bg-white/20 text-white'
                    : 'bg-[#FFA500] text-white'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px] p-4 overflow-hidden flex-1">
          {/* Left: Menu Items Grid */}
          <div className="overflow-y-auto pr-2">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const qty = cart.get(item.id) ?? 0;
                const hasQty = qty > 0;

                return (
                  <div
                    key={item.id}
                    className="relative rounded-2xl bg-white border-2 border-[#E7E7E7] p-4 shadow-sm hover:shadow-md transition flex flex-col"
                  >
                    {/* Item Image Placeholder */}
                    <div className="aspect-square rounded-xl bg-[#F5F5F5] mb-3 flex items-center justify-center">
                      <span className="text-4xl">🍗</span>
                    </div>

                    {/* Item Info */}
                    <div className="flex-1">
                      <div className="text-[13px] font-extrabold text-[#1E1E1E] mb-1">{item.name}</div>
                      <div className="text-[14px] font-extrabold text-[#B80F24]">{money(item.price)}</div>
                    </div>

                    {/* Add/Quantity Controls */}
                    {hasQty ? (
                      <div className="mt-3 flex items-center justify-center gap-2 bg-[#F5F5F5] rounded-xl p-2">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white shadow hover:bg-[#E7E7E7]"
                          aria-label="Decrease quantity"
                        >
                          <MdRemove className="h-4 w-4 text-[#1E1E1E]" />
                        </button>
                        <div className="w-10 text-center text-[13px] font-extrabold text-[#1E1E1E]">
                          {qty}
                        </div>
                        <button
                          onClick={() => handleAddItem(item.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-[#B80F24] shadow hover:bg-[#A00820]"
                          aria-label="Increase quantity"
                        >
                          <MdAdd className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddItem(item.id)}
                        className="mt-3 w-full rounded-xl bg-[#B80F24] px-4 py-2 text-[11px] font-extrabold text-white shadow hover:bg-[#A00820] flex items-center justify-center gap-1"
                      >
                        <MdAdd className="h-4 w-4" />
                        Add
                      </button>
                    )}

                    {/* Quantity Badge */}
                    {hasQty && false && (
                      <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-[#B80F24] text-white text-[11px] font-extrabold flex items-center justify-center shadow">
                        {qty}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="rounded-2xl bg-[#E7E7E7] p-4 h-fit sticky top-4 flex flex-col max-h-full">
            <div className="text-[12px] font-extrabold text-[#1E1E1E] mb-3">Order Summary</div>

            <div className="space-y-2 mb-4 pb-4 border-b border-[#D0D0D0] overflow-y-auto flex-1">
              {cart.size === 0 ? (
                <div className="text-center py-8 text-[11px] text-[#6D6D6D]">
                  No items selected
                </div>
              ) : (
                Array.from(cart.entries()).map(([menuItemId, qty]) => {
                  const item = menuItems.find(m => m.id === menuItemId);
                  return (
                    <div key={menuItemId} className="flex items-center justify-between text-[10px] bg-white rounded-lg p-2">
                      <span className="font-extrabold text-[#1E1E1E]">{item?.name} x{qty}</span>
                      <span className="font-extrabold text-[#B80F24]">{money((item?.price ?? 0) * qty)}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-2 rounded-xl bg-white p-3 mb-4">
              <div className="flex items-center justify-between text-[10px] font-extrabold text-[#6D6D6D]">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-extrabold text-[#6D6D6D]">
                <span>Tax 5%</span>
                <span>{money(tax)}</span>
              </div>
              <div className="border-t border-[#E0E0E0] pt-2 flex items-center justify-between text-[12px] font-extrabold text-[#1E1E1E]">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmItems}
                disabled={!hasItems}
                className="rounded-xl bg-[#B80F24] px-4 py-3 text-[11px] font-extrabold text-white shadow disabled:bg-[#D0D0D0] disabled:cursor-not-allowed"
              >
                Add Items ({cart.size})
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-white border border-[#E0E0E0] px-4 py-3 text-[11px] font-extrabold text-[#6D6D6D] shadow"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  open,
  order,
  menuItems,
  paymentMethod,
  setPaymentMethod,
  onClose,
  onComplete,
}: {
  open: boolean;
  order: Order;
  menuItems: MenuItem[];
  paymentMethod: 'Cash' | 'Debit Card' | 'E-Wallet';
  setPaymentMethod: (v: 'Cash' | 'Debit Card' | 'E-Wallet') => void;
  onClose: () => void;
  onComplete: (amountPaid: number, change: number) => void;
}) {
  const [amountTendered, setAmountTendered] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setAmountTendered('');
    }
  }, [open]);

  if (!open) return null;

  const subtotal = calcSubtotal(order.items, menuItems);
  const tax = calcTax(subtotal, 0.05);
  const total = subtotal + tax;
  const amountTenderedNum = Number(amountTendered || '0');
  const changeAmount = amountTenderedNum - total;

  const press = (k: string) => {
    if (k === 'x') {
      setAmountTendered(amountTendered.slice(0, -1));
    } else if (k === 'clear') {
      setAmountTendered('');
    } else if (/^\d$/.test(k)) {
      setAmountTendered((amountTendered || '0') + k);
    }
  };

  const handleCompletePayment = () => {
    if (amountTenderedNum >= total) {
      onComplete(amountTenderedNum, Math.max(0, changeAmount));
      onClose();
    }
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
          <div className="text-[11px] font-extrabold text-[#6D6D6D]">Order #{order.id}</div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Left: receipt */}
          <div className="rounded-2xl bg-[#E7E7E7] p-3">
            <div className="rounded-2xl bg-white p-3 shadow-inner">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[13px] font-extrabold text-[#1E1E1E]">Order #{order.id}</div>
                  <div className="text-[11px] font-extrabold text-[#6D6D6D]">{order.created_at}</div>
                </div>
                <button className="grid h-9 w-9 place-items-center rounded-xl bg-[#E7E7E7]" aria-label="Edit">
                  <MdEdit className="h-5 w-5 text-[#6D6D6D]" />
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {order.items.map((x, i) => {
                  const menuItem = menuItems.find(m => m.id === x.menu_item_id);
                  return (
                    <div key={x.id} className="flex items-center justify-between rounded-xl bg-[#F2F2F2] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#B80F24] text-[10px] font-extrabold text-white shadow">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="text-[11px] font-extrabold text-[#1E1E1E]">
                          {menuItem?.name || 'Unknown Item'} <span className="text-[#6D6D6D]">x {x.quantity}</span>
                        </div>
                      </div>
                      <div className="text-[11px] font-extrabold text-[#1E1E1E]">
                        {menuItem ? money(x.quantity * menuItem.price) : '$0.00'}
                      </div>
                    </div>
                  );
                })}
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
                onClick={handleCompletePayment}
                disabled={amountTenderedNum < total}
                className="mt-4 w-full rounded-xl bg-[#B80F24] px-4 py-3 text-[11px] font-extrabold text-white shadow disabled:bg-[#D0D0D0]"
              >
                Order Completed
              </button>
            </div>
          </div>

          {/* Right: amount tendered keypad */}
          <div className="rounded-2xl bg-[#E7E7E7] p-4">
            <div className="rounded-2xl bg-white p-4 shadow-inner">
              <div className="text-center">
                <div className="text-[13px] font-extrabold text-[#1E1E1E]">Amount Tendered</div>
                <div className="mt-3 text-[26px] font-extrabold text-[#1E1E1E]">{money(amountTenderedNum)}</div>
              </div>

              {amountTenderedNum > 0 && (
                <div className="mt-4 text-center bg-emerald-50 rounded-xl p-3">
                  <div className="text-[11px] font-extrabold text-[#6D6D6D]">Change</div>
                  <div className="mt-2 text-[20px] font-extrabold text-emerald-600">{money(Math.max(0, changeAmount))}</div>
                </div>
              )}

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
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-white border border-[#E0E0E0] px-4 py-3 text-[11px] font-extrabold text-[#6D6D6D] shadow"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCompletePayment}
                  disabled={amountTenderedNum < total}
                  className="flex-1 rounded-xl bg-[#B80F24] px-6 py-3 text-[11px] font-extrabold text-white shadow disabled:bg-[#D0D0D0]"
                >
                  Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableAssignmentModal({
  open,
  orders,
  onClose,
  onSelectTable,
}: {
  open: boolean;
  orders: Order[];
  onClose: () => void;
  onSelectTable: (tableNumber: number) => void;
}) {
  const tables = Array.from({ length: 20 }, (_, i) => i + 1);
  
  // Get occupied table numbers (only for unpaid orders)
  const occupiedTables = new Set(
    orders
      .filter(o => o.amount_paid === 0) // Only unpaid orders occupy tables
      .map(o => o.table_number)
      .filter(Boolean)
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[16px] font-extrabold text-[#1E1E1E]">Assign Order to Table</div>
            <div className="mt-2 flex items-center gap-4 text-[11px] font-extrabold">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#B80F24]" />
                <span>Occupied</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-[#E7E7E7] shadow"
            aria-label="Close"
            title="Close"
          >
            <MdClose className="h-5 w-5 text-[#1E1E1E]" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {tables.map((tableNum) => {
            const isOccupied = occupiedTables.has(tableNum);
            return (
              <button
                key={tableNum}
                onClick={() => !isOccupied && onSelectTable(tableNum)}
                disabled={isOccupied}
                className={`relative rounded-xl px-4 py-4 text-[14px] font-extrabold shadow transition ${
                  isOccupied
                    ? 'bg-[#B80F24] text-white cursor-not-allowed opacity-60'
                    : 'bg-[#E7E7E7] text-[#1E1E1E] hover:-translate-y-0.5 hover:bg-emerald-500 hover:text-white'
                }`}
              >
                <div>Table {String(tableNum).padStart(2, '0')}</div>
                {isOccupied && (
                  <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-white border border-[#E0E0E0] px-6 py-3 text-[12px] font-extrabold text-[#6D6D6D] shadow"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const activeNav = 'Order';

  // Schema-based static data
  const menuItems: MenuItem[] = useMemo(
    () => [
      // Meals
      { id: 'meals-1', name: 'C1-pc Chicken/Rice', price: 70, is_available: true, category: 'Meals', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'meals-2', name: 'C2-pcs Chicken/Rice', price: 120, is_available: true, category: 'Meals', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'meals-3', name: 'C3- Chicken w/fries', price: 100, is_available: true, category: 'Meals', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'meals-4', name: 'C4- 4pcs Chicken', price: 200, is_available: true, category: 'Meals', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'meals-5', name: '6pcs Chicken', price: 300, is_available: true, category: 'Meals', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'meals-6', name: 'T1- Taiwan Jpai', price: 150, is_available: true, category: 'Meals', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'meals-7', name: 'T2- Taiwan Chicken Pop', price: 100, is_available: true, category: 'Meals', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      // Add Ons
      { id: 'addons-1', name: 'Rice', price: 20, is_available: true, category: 'Add Ons', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'addons-2', name: 'Chicken Skin', price: 50, is_available: true, category: 'Add Ons', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'addons-3', name: 'Juice Pitcher', price: 50, is_available: true, category: 'Add Ons', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'addons-4', name: 'Softdrinks', price: 20, is_available: true, category: 'Add Ons', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'addons-5', name: 'Mineral Water', price: 20, is_available: true, category: 'Add Ons', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      // Snacks
      { id: 'snacks-1', name: 'Fries w/Drinks', price: 90, is_available: true, category: 'Snacks', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'snacks-2', name: 'Fries w/Drinks and Cheese Sticks', price: 110, is_available: true, category: 'Snacks', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'snacks-3', name: 'Fries w/Drinks and Hotdog', price: 130, is_available: true, category: 'Snacks', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'snacks-4', name: 'Solo', price: 50, is_available: true, category: 'Snacks', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'snacks-5', name: 'Buddy', price: 100, is_available: true, category: 'Snacks', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'snacks-6', name: 'Barkada', price: 150, is_available: true, category: 'Snacks', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    ],
    []
  );

  const initialOrders = useMemo<Order[]>(
    () => [
      {
        id: '01',
        amount: 262.5,
        amount_paid: 0,
        change: 0,
        created_at: '2025-01-29T16:48:00Z',
        updated_at: undefined,
        table_number: 1,
        items: [
          { id: 'oi-1', order_id: '01', menu_item_id: 'mi-1', quantity: 2, created_at: '2025-01-29T16:48:00Z' },
          { id: 'oi-2', order_id: '01', menu_item_id: 'mi-2', quantity: 2, created_at: '2025-01-29T16:48:00Z' },
          { id: 'oi-3', order_id: '01', menu_item_id: 'mi-3', quantity: 1, created_at: '2025-01-29T16:48:00Z' },
          { id: 'oi-4', order_id: '01', menu_item_id: 'mi-4', quantity: 1, created_at: '2025-01-29T16:48:00Z' },
        ],
      },
      {
        id: '02',
        amount: 231,
        amount_paid: 0,
        change: 0,
        created_at: '2025-01-29T16:48:00Z',
        table_number: 3,
        items: [
          { id: 'oi-5', order_id: '02', menu_item_id: 'mi-5', quantity: 2, created_at: '2025-01-29T16:48:00Z' },
          { id: 'oi-6', order_id: '02', menu_item_id: 'mi-5', quantity: 2, created_at: '2025-01-29T16:48:00Z' },
        ],
      },
      {
        id: '03',
        amount: 157.5,
        amount_paid: 0,
        change: 0,
        created_at: '2025-01-29T16:48:00Z',
        table_number: 5,
        items: [
          { id: 'oi-7', order_id: '03', menu_item_id: 'mi-1', quantity: 1, created_at: '2025-01-29T16:48:00Z' },
          { id: 'oi-8', order_id: '03', menu_item_id: 'mi-2', quantity: 1, created_at: '2025-01-29T16:48:00Z' },
          { id: 'oi-9', order_id: '03', menu_item_id: 'mi-3', quantity: 1, created_at: '2025-01-29T16:48:00Z' },
          { id: 'oi-10', order_id: '03', menu_item_id: 'mi-4', quantity: 1, created_at: '2025-01-29T16:48:00Z' },
        ],
      },
    ],
    []
  );

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrderId, setSelectedOrderId] = useState<Order['id']>(initialOrders[0].id);
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? orders[0],
    [orders, selectedOrderId]
  );

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Debit Card' | 'E-Wallet'>('E-Wallet');
  const [tableModalOpen, setTableModalOpen] = useState(false);

  const handleSelectTable = (tableNumber: number) => {
    // Create a new order for the selected table
    const newOrderId = (Math.max(...orders.map(o => parseInt(o.id))) + 1).toString().padStart(2, '0');
    const newOrder: Order = {
      id: newOrderId,
      amount: 0,
      amount_paid: 0,
      change: 0,
      created_at: new Date().toISOString(),
      table_number: tableNumber,
      items: [],
    };
    setOrders([...orders, newOrder]);
    setSelectedOrderId(newOrderId);
    setTableModalOpen(false);
    // Open add items modal immediately after table selection
    setAddItemsOpen(true);
  };

  const handleAddItems = (newItems: OrderItem[]) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === selectedOrderId) {
          // Add new items to the order
          const updatedItems = [...o.items, ...newItems];
          // Recalculate amount
          const subtotal = calcSubtotal(updatedItems, menuItems);
          const tax = calcTax(subtotal, 0.05);
          const total = subtotal + tax;
          return { ...o, items: updatedItems, amount: total };
        }
        return o;
      })
    );
    setAddItemsOpen(false);
  };

  const handlePaymentComplete = (amountPaid: number, change: number) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrderId
          ? { ...o, amount_paid: amountPaid, change, updated_at: new Date().toISOString() }
          : o
      )
    );
  };

  const handleLogout = async () => {
    // Logout logic here
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

          {/* Orders display */}
          <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
            {/* Left: Orders grid */}
            <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[12px] font-extrabold text-[#1E1E1E]">Active Orders</div>
                <button
                  onClick={() => setTableModalOpen(true)}
                  className="rounded-xl bg-[#B80F24] px-3 py-2 text-[11px] font-extrabold text-white shadow"
                >
                  + New Order
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`rounded-2xl p-3 text-left shadow transition hover:-translate-y-0.5 ${
                      selectedOrderId === o.id ? 'bg-[#B80F24] text-white' : 'bg-white'
                    }`}
                  >
                    <div className={`text-[10px] font-extrabold ${selectedOrderId === o.id ? 'text-white/70' : 'text-[#6D6D6D]'}`}>
                      {o.table_number ? `Table ${String(o.table_number).padStart(2, '0')}` : 'Order'} #{o.id}
                    </div>
                    <div className={`mt-1 text-[12px] font-extrabold ${selectedOrderId === o.id ? 'text-white' : 'text-[#1E1E1E]'}`}>
                      {money(o.amount)}
                    </div>
                    <div className={`mt-2 text-[10px] font-extrabold ${selectedOrderId === o.id ? 'text-white/70' : 'text-[#6D6D6D]'}`}>
                      {o.items.length} item(s)
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Receipt Panel */}
            <ReceiptPanel
              order={selectedOrder}
              menuItems={menuItems}
              onEdit={() => setAddItemsOpen(true)}
              onSendKitchen={() => {}}
              onPay={() => setPaymentOpen(true)}
            />
          </section>
        </main>
      </div>

      {/* Payment Processing Modal */}
      <PaymentModal
        open={paymentOpen}
        order={selectedOrder}
        menuItems={menuItems}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onClose={() => setPaymentOpen(false)}
        onComplete={handlePaymentComplete}
      />

      {/* Add Items Modal */}
      <AddItemsModal
        open={addItemsOpen}
        order={selectedOrder}
        menuItems={menuItems}
        onClose={() => setAddItemsOpen(false)}
        onAddItems={handleAddItems}
      />

      {/* Table Assignment Modal */}
      <TableAssignmentModal
        open={tableModalOpen}
        orders={orders}
        onClose={() => setTableModalOpen(false)}
        onSelectTable={handleSelectTable}
      />
    </div>
  );
}