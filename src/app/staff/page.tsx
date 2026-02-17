'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  MdEdit,
  MdDelete,
  MdVisibility,
  MdKeyboardArrowLeft,
  MdClose,
  MdMenu,
  MdSearch,
  MdFilterList,
  MdChevronLeft,
  MdChevronRight,
} from 'react-icons/md';

type NavItem = { name: string; path?: string };

type Staff = {
  id: string;
  code: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  avatarInitials: string;
};

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

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Menu', path: '/menu' },
  { name: 'User Management', path: '/staff' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Reports', path: '/reports' },
  { name: 'Order', path: '/order' },
];

const ModalRight = ({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="absolute right-0 top-0 h-full w-full max-w-2xl rounded-l-3xl bg-white shadow-2xl transition-transform duration-300 ease-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <p className="text-sm font-extrabold text-[#1E1E1E]">{title}</p>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#F2F2F2] text-[#6D6D6D] shadow-sm ring-1 ring-black/5 transition hover:bg-white"
            aria-label="Close"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>
        <div className="h-[calc(100%-72px)] overflow-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  rightIcon,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  rightIcon?: React.ReactNode;
}) => (
  <label className="block space-y-2">
    <span className="text-[11px] font-extrabold text-[#6D6D6D]">{label}</span>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/10 bg-[#F7F7F7] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] placeholder:text-[#B8B8B8] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#B80F24]/20"
      />
      {rightIcon ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]">{rightIcon}</span>
      ) : null}
    </div>
  </label>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) => (
  <label className="block space-y-2">
    <span className="text-[11px] font-extrabold text-[#6D6D6D]">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-black/10 bg-[#F7F7F7] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#B80F24]/20"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </label>
);

const ActionIcon = ({
  label,
  onClick,
  variant,
  children,
}: {
  label: string;
  onClick?: () => void;
  variant: 'soft' | 'danger';
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      'grid h-9 w-9 place-items-center rounded-full shadow-sm ring-1 transition',
      'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B80F24]/30',
      variant === 'soft'
        ? 'bg-[#F3C0D3] text-[#1E1E1E] ring-black/5'
        : 'bg-[#B80F24] text-white ring-[#B80F24]/30'
    )}
  >
    {children}
  </button>
);

const StatusTag = ({ role }: { role: string }) => {
  const isManager = role.toLowerCase().includes('manager');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1',
        isManager
          ? 'bg-[#B80F24]/10 text-[#B80F24] ring-[#B80F24]/20'
          : 'bg-black/5 text-[#1E1E1E] ring-black/10'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', isManager ? 'bg-[#B80F24]' : 'bg-[#6D6D6D]')} />
      {role}
    </span>
  );
};

