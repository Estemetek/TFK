// app/staff/page.tsx
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
  MdVisibility,
  MdKeyboardArrowLeft,
  MdMoreVert,
  MdClose,
  MdCheck,
  MdModeEditOutline,
} from 'react-icons/md';

type NavItem = { name: string; path?: string };

type Staff = {
  id: string;
  code: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  age: string;
  salary: string;
  timings: string;
  address: string;
  dob: string;
  shiftStart: string;
  shiftEnd: string;
  avatarInitials: string;
};

type AttendanceStatus = 'Present' | 'Absent' | 'Half Shift' | 'Leave';

type AttendanceRow = {
  id: string;
  staffId: string;
  name: string;
  role: string;
  date: string;
  timings: string;
  status?: AttendanceStatus;
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

const Pill = ({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-md px-4 py-2 text-[11px] font-extrabold shadow transition ${
      active ? 'bg-[#B80F24] text-white' : 'bg-white text-[#6D6D6D]'
    }`}
  >
    {children}
  </button>
);

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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-[520px] rounded-l-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5">
          <p className="text-[14px] font-extrabold text-[#1E1E1E]">{title}</p>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#F2F2F2] text-[#6D6D6D] shadow"
            aria-label="Close"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>
        <div className="h-[calc(100%-64px)] overflow-auto px-6 pb-6">{children}</div>
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
  <div className="space-y-2">
    <p className="text-[11px] font-extrabold text-[#6D6D6D]">{label}</p>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-black/10 bg-[#F7F7F7] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] placeholder:text-[#B8B8B8] outline-none focus:bg-white focus:ring-2 focus:ring-[#B80F24]/25"
      />
      {rightIcon ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]">{rightIcon}</span> : null}
    </div>
  </div>
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
  <div className="space-y-2">
    <p className="text-[11px] font-extrabold text-[#6D6D6D]">{label}</p>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-black/10 bg-[#F7F7F7] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] outline-none focus:bg-white focus:ring-2 focus:ring-[#B80F24]/25"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

const StatusButton = ({
  label,
  active,
  onClick,
}: {
  label: AttendanceStatus;
  active?: boolean;
  onClick: () => void;
}) => {
  const base =
    label === 'Present'
      ? 'bg-[#F7B8D0] text-[#1E1E1E]'
      : label === 'Absent'
      ? 'bg-[#F6D44E] text-[#1E1E1E]'
      : label === 'Half Shift'
      ? 'bg-[#54C7F2] text-[#1E1E1E]'
      : 'bg-[#FF6B6B] text-[#1E1E1E]';

  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-[11px] font-extrabold shadow transition ${
        active ? 'ring-2 ring-black/15' : ''
      } ${base}`}
    >
      {label}
    </button>
  );
};

