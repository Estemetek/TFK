'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  MdMenu,
  MdClose,
  MdFileDownload,
  MdChevronLeft,
  MdChevronRight,
} from 'react-icons/md';

type Metric = {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  accentVar?: string; // css var name, e.g. --primary
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

const allNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Menu', path: '/menu' },
  { name: 'User Management', path: '/staff' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Reports', path: '/reports' },
  { name: 'Order', path: '/order' },
];

const roleBasedNav: Record<UserRole, string[]> = {
  Manager: ['Dashboard', 'Menu', 'User Management', 'Inventory', 'Reports', 'Order'],
  Staff: ['Dashboard', 'Menu', 'Inventory', 'Order'],
};

const getNavItemsByRole = (role: UserRole): NavItem[] => {
  const allowedNames = roleBasedNav[role] || [];
  return allNavItems.filter((item) => allowedNames.includes(item.name));
};

const SparkBars = ({ values, accentVar = '--primary' }: { values: number[]; accentVar?: string }) => {
  return (
    <div className="flex h-12 items-end gap-1">
      {values.map((v, idx) => (
        <div
          key={`${v}-${idx}`}
          className="w-2.5 rounded-md"
          style={{
            height: `${v}%`,
            background: `color-mix(in oklab, var(${accentVar}) 85%, white 15%)`,
            opacity: 0.95,
          }}
        />
      ))}
    </div>
  );
};

const StatusPill = ({ status }: { status: Dish['status'] }) => {
  const isIn = status === 'In Stock';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        isIn
          ? 'bg-accent-green/10 text-accent-green ring-accent-green/25'
          : 'bg-accent-red/10 text-accent-red ring-accent-red/25'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', isIn ? 'bg-accent-green' : 'bg-accent-red')} />
      {status}
    </span>
  );
};

const DishRow = ({ dish }: { dish: Dish }) => {
  return (
    <div className="group flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-card-border transition hover:-translate-y-0.5 hover:shadow-md focus-within:shadow-md">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-card ring-1 ring-card-border">
        <div className="h-12 w-12 rounded-xl bg-linear-to-br from-primary/70 via-primary-dark/50 to-surface-dark" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{dish.name}</p>
        <p className="truncate text-xs text-text-muted">{dish.subtitle}</p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <StatusPill status={dish.status} />
        <span className="text-sm font-semibold text-foreground/80">{dish.price}</span>
      </div>
    </div>
  );
};

