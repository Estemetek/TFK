'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { logout } from '../lib/auth';
import {
  MdDashboard, MdRestaurantMenu, MdPeople, MdInventory2,
  MdAssessment, MdShoppingCart, MdLogout, MdMenu,
  MdClose, MdChevronLeft, MdChevronRight, MdWarning
} from 'react-icons/md';

// --- Types ---
type UserRole = 'Manager' | 'Staff';
type Metric = { label: string; value: string; note: string; icon: React.ReactNode; accentVar?: string; };
type Dish = { id: string; name: string; subtitle: string; status: 'In Stock' | 'Out of stock'; price: string; };
type NavItem = { name: string; path?: string; };

// --- Helpers ---
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <MdDashboard className="h-5 w-5" />,
  Menu: <MdRestaurantMenu className="h-5 w-5" />,
  'User Management': <MdPeople className="h-5 w-5" />,
  Inventory: <MdInventory2 className="h-5 w-5" />,
  Reports: <MdAssessment className="h-5 w-5" />,
  Order: <MdShoppingCart className="h-5 w-5" />,
};

// --- Sub-components ---
const SparkBars = ({ values, accentVar = '--primary' }: { values: number[]; accentVar?: string }) => (
  <div className="flex h-12 items-end gap-1">
    {values.map((v, idx) => (
      <div key={idx} className="w-2.5 rounded-md" style={{ height: `${v}%`, background: `color-mix(in oklab, var(${accentVar}) 85%, white 15%)`, opacity: 0.95 }} />
    ))}
  </div>
);

const DishRow = ({ dish }: { dish: Dish }) => (
  <div className="group flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-card-border transition hover:-translate-y-0.5">
    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-card ring-1 ring-card-border">
      <div className="h-12 w-12 rounded-xl bg-linear-to-br from-primary/70 via-primary-dark/50 to-surface-dark" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-foreground">{dish.name}</p>
      <p className="truncate text-xs text-text-muted">{dish.subtitle}</p>
    </div>
    <div className="flex flex-col items-end gap-1 text-right">
       <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full ring-1', dish.status === 'In Stock' ? 'bg-green-50 text-green-600 ring-green-200' : 'bg-red-50 text-red-600 ring-red-200')}>
        {dish.status}
      </span>
      <span className="text-sm font-semibold text-foreground/80">{dish.price}</span>
    </div>
  </div>
);