export default function StaffPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const activeNav = 'Staff';

  const [view, setView] = useState<'staff' | 'attendance' | 'details'>('staff');
  const [sort, setSort] = useState('Sort by');

  const staffList: Staff[] = useMemo(
    () =>
      Array.from({ length: 11 }).map((_, i) => ({
        id: `st-${i + 1}`,
        code: '#101',
        name: 'Watson Joyce',
        role: 'Manager',
        email: 'watsonjoyce112@gmail.com',
        phone: '+1 (123) 123 4654',
        age: '45 yr',
        salary: '$2200.00',
        timings: '9am to 6pm',
        address: 'House # 114 Street 123 USA, Chicago',
        dob: '01-Jan-1983',
        shiftStart: '9am',
        shiftEnd: '6pm',
        avatarInitials: 'WJ',
      })),
    []
  );

  const [selectedStaff, setSelectedStaff] = useState<Staff>(staffList[0]);

  const attendanceRowsInit: AttendanceRow[] = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        id: `att-${i + 1}`,
        staffId: staffList[0].id,
        name: 'Watson Joyce',
        role: 'Manager',
        date: '16-Apr-2024',
        timings: '9am to 6pm',
        status: i % 3 === 0 ? 'Present' : i % 4 === 0 ? 'Absent' : i % 5 === 0 ? 'Leave' : undefined,
      })),
    [staffList]
  );

  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>(attendanceRowsInit);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [form, setForm] = useState({
    fullName: 'Watson Joyce',
    email: 'watsonjoyce112@gmail.com',
    role: 'Manager',
    phone: '+1 (123) 123 4654',
    salary: '$2200.00',
    dob: '01-Jan-1983',
    shiftStart: '9am',
    shiftEnd: '6pm',
    address: 'House # 114 Street 123 USA, Chicago',
    details: '',
  });

  const resetAddForm = () =>
    setForm({
      fullName: '',
      email: '',
      role: 'Manager',
      phone: '',
      salary: '',
      dob: '',
      shiftStart: '',
      shiftEnd: '',
      address: '',
      details: '',
    });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    } finally {
      router.push('/');
    }
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
      salary: s.salary,
      dob: s.dob,
      shiftStart: s.shiftStart,
      shiftEnd: s.shiftEnd,
      address: s.address,
      details: '',
    });
    setOpenEdit(true);
  };

  const goDetails = (s: Staff) => {
    setSelectedStaff(s);
    setView('details');
  };

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-[#1E1E1E]">
      <div
        className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${
          collapsed ? 'grid-cols-[82px_1fr]' : 'grid-cols-[220px_1fr]'
        }`}
      >
        {/* Sidebar */}
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
                  onClick={() => item.path && router.push(item.path)}
                  className={`flex items-center rounded-2xl transition hover:-translate-y-0.5 hover:shadow ${
                    collapsed ? 'h-14 w-14 self-center justify-center gap-0 bg-[#F2F2F2]' : 'h-12 w-full gap-3 bg-[#F2F2F2] px-2'
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
          {/* Top bar */}
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

              {view === 'details' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView('staff')}
                    className="grid h-8 w-8 place-items-center rounded-full bg-[#E7E7E7] text-[#1E1E1E] shadow"
                    aria-label="Back"
                    title="Back"
                  >
                    <MdKeyboardArrowLeft className="h-5 w-5" />
                  </button>
                  <p className="text-[13px] font-extrabold text-[#1E1E1E]">{selectedStaff.name}</p>
                </div>
              ) : (
                <p className="text-[13px] font-extrabold text-[#1E1E1E]">Staff Management</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[14px]">🔔</span>
              <button
                onClick={() => router.push('/profile')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[12px] font-extrabold text-[#B80F24] shadow"
                aria-label="Open profile"
              >
                AC
              </button>
            </div>
          </header>

          {/* DETAILS VIEW (matches last screenshot) */}
          {view === 'details' ? (
            <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
              {/* Left profile card */}
              <div className="space-y-4">
                <div className="rounded-2xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  <p className="mb-3 text-[12px] font-extrabold text-[#1E1E1E]">Profile Image</p>
                  <div className="overflow-hidden rounded-2xl bg-[#E7E7E7]">
                    <div className="h-[220px] w-full bg-gradient-to-br from-[#DCDCDC] via-[#F3F3F3] to-[#CFCFCF]" />
                  </div>

                  <button className="mt-2 text-[11px] font-extrabold text-[#B80F24] hover:underline">
                    Change Profile Picture
                  </button>

                  <div className="mt-3 space-y-2">
                    <button
                      onClick={() => openEditModal(selectedStaff)}
                      className="w-full rounded-lg bg-[#B80F24] px-4 py-3 text-[12px] font-extrabold text-white shadow"
                    >
                      Edit profile
                    </button>
                    <button className="w-full rounded-lg border border-[#B80F24]/35 bg-white px-4 py-3 text-[12px] font-extrabold text-[#B80F24] shadow">
                      Delete profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Right details cards */}
              <div className="space-y-5">
                <div className="rounded-2xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  <p className="mb-3 text-[12px] font-extrabold text-[#1E1E1E]">Employee Personal Details</p>

                  <div className="rounded-2xl bg-[#D0D0D0] p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Full Name</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Email</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Phone number</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.phone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Date of birth</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.dob}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Address</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  <p className="mb-3 text-[12px] font-extrabold text-[#1E1E1E]">Employee Job Details</p>

                  <div className="rounded-2xl bg-[#D0D0D0] p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Role</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.role}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Salary</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.salary}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Shift start timing</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.shiftStart}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-[#B80F24]">Shift end timing</p>
                        <p className="text-[12px] font-extrabold text-[#1E1E1E]">{selectedStaff.shiftEnd}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* Top row: Staff (22) + actions */}
              <section className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-extrabold text-[#1E1E1E]">Staff (22)</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={openAddModal}
                    className="rounded-md bg-[#B80F24] px-4 py-2 text-[11px] font-extrabold text-white shadow"
                  >
                    Add Staff
                  </button>

                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-md bg-[#E7E7E7] px-4 py-2 text-[11px] font-extrabold text-[#6D6D6D] shadow outline-none"
                  >
                    <option>Sort by</option>
                    <option>Name</option>
                    <option>Role</option>
                    <option>Salary</option>
                  </select>
                </div>
              </section>

              {/* Tabs */}
              <section className="flex items-center gap-3">
                <Pill
                  active={view === 'staff'}
                  onClick={() => setView('staff')}
                >
                  Staff Management
                </Pill>
                <Pill
                  active={view === 'attendance'}
                  onClick={() => setView('attendance')}
                >
                  Attendance
                </Pill>
              </section>

              {/* STAFF MANAGEMENT TABLE */}
              {view === 'staff' ? (
                <section className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                  {/* Header row */}
                  <div className="grid grid-cols-[34px_70px_1.2fr_1.3fr_140px_90px_110px_120px_120px] items-center bg-[#F7F7F7] px-3 py-3 text-[10px] font-extrabold text-[#6D6D6D]">
                    <div className="flex items-center justify-center">
                      <input type="checkbox" className="h-3 w-3 accent-[#B80F24]" />
                    </div>
                    <div>ID</div>
                    <div>Name</div>
                    <div>Email</div>
                    <div>Phone</div>
                    <div>Age</div>
                    <div>Salary</div>
                    <div>Timings</div>
                    <div className="text-right"> </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-black/5">
                    {staffList.map((s, idx) => (
                      <div
                        key={s.id}
                        className={`grid grid-cols-[34px_70px_1.2fr_1.3fr_140px_90px_110px_120px_120px] items-center px-3 py-3 text-[11px] ${
                          idx % 2 === 1 ? 'bg-[#D0D0D0]' : 'bg-[#EFEFEF]'
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          <input type="checkbox" className="h-3 w-3 accent-[#B80F24]" />
                        </div>

                        <div className="font-extrabold text-[#1E1E1E]">{s.code}</div>

                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-[11px] font-extrabold text-[#B80F24] shadow">
                            {s.avatarInitials}
                          </div>
                          <div className="leading-tight">
                            <p className="text-[11px] font-extrabold text-[#1E1E1E]">{s.name}</p>
                            <p className="text-[10px] font-extrabold text-[#B80F24]">{s.role}</p>
                          </div>
                        </div>

                        <div className="truncate font-semibold text-[#1E1E1E]">{s.email}</div>
                        <div className="font-semibold text-[#1E1E1E]">{s.phone}</div>
                        <div className="font-semibold text-[#1E1E1E]">{s.age}</div>
                        <div className="font-semibold text-[#1E1E1E]">{s.salary}</div>
                        <div className="font-semibold text-[#1E1E1E]">{s.timings}</div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => goDetails(s)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#F3C0D3] text-[#1E1E1E] shadow"
                            title="View details"
                            aria-label="View details"
                          >
                            <MdVisibility className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(s)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#F3C0D3] text-[#1E1E1E] shadow"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <MdEdit className="h-4 w-4" />
                          </button>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#B80F24] text-white shadow"
                            title="Delete"
                            aria-label="Delete"
                          >
                            <MdDelete className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                /* ATTENDANCE VIEW */
                <section className="space-y-3">
                  <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                    <div className="divide-y divide-black/5">
                      {attendanceRows.map((r, idx) => (
                        <div
                          key={r.id}
                          className={`grid grid-cols-[70px_1.2fr_140px_140px_1fr_200px] items-center gap-3 px-4 py-3 text-[11px] ${
                            idx % 2 === 0 ? 'bg-[#D0D0D0]' : 'bg-[#BDBDBD]'
                          }`}
                        >
                          <div className="font-extrabold text-[#6D6D6D]">#101</div>

                          <div className="flex items-center gap-3">
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-[11px] font-extrabold text-[#B80F24] shadow">
                              WJ
                            </div>
                            <div className="leading-tight">
                              <p className="text-[11px] font-extrabold text-[#1E1E1E]">{r.name}</p>
                              <p className="text-[10px] font-extrabold text-[#B80F24]">{r.role}</p>
                            </div>
                          </div>

                          <div className="text-[10px] font-extrabold text-[#6D6D6D]">{r.date}</div>
                          <div className="text-[10px] font-extrabold text-[#6D6D6D]">{r.timings}</div>

                          <div className="flex flex-wrap items-center gap-2">
                            {(['Present', 'Absent', 'Half Shift', 'Leave'] as AttendanceStatus[]).map((s) => (
                              <StatusButton
                                key={s}
                                label={s}
                                active={r.status === s}
                                onClick={() =>
                                  setAttendanceRows((prev) =>
                                    prev.map((x) => (x.id === r.id ? { ...x, status: s } : x))
                                  )
                                }
                              />
                            ))}
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-2 rounded-md bg-[#8A8A8A] px-3 py-2 text-[10px] font-extrabold text-white shadow">
                              <span>{r.status ?? 'Present'}</span>
                              <MdModeEditOutline className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* ADD STAFF MODAL */}
      <ModalRight
        open={openAdd}
        title="Add Staff"
        onClose={() => setOpenAdd(false)}
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#F7F7F7] p-4">
            <div className="mx-auto h-[150px] w-[180px] overflow-hidden rounded-xl bg-[#D0D0D0]">
              <div className="h-full w-full bg-gradient-to-br from-[#CFCFCF] via-[#EDEDED] to-[#BDBDBD]" />
            </div>
            <button className="mt-2 w-full text-center text-[11px] font-extrabold text-[#B80F24] hover:underline">
              Change Profile Picture
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" placeholder="Enter full name" value={form.fullName} onChange={(v) => setForm((p) => ({ ...p, fullName: v }))} />
            <Field label="Email" placeholder="Enter email address" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
            <SelectField label="Role" value={form.role} onChange={(v) => setForm((p) => ({ ...p, role: v }))} options={['Manager', 'Cashier', 'Cook', 'Waiter']} />
            <Field label="Phone number" placeholder="Enter phone number" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
            <Field label="Salary" placeholder="Enter salary" value={form.salary} onChange={(v) => setForm((p) => ({ ...p, salary: v }))} />
            <Field label="Date of birth" placeholder="Enter date of birth" value={form.dob} onChange={(v) => setForm((p) => ({ ...p, dob: v }))} />
            <Field label="Shift start timing" placeholder="Enter start timing" value={form.shiftStart} onChange={(v) => setForm((p) => ({ ...p, shiftStart: v }))} rightIcon={<MdMoreVert />} />
            <Field label="Shift end timing" placeholder="Enter end timing" value={form.shiftEnd} onChange={(v) => setForm((p) => ({ ...p, shiftEnd: v }))} rightIcon={<MdMoreVert />} />
          </div>

          <Field label="Address" placeholder="Enter address" value={form.address} onChange={(v) => setForm((p) => ({ ...p, address: v }))} />

          <div className="space-y-2">
            <p className="text-[11px] font-extrabold text-[#6D6D6D]">Additional details</p>
            <textarea
              value={form.details}
              onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))}
              placeholder="Enter additional details"
              className="h-28 w-full resize-none rounded-lg border border-black/10 bg-[#F7F7F7] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] placeholder:text-[#B8B8B8] outline-none focus:bg-white focus:ring-2 focus:ring-[#B80F24]/25"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setOpenAdd(false)}
              className="rounded-md bg-transparent px-4 py-2 text-[11px] font-extrabold text-[#1E1E1E]"
            >
              Cancel
            </button>
            <button
              onClick={() => setOpenAdd(false)}
              className="rounded-md bg-[#B80F24] px-5 py-2 text-[11px] font-extrabold text-white shadow"
            >
              Confirm
            </button>
          </div>
        </div>
      </ModalRight>

      {/* EDIT STAFF MODAL */}
      <ModalRight
        open={openEdit}
        title="Edit Staff"
        onClose={() => setOpenEdit(false)}
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#F7F7F7] p-4">
            <div className="mx-auto h-[150px] w-[180px] overflow-hidden rounded-xl bg-[#D0D0D0]">
              <div className="h-full w-full bg-gradient-to-br from-[#D0D0D0] via-[#F3F3F3] to-[#BDBDBD]" />
            </div>
            <button className="mt-2 w-full text-center text-[11px] font-extrabold text-[#B80F24] hover:underline">
              Change Profile Picture
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" value={form.fullName} onChange={(v) => setForm((p) => ({ ...p, fullName: v }))} />
            <Field label="Email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
            <SelectField label="Role" value={form.role} onChange={(v) => setForm((p) => ({ ...p, role: v }))} options={['Manager', 'Cashier', 'Cook', 'Waiter']} />
            <Field label="Phone number" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
            <Field label="Salary" value={form.salary} onChange={(v) => setForm((p) => ({ ...p, salary: v }))} />
            <Field label="Date of birth" value={form.dob} onChange={(v) => setForm((p) => ({ ...p, dob: v }))} />
            <Field label="Shift start timing" value={form.shiftStart} onChange={(v) => setForm((p) => ({ ...p, shiftStart: v }))} rightIcon={<MdMoreVert />} />
            <Field label="Shift end timing" value={form.shiftEnd} onChange={(v) => setForm((p) => ({ ...p, shiftEnd: v }))} rightIcon={<MdMoreVert />} />
          </div>

          <Field label="Address" value={form.address} onChange={(v) => setForm((p) => ({ ...p, address: v }))} />

          <div className="space-y-2">
            <p className="text-[11px] font-extrabold text-[#6D6D6D]">Additional details</p>
            <textarea
              value={form.details}
              onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))}
              placeholder="Enter additional details"
              className="h-28 w-full resize-none rounded-lg border border-black/10 bg-[#F7F7F7] px-3 py-3 text-[12px] font-semibold text-[#1E1E1E] placeholder:text-[#B8B8B8] outline-none focus:bg-white focus:ring-2 focus:ring-[#B80F24]/25"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setOpenEdit(false)}
              className="rounded-md bg-transparent px-4 py-2 text-[11px] font-extrabold text-[#1E1E1E]"
            >
              Cancel
            </button>
            <button
              onClick={() => setOpenEdit(false)}
              className="rounded-md bg-[#B80F24] px-5 py-2 text-[11px] font-extrabold text-white shadow"
            >
              Confirm
            </button>
          </div>
        </div>
      </ModalRight>
    </div>
  );
}