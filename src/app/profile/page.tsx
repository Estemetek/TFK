// app/profile/page.tsx
// Profile page (My Profile + Manage Access) — matches your updated UI style (gray panels + red accent)

'use client';

import React, { useMemo, useState } from 'react';
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
  MdEdit,
  MdDelete,
  MdVisibilityOff,
  MdVisibility,
  MdAdd,
} from 'react-icons/md';

type NavItem = { name: string; path?: string };

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

const LeftTab = ({
  active,
  icon,
  children,
  onClick,
}: {
  active?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[11px] font-extrabold shadow transition ${
      active ? 'bg-[#B80F24] text-white' : 'bg-[#E7E7E7] text-[#6D6D6D]'
    }`}
  >
    <span className={`grid h-8 w-8 place-items-center rounded-xl ${active ? 'bg-white/15' : 'bg-white'} shadow-inner`}>
      {icon}
    </span>
    <span>{children}</span>
  </button>
);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-extrabold text-[#6D6D6D]">{children}</div>;
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  rightIcon,
  onRightIconClick,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-[#E7E7E7] px-4 py-3 pr-12 text-[11px] font-extrabold text-[#1E1E1E] outline-none placeholder:text-[#9B9B9B]"
      />
      {rightIcon && (
        <button
          type="button"
          onClick={onRightIconClick}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-xl bg-white shadow-inner"
          aria-label="toggle"
          title="toggle"
        >
          {rightIcon}
        </button>
      )}
    </div>
  );
}

type ProfileTab = 'My Profile' | 'Manage Access';

type AccessModule = 'Dashboard' | 'Reports' | 'Inventory' | 'Orders' | 'Customers' | 'Settings';

type AccessUser = {
  id: string;
  name: string;
  email: string;
  roleTag: 'Admin' | 'Sub admin';
  access: Record<AccessModule, boolean>;
};

function Toggle({ on, onChange }: { on: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!on)}
      className={`relative h-6 w-12 rounded-full transition shadow-inner ${on ? 'bg-[#B80F24]' : 'bg-[#DCDCDC]'}`}
      aria-label="toggle"
      title="toggle"
    >
      <span
        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition ${
          on ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  );
}

function AccessRow({
  user,
  onToggle,
  onEdit,
  onDelete,
}: {
  user: AccessUser;
  onToggle: (id: string, module: AccessModule, value: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const modules: AccessModule[] = ['Dashboard', 'Reports', 'Inventory', 'Orders', 'Customers', 'Settings'];

  return (
    <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[13px] font-extrabold text-[#1E1E1E]">{user.name}</div>
            <span className="rounded-md bg-[#B80F24] px-2 py-1 text-[10px] font-extrabold text-white shadow">
              {user.roleTag}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-extrabold text-[#B80F24]">{user.email}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-inner transition hover:-translate-y-0.5"
            aria-label="edit user"
            title="Edit"
          >
            <MdEdit className="h-5 w-5 text-[#1E1E1E]" />
          </button>
          <button
            onClick={onDelete}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-inner transition hover:-translate-y-0.5"
            aria-label="delete user"
            title="Delete"
          >
            <MdDelete className="h-5 w-5 text-[#B80F24]" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-6">
        {modules.map((m) => (
          <div key={m} className="space-y-2">
            <div className="text-[10px] font-extrabold text-[#6D6D6D]">{m}</div>
            <Toggle on={user.access[m]} onChange={(v) => onToggle(user.id, m, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const activeNav = 'Dashboard'; // sidebar active doesn't change in mock; you can set to whatever you prefer
  const [tab, setTab] = useState<ProfileTab>('My Profile');

  // My Profile form state
  const [firstName, setFirstName] = useState('John Doe');
  const [email, setEmail] = useState('john doe123@gmail.com');
  const [address, setAddress] = useState('123 Street USA, Chicago');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Manage access form state
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('');
  const [addPass, setAddPass] = useState('');
  const [showAddPass, setShowAddPass] = useState(false);

  const [users, setUsers] = useState<AccessUser[]>([
    {
      id: 'u1',
      name: 'Abubakar Sherazi',
      email: 'abubakarsherazi@gmail.com',
      roleTag: 'Admin',
      access: {
        Dashboard: true,
        Reports: true,
        Inventory: true,
        Orders: true,
        Customers: true,
        Settings: true,
      },
    },
    {
      id: 'u2',
      name: 'Anees Ansari',
      email: 'aneesansari@gmail.com',
      roleTag: 'Sub admin',
      access: {
        Dashboard: false,
        Reports: true,
        Inventory: true,
        Orders: true,
        Customers: false,
        Settings: false,
      },
    },
  ]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    } finally {
      router.push('/');
    }
  };

  const onToggleAccess = (id: string, module: AccessModule, value: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, access: { ...u.access, [module]: value } } : u))
    );
  };

  const discardChanges = () => {
    setFirstName('John Doe');
    setEmail('john doe123@gmail.com');
    setAddress('123 Street USA, Chicago');
    setNewPass('');
    setConfirmPass('');
  };

  const addUser = () => {
    if (!addName.trim() || !addEmail.trim()) return;

    const newUser: AccessUser = {
      id: crypto.randomUUID(),
      name: addName.trim(),
      email: addEmail.trim(),
      roleTag: (addRole || 'Sub admin') === 'Admin' ? 'Admin' : 'Sub admin',
      access: {
        Dashboard: false,
        Reports: false,
        Inventory: false,
        Orders: false,
        Customers: false,
        Settings: false,
      },
    };

    setUsers((p) => [newUser, ...p]);
    setAddName('');
    setAddEmail('');
    setAddRole('');
    setAddPass('');
  };

  const mainCard = tab === 'My Profile';

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        }`}
      >
        {/* Sidebar */}
        <aside className="flex flex-col items-stretch gap-4 rounded-r-2xl bg-white px-3 py-5 shadow-md">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-extrabold text-[#B80F24] shadow ring-1 ring-black/5">
              TFK
            </div>
            {!collapsed && <span className="text-[12px] font-extrabold text-[#1E1E1E]">Taiwan Fried Kitchen</span>}
          </div>

          <nav className={`flex w-full flex-col gap-2 ${collapsed ? 'items-center' : ''}`}>
            {navItems.map((item) => {
              const isActive = item.name === activeNav;
              return (
                <button
                  key={item.name}
                  onClick={() => item.path && router.push(item.path)}
                  className={`flex items-center rounded-2xl transition hover:-translate-y-0.5 hover:shadow ${
                    collapsed
                      ? 'h-14 w-14 self-center justify-center gap-0 bg-[#F2F2F2]'
                      : 'h-12 w-full gap-3 bg-[#F2F2F2] px-2'
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-full shadow-inner ${
                      isActive ? 'bg-[#B80F24] text-white' : 'bg-white text-[#6D6D6D]'
                    }`}
                  >
                    {iconMap[item.name]}
                  </span>

                  {!collapsed && (
                    <span className={`text-[12px] font-extrabold ${isActive ? 'text-[#1E1E1E]' : 'text-[#6D6D6D]'}`}>
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
              className={`transition hover:shadow ${
                collapsed
                  ? 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#B80F24] text-white'
                  : 'flex w-full items-center gap-3 rounded-2xl bg-[#F2F2F2] px-2 py-2'
              }`}
              aria-label="Logout"
              title="Logout"
            >
              <span
                className={`grid h-10 w-10 place-items-center rounded-full shadow-inner ${
                  collapsed ? 'bg-[#B80F24] text-white' : 'bg-white text-[#6D6D6D]'
                }`}
              >
                <MdLogout className="h-5 w-5" />
              </span>
              {!collapsed && <span className="text-[12px] font-extrabold text-[#6D6D6D]">Logout</span>}
            </button>
          </div>
        </aside>

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
              <p className="text-[13px] font-extrabold text-[#1E1E1E]">Profile</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[14px]">🔔</span>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[12px] font-extrabold text-[#B80F24] shadow"
                aria-label="Open profile"
              >
                AC
              </button>
            </div>
          </header>

          {/* Content layout */}
          <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
            {/* Left panel */}
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                <div className="rounded-2xl bg-white p-4 shadow-inner space-y-2">
                  <LeftTab
                    active={tab === 'My Profile'}
                    onClick={() => setTab('My Profile')}
                    icon={<MdPeople className={`h-5 w-5 ${tab === 'My Profile' ? 'text-white' : 'text-[#6D6D6D]'}`} />}
                  >
                    My Profile
                  </LeftTab>

                  <LeftTab
                    active={tab === 'Manage Access'}
                    onClick={() => setTab('Manage Access')}
                    icon={<MdAssessment className={`h-5 w-5 ${tab === 'Manage Access' ? 'text-white' : 'text-[#6D6D6D]'}`} />}
                  >
                    Manage Access
                  </LeftTab>

                  <LeftTab
                    active={false}
                    onClick={handleLogout}
                    icon={<MdLogout className="h-5 w-5 text-[#6D6D6D]" />}
                  >
                    Logout
                  </LeftTab>
                </div>
              </div>

              {/* Add New User panel appears only in Manage Access (matches design) */}
              {tab === 'Manage Access' && (
                <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  <div className="rounded-2xl bg-white p-4 shadow-inner">
                    <div className="text-[13px] font-extrabold text-[#1E1E1E]">Add New User</div>

                    <div className="mt-4 space-y-3">
                      <TextInput value={addName} onChange={setAddName} placeholder="First Name" />
                      <TextInput value={addEmail} onChange={setAddEmail} placeholder="Email" />
                      <TextInput value={addRole} onChange={setAddRole} placeholder="Role" />
                      <TextInput
                        value={addPass}
                        onChange={setAddPass}
                        placeholder="Password"
                        type={showAddPass ? 'text' : 'password'}
                        rightIcon={
                          showAddPass ? <MdVisibilityOff className="h-5 w-5 text-[#6D6D6D]" /> : <MdVisibility className="h-5 w-5 text-[#6D6D6D]" />
                        }
                        onRightIconClick={() => setShowAddPass((s) => !s)}
                      />

                      <button
                        onClick={addUser}
                        className="mt-2 w-full rounded-xl bg-[#B80F24] px-4 py-3 text-[11px] font-extrabold text-white shadow"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right main panel */}
            <div className="rounded-2xl bg-[#E7E7E7] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
              <div className="rounded-2xl bg-white p-4 shadow-inner">
                {tab === 'My Profile' && (
                  <>
                    <div className="text-[13px] font-extrabold text-[#1E1E1E]">Personal Information</div>

                    <div className="mt-4 flex items-start gap-4">
                      <div className="relative">
                        <div className="h-16 w-16 overflow-hidden rounded-full bg-[#E7E7E7] shadow-inner">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=200&q=60"
                            alt="avatar"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <button
                          className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-[#B80F24] text-white shadow"
                          aria-label="edit avatar"
                          title="Edit"
                        >
                          <MdEdit className="h-4 w-4" />
                        </button>
                      </div>

                      <div>
                        <div className="text-[14px] font-extrabold text-[#1E1E1E]">John Doe</div>
                        <div className="text-[10px] font-extrabold text-[#B80F24]">Manager</div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="space-y-2">
                        <FieldLabel>First Name</FieldLabel>
                        <TextInput value={firstName} onChange={setFirstName} placeholder="John Doe" />
                      </div>

                      <div className="space-y-2">
                        <FieldLabel>Email</FieldLabel>
                        <TextInput value={email} onChange={setEmail} placeholder="email" />
                      </div>

                      <div className="space-y-2">
                        <FieldLabel>Address</FieldLabel>
                        <TextInput value={address} onChange={setAddress} placeholder="address" />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <FieldLabel>New Password</FieldLabel>
                          <TextInput
                            value={newPass}
                            onChange={setNewPass}
                            placeholder="New password"
                            type={showNew ? 'text' : 'password'}
                            rightIcon={
                              showNew ? <MdVisibilityOff className="h-5 w-5 text-[#6D6D6D]" /> : <MdVisibility className="h-5 w-5 text-[#6D6D6D]" />
                            }
                            onRightIconClick={() => setShowNew((s) => !s)}
                          />
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>Confirm Password</FieldLabel>
                          <TextInput
                            value={confirmPass}
                            onChange={setConfirmPass}
                            placeholder="Confirm password"
                            type={showConfirm ? 'text' : 'password'}
                            rightIcon={
                              showConfirm ? <MdVisibilityOff className="h-5 w-5 text-[#6D6D6D]" /> : <MdVisibility className="h-5 w-5 text-[#6D6D6D]" />
                            }
                            onRightIconClick={() => setShowConfirm((s) => !s)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-4 pt-2">
                        <button
                          onClick={discardChanges}
                          className="text-[11px] font-extrabold text-[#1E1E1E] underline"
                        >
                          Discard Changes
                        </button>
                        <button className="rounded-xl bg-[#B80F24] px-8 py-3 text-[11px] font-extrabold text-white shadow">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {tab === 'Manage Access' && (
                  <>
                    <div className="space-y-3">
                      {users.map((u) => (
                        <AccessRow
                          key={u.id}
                          user={u}
                          onToggle={onToggleAccess}
                          onEdit={() => {}}
                          onDelete={() => setUsers((p) => p.filter((x) => x.id !== u.id))}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