export default function StaffPage() {
  const router = useRouter();
  const pathname = usePathname();

  // desktop collapse + mobile drawer
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeNav = 'User Management';

  const [view, setView] = useState<'staff' | 'details'>('staff');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // controls
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'name' | 'role' | 'newest'>('name');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Manager' | 'Staff'>('All');

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // pagination (client-side)
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(1);

  // modals
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: 'Manager',
    phone: '',
    dob: '',
    address: '',
    details: '',
    password: '',
  });

  const resetAddForm = () =>
    setForm({
      fullName: '',
      email: '',
      role: 'Manager',
      phone: '',
      dob: '',
      address: '',
      details: '',
      password: '',
    });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const [usersRes, rolesRes] = await Promise.all([
        supabase
          .from('UsersAccount')
          .select('userID, roleID, email, firstName, lastName, phone, dob, address')
          .order('firstName', { ascending: true }),
        supabase.from('Role').select('roleID, roleName'),
      ]);

      if (usersRes.error) {
        console.error('Supabase error:', usersRes.error);
        setError(usersRes.error.message);
        setLoading(false);
        return;
      }

      const roleMap: Record<number, string> = {};
      rolesRes.data?.forEach((r: any) => {
        roleMap[r.roleID] = r.roleName;
      });

      const mapped =
        usersRes.data?.map((r: any) => {
          const first = r.firstName ?? '';
          const last = r.lastName ?? '';
          const initials = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
          return {
            id: r.userID,
            code: r.userID?.slice(0, 6) ?? '',
            name: `${first} ${last}`.trim(),
            role: roleMap[r.roleID] ?? 'Unknown',
            email: r.email ?? '',
            phone: r.phone ?? '',
            dob: r.dob ?? '',
            address: r.address ?? '',
            avatarInitials: initials || 'NA',
          } as Staff;
        }) ?? [];

      setStaffList(mapped);
      setSelectedStaff(mapped[0] ?? null);
      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
  };

  const openAddModal = () => {
    resetAddForm();
    setOpenAdd(true);
  };

  const openEditModal = (s: Staff) => {
    setForm({
      fullName: s.name,
      email: s.email,
      role: s.role,
      phone: s.phone,
      dob: s.dob,
      address: s.address,
      details: '',
      password: '',
    });
    setOpenEdit(true);
  };

  const goDetails = (s: Staff) => {
    setSelectedStaff(s);
    setView('details');
  };

  const handleAddStaff = async () => {
    if (!form.fullName || !form.email || !form.phone || !form.password) {
      alert('Please fill in all required fields');
      return;
    }
    if (form.password.trim().length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);

      const [firstName, ...lastNameParts] = form.fullName.trim().split(' ');
      const lastName = lastNameParts.join(' ') || '';
      const email = form.email.trim().toLowerCase();
      const password = form.password.trim();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });

      if (authError) {
        if (
          authError.message.includes('already registered') ||
          authError.message.includes('Database error') ||
          authError.message.includes('User already registered')
        ) {
          alert(
            'This email is already registered. Please:\n1. Use a different email address, OR\n2. Delete the existing user from Supabase Dashboard → Authentication → Users'
          );
        } else if (authError.message.includes('Password')) {
          alert(`Password error: ${authError.message}`);
        } else {
          alert(`Failed to create auth user: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        alert('Failed to create user - no user data returned');
        setLoading(false);
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('Role')
        .select('roleID')
        .eq('roleName', form.role)
        .single();

      if (roleError) {
        alert(`Failed to find role: ${roleError.message}`);
        setLoading(false);
        return;
      }

      const roleID = roleData?.roleID || 1;

      const { error: insertError } = await supabase.from('UsersAccount').insert([
        {
          userID: authData.user.id,
          firstName,
          lastName,
          email,
          phone: form.phone.trim(),
          dob: form.dob,
          address: form.address.trim(),
          roleID,
          username: email.split('@')[0],
          isActive: true,
        },
      ]);

      if (insertError) {
        alert(
          `Failed to add staff profile: ${insertError.message}\n\nNote: The auth user was created but the profile failed. You may need to manually delete the user from Supabase Auth.`
        );
        setLoading(false);
        return;
      }

      alert('Staff added successfully!');
      setOpenAdd(false);
      resetAddForm();

      // reload
      const [usersRes, rolesRes] = await Promise.all([
        supabase
          .from('UsersAccount')
          .select('userID, roleID, email, firstName, lastName, phone, dob, address')
          .order('firstName', { ascending: true }),
        supabase.from('Role').select('roleID, roleName'),
      ]);

      const roleMap: Record<number, string> = {};
      rolesRes.data?.forEach((r: any) => {
        roleMap[r.roleID] = r.roleName;
      });

      const mapped =
        usersRes.data?.map((r: any) => ({
          id: r.userID,
          code: r.userID?.slice(0, 6) ?? '',
          name: `${r.firstName} ${r.lastName}`.trim(),
          role: roleMap[r.roleID] ?? 'Unknown',
          email: r.email ?? '',
          phone: r.phone ?? '',
          dob: r.dob ?? '',
          address: r.address ?? '',
          avatarInitials:
            `${(r.firstName?.[0] ?? '')}${(r.lastName?.[0] ?? '')}`.toUpperCase() || 'NA',
        })) ?? [];

      setStaffList(mapped);
      setSelectedStaff(mapped[0] ?? null);
      setPage(1);
      setSelectedIds(new Set());
      setLoading(false);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
      setLoading(false);
    }
  };

  // derived list (search + filter + sort)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let out = staffList.filter((s) => {
      const roleOk =
        roleFilter === 'All' ? true : s.role.toLowerCase() === roleFilter.toLowerCase();
      if (!roleOk) return false;

      if (!q) return true;
      const hay = `${s.code} ${s.name} ${s.email} ${s.phone} ${s.address} ${s.role}`.toLowerCase();
      return hay.includes(q);
    });

    out = [...out].sort((a, b) => {
      if (sort === 'role') return a.role.localeCompare(b.role) || a.name.localeCompare(b.name);
      if (sort === 'newest') return b.code.localeCompare(a.code); // best effort (code is uid slice)
      return a.name.localeCompare(b.name);
    });

    return out;
  }, [staffList, query, roleFilter, sort]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, sort]);

  const allVisibleChecked = pageItems.length > 0 && pageItems.every((s) => selectedIds.has(s.id));
  const someVisibleChecked = pageItems.some((s) => selectedIds.has(s.id)) && !allVisibleChecked;

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) {
        pageItems.forEach((s) => next.delete(s.id));
      } else {
        pageItems.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const Sidebar = ({ variant }: { variant: 'desktop' | 'mobile' }) => {
    const isCollapsed = variant === 'desktop' ? collapsed : false;
    return (
      <aside
        className={cn(
          'flex h-full flex-col items-stretch gap-4 bg-surface px-3 py-5 shadow-md',
          variant === 'desktop' ? 'rounded-r-3xl' : 'rounded-3xl',
          variant === 'mobile' && 'w-[280px]'
        )}
      >
        <div className={cn('mb-1 flex items-center gap-3 px-2', isCollapsed && 'justify-center')}>
          <img
            src="/TFK.png"
            alt="TFK Logo"
            className="h-12 w-12 rounded-full shadow ring-1 ring-card-border"
          />
          {!isCollapsed && (
            <span className="text-sm font-semibold text-foreground">Taiwan Fried Kitchen</span>
          )}
        </div>

        <nav className={cn('flex w-full flex-col gap-2', isCollapsed && 'items-center')}>
          {navItems.map((item) => {
            const isActive = item.name === activeNav;
            return (
              <button
                key={item.name}
                onClick={() => item.path && router.push(item.path)}
                className={cn(
                  'group flex items-center rounded-2xl ring-1 ring-card-border transition',
                  'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isCollapsed ? 'h-14 w-14 justify-center bg-card' : 'h-12 w-full gap-3 bg-card px-2'
                )}
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

  if (loading && staffList.length === 0) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="w-full max-w-sm rounded-2xl bg-card p-5 ring-1 ring-card-border">
          <div className="h-5 w-40 rounded bg-black/5" />
          <div className="mt-3 h-10 w-full rounded bg-black/5" />
          <div className="mt-3 h-10 w-5/6 rounded bg-black/5" />
          <p className="mt-4 text-sm text-text-muted">Loading users…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile backdrop */}
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
          collapsed ? 'lg:grid-cols-[88px_1fr]' : 'lg:grid-cols-[240px_1fr]'
        )}
      >
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar variant="desktop" />
        </div>

        {/* Main */}
        <main className="min-w-0 space-y-4 p-4 sm:p-5 md:p-7">
          {/* Top bar */}
          <header className="sticky top-3 z-30 rounded-2xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-card-border backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mobile menu */}
                <button
                  aria-label="Open menu"
                  onClick={() => setMobileOpen(true)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-card-border transition hover:bg-card lg:hidden"
                >
                  <MdMenu className="h-6 w-6 text-text-muted" />
                </button>

                {/* Desktop collapse */}
                <button
                  aria-label="Toggle sidebar"
                  onClick={() => setCollapsed((c) => !c)}
                  className="hidden lg:grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-card-border transition hover:bg-card"
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {collapsed ? (
                    <MdChevronRight className="h-6 w-6 text-text-muted" />
                  ) : (
                    <MdChevronLeft className="h-6 w-6 text-text-muted" />
                  )}
                </button>

                {view === 'details' && selectedStaff ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setView('staff')}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-card-border transition hover:bg-card"
                      aria-label="Back"
                      title="Back"
                    >
                      <MdKeyboardArrowLeft className="h-6 w-6 text-text-muted" />
                    </button>
                    <div className="leading-tight">
                      <p className="text-xs uppercase tracking-wide text-text-muted">User</p>
                      <p className="text-sm font-extrabold text-[#1E1E1E]">{selectedStaff.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="leading-tight">
                    <p className="text-xs uppercase tracking-wide text-text-muted">Management</p>
                    <p className="text-sm font-extrabold text-[#1E1E1E]">User Management</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-card-border transition hover:bg-card"
                  aria-label="Notifications"
                >
                  🔔
                </button>
                <button
                  onClick={() => router.push('/profile')}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-extrabold text-[#B80F24] shadow-sm ring-1 ring-card-border"
                  aria-label="Open profile"
                >
                  AC
                </button>
              </div>
            </div>
          </header>

          {/* DETAILS VIEW */}
          {view === 'details' && selectedStaff ? (
            <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
              {/* Left profile card */}
              <div className="space-y-4">
                <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-card-border">
                  <p className="mb-3 text-xs font-extrabold text-[#1E1E1E]">Profile</p>

                  <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-extrabold text-[#B80F24] shadow-sm ring-1 ring-card-border">
                      {selectedStaff.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-[#1E1E1E]">{selectedStaff.name}</p>
                      <div className="mt-1">
                        <StatusTag role={selectedStaff.role} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl bg-[#F7F7F7] ring-1 ring-black/5">
                    <div className="h-56 w-full bg-linear-to-br from-[#DCDCDC] via-[#F3F3F3] to-[#CFCFCF]" />
                  </div>

                  <button className="mt-2 text-[11px] font-extrabold text-[#B80F24] hover:underline">
                    Change Profile Picture
                  </button>

                  <div className="mt-4 grid gap-2">
                    <button
                      onClick={() => openEditModal(selectedStaff)}
                      className="w-full rounded-xl bg-[#B80F24] px-4 py-3 text-[12px] font-extrabold text-white shadow-sm ring-1 ring-[#B80F24]/30 transition hover:brightness-95"
                    >
                      Edit profile
                    </button>
                    <button
                      className="w-full rounded-xl bg-white px-4 py-3 text-[12px] font-extrabold text-[#B80F24] shadow-sm ring-1 ring-[#B80F24]/25 transition hover:bg-[#B80F24]/5"
                    >
                      Delete profile
                    </button>
                  </div>
                </section>
              </div>

              {/* Right details */}
              <div className="space-y-5">
                <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-card-border">
                  <p className="mb-3 text-[12px] font-extrabold text-[#1E1E1E]">Employee Personal Details</p>

                  <div className="rounded-2xl bg-[#F7F7F7] p-4 ring-1 ring-black/5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Full Name</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.name}</p>
                      </div>

                      <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Email</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.email}</p>
                      </div>

                      <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Phone number</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.phone}</p>
                      </div>

                      <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Date of birth</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.dob}</p>
                      </div>

                      <div className="sm:col-span-2 rounded-xl bg-white p-3 ring-1 ring-black/5">
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Address</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.address}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-card-border">
                  <p className="mb-3 text-[12px] font-extrabold text-[#1E1E1E]">Quick Actions</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button className="rounded-xl bg-white px-4 py-3 text-[12px] font-extrabold text-[#1E1E1E] ring-1 ring-black/5 transition hover:bg-[#F7F7F7]">
                      Reset password
                    </button>
                    <button className="rounded-xl bg-white px-4 py-3 text-[12px] font-extrabold text-[#1E1E1E] ring-1 ring-black/5 transition hover:bg-[#F7F7F7]">
                      Disable account
                    </button>
                    <button className="rounded-xl bg-white px-4 py-3 text-[12px] font-extrabold text-[#B80F24] ring-1 ring-[#B80F24]/20 transition hover:bg-[#B80F24]/5">
                      Audit activity
                    </button>
                  </div>
                </section>
              </div>
            </section>
          ) : (
            <>
              {/* Toolbar */}
              <section className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-card-border">
                    <MdSearch className="h-5 w-5 text-[#6D6D6D]" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name, email, phone, role…"
                      className="w-full bg-transparent text-[12px] font-semibold text-[#1E1E1E] outline-none placeholder:text-[#B8B8B8]"
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-white px-2 py-2 shadow-sm ring-1 ring-card-border">
                    <MdFilterList className="h-5 w-5 text-[#6D6D6D]" />
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as any)}
                      className="bg-transparent text-[12px] font-extrabold text-[#6D6D6D] outline-none"
                      aria-label="Filter role"
                    >
                      <option value="All">All roles</option>
                      <option value="Manager">Manager</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-white px-2 py-2 shadow-sm ring-1 ring-card-border">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as any)}
                      className="bg-transparent text-[12px] font-extrabold text-[#6D6D6D] outline-none"
                      aria-label="Sort"
                    >
                      <option value="name">Sort: Name</option>
                      <option value="role">Sort: Role</option>
                      <option value="newest">Sort: Newest</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={openAddModal}
                    className="rounded-xl bg-[#B80F24] px-4 py-2.5 text-[12px] font-extrabold text-white shadow-sm ring-1 ring-[#B80F24]/30 transition hover:brightness-95"
                  >
                    Add Staff
                  </button>

                  <button
                    disabled={selectedIds.size === 0}
                    onClick={() => alert('Bulk delete action here')}
                    className={cn(
                      'rounded-xl px-4 py-2.5 text-[12px] font-extrabold shadow-sm ring-1 transition',
                      selectedIds.size === 0
                        ? 'bg-white text-[#B8B8B8] ring-black/5'
                        : 'bg-white text-[#B80F24] ring-[#B80F24]/20 hover:bg-[#B80F24]/5'
                    )}
                  >
                    Delete selected ({selectedIds.size})
                  </button>
                </div>
              </section>

              {/* Table */}
              <section className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-card-border">
                {/* Desktop table header */}
                <div className="hidden lg:grid grid-cols-[42px_80px_1.2fr_1.4fr_150px_140px_1fr_140px] items-center bg-[#F7F7F7] px-3 py-3 text-[10px] font-extrabold text-[#6D6D6D]">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allVisibleChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleChecked;
                      }}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 accent-[#B80F24]"
                    />
                  </div>
                  <div>ID</div>
                  <div>Name</div>
                  <div>Email</div>
                  <div>Phone</div>
                  <div>Date of Birth</div>
                  <div>Address</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* States */}
                {loading ? (
                  <div className="px-4 py-10 text-center text-[12px] font-semibold text-[#6D6D6D]">
                    Loading staff...
                  </div>
                ) : error ? (
                  <div className="px-4 py-10 text-center text-[12px] font-semibold text-[#B80F24]">
                    Error: {error}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-10 text-center text-[12px] font-semibold text-[#6D6D6D]">
                    No users match your filters.
                  </div>
                ) : (
                  <>
                    {/* Desktop rows */}
                    <div className="hidden lg:block divide-y divide-black/5">
                      {pageItems.map((s, idx) => (
                        <div
                          key={s.id}
                          className={cn(
                            'grid grid-cols-[42px_80px_1.2fr_1.4fr_150px_140px_1fr_140px] items-center px-3 py-3 text-[11px]',
                            idx % 2 === 1 ? 'bg-white' : 'bg-[#FAFAFA]'
                          )}
                        >
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(s.id)}
                              onChange={() => toggleOne(s.id)}
                              className="h-4 w-4 accent-[#B80F24]"
                            />
                          </div>

                          <div className="font-extrabold text-[#1E1E1E]">{s.code}</div>

                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-[11px] font-extrabold text-[#B80F24] shadow-sm ring-1 ring-black/5">
                              {s.avatarInitials}
                            </div>
                            <div className="min-w-0 leading-tight">
                              <p className="truncate text-[12px] font-extrabold text-[#1E1E1E]">{s.name}</p>
                              <div className="mt-1">
                                <StatusTag role={s.role} />
                              </div>
                            </div>
                          </div>

                          <div className="truncate font-semibold text-[#1E1E1E]">{s.email}</div>
                          <div className="font-semibold text-[#1E1E1E]">{s.phone}</div>
                          <div className="font-semibold text-[#1E1E1E]">{s.dob}</div>
                          <div className="truncate font-semibold text-[#1E1E1E]">{s.address}</div>

                          <div className="flex items-center justify-end gap-2">
                            <ActionIcon
                              label="View details"
                              variant="soft"
                              onClick={() => {
                                setSelectedStaff(s);
                                setView('details');
                              }}
                            >
                              <MdVisibility className="h-4 w-4" />
                            </ActionIcon>

                            <ActionIcon label="Edit" variant="soft" onClick={() => openEditModal(s)}>
                              <MdEdit className="h-4 w-4" />
                            </ActionIcon>

                            <ActionIcon label="Delete" variant="danger" onClick={() => alert('Delete action here')}>
                              <MdDelete className="h-4 w-4" />
                            </ActionIcon>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mobile cards (responsive instead of horizontal scroll) */}
                    <div className="lg:hidden divide-y divide-black/5">
                      {pageItems.map((s) => (
                        <div key={s.id} className="bg-white px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(s.id)}
                                onChange={() => toggleOne(s.id)}
                                className="mt-1 h-4 w-4 accent-[#B80F24]"
                              />
                              <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-[12px] font-extrabold text-[#B80F24] shadow-sm ring-1 ring-black/5">
                                {s.avatarInitials}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-extrabold text-[#1E1E1E]">{s.name}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-extrabold text-[#1E1E1E]">{s.code}</span>
                                  <StatusTag role={s.role} />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <ActionIcon label="View details" variant="soft" onClick={() => goDetails(s)}>
                                <MdVisibility className="h-4 w-4" />
                              </ActionIcon>
                              <ActionIcon label="Edit" variant="soft" onClick={() => openEditModal(s)}>
                                <MdEdit className="h-4 w-4" />
                              </ActionIcon>
                              <ActionIcon label="Delete" variant="danger" onClick={() => alert('Delete action here')}>
                                <MdDelete className="h-4 w-4" />
                              </ActionIcon>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 rounded-2xl bg-[#F7F7F7] p-3 ring-1 ring-black/5">
                            <div className="grid grid-cols-[90px_1fr] gap-2 text-[12px]">
                              <p className="font-extrabold text-[#6D6D6D]">Email</p>
                              <p className="truncate font-semibold text-[#1E1E1E]">{s.email}</p>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-2 text-[12px]">
                              <p className="font-extrabold text-[#6D6D6D]">Phone</p>
                              <p className="font-semibold text-[#1E1E1E]">{s.phone}</p>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-2 text-[12px]">
                              <p className="font-extrabold text-[#6D6D6D]">DOB</p>
                              <p className="font-semibold text-[#1E1E1E]">{s.dob}</p>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] gap-2 text-[12px]">
                              <p className="font-extrabold text-[#6D6D6D]">Address</p>
                              <p className="truncate font-semibold text-[#1E1E1E]">{s.address}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer pagination */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 ring-1 ring-black/5">
                      <p className="text-[12px] font-semibold text-[#6D6D6D]">
                        Showing{' '}
                        <span className="font-extrabold text-[#1E1E1E]">
                          {(pageSafe - 1) * PAGE_SIZE + 1}
                        </span>
                        –
                        <span className="font-extrabold text-[#1E1E1E]">
                          {Math.min(pageSafe * PAGE_SIZE, filtered.length)}
                        </span>{' '}
                        of <span className="font-extrabold text-[#1E1E1E]">{filtered.length}</span>
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={pageSafe === 1}
                          className={cn(
                            'rounded-xl px-3 py-2 text-[12px] font-extrabold ring-1 transition',
                            pageSafe === 1
                              ? 'bg-[#F7F7F7] text-[#B8B8B8] ring-black/5'
                              : 'bg-white text-[#1E1E1E] ring-black/10 hover:bg-[#F7F7F7]'
                          )}
                        >
                          Prev
                        </button>

                        <div className="rounded-xl bg-[#F7F7F7] px-3 py-2 text-[12px] font-extrabold text-[#1E1E1E] ring-1 ring-black/5">
                          {pageSafe} / {totalPages}
                        </div>

                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={pageSafe === totalPages}
                          className={cn(
                            'rounded-xl px-3 py-2 text-[12px] font-extrabold ring-1 transition',
                            pageSafe === totalPages
                              ? 'bg-[#F7F7F7] text-[#B8B8B8] ring-black/5'
                              : 'bg-white text-[#1E1E1E] ring-black/10 hover:bg-[#F7F7F7]'
                          )}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* ADD STAFF MODAL */}
      <ModalRight open={openAdd} title="Add Staff" onClose={() => setOpenAdd(false)}>
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#F7F7F7] p-4 ring-1 ring-black/5">
            <div className="mx-auto h-40 w-48 overflow-hidden rounded-2xl bg-[#D0D0D0]">
              <div className="h-full w-full bg-linear-to-br from-[#CFCFCF] via-[#EDEDED] to-[#BDBDBD]" />
            </div>
            <button className="mt-2 w-full text-center text-[11px] font-extrabold text-[#B80F24] hover:underline">
              Change Profile Picture
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full Name"
              placeholder="Enter full name"
              value={form.fullName}
              onChange={(v) => setForm((p) => ({ ...p, fullName: v }))}
            />
            <Field
              label="Email"
              placeholder="Enter email address"
              value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            />
            <SelectField
              label="Role"
              value={form.role}
              onChange={(v) => setForm((p) => ({ ...p, role: v }))}
              options={['Manager', 'Staff']}
            />
            <Field
              label="Phone number"
              placeholder="Enter phone number"
              value={form.phone}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
            />
            <Field
              label="Date of birth"
              value={form.dob}
              onChange={(v) => setForm((p) => ({ ...p, dob: v }))}
              type="date"
            />
            <Field
              label="Password"
              placeholder="Enter password"
              value={form.password}
              onChange={(v) => setForm((p) => ({ ...p, password: v }))}
              type="password"
            />
          </div>

          <Field
            label="Address"
            placeholder="Enter address"
            value={form.address}
            onChange={(v) => setForm((p) => ({ ...p, address: v }))}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setOpenAdd(false)}
              className="rounded-xl bg-transparent px-4 py-2 text-[12px] font-extrabold text-[#1E1E1E]"
            >
              Cancel
            </button>
            <button
              onClick={handleAddStaff}
              className="rounded-xl bg-[#B80F24] px-5 py-2 text-[12px] font-extrabold text-white shadow-sm ring-1 ring-[#B80F24]/30 transition hover:brightness-95"
            >
              Confirm
            </button>
          </div>
        </div>
      </ModalRight>

      {/* EDIT STAFF MODAL */}
      <ModalRight open={openEdit} title="Edit Staff" onClose={() => setOpenEdit(false)}>
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#F7F7F7] p-4 ring-1 ring-black/5">
            <div className="mx-auto h-40 w-48 overflow-hidden rounded-2xl bg-[#D0D0D0]">
              <div className="h-full w-full bg-linear-to-br from-[#D0D0D0] via-[#F3F3F3] to-[#BDBDBD]" />
            </div>
            <button className="mt-2 w-full text-center text-[11px] font-extrabold text-[#B80F24] hover:underline">
              Change Profile Picture
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full Name"
              value={form.fullName}
              onChange={(v) => setForm((p) => ({ ...p, fullName: v }))}
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            />
            <SelectField
              label="Role"
              value={form.role}
              onChange={(v) => setForm((p) => ({ ...p, role: v }))}
              options={['Manager', 'Staff']}
            />
            <Field
              label="Phone number"
              value={form.phone}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
            />
            <Field
              label="Date of birth"
              value={form.dob}
              onChange={(v) => setForm((p) => ({ ...p, dob: v }))}
              type="date"
            />
            <Field
              label="Password (leave empty to keep current)"
              placeholder="Enter new password"
              value={form.password}
              onChange={(v) => setForm((p) => ({ ...p, password: v }))}
              type="password"
            />
          </div>

          <Field
            label="Address"
            value={form.address}
            onChange={(v) => setForm((p) => ({ ...p, address: v }))}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setOpenEdit(false)}
              className="rounded-xl bg-transparent px-4 py-2 text-[12px] font-extrabold text-[#1E1E1E]"
            >
              Cancel
            </button>
            <button
              onClick={() => setOpenEdit(false)}
              className="rounded-xl bg-[#B80F24] px-5 py-2 text-[12px] font-extrabold text-white shadow-sm ring-1 ring-[#B80F24]/30 transition hover:brightness-95"
            >
              Confirm
            </button>
          </div>
        </div>
      </ModalRight>
    </div>
  );
}
