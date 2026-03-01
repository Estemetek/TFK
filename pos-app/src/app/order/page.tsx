'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { supabase } from '../lib/supabaseClient';
import {
  MdAdd,
  MdRemove,
  MdShoppingCart,
  MdReceipt,
  MdRestaurantMenu,
  MdClose,
  MdSearch,
  MdTune,
  MdDelete,
} from 'react-icons/md';

// --- TYPES ---
interface Category {
  categoryID: number;
  categoryName: string;
  description?: string;
}

interface MenuItem {
  menuItemID: number;
  name: string;
  price: number;
  isAvailable: boolean;
  imageUrl: string | null;
  categoryID: number;
  categoryName?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

type PayMethod = 'cash' | 'gcash' | 'bank';

const BRAND = '#B80F24';
const money = (n: number) => `₱${Number(n || 0).toFixed(2)}`;

// ---------- Toast (stable component) ----------
function Toast({
  show,
  text,
  onClose,
}: {
  show: boolean;
  text: string;
  onClose: () => void;
}) {
  if (!show) return null;
  return (
    <div className="fixed z-999 left-1/2 top-5 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-2xl bg-gray-900 text-white px-4 py-3 shadow-xl border border-white/10">
        <span className="text-sm font-bold">{text}</span>
        <button
          onClick={onClose}
          className="ml-2 rounded-xl px-2 py-1 text-white/80 hover:text-white hover:bg-white/10 transition"
          aria-label="Close toast"
        >
          <MdClose />
        </button>
      </div>
    </div>
  );
}

// ---------- CartPanel (MOVED OUTSIDE so it won't remount on every keystroke) ----------
function CartPanel({
  compact,
  cart,
  cartCount,
  cartTotal,
  paymentMethod,
  setPaymentMethod,
  paymentConfirmed,
  setPaymentConfirmed,
  isSubmitting,
  handleCheckout,
  clearCart,
  removeLine,
  removeFromCart,
  addToCart,
  setShowCartMobile,
  amountPaidInput,
  setAmountPaidInput,
  amountPaid,
  changeDue,
}: {
  compact?: boolean;

  cart: CartItem[];
  cartCount: number;
  cartTotal: number;

  paymentMethod: PayMethod;
  setPaymentMethod: React.Dispatch<React.SetStateAction<PayMethod>>;

  paymentConfirmed: boolean;
  setPaymentConfirmed: React.Dispatch<React.SetStateAction<boolean>>;

  isSubmitting: boolean;
  handleCheckout: () => Promise<void> | void;
  clearCart: () => void;

  removeLine: (menuItemID: number) => void;
  removeFromCart: (menuItemID: number) => void;
  addToCart: (item: MenuItem) => void;

  setShowCartMobile: React.Dispatch<React.SetStateAction<boolean>>;

  amountPaidInput: string;
  setAmountPaidInput: React.Dispatch<React.SetStateAction<string>>;
  amountPaid: number;
  changeDue: number;
}) {
  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="p-5 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: `${BRAND}12` }}
          >
            <MdShoppingCart className="text-xl" style={{ color: BRAND }} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-gray-900">Order Details</h2>
            <p className="text-[11px] font-bold text-gray-400">
              {cartCount} item{cartCount !== 1 ? 's' : ''} in cart
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="rounded-xl px-3 py-2 text-xs font-black bg-gray-100 text-gray-700 hover:bg-gray-200 transition flex items-center gap-1"
              title="Clear cart"
            >
              <MdDelete className="text-base" />
              Clear
            </button>
          )}

          {compact && (
            <button
              onClick={() => setShowCartMobile(false)}
              className="rounded-xl p-2 hover:bg-gray-100 transition"
              aria-label="Close cart"
            >
              <MdClose className="text-xl text-gray-600" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <div className="h-14 w-14 rounded-3xl bg-gray-50 flex items-center justify-center mb-3 border border-gray-100">
              <MdReceipt size={34} className="opacity-30" />
            </div>
            <p className="text-sm font-black">No items selected</p>
            <p className="text-[11px] font-bold text-gray-400 mt-1 text-center max-w-220px">
              Tap a menu item to add it here.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.menuItemID}
              className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-900 truncate">{item.name}</p>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">{money(item.price)}</p>
                  <p className="text-[11px] font-black text-gray-800 mt-2">
                    Line total:{' '}
                    <span className="text-gray-900">{money(Number(item.price) * item.quantity)}</span>
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => removeLine(item.menuItemID)}
                    className="rounded-xl px-2 py-1 text-[11px] font-black text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Remove item"
                  >
                    Remove
                  </button>

                  <div className="flex items-center gap-2 rounded-2xl border bg-white p-1 shadow-inner">
                    <button
                      onClick={() => removeFromCart(item.menuItemID)}
                      className="h-9 w-9 rounded-xl grid place-items-center text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                      aria-label="Decrease quantity"
                    >
                      <MdRemove />
                    </button>
                    <span className="w-7 text-center text-sm font-black text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      className="h-9 w-9 rounded-xl grid place-items-center text-gray-500 hover:text-green-700 hover:bg-green-50 transition"
                      aria-label="Increase quantity"
                    >
                      <MdAdd />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAYMENT */}
      <div className="p-5 bg-gray-50 border-t space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Payment Method
            </label>
            <span className="text-[10px] font-black text-gray-400">
              {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'gcash' ? 'GCash' : 'Bank'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: 'cash', label: 'Cash', icon: '💵' },
                { key: 'gcash', label: 'GCash', icon: '📱' },
                { key: 'bank', label: 'Bank', icon: '🏦' },
              ] as const
            ).map((m) => {
              const active = paymentMethod === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    setPaymentMethod(m.key);
                    setPaymentConfirmed(false);
                    if (m.key !== 'cash') setAmountPaidInput('');
                  }}
                  className={[
                    'rounded-2xl px-3 py-3 text-xs font-black transition border-2',
                    active
                      ? 'text-white shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300',
                  ].join(' ')}
                  style={active ? { backgroundColor: BRAND, borderColor: BRAND } : undefined}
                >
                  <span className="mr-1">{m.icon}</span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
              Total Due
            </span>
            <span className="text-2xl font-black text-gray-900">{money(cartTotal)}</span>
          </div>

          {paymentMethod === 'cash' ? (
            <>
              <div className="mt-4 space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Cash Received
                </label>

                {/* Stable caret: controlled string, no remount */}
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountPaidInput}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(next)) setAmountPaidInput(next);
                  }}
                  placeholder="0.00"
                  className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 font-black text-lg outline-none focus:ring-4 focus:ring-red-100"
                />

                <div className="grid grid-cols-3 gap-2">
                  {[50, 100, 200].map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        const base = amountPaidInput.trim() === '' ? 0 : Number(amountPaidInput);
                        const next = base + v;
                        setAmountPaidInput(next.toFixed(2));
                      }}
                      className="rounded-2xl bg-gray-100 hover:bg-gray-200 transition px-3 py-2 text-xs font-black text-gray-800"
                      disabled={cart.length === 0}
                      title={`Add ${money(v)}`}
                    >
                      +{money(v)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  Change
                </span>
                <span
                  className={[
                    'text-lg font-black',
                    amountPaidInput.trim() === '' ? 'text-gray-400' : changeDue < 0 ? 'text-red-600' : 'text-green-700',
                  ].join(' ')}
                >
                  {money(amountPaidInput.trim() === '' ? 0 : changeDue)}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-4 space-y-3">
              <div
                className="rounded-2xl border-2 p-4 text-center"
                style={{
                  backgroundColor: paymentMethod === 'gcash' ? '#EFF6FF' : '#F5F3FF',
                  borderColor: paymentMethod === 'gcash' ? '#BFDBFE' : '#DDD6FE',
                }}
              >
                <p
                  className="text-xs font-black mb-1"
                  style={{ color: paymentMethod === 'gcash' ? '#2563EB' : '#6D28D9' }}
                >
                  {paymentMethod === 'gcash' ? '📱 GCash Payment' : '🏦 Bank Transfer'}
                </p>
                <p className="text-[11px] font-bold text-gray-500">
                  Customer shows proof, then tick confirmation.
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-3 cursor-pointer hover:border-green-500 transition">
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="text-xs font-black text-gray-800">Payment received and verified</span>
              </label>
            </div>
          )}
        </div>

        <button
          onClick={handleCheckout}
          disabled={
            cart.length === 0 ||
            isSubmitting ||
            (paymentMethod === 'cash' ? amountPaid < cartTotal : !paymentConfirmed)
          }
          className={[
            'w-full rounded-2xl py-4 font-black shadow-lg transition-all',
            cart.length === 0 ||
            isSubmitting ||
            (paymentMethod === 'cash' ? amountPaid < cartTotal : !paymentConfirmed)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'text-white hover:brightness-95',
          ].join(' ')}
          style={
            cart.length === 0 ||
            isSubmitting ||
            (paymentMethod === 'cash' ? amountPaid < cartTotal : !paymentConfirmed)
              ? undefined
              : { backgroundColor: BRAND }
          }
        >
          {isSubmitting ? 'PROCESSING...' : 'CONFIRM & PAY'}
        </button>
      </div>
    </div>
  );
}