const LowStockRow = ({ item }: { item: { name: string; stock: number; level: number; unit: string } }) => (
  <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-card-border">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500">
      <MdWarning size={20} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
      <p className="text-[10px] text-text-muted">Threshold: {item.level} {item.unit}</p>
    </div>
    <div className="text-right">
      <p className="text-sm font-black text-red-600">{item.stock} {item.unit}</p>
    </div>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  // Database States
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [popularDishes, setPopularDishes] = useState<Dish[]>([]);
  const [recentOrders, setRecentOrders] = useState<Dish[]>([]);
  const [lowStockIngredients, setLowStockIngredients] = useState<any[]>([]);

  const activeNav = useMemo(() => {
    const all = [
      { name: 'Dashboard', path: '/dashboard' }, { name: 'Menu', path: '/menu' },
      { name: 'User Management', path: '/staff' }, { name: 'Inventory', path: '/inventory' },
      { name: 'Reports', path: '/reports' }, { name: 'Order', path: '/order' }
    ];
    return all.find((x) => x.path === pathname)?.name ?? 'Dashboard';
  }, [pathname]);

  const handleLogout = async () => { await logout(); };

  const fetchDashboardData = async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const { data: orders } = await supabase.from('Order').select('amount').gte('createdAt', today.toISOString());
      const dailyTotal = orders?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      const { data: ingredients } = await supabase.from('Ingredient').select('name, currentStock, reorderLevel, unit');
      const lowItems = ingredients?.filter(i => Number(i.currentStock) <= Number(i.reorderLevel)) || [];

      const { data: items } = await supabase.from('MenuItem').select(`menuItemID, name, price, isAvailable, Category(categoryName)`).limit(4);
      const { data: transactions } = await supabase.from('Order').select('*').order('createdAt', { ascending: false }).limit(4);

      setMetrics([
        { label: 'Daily Sales', value: `₱${dailyTotal.toLocaleString()}`, note: 'Current Today', icon: <span>₱</span>, accentVar: '--primary' },
        { label: 'Low Stock', value: `${lowItems.length} Items`, note: 'Action Required', icon: <MdWarning />, accentVar: '--accent-red' },
        { label: 'Orders Today', value: (orders?.length || 0).toString(), note: 'Live Traffic', icon: <span>▣</span>, accentVar: '--accent-green' },
        { label: 'System status', value: 'Live', note: 'Connected', icon: <span>👤</span>, accentVar: '--accent-gold' },
      ]);

      setLowStockIngredients(lowItems.slice(0, 4));
      setPopularDishes(items?.map(i => ({
        id: i.menuItemID.toString(),
        name: i.name,
        subtitle: (i.Category as any)?.categoryName || 'Menu Item',
        status: i.isAvailable ? 'In Stock' : 'Out of stock',
        price: `₱${Number(i.price).toFixed(2)}`
      })) || []);

      setRecentOrders(transactions?.map(t => ({
        id: t.orderID.toString(),
        name: `Order #${t.orderID}`,
        subtitle: t.paymentmethod || 'Walk-in',
        status: 'In Stock',
        price: `₱${Number(t.amount).toFixed(2)}`
      })) || []);
    } catch (err) { console.error("Fetch Error:", err); }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: profile } = await supabase.from('UsersAccount').select('Role(roleName)').eq('userID', user.id).single();
      const role = (profile?.Role as any)?.roleName as UserRole || 'Staff';
      setUserRole(role);

      const all = [
        { name: 'Dashboard', path: '/dashboard' }, { name: 'Menu', path: '/menu' },
        { name: 'User Management', path: '/staff' }, { name: 'Inventory', path: '/inventory' },
        { name: 'Reports', path: '/reports' }, { name: 'Order', path: '/order' }
      ];
      const allowed = role === 'Manager' ? ['Dashboard', 'Menu', 'User Management', 'Inventory', 'Reports', 'Order'] : ['Dashboard', 'Menu', 'Inventory', 'Order'];
      setNavItems(all.filter(n => allowed.includes(n.name)));

      await fetchDashboardData();
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) return <div className="h-screen grid place-items-center text-primary font-bold animate-pulse">Connecting to TFK System...</div>;

  // --- REUSABLE SIDEBAR COMPONENT ---
  const Sidebar = ({ isMobile = false }: { isMobile?: boolean }) => {
    // On mobile, we never want it collapsed.
    const isCollapsed = isMobile ? false : collapsed;

    return (
      <aside className={cn(
        "flex h-full flex-col items-stretch gap-4 bg-surface px-3 py-5 shadow-md",
        !isMobile && "rounded-r-2xl"
      )}>
        <div className="mb-2 flex items-center gap-3 px-2">
          <img src="/TFK.png" alt="TFK Logo" className="h-12 w-12 rounded-full shadow" />
          {!isCollapsed && (
            <span className="text-sm font-semibold text-foreground">
              Taiwan Fried Kitchen
            </span>
          )}
        </div>

        <nav className={cn("flex w-full flex-col gap-2", isCollapsed ? 'items-center' : '')}>
          {navItems.map((item) => {
            const isActive = item.name === activeNav;
            return (
              <button
                key={item.name}
                onClick={() => {
                  if (item.path) router.push(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                className={cn(
                  "flex items-center rounded-xl ring-1 ring-card-border transition hover:-translate-y-0.5 hover:shadow",
                  isCollapsed 
                    ? 'h-14 w-14 self-center bg-card justify-center' 
                    : 'h-12 w-full bg-card px-2 gap-3'
                )}
              >
                <span className={cn(
                  "grid h-10 w-10 place-items-center rounded-full shadow-inner",
                  isActive ? 'bg-primary text-white' : 'bg-white text-text-muted'
                )}>
                  {iconMap[item.name]}
                </span>
                {!isCollapsed && (
                  <span className={cn("text-xs font-semibold", isActive ? 'text-foreground' : 'text-text-muted')}>
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={cn("mt-auto", isCollapsed ? '' : 'px-2')}>
          <button
            onClick={handleLogout}
            className={cn(
              "ring-1 ring-card-border transition hover:shadow",
              isCollapsed
                ? 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-dark text-white'
                : 'flex w-full items-center gap-3 rounded-xl bg-card px-2 py-2'
            )}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-text-muted shadow-inner">
              <MdLogout className="h-5 w-5" />
            </span>
            {!isCollapsed && (
              <span className="text-xs font-semibold text-text-muted">Logout</span>
            )}
          </button>
        </div>
      </aside>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      
      {/* Mobile Sidebar */}
      <div className={cn(
        'fixed left-0 top-0 z-50 h-screen w-72 transition-transform duration-300 lg:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar isMobile />
      </div>

      {/* Desktop Sidebar Container */}
      <div className="hidden lg:block">
        <div className={cn('h-screen transition-all duration-300', collapsed ? 'w-24' : 'w-64')}>
          <Sidebar />
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex justify-between items-center bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-card-border">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 bg-card rounded-lg border border-card-border">
              <MdMenu />
            </button>
            <h1 className="text-xl font-black tracking-tight">Dashboard Overview</h1>
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="hidden lg:flex h-9 w-9 items-center justify-center bg-white border border-card-border rounded-full shadow-sm hover:bg-slate-50 transition-all"
          >
            {collapsed ? <MdChevronRight /> : <MdChevronLeft />}
          </button>
        </header>

        {/* METRICS */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-card p-5 rounded-2xl border border-card-border shadow-sm">
              <div className="flex justify-between text-text-muted text-[10px] font-bold uppercase tracking-widest mb-2">
                {m.label} <div className="text-primary">{m.icon}</div>
              </div>
              <div className="text-3xl font-black">{m.value}</div>
              <div className="text-[10px] opacity-60 mt-1">{m.note}</div>
              <div className="mt-4"><SparkBars values={[30, 60, 45, 80, 50, 90, 70]} accentVar={m.accentVar} /></div>
            </div>
          ))}
        </section>

        {/* DATA LISTS */}
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="space-y-4">
            <h3 className="font-black text-xs text-text-muted uppercase tracking-widest">Trending Items</h3>
            {popularDishes.length > 0 ? popularDishes.map(d => <DishRow key={d.id} dish={d} />) : <div className="p-8 text-center text-xs opacity-50">No Menu Data</div>}
          </section>

          <section className="space-y-4">
            <h3 className="font-black text-xs text-text-muted uppercase tracking-widest">Recent Sales</h3>
            {recentOrders.length > 0 ? recentOrders.map(d => <DishRow key={d.id} dish={d} />) : <div className="p-8 text-center text-xs opacity-50">No Recent Orders</div>}
          </section>

          <section className="space-y-4">
            <h3 className="font-black text-xs text-red-500 uppercase tracking-widest flex items-center gap-2">
              <MdWarning /> Stock Alerts
            </h3>
            {lowStockIngredients.length > 0 ? (
              lowStockIngredients.map((ing, idx) => (
                <LowStockRow key={idx} item={{ name: ing.name, stock: Number(ing.currentStock), level: Number(ing.reorderLevel), unit: ing.unit }} />
              ))
            ) : (
              <div className="p-10 text-center bg-green-50/50 border-dashed border-2 border-green-200 rounded-2xl text-green-600 text-[10px] font-bold uppercase">
                Inventory Healthy
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}