const CardShell = ({
  title,
  right,
  children,
  className,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn('rounded-2xl bg-card p-4 shadow-sm ring-1 ring-card-border', className)}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {right}
    </div>
    {children}
  </section>
);

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false); // desktop collapse
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);

  const activeNav = useMemo(() => {
    const hit = allNavItems.find((x) => x.path === pathname);
    return hit?.name ?? 'Dashboard';
  }, [pathname]);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace('/login');
          return;
        }

        const { data, error } = await supabase
          .from('UsersAccount')
          .select(
            `
            roleID,
            Role (
              roleName
            )
          `
          )
          .eq('userID', user.id)
          .maybeSingle();

        if (error) {
          console.error('Database error:', error);
          return;
        }

        if (!data) {
          console.error('User found in Auth but no profile exists in UsersAccount table.');
          alert('Account error: Your user profile was not found in the database.');
          return;
        }

        const roleName = ((data.Role as any)?.roleName as UserRole) || 'Staff';
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

  // Protect routes
  useEffect(() => {
    if (loading || !userRole || navItems.length === 0) return;

    const currentPath = window.location.pathname || '/dashboard';
    const allowedPaths = navItems.map((item) => item.path).filter(Boolean) as string[];

    if (allowedPaths.includes(currentPath)) return;

    if (currentPath !== '/dashboard') {
      alert(`⛔ Access Denied!\n\nYou (${userRole}) cannot access this page.`);
      router.replace('/dashboard');
    }
  }, [userRole, loading, router, navItems]);

  const handleNavClick = (path?: string) => {
    if (!path || !userRole) return;

    const allowedPaths = navItems.map((item) => item.path);
    const hasAccess = allowedPaths.includes(path);

    if (!hasAccess) {
      alert(`⛔ Access Denied!\n\nYou (${userRole}) cannot access this page.`);
      return;
    }

    setMobileOpen(false);
    router.push(path);
  };

  const handleLogout = async () => {
    await logout();
  };

  const metrics: Metric[] = [
    { label: 'Daily Sales', value: '$2k', note: '9 February 2024', icon: <span className="font-bold">$</span>, accentVar: '--primary' },
    { label: 'Monthly Revenue', value: '$55k', note: '1 Jan - 1 Feb', icon: <span className="font-bold">⎔</span>, accentVar: '--surface-dark' },
    { label: 'Table Occupancy', value: '25 Tables', note: 'Active floor', icon: <span className="font-bold">▣</span>, accentVar: '--accent-green' },
    { label: 'Registered Users', value: '128', note: 'Static demo', icon: <span className="font-bold">👤</span>, accentVar: '--accent-gold' },
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

  const [overviewTab, setOverviewTab] = useState<'Monthly' | 'Daily' | 'Weekly'>('Monthly');

  const overviewValues = useMemo(() => {
    if (overviewTab === 'Daily') return [40, 55, 35, 60, 48, 72, 45, 52, 44, 58, 40, 66];
    if (overviewTab === 'Weekly') return [55, 62, 48, 70, 60, 78, 52, 60, 55, 62, 50, 82];
    return [60, 80, 50, 70, 65, 78, 55, 62, 58, 65, 52, 85];
  }, [overviewTab]);

  // close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="w-full max-w-sm rounded-2xl bg-card p-5 ring-1 ring-card-border">
          <div className="h-5 w-32 rounded bg-black/5" />
          <div className="mt-3 h-10 w-full rounded bg-black/5" />
          <div className="mt-3 h-10 w-5/6 rounded bg-black/5" />
          <p className="mt-4 text-sm text-text-muted">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const Sidebar = ({ variant }: { variant: 'desktop' | 'mobile' }) => {
    const isCollapsed = variant === 'desktop' ? collapsed : false;

    return (
      <aside
        className={cn(
          'flex h-full flex-col gap-4 bg-surface px-3 py-5 shadow-md',
          variant === 'desktop' ? 'rounded-r-3xl' : 'rounded-3xl',
          variant === 'mobile' && 'w-[280px]'
        )}
      >
        <div className={cn('flex items-center gap-3 px-2', isCollapsed && 'justify-center')}>
          <img src="/TFK.png" alt="TFK Logo" className="h-12 w-12 rounded-full shadow ring-1 ring-card-border" />
          {!isCollapsed && <span className="text-sm font-semibold text-foreground">Taiwan Fried Kitchen</span>}
        </div>

        <nav className={cn('flex w-full flex-col gap-2', isCollapsed && 'items-center')}>
          {navItems.map((item) => {
            const isActive = item.name === activeNav;
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'group flex items-center rounded-2xl ring-1 ring-card-border transition',
                  'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isCollapsed
                    ? 'h-14 w-14 justify-center bg-card'
                    : 'h-12 w-full bg-card px-2 gap-3'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'grid h-10 w-10 place-items-center rounded-full shadow-inner ring-1 ring-card-border transition',
                    isActive ? 'bg-primary text-white ring-primary/20' : 'bg-white text-text-muted'
                  )}
                >
                  {iconMap[item.name]}
                </span>

                {!isCollapsed && (
                  <span className={cn('text-xs font-semibold', isActive ? 'text-foreground' : 'text-text-muted')}>
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={cn('mt-auto', isCollapsed ? '' : 'px-2')}>
          <button
            onClick={handleLogout}
            className={cn(
              'ring-1 ring-card-border transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              isCollapsed
                ? 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-dark text-white'
                : 'flex w-full items-center gap-3 rounded-2xl bg-card px-2 py-2'
            )}
            aria-label="Logout"
            title="Logout"
          >
            <span
              className={cn(
                'grid h-10 w-10 place-items-center rounded-full shadow-inner ring-1 ring-card-border',
                isCollapsed ? 'bg-surface-dark text-white ring-white/10' : 'bg-white text-text-muted'
              )}
            >
              <MdLogout className="h-5 w-5" />
            </span>
            {!isCollapsed && <span className="text-xs font-semibold text-text-muted">Logout</span>}
          </button>
        </div>
      </aside>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed left-3 top-3 z-50 h-[calc(100vh-24px)] transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-[120%]'
        )}
      >
        <div className="relative h-full">
          <div className="absolute -right-12 top-2">
            <button
              onClick={() => setMobileOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white shadow ring-1 ring-card-border"
              aria-label="Close menu"
            >
              <MdClose className="h-6 w-6 text-text-muted" />
            </button>
          </div>
          <Sidebar variant="mobile" />
        </div>
      </div>

      <div
        className={cn(
          'grid min-h-screen transition-[grid-template-columns] duration-200',
          'lg:gap-0',
          collapsed ? 'lg:grid-cols-[88px_1fr]' : 'lg:grid-cols-[240px_1fr]'
        )}
      >
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar variant="desktop" />
        </div>

        <main className="min-w-0 space-y-5 p-4 sm:p-5 md:p-7">
          {/* Header */}
          <header className="sticky top-3 z-30 rounded-2xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-card-border backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mobile menu button */}
                <button
                  aria-label="Open menu"
                  onClick={() => setMobileOpen(true)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-foreground ring-1 ring-card-border transition hover:bg-card lg:hidden"
                >
                  <MdMenu className="h-6 w-6 text-text-muted" />
                </button>

                {/* Desktop collapse button */}
                <button
                  aria-label="Toggle sidebar"
                  onClick={() => setCollapsed((c) => !c)}
                  className="hidden lg:grid h-9 w-9 place-items-center rounded-full bg-white text-foreground ring-1 ring-card-border transition hover:bg-card"
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {collapsed ? <MdChevronRight className="h-6 w-6 text-text-muted" /> : <MdChevronLeft className="h-6 w-6 text-text-muted" />}
                </button>

                <div className="h-11 w-11 rounded-full bg-white shadow ring-1 ring-card-border" />
                <div className="leading-tight">
                  <p className="text-xs uppercase tracking-wide text-text-muted">Dashboard</p>
                  <p className="text-lg font-semibold text-foreground">POS Dashboard</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-text-muted">
                <button className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-card-border transition hover:bg-card" aria-label="Notifications">
                  🔔
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-card-border transition hover:bg-card" aria-label="Settings">
                  ⚙️
                </button>
                <button
                  onClick={() => router.push('/profile')}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-primary shadow ring-1 ring-card-border"
                  aria-label="Open profile"
                >
                  AC
                </button>
              </div>
            </div>
          </header>

          {/* Metrics */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className={cn(
                  'rounded-2xl bg-card p-4 shadow-sm ring-1 ring-card-border',
                  'transition hover:-translate-y-0.5 hover:shadow-md'
                )}
              >
                <div className="mb-3 flex items-center justify-between text-sm text-text-muted">
                  <span>{metric.label}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary ring-1 ring-card-border">
                    {metric.icon}
                  </span>
                </div>

                <p className="text-2xl font-extrabold tracking-tight text-foreground">{metric.value}</p>
                <p className="text-xs text-text-muted">{metric.note}</p>

                <div className="mt-4">
                  <SparkBars values={[20, 35, 25, 45, 30, 50, 40]} accentVar={metric.accentVar} />
                </div>
              </div>
            ))}
          </section>

          {/* Lists */}
          <section className="grid gap-4 lg:grid-cols-2">
            <CardShell
              title="Popular Dishes"
              right={<button className="text-sm font-semibold text-primary hover:underline">See All</button>}
            >
              <div className="flex flex-col gap-3">
                {dishesLeft.map((dish) => (
                  <DishRow key={dish.id} dish={dish} />
                ))}
              </div>
            </CardShell>

            <CardShell
              title="Recent Orders"
              right={<button className="text-sm font-semibold text-primary hover:underline">See All</button>}
            >
              <div className="flex flex-col gap-3">
                {dishesRight.map((dish) => (
                  <DishRow key={dish.id} dish={dish} />
                ))}
              </div>
            </CardShell>
          </section>

          {/* Overview */}
          <CardShell
            title="Overview"
            right={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center rounded-full bg-white p-1 ring-1 ring-card-border">
                  {(['Monthly', 'Daily', 'Weekly'] as const).map((tab) => {
                    const active = overviewTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setOverviewTab(tab)}
                        className={cn(
                          'rounded-full px-4 py-2 text-sm font-semibold transition',
                          active ? 'bg-primary text-white shadow' : 'text-text-muted hover:bg-card'
                        )}
                        aria-pressed={active}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary ring-1 ring-card-border transition hover:bg-card"
                  aria-label="Export"
                >
                  <MdFileDownload className="h-5 w-5" />
                  Export
                </button>
              </div>
            }
          >
            <p className="-mt-2 mb-3 text-sm text-text-muted">Sales & Revenue</p>

            <div className="relative overflow-hidden rounded-2xl bg-linear-to-b from-white to-background px-4 py-6 ring-1 ring-card-border">
              {/* Subtle grid */}
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  backgroundImage:
                    'linear-gradient(#dcdcdc 1px, transparent 1px), linear-gradient(90deg, #dcdcdc 1px, transparent 1px)',
                  backgroundSize: '100% 25%, 8% 100%',
                }}
              />
              <div className="relative flex items-end gap-2 sm:gap-3">
                {overviewValues.map((value, idx) => (
                  <div key={idx} className="flex flex-1 items-end justify-center">
                    <div
                      className="w-2.5 sm:w-3.5 rounded-full bg-primary/90 shadow-sm"
                      style={{ height: `${value}%` }}
                      aria-label={`Bar ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>

              <div className="relative mt-4 grid grid-cols-6 gap-y-2 text-xs text-text-muted sm:flex sm:justify-between">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                  <span key={m} className="text-center sm:text-left">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </CardShell>
        </main>
      </div>
    </div>
  );
}