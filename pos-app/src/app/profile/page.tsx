'use client';

import { useEffect, useState } from 'react';
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
} from 'react-icons/md';

type NavItem = {
  name: string;
  path?: string;
};

type UserProfile = {
  userID: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  roleName: string | null;
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
  { name: 'Menu', path: '/menu' },
  { name: 'Staff', path: '/staff' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Reports', path: '/reports' },
  { name: 'Order', path: '/order' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const activeNav = 'Profile';

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/');
        return;
      }

      const { data, error } = await supabase
        .from('UsersAccount')
        .select(`
          userID,
          email,
          username,
          firstName,
          lastName,
          Role (
            roleName
          )
        `)
        .eq('userID', authUser.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        return;
      }

      setUser({
        userID: data.userID,
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        roleName: data.Role?.[0]?.roleName ?? null,
      });

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return <div className="p-6 text-sm">Loading profile...</div>;
  }

  if (!user) return null;

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    fullName || user.username
  )}&backgroundType=gradientLinear&backgroundColor=ffcece,c6d2ff`;

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
            <img src="/TFK.png" alt="TFK Logo" className="h-12 w-12 rounded-full shadow" />
            {!collapsed && (
              <span className="text-sm font-semibold text-foreground">
                Taiwan Fried Kitchen
              </span>
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
                    collapsed
                      ? 'h-14 w-14 self-center bg-card justify-center'
                      : 'h-12 w-full bg-card px-2 gap-3'
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
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-text-muted shadow-inner">
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
            <aside className="flex flex-col gap-3">
              <div className="flex h-16 items-center gap-3 rounded-xl bg-white px-3 shadow-sm ring-1 ring-card-border">
                <MdPerson className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold text-primary">My Profile</span>
              </div>
              <div className="flex h-16 items-center gap-3 rounded-xl bg-white px-3 shadow-sm ring-1 ring-card-border">
                <MdSecurity className="h-6 w-6 text-text-muted" />
                <span className="text-sm font-semibold text-text-muted">
                  Manage Access
                </span>
              </div>
            </aside>

            <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-card-border">
              <h2 className="mb-6 text-lg font-semibold text-foreground">
                Personal Information
              </h2>

              <div className="mb-6 flex items-center gap-4">
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-16 w-16 rounded-full ring-2 ring-white shadow"
                />
                <div>
                  <p className="text-base font-semibold text-foreground">{fullName}</p>
                  <p className="text-sm font-medium text-primary">
                    {user.roleName}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted">
                    Full Name
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-card-border bg-white px-3 py-2 text-sm"
                    value={fullName}
                    disabled
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-muted">Email</label>
                  <input
                    className="mt-1 w-full rounded-md border border-card-border bg-white px-3 py-2 text-sm"
                    value={user.email}
                    disabled
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-muted">
                    Username
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-card-border bg-white px-3 py-2 text-sm"
                    value={user.username}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