// -------------------- PAGE --------------------
export default function OrderPage() {
  const [collapsed, setCollapsed] = useState(false);
  const activeNav = 'Order';

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'All'>('All');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'name' | 'price_low' | 'price_high'>('popular');
  const [showCartMobile, setShowCartMobile] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);

  // ✅ stable cash typing: string state
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const amountPaid = useMemo(() => {
    const v = Number(amountPaidInput);
    return Number.isFinite(v) ? v : 0;
  }, [amountPaidInput]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('cash');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: '' });
  const popToast = (text: string) => {
    setToast({ show: true, text });
    window.clearTimeout((popToast as any)._t);
    (popToast as any)._t = window.setTimeout(() => setToast({ show: false, text: '' }), 1800);
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const changeDue = useMemo(() => {
    if (amountPaidInput.trim() === '') return 0;
    return amountPaid - cartTotal;
  }, [amountPaidInput, amountPaid, cartTotal]);

  // Fetch
  useEffect(() => {
    async function loadStoreData() {
      try {
        const { data: catData } = await supabase.from('Category').select('categoryID, categoryName');
        const { data: menuData, error: menuError } = await supabase
          .from('MenuItem')
          .select('*, Category (categoryName)')
          .eq('status', 'Active');

        if (menuError) throw menuError;
        if (catData) setCategories(catData);

        if (menuData) {
          setMenuItems(
            menuData.map((item: any) => ({
              ...item,
              categoryName: item.Category?.categoryName || 'Uncategorized',
            }))
          );
        }
      } catch (error) {
        console.error('Database Error:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStoreData();
  }, []);

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => window.clearTimeout(t);
  }, [search]);

  // Keyboard shortcut Ctrl/Cmd + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k';
      const meta = e.metaKey || e.ctrlKey;
      if (meta && isK) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') setShowCartMobile(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Cart actions
  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemID === item.menuItemID);
      if (existing) {
        return prev.map((i) =>
          i.menuItemID === item.menuItemID ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });

    popToast(`Added: ${item.name}`);
  };

  const removeFromCart = (menuItemID: number) => {
    setCart((prev) =>
      prev.reduce((acc, item) => {
        if (item.menuItemID === menuItemID) {
          if (item.quantity > 1) acc.push({ ...item, quantity: item.quantity - 1 });
        } else {
          acc.push(item);
        }
        return acc;
      }, [] as CartItem[])
    );
  };

  const removeLine = (menuItemID: number) => setCart((prev) => prev.filter((i) => i.menuItemID !== menuItemID));

  const clearCart = () => {
    setCart([]);
    setAmountPaidInput('');
    setPaymentMethod('cash');
    setPaymentConfirmed(false);
    popToast('Cart cleared');
  };

  const qtyInCart = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of cart) m.set(c.menuItemID, c.quantity);
    return m;
  }, [cart]);

  const filtered = useMemo(() => {
    let items = [...menuItems];

    if (selectedCategory !== 'All') items = items.filter((i) => i.categoryID === selectedCategory);

    if (debouncedSearch) {
      items = items.filter((i) => {
        const hay = `${i.name} ${i.categoryName || ''}`.toLowerCase();
        return hay.includes(debouncedSearch);
      });
    }

    if (sortBy === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'price_low') items.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === 'price_high') items.sort((a, b) => Number(b.price) - Number(a.price));

    return items;
  }, [menuItems, selectedCategory, debouncedSearch, sortBy]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // Check ingredient stock before placing order
    for (const item of cart) {
      const { data: recipeIngredients } = await supabase
        .from('MenuIngredient')
        .select('ingredientID, quantityRequired')
        .eq('menuItemID', item.menuItemID);

      if (!recipeIngredients || recipeIngredients.length === 0) {
        alert(`"${item.name}" has no ingredients and cannot be ordered.`);
        return;
      }

      for (const recipeIng of recipeIngredients) {
        const { data: ingredientData } = await supabase
          .from('Ingredient')
          .select('currentStock')
          .eq('ingredientID', recipeIng.ingredientID)
          .single();

        if (!ingredientData || ingredientData.currentStock < recipeIng.quantityRequired * item.quantity) {
          alert(
            `Not enough stock for "${item.name}". Required: ${recipeIng.quantityRequired * item.quantity}, Available: ${ingredientData?.currentStock ?? 0}`
          );
          return;
        }
      }
    }

    if (paymentMethod === 'cash' && amountPaid < cartTotal) {
      alert('Insufficient payment amount!');
      return;
    }

    if (paymentMethod !== 'cash' && !paymentConfirmed) {
      alert('Please confirm payment first!');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalAmountPaid = paymentMethod === 'cash' ? amountPaid : cartTotal;
      const finalChange = paymentMethod === 'cash' ? Math.max(0, changeDue) : 0;

      const { data: order, error: orderErr } = await supabase
        .from('Order')
        .insert([
          {
            amount: cartTotal,
            amountPaid: finalAmountPaid,
            change: finalChange,
            paymentmethod: paymentMethod,
          },
        ])
        .select()
        .single();

      if (orderErr) throw orderErr;

      const orderItems = cart.map((item) => ({
        orderID: order.orderID,
        menuItemID: item.menuItemID,
        quantity: item.quantity,
      }));

      const { error: itemErr } = await supabase.from('OrderItem').insert(orderItems);
      if (itemErr) throw itemErr;

      // --- Deduct inventory for recipes with multiple ingredients ---
      for (const item of cart) {
        // 1. Get all ingredients for this menu item (recipe)
        const { data: recipeIngredients, error: recipeErr } = await supabase
          .from('MenuIngredient')
          .select('ingredientID, quantityRequired')
          .eq('menuItemID', item.menuItemID);

        if (recipeErr || !recipeIngredients) continue;

        let anyOutOfStock = false;

        for (const recipeIng of recipeIngredients) {
          // 2. Deduct stock for each ingredient
          const { data: ingredientData, error: ingredientErr } = await supabase
            .from('Ingredient')
            .select('currentStock')
            .eq('ingredientID', recipeIng.ingredientID)
            .single();

          if (ingredientErr || !ingredientData) continue;

          const deductionQty = recipeIng.quantityRequired * item.quantity;
          const newStock = Math.max(0, ingredientData.currentStock - deductionQty);

          await supabase
            .from('Ingredient')
            .update({
              currentStock: newStock,
              isAvailable: newStock === 0 ? false : true,
            })
            .eq('ingredientID', recipeIng.ingredientID);

          if (newStock === 0) anyOutOfStock = true;
        }

        // 3. If any ingredient is out of stock, mark menu item as unavailable
        await supabase
          .from('MenuItem')
          .update({
            isAvailable: anyOutOfStock ? false : true,
          })
          .eq('menuItemID', item.menuItemID);
      }

      alert(
        `Order Successful! ${
          paymentMethod === 'cash' ? `Change: ${money(changeDue)}` : 'Payment confirmed'
        }`
      );

      clearCart();
      setShowCartMobile(false);
    } catch (err: any) {
      console.error('Checkout Error:', err);
      if (err?.message) alert(`Error: ${err.message}`);
      else if (err?.details) alert(`Error processing order: ${err.details}`);
      else alert('Error processing order. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function syncMenuAvailability() {
      // Fetch all menu items
      const { data: menuData } = await supabase.from('MenuItem').select('menuItemID');
      if (!menuData) return;

      for (const menu of menuData) {
        // Get all ingredients for this menu item
        const { data: recipeIngredients } = await supabase
          .from('MenuIngredient')
          .select('ingredientID, quantityRequired')
          .eq('menuItemID', menu.menuItemID);

        let anyOutOfStock = false;
        if (!recipeIngredients || recipeIngredients.length === 0) {
          anyOutOfStock = true;
        } else {
          for (const recipeIng of recipeIngredients) {
            const { data: ingredientData } = await supabase
              .from('Ingredient')
              .select('currentStock')
              .eq('ingredientID', recipeIng.ingredientID)
              .single();
            if (!ingredientData || ingredientData.currentStock < (recipeIng.quantityRequired ?? 1)) {
              anyOutOfStock = true;
              break;
            }
          }
        }
        await supabase
          .from('MenuItem')
          .update({ isAvailable: !anyOutOfStock })
          .eq('menuItemID', menu.menuItemID);
      }
    }
    syncMenuAvailability();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-black" style={{ color: BRAND }}>
        Loading TFK POS...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      <Toast show={toast.show} text={toast.text} onClose={() => setToast({ show: false, text: '' })} />

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

      <main className="flex flex-1 overflow-hidden">
        {/* LEFT: MENU */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Orders</h1>
                <p className="text-[12px] font-bold text-gray-500 mt-1">
                  Search fast, tap to add, and checkout smoothly.
                </p>
              </div>

              <button
                onClick={() => setShowCartMobile(true)}
                className="lg:hidden rounded-2xl px-4 py-3 font-black text-sm text-white shadow-lg flex items-center gap-2"
                style={{ backgroundColor: BRAND }}
              >
                <MdShoppingCart />
                Cart
                <span className="ml-1 rounded-xl bg-white/15 px-2 py-1 text-[11px]">{cartCount}</span>
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <div className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-3 focus-within:ring-4 focus-within:ring-red-100">
                  <MdSearch className="text-gray-400 text-xl" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search menu (Ctrl/Cmd + K)"
                    className="w-full outline-none font-bold text-sm text-gray-800 placeholder:text-gray-400"
                  />
                  {search.trim() && (
                    <button
                      onClick={() => setSearch('')}
                      className="rounded-xl px-2 py-1 text-gray-500 hover:bg-gray-100 transition"
                      aria-label="Clear search"
                    >
                      <MdClose />
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-3">
                  <MdTune className="text-gray-400 text-xl" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full outline-none font-black text-sm text-gray-800 bg-transparent"
                  >
                    <option value="popular">Recommended</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="price_low">Price (Low)</option>
                    <option value="price_high">Price (High)</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-3 h-full flex items-center justify-between">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Results</span>
                  <span className="text-sm font-black text-gray-900">{filtered.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('All')}
                className={[
                  'px-5 py-2 rounded-2xl text-xs font-black transition border-2',
                  selectedCategory === 'All'
                    ? 'text-white shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                ].join(' ')}
                style={selectedCategory === 'All' ? { backgroundColor: BRAND, borderColor: BRAND } : {}}
              >
                All
              </button>

              {categories.map((cat) => {
                const active = selectedCategory === cat.categoryID;
                return (
                  <button
                    key={cat.categoryID}
                    onClick={() => setSelectedCategory(cat.categoryID)}
                    className={[
                      'px-5 py-2 rounded-2xl text-xs font-black transition border-2 whitespace-nowrap',
                      active
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                    ].join(' ')}
                    style={active ? { backgroundColor: BRAND, borderColor: BRAND } : {}}
                  >
                    {cat.categoryName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-28 lg:pb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((item) => {
                const inCart = qtyInCart.get(item.menuItemID) || 0;

                return (
                  <button
                    key={item.menuItemID}
                    onClick={() => addToCart(item)}
                    disabled={!item.isAvailable}
                    className={[
                      'group relative flex flex-col rounded-2xl bg-white border shadow-sm overflow-hidden text-left transition',
                      'hover:-translate-y-[2px hover:shadow-lg',
                      item.isAvailable ? 'border-gray-100' : 'border-gray-100 opacity-55 grayscale',
                    ].join(' ')}
                  >
                    <div className="h-32 w-full bg-gray-100 overflow-hidden relative">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center">
                          <div className="h-12 w-12 rounded-2xl bg-white/70 grid place-items-center border border-white/60">
                            <MdRestaurantMenu className="text-2xl text-gray-400" />
                          </div>
                        </div>
                      )}

                      <div className="absolute top-3 left-3">
                        <span
                          className={[
                            'text-[10px] font-black px-3 py-1 rounded-2xl border',
                            item.isAvailable
                              ? 'bg-white/90 text-gray-800 border-white/60'
                              : 'bg-gray-900/80 text-white border-white/10',
                          ].join(' ')}
                        >
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </div>

                      {inCart > 0 && (
                        <div className="absolute top-3 right-3">
                          <span
                            className="text-[10px] font-black px-3 py-1 rounded-2xl text-white shadow-md"
                            style={{ backgroundColor: BRAND }}
                          >
                            {inCart} in cart
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND }}>
                        {item.categoryName}
                      </p>
                      <h3 className="text-sm font-black text-gray-900 mt-1 line-clamp-1">{item.name}</h3>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-lg font-black text-gray-900">{money(Number(item.price))}</span>

                        {/* + button never disappears */}
                        <div className="h-11 w-11 rounded-2xl grid place-items-center border-2 bg-gray-50 border-gray-100 transition">
                          <div
                            className="h-11 w-11 rounded-2xl grid place-items-center transition-colors"
                            style={{ backgroundColor: item.isAvailable ? (inCart > 0 ? `${BRAND}12` : 'transparent') : 'transparent' }}
                          >
                            <MdAdd
                              className="text-xl transition-colors"
                              style={{ color: item.isAvailable ? (inCart > 0 ? BRAND : '#111827') : '#9CA3AF' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition"
                      style={{ boxShadow: `inset 0 0 0 2px ${BRAND}` }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white/90 backdrop-blur">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                <p className="text-lg font-black text-gray-900 truncate">{money(cartTotal)}</p>
              </div>

              <button
                onClick={() => setShowCartMobile(true)}
                className="rounded-2xl px-4 py-3 font-black text-sm text-white shadow-lg flex items-center gap-2"
                style={{ backgroundColor: BRAND }}
              >
                <MdShoppingCart />
                View Cart
                <span className="ml-1 rounded-xl bg-white/15 px-2 py-1 text-[11px]">{cartCount}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: CART (Desktop) */}
        <div className="hidden lg:block w-420px border-l shadow-2xl z-10">
          <CartPanel
            cart={cart}
            cartCount={cartCount}
            cartTotal={cartTotal}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            paymentConfirmed={paymentConfirmed}
            setPaymentConfirmed={setPaymentConfirmed}
            isSubmitting={isSubmitting}
            handleCheckout={handleCheckout}
            clearCart={clearCart}
            removeLine={removeLine}
            removeFromCart={removeFromCart}
            addToCart={addToCart}
            setShowCartMobile={setShowCartMobile}
            amountPaidInput={amountPaidInput}
            setAmountPaidInput={setAmountPaidInput}
            amountPaid={amountPaid}
            changeDue={changeDue}
          />
        </div>

        {/* Mobile cart drawer */}
        {showCartMobile && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCartMobile(false)} />
            <div className="absolute right-0 top-0 h-full w-[92%] max-w-420px shadow-2xl">
              <CartPanel
                compact
                cart={cart}
                cartCount={cartCount}
                cartTotal={cartTotal}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                paymentConfirmed={paymentConfirmed}
                setPaymentConfirmed={setPaymentConfirmed}
                isSubmitting={isSubmitting}
                handleCheckout={handleCheckout}
                clearCart={clearCart}
                removeLine={removeLine}
                removeFromCart={removeFromCart}
                addToCart={addToCart}
                setShowCartMobile={setShowCartMobile}
                amountPaidInput={amountPaidInput}
                setAmountPaidInput={setAmountPaidInput}
                amountPaid={amountPaid}
                changeDue={changeDue}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
