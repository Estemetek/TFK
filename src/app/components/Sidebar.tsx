'use client';

import { useState, useEffect } from 'react';
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
} from 'react-icons/md';

type UserRole = 'Manager' | 'Staff';
type NavItem = { name: string; path?: string };

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

export function Sidebar({
  collapsed,
  setCollapsed,
  activeNav,
}: {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  activeNav: string;
}) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          window.location.href = '/login';
          return;
        }

        const { data, error } = await supabase
          .from('UsersAccount')
          .select('roleID, Role!inner(roleName)')
          .eq('userID', user.id)
          .single();

        if (error || !data) {
          console.error('Failed to fetch user role:', error);
          window.location.href = '/login';
          return;
        }

        // Extract role name with proper typing
        let roleName: UserRole = 'Staff'; // default
        
        if (data.Role) {
          // Cast to any to avoid TypeScript strict checking on Supabase join types
          const roleData = data.Role as any;
          if (Array.isArray(roleData)) {
            roleName = (roleData[0]?.roleName || 'Staff') as UserRole;
          } else if (roleData.roleName) {
            roleName = roleData.roleName as UserRole;
          }
        }

        console.log('User role fetched:', roleName, 'roleID:', data.roleID);
        setUserRole(roleName);
        
        // Filter nav items based on role
        const allowedNames = roleBasedNav[roleName] || [];
        const filteredItems = allNavItems.filter(item => allowedNames.includes(item.name));
        setNavItems(filteredItems);
      } catch (err) {
        console.error('Error fetching user role:', err);
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [router]);

  const handleNavClick = (path?: string) => {
    if (!path || !userRole) return;

    const allowedPaths = navItems.map(item => item.path);
    const hasAccess = allowedPaths.includes(path);

    if (!hasAccess) {
      alert(`⛔ Access Denied!\n\nYou (${userRole}) cannot access this page.`);
      return;
    }

    router.push(path);
  };

  const handleLogout = async () => {
    // Use unified logout function to ensure clean session clearing
    await logout();
  };

  if (loading) {
    return (
      <aside className="flex flex-col items-stretch gap-4 rounded-r-2xl bg-surface px-3 py-5 shadow-md">
        <div className="text-sm text-text-muted">Loading...</div>
      </aside>
    );
  }

  return (
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
  );
}
