//dashboard
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { logout } from '../lib/auth';
import { MdDashboard, MdRestaurantMenu, MdPeople, MdInventory2, MdAssessment, MdShoppingCart, MdLogout } from 'react-icons/md';

type Metric = {
  label: string;
  value: string;
  note: string;
  icon: string;
  accent?: string;
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

type UserRole = 'Manager' | 'Staff';

const SparkBars = ({ values, color }: { values: number[]; color: string }) => (
  <div className="flex h-12 items-end gap-1">
    {values.map((v, idx) => (
      <div
        key={`${v}-${idx}`}
        className="w-2 rounded-sm"
        style={{ height: `${v}%`, backgroundColor: color }}
      />
    ))}
  </div>
);

const StatusPill = ({ status }: { status: Dish['status'] }) => (
  <span
    className={`text-sm font-semibold ${status === 'In Stock' ? 'text-accent-green' : 'text-accent-red'}`}
  >
    {status}
  </span>
);

const DishRow = ({ dish }: { dish: Dish }) => (
  <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-3 shadow-sm ring-1 ring-card-border">
    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-card ring-1 ring-card-border">
      <div className="h-12 w-12 rounded-lg bg-linear-to-br from-primary/70 via-primary-dark/50 to-surface-dark" />
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-foreground">{dish.name}</p>
      <p className="text-xs text-text-muted">{dish.subtitle}</p>
    </div>
    <div className="flex flex-col items-end">
      <StatusPill status={dish.status} />
      <span className="text-sm font-semibold text-text-muted">{dish.price}</span>
    </div>
  </div>
);

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <MdDashboard className="h-5 w-5" />,
  Menu: <MdRestaurantMenu className="h-5 w-5" />,
  'User Management': <MdPeople className="h-5 w-5" />,
  Inventory: <MdInventory2 className="h-5 w-5" />,
  Reports: <MdAssessment className="h-5 w-5" />,
  Order: <MdShoppingCart className="h-5 w-5" />,
};

const allNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Menu', path: '/menu' },
  { name: 'User Management', path: '/staff' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Reports', path: '/reports' },
  { name: 'Order', path: '/order' },
];

// Define role-based access
const roleBasedNav: Record<UserRole, string[]> = {
  Manager: ['Dashboard', 'Menu', 'User Management', 'Inventory', 'Reports', 'Order'],
  Staff: ['Dashboard', 'Menu', 'Inventory', 'Order'],
};

// Function to filter nav items based on role
const getNavItemsByRole = (role: UserRole): NavItem[] => {
  const allowedNames = roleBasedNav[role] || [];
  return allNavItems.filter(item => allowedNames.includes(item.name));
};

