// profile page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import {
  MdDashboard,
  MdRestaurantMenu,
  MdPeople,
  MdInventory2,
  MdAssessment,
  MdShoppingCart,
  MdLogout,
  MdPerson,
  MdSecurity,
  MdVisibilityOff,
} from 'react-icons/md';

type NavItem = {
  name: string;
  path?: string;
};

const user = {
  name: 'John Doe',
  role: 'Manager',
  email: 'johndoe123@gmail.com',
  address: '123 Street USA, Chicago',
  avatar:
    'https://api.dicebear.com/7.x/initials/svg?seed=John%20Doe&backgroundType=gradientLinear&backgroundColor=ffcece,c6d2ff',
};

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <MdDashboard className="h-5 w-5" />,
  Menu: <MdRestaurantMenu className="h-5 w-5" />,
  Staff: <MdPeople className="h-5 w-5" />,
  Inventory: <MdInventory2 className="h-5 w-5" />,
  Reports: <MdAssessment className="h-5 w-5" />,
  Order: <MdShoppingCart className="h-5 w-5" />,
};

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Menu' },
  { name: 'Staff' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Reports' },
  { name: 'Order' },
];

export default function ProfilePage() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const activeNav = 'Profile';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore errors in demo
    } finally {
      router.push('/');
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        }`}
      >
        {/* Main Sidebar */}
        <aside className="flex flex-col items-stretch gap-4 rounded-r-2xl bg-surface px-3 py-5 shadow-md">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-bold text-primary shadow">
              TFK
            </div>
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

        {/* Main Content */}
        <main className="space-y-5 p-5 md:p-7">
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            {/* Secondary Sidebar */}
            <aside className="flex flex-col gap-3">
              <div className="flex h-16 items-center gap-3 rounded-xl bg-white px-3 shadow-sm ring-1 ring-card-border">
                <MdPerson className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold text-primary">My Profile</span>
              </div>
              <div className="flex h-16 items-center gap-3 rounded-xl bg-white px-3 shadow-sm ring-1 ring-card-border">
                <MdSecurity className="h-6 w-6 text-text-muted" />
                <span className="text-sm font-semibold text-text-muted">Manage Access</span>
              </div>
            </aside>

            {/* Main Card */}
            <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-card-border">
              <h2 className="mb-6 text-lg font-semibold text-foreground">Personal Information</h2>

              <div className="mb-6 flex items-center gap-4">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow"
                />
                <div>
                  <p className="text-base font-semibold text-foreground">{user.name}</p>
                  <p className="text-sm font-medium text-primary">{user.role}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted">Full Name</label>
                  <input
                    className="mt-1 w-full rounded-md border border-card-border bg-white px-3 py-2 text-sm text-foreground shadow-sm"
                    defaultValue={user.name}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-muted">Email</label>
                  <input
                    className="mt-1 w-full rounded-md border border-card-border bg-white px-3 py-2 text-sm text-foreground shadow-sm"
                    defaultValue={user.email}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-muted">Address</label>
                  <input
                    className="mt-1 w-full rounded-md border border-card-border bg-white px-3 py-2 text-sm text-foreground shadow-sm"
                    defaultValue={user.address}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-text-muted">New Password</label>
                    <div className="mt-1 flex items-center rounded-md border border-card-border bg-white px-3 py-2 text-sm text-foreground shadow-sm">
                      <input className="w-full outline-none" type="password" defaultValue="••••••" />
                      <MdVisibilityOff className="h-4 w-4 text-text-muted" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted">Confirm Password</label>
                    <div className="mt-1 flex items-center rounded-md border border-card-border bg-white px-3 py-2 text-sm text-foreground shadow-sm">
                      <input className="w-full outline-none" type="password" defaultValue="••••••" />
                      <MdVisibilityOff className="h-4 w-4 text-text-muted" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-text-muted ring-1 ring-card-border hover:bg-card">
                    Discard Changes
                  </button>
                  <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
