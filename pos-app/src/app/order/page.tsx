'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { supabase } from '../lib/supabaseClient';
import { MdAdd, MdRemove, MdShoppingCart, MdReceipt, MdRestaurantMenu } from 'react-icons/md';

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

export default function OrderPage() {
  // 1. Sidebar & UI State
  const [collapsed, setCollapsed] = useState(false);
  const activeNav = 'Order';

  // 2. Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'All'>('All');
  const [loading, setLoading] = useState(true);

  // 3. Order & Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 4. DERIVED CALCULATIONS (Order matters here!)
  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const changeDue = amountPaid > 0 ? amountPaid - cartTotal : 0;

  // 5. FETCH DATA
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
          setMenuItems(menuData.map((item: any) => ({
            ...item,
            categoryName: item.Category?.categoryName || 'Uncategorized'
          })));
        }
      } catch (error) {
        console.error("Database Error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStoreData();
  }, []);

  // 6. CART ACTIONS
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemID === item.menuItemID);
      if (existing) {
        return prev.map(i => i.menuItemID === item.menuItemID 
          ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemID: number) => {
    setCart(prev => prev.reduce((acc, item) => {
      if (item.menuItemID === menuItemID) {
        if (item.quantity > 1) acc.push({ ...item, quantity: item.quantity - 1 });
      } else {
        acc.push(item);
      }
      return acc;
    }, [] as CartItem[]));
  };

  // 7. CHECKOUT LOGIC
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (amountPaid < cartTotal) {
      alert("Insufficient payment amount!");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create Order (Matches: amount, amountPaid, change)
      const { data: order, error: orderErr } = await supabase
        .from('Order')
        .insert([{ 
            amount: cartTotal, 
            amountPaid: amountPaid,
            change: changeDue
        }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Create OrderItems (Matches: orderID, menuItemID, quantity)
      const orderItems = cart.map(item => ({
        orderID: order.orderID,
        menuItemID: item.menuItemID,
        quantity: item.quantity
      }));

      const { error: itemErr } = await supabase.from('OrderItem').insert(orderItems);
      if (itemErr) throw itemErr;

      alert(`Order Successful! Change: ₱${changeDue.toFixed(2)}`);
      setCart([]);
      setAmountPaid(0);
    } catch (err) {
      console.error("Checkout Error:", err);
      alert("Error processing order. Check ingredients/inventory stock.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-[#B80F24]">Loading TFK POS...</div>;

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

      <main className="flex flex-1 overflow-hidden">
        {/* MENU SECTION */}
        <div className="flex flex-1 flex-col p-6 overflow-y-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Orders</h1>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button 
                onClick={() => setSelectedCategory('All')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategory === 'All' ? 'bg-[#B80F24] text-white' : 'bg-white text-gray-500'}`}
              >All</button>
              {categories.map(cat => (
                <button 
                  key={cat.categoryID}
                  onClick={() => setSelectedCategory(cat.categoryID)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedCategory === cat.categoryID ? 'bg-[#B80F24] text-white' : 'bg-white text-gray-500'}`}
                >
                  {cat.categoryName}
                </button>
              ))}
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {menuItems
              .filter(item => selectedCategory === 'All' || item.categoryID === selectedCategory)
              .map((item) => (
                <button
                  key={item.menuItemID}
                  onClick={() => addToCart(item)}
                  disabled={!item.isAvailable}
                  className={`group flex flex-col bg-white rounded-2xl shadow-sm border-2 transition-all ${!item.isAvailable ? 'opacity-50 grayscale' : 'hover:border-[#B80F24] border-transparent'}`}
                >
                  <div className="h-32 w-full bg-gray-100 rounded-t-2xl overflow-hidden relative">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300"><MdRestaurantMenu size={40}/></div>}
                  </div>
                  <div className="p-4 text-left">
                    <p className="text-[10px] font-black text-[#B80F24] uppercase tracking-widest">{item.categoryName}</p>
                    <h3 className="text-sm font-extrabold text-gray-800 mt-1 line-clamp-1">{item.name}</h3>
                    <div className="mt-3 flex items-center justify-between">
                       <span className="text-lg font-black text-gray-900">₱{Number(item.price).toFixed(2)}</span>
                       <div className="p-1 bg-gray-50 rounded-lg group-hover:bg-[#B80F24] group-hover:text-white transition-colors"><MdAdd /></div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* CART SIDEBAR */}
        <div className="w-96 bg-white border-l flex flex-col shadow-2xl z-10">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2 tracking-tight"><MdShoppingCart className="text-[#B80F24]"/> Order Details</h2>
            <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-md">{cart.length} ITEMS</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 italic">
                <MdReceipt size={48} className="mb-2 opacity-20"/>
                <p className="text-sm font-bold">No items selected</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.menuItemID} className="flex items-center justify-between bg-[#FDFDFD] border border-gray-100 p-3 rounded-xl shadow-sm">
                  <div className="flex-1">
                    <p className="text-xs font-black text-gray-800">{item.name}</p>
                    <p className="text-[10px] font-bold text-gray-400">₱{Number(item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-white border rounded-xl p-1 shadow-inner">
                    <button onClick={() => removeFromCart(item.menuItemID)} className="p-1 text-gray-400 hover:text-red-500"><MdRemove /></button>
                    <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                    <button onClick={() => addToCart(item)} className="p-1 text-gray-400 hover:text-green-500"><MdAdd /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PAYMENT SECTION */}
          <div className="p-6 bg-gray-50 border-t space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                <span>TOTAL DUE</span>
                <span className="text-xl font-black text-gray-900">₱{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Cash Received</label>
                <input 
                  type="number"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-[#B80F24] outline-none font-bold text-lg"
                />
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-500">CHANGE</span>
                <span className={`text-lg font-black ${changeDue < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  ₱{changeDue.toFixed(2)}
                </span>
              </div>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting || amountPaid < cartTotal}
              className="w-full bg-[#B80F24] text-white py-4 rounded-2xl font-black shadow-lg hover:bg-red-700 transition-all disabled:bg-gray-200"
            >
              {isSubmitting ? 'PROCESSING...' : 'CONFIRM & PAY'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}