export default function DashboardPage() {
  // Sidebar collapse/expand state
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const activeNav = 'Dashboard';

  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.replace('/login');
          return;
        }

        console.log("Checking database for UID:", user.id);

        // Simplified query to check if the user exists first
        const { data, error } = await supabase
          .from('UsersAccount')
          .select(`
            roleID,
            Role (
              roleName
            )
          `)
          .eq('userID', user.id)
          .maybeSingle(); // maybeSingle() returns null instead of an error if not found

        if (error) {
          console.error('Database error:', error);
          return; 
        }

        if (!data) {
          // THIS IS THE KEY: If the user exists in Auth but not in your table
          console.error('User found in Auth but no profile exists in UsersAccount table.');
          alert("Account error: Your user profile was not found in the database.");
          // Do NOT redirect to login automatically here, or you'll loop.
          return;
        }

        // Extract role name
        const roleName = (data.Role as any)?.roleName as UserRole || 'Staff';
        
        console.log('User role fetched:', roleName);
        setUserRole(roleName);
        setNavItems(getNavItemsByRole(roleName));
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [router]);

  // Protect routes from unauthorized access (only after role is fully loaded)
  useEffect(() => {
    if (loading || !userRole || navItems.length === 0) return; // Wait until role and nav are ready

    const currentPath = window.location.pathname || '/dashboard';
    const allowedPaths = navItems.map(item => item.path).filter(Boolean) as string[];

    // Allow navigation if current path is in the allowed list
    if (allowedPaths.includes(currentPath)) return;

    // Otherwise, block and redirect
    if (currentPath !== '/dashboard') {
      console.warn(`❌ Unauthorized access attempt to ${currentPath} by ${userRole}`);
      alert(`⛔ Access Denied!\n\nYou (${userRole}) cannot access this page.`);
      router.replace('/dashboard');
    }
  }, [userRole, loading, router, navItems]);

  const handleNavClick = (path?: string) => {
    if (!path || !userRole) return;

    // Check if user has access to this page via allowed nav items
    const allowedPaths = navItems.map(item => item.path);
    const hasAccess = allowedPaths.includes(path);

    if (!hasAccess) {
      alert(`⛔ Access Denied!\n\nYou (${userRole}) cannot access this page.`);
      return; // Don't navigate
    }

    // Page is allowed, navigate without warning
    console.log(`✅ ${userRole} accessing ${path}`);
    router.push(path);
  };

  const handleLogout = async () => {
    // Use unified logout function to ensure clean session clearing
    await logout();
  };

  const metrics: Metric[] = [
    {
      label: 'Daily Sales',
      value: '$2k',
      note: '9 February 2024',
      icon: '$',
      accent: 'var(--primary)',
    },
    {
      label: 'Monthly Revenue',
      value: '$55k',
      note: '1 Jan - 1 Feb',
      icon: '⎔',
      accent: 'var(--surface-dark)',
    },
    {
      label: 'Table Occupancy',
      value: '25 Tables',
      note: 'Active floor',
      icon: '▣',
      accent: 'var(--accent-green)',
    },
    {
      label: 'Registered Users',
      value: '128',
      note: 'Static demo',
      icon: '👤',
      accent: 'var(--accent-gold)',
    },
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        }`}
      >
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
                  onClick={() => handleNavClick(item.path)}
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

        <main className="space-y-5 p-5 md:p-7">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-card-border">
            <div className="flex items-center gap-3">
              {/* Toggle button beside Dashboard */}
              <button
                aria-label="Toggle sidebar"
                onClick={() => setCollapsed((c) => !c)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white text-foreground ring-1 ring-card-border transition hover:bg-card"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? '›' : '‹'}
              </button>
              <div className="h-12 w-12 rounded-full bg-white shadow ring-1 ring-card-border" />
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Dashboard</p>
                <p className="text-lg font-semibold text-foreground">POS Dashboard</p>
              </div>
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

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-card-border"
              >
                <div className="mb-3 flex items-center justify-between text-sm text-text-muted">
                  <span>{metric.label}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary ring-1 ring-card-border">
                    {metric.icon}
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-text-muted">{metric.note}</p>
                <div className="mt-4">
                  <SparkBars values={[20, 35, 25, 45, 30, 50, 40]} color={metric.accent || 'var(--primary)'} />
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-card-border">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Popular Dishes</h2>
                <button className="text-sm font-semibold text-primary hover:underline">See All</button>
              </div>
              <div className="flex flex-col gap-3">
                {dishesLeft.map((dish) => (
                  <DishRow key={dish.id} dish={dish} />
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-card-border">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Popular Dishes</h2>
                <button className="text-sm font-semibold text-primary hover:underline">See All</button>
              </div>
              <div className="flex flex-col gap-3">
                {dishesRight.map((dish) => (
                  <DishRow key={dish.id} dish={dish} />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-card-border">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-foreground">Overview</p>
                <p className="text-sm text-text-muted">Sales & Revenue</p>
              </div>
              <div className="flex items-center gap-2">
                {['Monthly', 'Daily', 'Weekly'].map((tab, idx) => (
                  <button
                    key={tab}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-card-border ${
                      idx === 0
                        ? 'bg-primary text-white shadow'
                        : 'bg-white text-text-muted'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary ring-1 ring-card-border">
                  Export
                  <span>⤓</span>
                </button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-linear-to-b from-white to-background px-4 py-6 ring-1 ring-card-border">
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#dcdcdc 1px, transparent 1px), linear-gradient(90deg, #dcdcdc 1px, transparent 1px)', backgroundSize: '100% 25%, 8% 100%' }} />
              <div className="relative flex items-end gap-3">
                {[60, 80, 50, 70, 65, 78, 55, 62, 58, 65, 52, 85].map((value, idx) => (
                  <div key={idx} className="flex flex-1 items-end justify-center">
                    <div className="w-3 rounded-full bg-primary/90 shadow" style={{ height: `${value}%` }} />
                  </div>
                ))}
              </div>
              <div className="relative mt-4 flex justify-between text-xs text-text-muted">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
