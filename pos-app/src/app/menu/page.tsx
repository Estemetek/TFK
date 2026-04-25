'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

import { Sidebar } from '../components/Sidebar';
import {
  MdGridView,
  MdLocalDining,
  MdFastfood,
  MdRiceBowl,
  MdLocalCafe,
  MdEdit,
  MdDelete,
  MdClose,
  MdImage,
  MdSearch,
  MdTune,
  MdReceiptLong,
  MdCheckCircle,
  MdCancel,
  MdWarningAmber,
  MdInfo,
  MdArchive,
  MdDeleteForever,
  MdRestore,
  MdRefresh,
} from 'react-icons/md';
import { RecipeModal } from '../components/RecipeModal';

// --- TYPES ---
type Category = {
  categoryID: number;
  categoryName: string;
  description: string;
};

type MenuItem = {
  menuItemID: number;
  name: string;
  description?: string;
  price: number;
  regularPrice: number;
  isAvailable: boolean;
  status: string;
  categoryID: number;
  imageUrl?: string;
  Category?: { categoryName: string };
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  UsersAccount?: { username: string };
};

type MenuType = 'Normal Menu' | 'Archived Menu';

type PopupType = 'success' | 'error' | 'info' | 'warning';

const PRIMARY = '#b80f24';
const PRIMARY_DARK = '#6d0f2a';
const BG = '#F3F3F3';
const TEXT = '#1E1E1E';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('chicken')) return <MdLocalDining className="h-6 w-6" />;
  if (n.includes('fries') || n.includes('sides')) return <MdFastfood className="h-6 w-6" />;
  if (n.includes('rice')) return <MdRiceBowl className="h-6 w-6" />;
  if (n.includes('bev') || n.includes('drink')) return <MdLocalCafe className="h-6 w-6" />;
  return <MdGridView className="h-6 w-6" />;
};

const AvailabilityPill = ({ value }: { value: boolean }) => (
  <span
    className={[
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold',
      value ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
    ].join(' ')}
  >
    {value ? <MdCheckCircle className="h-4 w-4" /> : <MdCancel className="h-4 w-4" />}
    {value ? 'In Stock' : 'Unavailable'}
  </span>
);

function RightDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;

      requestAnimationFrame(() => {
        const el = panelRef.current?.querySelector<HTMLElement>('input, select, textarea');
        el?.focus();
      });
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full justify-end">
        <div
          ref={panelRef}
          className="h-full w-full max-w-2xl rounded-l-[28px] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between px-6 pt-6">
            <p className="text-sm font-extrabold" style={{ color: TEXT }}>
              {title}
            </p>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-[#E7E7E7] text-[#1E1E1E] shadow"
              aria-label="Close"
            >
              <MdClose className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 h-px w-full bg-black/10" />
          <div className="h-[calc(100%-84px)] overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PopupModal({
  open,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  cancelText,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  type?: PopupType;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        if (onCancel) onCancel();
        else onConfirm();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, loading, onCancel, onConfirm]);

  if (!open) return null;

  const icon =
    type === 'success' ? (
      <MdCheckCircle className="h-6 w-6" />
    ) : type === 'error' || type === 'warning' ? (
      <MdWarningAmber className="h-6 w-6" />
    ) : (
      <MdInfo className="h-6 w-6" />
    );

  const iconClasses =
    type === 'success'
      ? 'bg-emerald-50 text-emerald-600'
      : type === 'error'
        ? 'bg-red-50 text-red-600'
        : type === 'warning'
          ? 'bg-amber-50 text-amber-600'
          : 'bg-black/5 text-black/70';

  const confirmClasses =
    type === 'error' || type === 'warning'
      ? 'bg-[#B80F24] text-white ring-[#B80F24]/30 hover:brightness-95'
      : type === 'success'
        ? 'bg-emerald-600 text-white ring-emerald-600/30 hover:brightness-95'
        : 'bg-[#1E1E1E] text-white ring-black/10 hover:bg-black/90';

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => {
          if (!loading) {
            if (onCancel) onCancel();
            else onConfirm();
          }
        }}
      />
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
        <div className="flex items-start gap-4">
          <div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', iconClasses)}>
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[18px] font-extrabold text-[#1E1E1E]">{title}</h3>
            <div className="mt-2 text-[14px] leading-6 text-[#5E5E5E]">{message}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {cancelText ? (
            <button
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[12px] font-extrabold text-[#1E1E1E] transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelText}
            </button>
          ) : null}

          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'rounded-xl px-4 py-2.5 text-[12px] font-extrabold shadow-sm ring-1 transition disabled:cursor-not-allowed disabled:opacity-60',
              confirmClasses
            )}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionChoiceModal({
  open,
  title,
  message,
  archiveText = 'Archive',
  deleteText = 'Delete Permanently',
  hideArchive = false,
  loading = false,
  onArchive,
  onDelete,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  archiveText?: string;
  deleteText?: string;
  hideArchive?: boolean;
  loading?: boolean;
  onArchive?: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-95 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <MdWarningAmber className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[18px] font-extrabold text-[#1E1E1E]">{title}</h3>
            <div className="mt-2 text-[14px] leading-6 text-[#5E5E5E]">{message}</div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {!hideArchive && onArchive ? (
            <button
              onClick={onArchive}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-[#F8F8F8] px-4 py-3 text-sm font-extrabold text-[#1E1E1E] transition hover:bg-[#F2F2F2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MdArchive className="h-5 w-5" />
              {archiveText}
            </button>
          ) : null}

          <button
            onClick={onDelete}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B80F24] px-4 py-3 text-sm font-extrabold text-white shadow transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MdDeleteForever className="h-5 w-5" />
            {deleteText}
          </button>

          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-extrabold text-[#1E1E1E] transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[12px] font-extrabold tracking-[0.01em] text-[#1E1E1E]">{label}</p>
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-xl bg-[#F3F3F3] px-3 py-3 text-xs outline-none ring-1 ring-transparent',
        'focus:ring-2 focus:ring-[#b80f24]/35',
        props.className || '',
      ].join(' ')}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        'w-full rounded-xl bg-[#F3F3F3] px-3 py-3 text-xs outline-none resize-none ring-1 ring-transparent',
        'focus:ring-2 focus:ring-[#b80f24]/35',
        props.className || '',
      ].join(' ')}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={[
          'w-full appearance-none rounded-2xl border border-black/10 bg-white px-4 py-3 pr-11 text-sm font-semibold text-[#1E1E1E] shadow-sm outline-none transition',
          'hover:border-black/15',
          'focus:border-[#b80f24]/30 focus:ring-4 focus:ring-[#b80f24]/10',
          'disabled:cursor-not-allowed disabled:opacity-60',
          props.className || '',
        ].join(' ')}
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
        <svg
          className="h-4 w-4 text-[#6D6D6D]"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
  className,
  type = 'button',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        'rounded-xl px-5 py-2.5 text-xs font-extrabold text-white shadow',
        'transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed',
        className || '',
      ].join(' ')}
      style={{ backgroundColor: PRIMARY }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_DARK;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-5 py-2.5 text-xs font-extrabold text-[#6D6D6D] hover:bg-black/5 transition"
      type="button"
    >
      {children}
    </button>
  );
}

// --- MAIN PAGE ---
export default function MenuPage() {
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  }, [collapsed]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCatID, setSelectedCatID] = useState<number | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const menuTypes: MenuType[] = ['Normal Menu', 'Archived Menu'];
  const [selectedMenuType, setSelectedMenuType] = useState<MenuType>('Normal Menu');

  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'in' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'updated_desc'>('name');

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [catForm, setCatForm] = useState({ categoryName: '', description: '' });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingItemID, setEditingItemID] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    regularPrice: '',
    categoryID: '',
    isAvailable: false,
    imageUrl: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    regularPrice: '',
    categoryID: '',
    isAvailable: true,
    imageUrl: '',
  });

  // Role-based access control
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserID, setCurrentUserID] = useState<string | null>(null);

  // Fetch user role on component mount
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setCurrentUserID(session.user.id);
        console.log('[MENU PAGE] Logged-in user UUID:', session.user.id);

        // Fetch role from database (same as staff page)
        const { data: profile, error } = await supabase
          .from('UsersAccount')
          .select('Role(roleName)')
          .eq('userID', session.user.id)
          .single();

        if (error || !profile) {
          console.error('Failed to fetch user role:', error);
          return;
        }

        const roleData = (profile as any)?.Role;
        const roleName = Array.isArray(roleData) ? roleData[0]?.roleName : roleData?.roleName;
        
        if (roleName) {
          setUserRole(roleName);
          console.log('👤 [USER ROLE]', roleName);
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
    }
    fetchUserRole();
  }, []);

  // Check if user can edit/delete menu items
  const canEditMenuItems = userRole === 'Manager' || userRole === 'Superadmin';

  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [activeRecipeItem, setActiveRecipeItem] = useState<MenuItem | null>(null);

  const [isCategoryListOpen, setIsCategoryListOpen] = useState(false);
  const [isCategoryMgmtOpen, setIsCategoryMgmtOpen] = useState(false);
  const [isArchivedCategoriesOpen, setIsArchivedCategoriesOpen] = useState(false);
  const [editingCategoryID, setEditingCategoryID] = useState<number | null>(null);
  const [editingCategoryForm, setEditingCategoryForm] = useState({ categoryName: '', description: '' });
  const [categoryMgmtSubmitting, setCategoryMgmtSubmitting] = useState(false);

  const [popup, setPopup] = useState<{
    open: boolean;
    type: PopupType;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    cancelText?: string;
    loading?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    open: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
  });

  const [actionChoice, setActionChoice] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    archiveText?: string;
    deleteText?: string;
    hideArchive?: boolean;
    onArchive?: () => void;
    onDelete?: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    archiveText: 'Archive',
    deleteText: 'Delete Permanently',
    hideArchive: false,
  });

  const showPopup = ({
    type = 'info',
    title,
    message,
    confirmText = 'OK',
    cancelText,
    onConfirm,
    onCancel,
    loading = false,
  }: {
    type?: PopupType;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    loading?: boolean;
  }) => {
    setPopup({
      open: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
      loading,
    });
  };

  const closePopup = () => {
    setPopup((prev) => ({
      ...prev,
      open: false,
      title: '',
      message: '',
      confirmText: 'OK',
      cancelText: undefined,
      onConfirm: undefined,
      onCancel: undefined,
      loading: false,
    }));
  };

  const showActionChoice = ({
    title,
    message,
    archiveText = 'Archive',
    deleteText = 'Delete Permanently',
    hideArchive = false,
    onArchive,
    onDelete,
  }: {
    title: string;
    message: React.ReactNode;
    archiveText?: string;
    deleteText?: string;
    hideArchive?: boolean;
    onArchive?: () => void;
    onDelete?: () => void;
  }) => {
    setActionChoice({
      open: true,
      title,
      message,
      archiveText,
      deleteText,
      hideArchive,
      onArchive,
      onDelete,
    });
  };

  const closeActionChoice = () => {
    setActionChoice({
      open: false,
      title: '',
      message: '',
      archiveText: 'Archive',
      deleteText: 'Delete Permanently',
      hideArchive: false,
      onArchive: undefined,
      onDelete: undefined,
    });
  };

  const activeNav = 'Menu';

  const closeCategoryDrawer = useCallback(() => setIsCategoryOpen(false), []);
  const closeAddDrawer = useCallback(() => setIsAddOpen(false), []);
  const closeEditDrawer = useCallback(() => setIsEditOpen(false), []);
  const closeCategoryListDrawer = useCallback(() => setIsCategoryListOpen(false), []);
  const closeArchivedCategoriesDrawer = useCallback(() => setIsArchivedCategoriesOpen(false), []);
  const closeCategoryMgmtDrawer = useCallback(() => {
    setIsCategoryMgmtOpen(false);
    setEditingCategoryID(null);
    setEditingCategoryForm({ categoryName: '', description: '' });
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    console.log('📥 [FETCH ALL DATA] Starting fetch from database...');

    const [{ data: catData, error: catErr }, { data: menuData, error: menuErr }] = await Promise.all([
      supabase.from('Category').select('*').order('categoryName'),
      supabase
        .from('MenuItem')
        .select('*, Category(categoryName), UsersAccount:updatedBy(username)')
        .order('name'),
    ]);

    if (catErr) {
      console.error('❌ [FETCH ERROR - Categories]', catErr);
    }
    if (menuErr) {
      console.error('❌ [FETCH ERROR - MenuItems]', menuErr);
    }

    if (catData) setCategories(catData as Category[]);
    
    if (menuData) {
      // Log the fetched data to see isAvailable values
      console.log('📊 [FETCHED MENU DATA] Total items:', menuData.length);
      const item1pc = menuData.find((m: any) => m.menuItemID === 2);
      if (item1pc) {
        console.log(`📌 [1pc Chicken w/ Rice] ID: 2, isAvailable: ${item1pc.isAvailable}`);
      }
      menuData.forEach((item: any) => {
        if (item.menuItemID <= 5) {
          console.log(`  📦 ${item.name}: isAvailable = ${item.isAvailable}`);
        }
      });
      setMenuItems((menuData as any) || []);
      console.log('✅ [FETCH COMPLETE] Menu items updated in state');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function runSyncAndFetch() {
      // Disabled sync for defense demo - no inventory integration needed
      // await fetch('/api/sync-all', { method: 'POST' });
      // console.log('⏳ [AFTER SYNC] Waiting 1.5 seconds for database replication...');
      // // Wait for Supabase to replicate changes to all nodes
      // await new Promise(resolve => setTimeout(resolve, 1500));
      // console.log('✅ [REPLICATION COMPLETE] Now fetching fresh data...');
      await fetchAllData();
    }
    runSyncAndFetch();
  }, [fetchAllData]);

  // ✨ Solution 1: Realtime subscription to MenuItem changes
  useEffect(() => {
    console.log('🔄 [REALTIME] Subscribing to MenuItem table changes...');
    
    const subscription = supabase
      .channel('public:MenuItem')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'MenuItem',
        },
        (payload) => {
          console.log('🔄 [REALTIME UPDATE] MenuItem changed:', payload.new.name);
          // Update the specific menu item in state
          setMenuItems((prev) =>
            prev.map((item) =>
              item.menuItemID === payload.new.menuItemID
                ? { ...item, isAvailable: payload.new.isAvailable }
                : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 [REALTIME] Unsubscribing from MenuItem table changes');
      subscription.unsubscribe();
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of menuItems) {
      if (item.status?.toLowerCase() === 'archived') continue;
      map.set(item.categoryID, (map.get(item.categoryID) || 0) + 1);
    }
    return map;
  }, [menuItems]);

  const totalCategoryItemCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of menuItems) {
      map.set(item.categoryID, (map.get(item.categoryID) || 0) + 1);
    }
    return map;
  }, [menuItems]);

  const activeMenuItemsCount = useMemo(
    () => menuItems.filter((i) => (i.status || '').toLowerCase() !== 'archived').length,
    [menuItems]
  );

  const archivedMenuItemsCount = useMemo(
    () => menuItems.filter((i) => (i.status || '').toLowerCase() === 'archived').length,
    [menuItems]
  );

  const visibleItems = useMemo(() => {
    let items =
      selectedMenuType === 'Archived Menu'
        ? menuItems.filter((i) => (i.status || '').toLowerCase() === 'archived')
        : menuItems.filter((i) => (i.status || '').toLowerCase() !== 'archived');

    if (selectedCatID !== 'all') items = items.filter((i) => i.categoryID === selectedCatID);

    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter((i) => {
        const cat = i.Category?.categoryName?.toLowerCase() || '';
        return (
          i.name.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          cat.includes(q) ||
          String(i.menuItemID).includes(q)
        );
      });
    }

    if (availabilityFilter === 'in') items = items.filter((i) => i.isAvailable);
    if (availabilityFilter === 'out') items = items.filter((i) => !i.isAvailable);

    const sorted = [...items];
    sorted.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'updated_desc') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return 0;
    });

    return sorted;
  }, [menuItems, selectedCatID, selectedMenuType, query, availabilityFilter, sortBy]);

  const activeCategoriesForForms = useMemo(
    () => categories.filter((c) => !c.categoryName.startsWith('[ARCHIVED]')),
    [categories]
  );

  const archivedCategories = useMemo(
    () => categories.filter((c) => c.categoryName.startsWith('[ARCHIVED]')),
    [categories]
  );

  const activeCategoriesForDisplay = useMemo(
    () => activeCategoriesForForms.slice(0, 6),
    [activeCategoriesForForms]
  );

  const archivedCategoriesCount = useMemo(
    () => archivedCategories.length,
    [archivedCategories]
  );

  const remainingCategoriesCount = useMemo(
    () => Math.max(0, activeCategoriesForForms.length - 6),
    [activeCategoriesForForms]
  );

  const openAddDrawer = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      regularPrice: '',
      categoryID: '',
      isAvailable: false,
      imageUrl: '',
    });
    setIsAddOpen(true);
  };

  const handlePriceInput = (value: string): string => {
    return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  };

  // ✨ Solution 3: Manual refresh handler
  const handleRefreshAvailability = async () => {
    setIsRefreshing(true);
    console.log('🔄 [REFRESH] User manually triggering availability sync...');
    try {
      const response = await fetch('/api/sync-all', { method: 'POST' });
      if (!response.ok) throw new Error('Sync failed');
      
      // Wait for sync to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      console.log('✅ [REFRESH] Sync complete, fetching fresh data...');
      await fetchAllData();
      
      showPopup({
        type: 'success',
        title: 'Availability refreshed',
        message: 'Menu availability has been updated based on current inventory.',
        confirmText: 'OK',
        onConfirm: closePopup,
      });
    } catch (err: any) {
      console.error('❌ [REFRESH ERROR]', err);
      showPopup({
        type: 'error',
        title: 'Refresh failed',
        message: err.message || 'Failed to refresh availability.',
        confirmText: 'Close',
        onConfirm: closePopup,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddCategory = async () => {
    if (!catForm.categoryName.trim()) {
      showPopup({
        type: 'warning',
        title: 'Missing category name',
        message: 'Please enter a category name.',
        confirmText: 'OK',
        onConfirm: closePopup,
      });
      return;
    }

    setCategorySubmitting(true);

    const { error } = await supabase.from('Category').insert([
      { categoryName: catForm.categoryName.trim(), description: catForm.description.trim() },
    ]);

    if (error) {
      showPopup({
        type: 'error',
        title: 'Failed to add category',
        message: error.message,
        confirmText: 'Close',
        onConfirm: closePopup,
      });
    } else {
      setIsCategoryOpen(false);
      setCatForm({ categoryName: '', description: '' });
      await fetchAllData();

      showPopup({
        type: 'success',
        title: 'Category added',
        message: 'The new category has been added successfully.',
        confirmText: 'OK',
        onConfirm: closePopup,
      });
    }

    setCategorySubmitting(false);
  };

  const handleAddItem = async () => {
    if (!form.name.trim() || !form.price || !form.categoryID) {
      showPopup({
        type: 'warning',
        title: 'Incomplete form',
        message: 'Please fill in Name, Price, and Category.',
        confirmText: 'OK',
        onConfirm: closePopup,
      });
      return;
    }

    const price = Number(form.price);
    const regular = form.regularPrice ? Number(form.regularPrice) : price;

    if (Number.isNaN(price) || Number.isNaN(regular)) {
      showPopup({
        type: 'warning',
        title: 'Invalid price',
        message: 'Please enter valid prices.',
        confirmText: 'OK',
        onConfirm: closePopup,
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('MenuItem').insert([
      {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        regularPrice: regular,
        categoryID: Number(form.categoryID),
        isAvailable: false,
        imageUrl: form.imageUrl.trim() || null,
        status: 'Active',
      },
    ]);

    if (error) {
      showPopup({
        type: 'error',
        title: 'Failed to add item',
        message: error.message,
        confirmText: 'Close',
        onConfirm: closePopup,
      });
    } else {
      setIsAddOpen(false);
      await fetch('/api/sync-all', { method: 'POST' });
      await fetchAllData();

      showPopup({
        type: 'success',
        title: 'Menu item added',
        message: `"${form.name.trim()}" has been added successfully.`,
        confirmText: 'OK',
        onConfirm: closePopup,
      });
    }

    setIsSubmitting(false);
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingItemID(item.menuItemID);
    setEditForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price ?? ''),
      regularPrice: String(item.regularPrice ?? ''),
      categoryID: String(item.categoryID ?? ''),
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItemID) return;

    const price = Number(editForm.price);
    const regular = Number(editForm.regularPrice);

    if (!editForm.name.trim() || !editForm.categoryID) {
      showPopup({
        type: 'warning',
        title: 'Incomplete form',
        message: 'Name and Category are required.',
        confirmText: 'OK',
        onConfirm: closePopup,
      });
      return;
    }

    if (Number.isNaN(price) || Number.isNaN(regular)) {
      showPopup({
        type: 'warning',
        title: 'Invalid price',
        message: 'Please enter valid prices.',
        confirmText: 'OK',
        onConfirm: closePopup,
      });
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    setIsSubmitting(true);

    const { error } = await supabase
      .from('MenuItem')
      .update({
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        price,
        regularPrice: regular,
        categoryID: Number(editForm.categoryID),
        imageUrl: editForm.imageUrl.trim() || null,
        updatedBy: user?.id,
      })
      .eq('menuItemID', editingItemID);

    if (error) {
      showPopup({
        type: 'error',
        title: 'Failed to update item',
        message: error.message,
        confirmText: 'Close',
        onConfirm: closePopup,
      });
    } else {
      setIsEditOpen(false);
      setEditingItemID(null);
      await fetch('/api/sync-all', { method: 'POST' });
      await fetchAllData();

      showPopup({
        type: 'success',
        title: 'Item updated',
        message: `"${editForm.name.trim()}" has been updated successfully.`,
        confirmText: 'OK',
        onConfirm: closePopup,
      });
    }

    setIsSubmitting(false);
  };

  const confirmArchiveItem = (item: MenuItem) => {
    showPopup({
      type: 'warning',
      title: 'Archive menu item?',
      message: (
        <>
          <p>
            Archive <span className="font-extrabold text-[#1E1E1E]">"{item.name}"</span>?
          </p>
          <p className="mt-2">This will move it to the archived menu tab.</p>
        </>
      ),
      confirmText: 'Archive',
      cancelText: 'Cancel',
      onCancel: closePopup,
      onConfirm: async () => {
        closePopup();

        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        setIsSubmitting(true);

        const { error } = await supabase
          .from('MenuItem')
          .update({
            status: 'Archived',
            isAvailable: false,
            updatedBy: user?.id,
          })
          .eq('menuItemID', item.menuItemID);

        if (error) {
          showPopup({
            type: 'error',
            title: 'Archive failed',
            message: error.message,
            confirmText: 'Close',
            onConfirm: closePopup,
          });
        } else {
          await fetchAllData();

          showPopup({
            type: 'success',
            title: 'Item archived',
            message: `"${item.name}" has been archived successfully.`,
            confirmText: 'OK',
            onConfirm: closePopup,
          });
        }

        setIsSubmitting(false);
      },
    });
  };

  const handleRestoreItem = (item: MenuItem) => {
    showPopup({
      type: 'info',
      title: 'Restore menu item?',
      message: (
        <>
          <p>
            Restore <span className="font-extrabold text-[#1E1E1E]">"{item.name}"</span>?
          </p>
          <p className="mt-2">This will bring it back to the normal menu list.</p>
        </>
      ),
      confirmText: 'Restore',
      cancelText: 'Cancel',
      onCancel: closePopup,
      onConfirm: async () => {
        closePopup();

        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        setIsSubmitting(true);

        const { error } = await supabase
          .from('MenuItem')
          .update({
            status: 'Active',
            updatedBy: user?.id,
          })
          .eq('menuItemID', item.menuItemID);

        if (error) {
          showPopup({
            type: 'error',
            title: 'Restore failed',
            message: error.message,
            confirmText: 'Close',
            onConfirm: closePopup,
          });
        } else {
          await fetchAllData();

          showPopup({
            type: 'success',
            title: 'Item restored',
            message: `"${item.name}" has been restored successfully.`,
            confirmText: 'OK',
            onConfirm: closePopup,
          });
        }

        setIsSubmitting(false);
      },
    });
  };

  const confirmPermanentDeleteItem = (item: MenuItem) => {
    showPopup({
      type: 'error',
      title: 'Delete menu item permanently?',
      message: (
        <>
          <p>
            Permanently delete <span className="font-extrabold text-[#1E1E1E]">"{item.name}"</span>?
          </p>
          <p className="mt-2">This action cannot be undone.</p>
        </>
      ),
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      onCancel: closePopup,
      onConfirm: async () => {
        closePopup();
        setIsSubmitting(true);

        const { error } = await supabase.from('MenuItem').delete().eq('menuItemID', item.menuItemID);

        if (error) {
          showPopup({
            type: 'error',
            title: 'Permanent delete failed',
            message: error.message,
            confirmText: 'Close',
            onConfirm: closePopup,
          });
        } else {
          await fetchAllData();

          showPopup({
            type: 'success',
            title: 'Item deleted permanently',
            message: `"${item.name}" has been deleted permanently.`,
            confirmText: 'OK',
            onConfirm: closePopup,
          });
        }

        setIsSubmitting(false);
      },
    });
  };

  const handleDeleteItem = (item: MenuItem) => {
    showActionChoice({
      title: 'Choose action for menu item',
      message: (
        <>
          <p>
            What do you want to do with <span className="font-extrabold text-[#1E1E1E]">"{item.name}"</span>?
          </p>
          <p className="mt-2">
            Archive will move it to the archived menu tab. Delete permanently will remove it completely from the database.
          </p>
        </>
      ),
      archiveText: 'Archive Item',
      deleteText: 'Delete Item Permanently',
      onArchive: () => {
        closeActionChoice();
        confirmArchiveItem(item);
      },
      onDelete: () => {
        closeActionChoice();
        confirmPermanentDeleteItem(item);
      },
    });
  };

  const handleRecipeClick = (item: MenuItem) => {
    setActiveRecipeItem(item);
    setIsRecipeOpen(true);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryID(cat.categoryID);
    setEditingCategoryForm({ categoryName: cat.categoryName, description: cat.description || '' });
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryID) return;

    if (!editingCategoryForm.categoryName.trim()) {
      showPopup({
        type: 'warning',
        title: 'Missing category name',
        message: 'Please enter a category name.',
        confirmText: 'OK',
        onConfirm: closePopup,
      });
      return;
    }

    setCategoryMgmtSubmitting(true);

    const { error } = await supabase
      .from('Category')
      .update({
        categoryName: editingCategoryForm.categoryName.trim(),
        description: editingCategoryForm.description.trim(),
      })
      .eq('categoryID', editingCategoryID);

    if (error) {
      showPopup({
        type: 'error',
        title: 'Failed to update category',
        message: error.message,
        confirmText: 'Close',
        onConfirm: closePopup,
      });
    } else {
      const savedName = editingCategoryForm.categoryName.trim();
      setEditingCategoryID(null);
      setEditingCategoryForm({ categoryName: '', description: '' });
      await fetchAllData();

      showPopup({
        type: 'success',
        title: 'Category updated',
        message: `"${savedName}" has been updated successfully.`,
        confirmText: 'OK',
        onConfirm: closePopup,
      });
    }

    setCategoryMgmtSubmitting(false);
  };

  const confirmArchiveCategory = async (cat: Category) => {
    const itemCount = categoryCounts.get(cat.categoryID) || 0;

    if (itemCount > 0) {
      showPopup({
        type: 'warning',
        title: 'Cannot archive category',
        message: (
          <>
            <p>
              Cannot archive <span className="font-extrabold text-[#1E1E1E]">"{cat.categoryName}"</span> because it has{' '}
              <span className="font-extrabold text-[#1E1E1E]">{itemCount}</span> active item(s).
            </p>
            <p className="mt-2">Please move or archive those items first.</p>
          </>
        ),
        confirmText: 'OK',
        onConfirm: closePopup,
      });
      return;
    }

    showPopup({
      type: 'warning',
      title: 'Archive category?',
      message: (
        <>
          <p>
            Archive <span className="font-extrabold text-[#1E1E1E]">"{cat.categoryName}"</span>?
          </p>
          <p className="mt-2">This will hide it from the category list. You can restore it later if needed.</p>
        </>
      ),
      confirmText: 'Archive',
      cancelText: 'Cancel',
      onCancel: closePopup,
      onConfirm: async () => {
        closePopup();

        setCategoryMgmtSubmitting(true);

        const { error } = await supabase
          .from('Category')
          .update({ categoryName: `[ARCHIVED] ${cat.categoryName}` })
          .eq('categoryID', cat.categoryID);

        if (error) {
          showPopup({
            type: 'error',
            title: 'Archive failed',
            message: error.message,
            confirmText: 'Close',
            onConfirm: closePopup,
          });
        } else {
          setEditingCategoryID(null);
          setEditingCategoryForm({ categoryName: '', description: '' });
          await fetchAllData();

          showPopup({
            type: 'success',
            title: 'Category archived',
            message: `"${cat.categoryName}" has been archived successfully.`,
            confirmText: 'OK',
            onConfirm: closePopup,
          });
        }

        setCategoryMgmtSubmitting(false);
      },
    });
  };

  const confirmPermanentDeleteCategory = async (cat: Category) => {
    const totalLinkedItems = totalCategoryItemCounts.get(cat.categoryID) || 0;

    if (totalLinkedItems > 0) {
      showPopup({
        type: 'warning',
        title: 'Cannot delete category permanently',
        message: (
          <>
            <p>
              Cannot permanently delete{' '}
              <span className="font-extrabold text-[#1E1E1E]">"{cat.categoryName}"</span> because it still has{' '}
              <span className="font-extrabold text-[#1E1E1E]">{totalLinkedItems}</span> linked menu item(s).
            </p>
            <p className="mt-2">Please move, archive, or permanently delete those items first.</p>
          </>
        ),
        confirmText: 'OK',
        onConfirm: closePopup,
      });
      return;
    }

    showPopup({
      type: 'error',
      title: 'Delete category permanently?',
      message: (
        <>
          <p>
            Permanently delete <span className="font-extrabold text-[#1E1E1E]">"{cat.categoryName}"</span>?
          </p>
          <p className="mt-2">This action cannot be undone.</p>
        </>
      ),
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      onCancel: closePopup,
      onConfirm: async () => {
        closePopup();

        setCategoryMgmtSubmitting(true);

        const { error } = await supabase.from('Category').delete().eq('categoryID', cat.categoryID);

        if (error) {
          showPopup({
            type: 'error',
            title: 'Permanent delete failed',
            message: error.message,
            confirmText: 'Close',
            onConfirm: closePopup,
          });
        } else {
          setEditingCategoryID(null);
          setEditingCategoryForm({ categoryName: '', description: '' });

          if (selectedCatID === cat.categoryID) {
            setSelectedCatID('all');
          }

          await fetchAllData();

          showPopup({
            type: 'success',
            title: 'Category deleted permanently',
            message: `"${cat.categoryName}" has been deleted permanently.`,
            confirmText: 'OK',
            onConfirm: closePopup,
          });
        }

        setCategoryMgmtSubmitting(false);
      },
    });
  };

  const handleCategoryDeleteOptions = (cat: Category) => {
    showActionChoice({
      title: 'Choose action for category',
      message: (
        <>
          <p>
            What do you want to do with <span className="font-extrabold text-[#1E1E1E]">"{cat.categoryName}"</span>?
          </p>
          <p className="mt-2">
            Archive will hide it from active categories. Delete permanently will remove it completely from the database.
          </p>
        </>
      ),
      archiveText: 'Archive Category',
      deleteText: 'Delete Category Permanently',
      onArchive: () => {
        closeActionChoice();
        confirmArchiveCategory(cat);
      },
      onDelete: () => {
        closeActionChoice();
        confirmPermanentDeleteCategory(cat);
      },
    });
  };

  const handleRestoreCategory = async (cat: Category) => {
    showPopup({
      type: 'info',
      title: 'Restore category?',
      message: (
        <>
          <p>
            Restore <span className="font-extrabold text-[#1E1E1E]">"{cat.categoryName}"</span>?
          </p>
          <p className="mt-2">This will bring it back to the active categories list.</p>
        </>
      ),
      confirmText: 'Restore',
      cancelText: 'Cancel',
      onCancel: closePopup,
      onConfirm: async () => {
        closePopup();

        setCategoryMgmtSubmitting(true);
        const restoredName = cat.categoryName.replace('[ARCHIVED] ', '');

        const { error } = await supabase
          .from('Category')
          .update({ categoryName: restoredName })
          .eq('categoryID', cat.categoryID);

        if (error) {
          showPopup({
            type: 'error',
            title: 'Restore failed',
            message: error.message,
            confirmText: 'Close',
            onConfirm: closePopup,
          });
        } else {
          setEditingCategoryID(null);
          setEditingCategoryForm({ categoryName: '', description: '' });
          await fetchAllData();

          showPopup({
            type: 'success',
            title: 'Category restored',
            message: `"${restoredName}" has been restored successfully.`,
            confirmText: 'OK',
            onConfirm: closePopup,
          });
        }

        setCategoryMgmtSubmitting(false);
      },
    });
  };

  return (
    <div className="h-screen overflow-hidden" style={{ backgroundColor: BG, color: TEXT }}>
      <div
        className={[
          'grid h-screen transition-[grid-template-columns] duration-200',
          collapsed ? 'grid-cols-[96px_1fr]' : 'grid-cols-[256px_1fr]',
        ].join(' ')}
      >
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeNav={activeNav} />

        <main className="h-screen overflow-y-auto space-y-5 p-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="h-10 w-10 rounded-full bg-white shadow flex items-center justify-center text-lg font-bold hover:bg-black/5 transition"
                aria-label="Toggle sidebar"
              >
                {collapsed ? '›' : '‹'}
              </button>
              <div>
                <p className="text-xl font-extrabold">Menu</p>
                <p className="text-xs text-black/45">Manage categories, items, pricing, and availability.</p>
              </div>
            </div>
          </header>

          <section className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold">Categories</p>
                <p className="text-xs text-black/45">Tap a category to filter items.</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canEditMenuItems && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsCategoryMgmtOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-[#F7F7F7] px-4 py-2.5 text-xs font-extrabold text-[#1E1E1E] transition hover:bg-black/5"
                    >
                      <MdEdit className="h-4 w-4 text-[#b80f24]" />
                      Manage Categories
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsArchivedCategoriesOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-[#F7F7F7] px-4 py-2.5 text-xs font-extrabold text-[#1E1E1E] transition hover:bg-black/5"
                    >
                      <MdArchive className="h-4 w-4 text-[#b80f24]" />
                      Archived Categories
                      {archivedCategoriesCount > 0 && (
                        <span className="rounded-full bg-[#b80f24] px-2 py-0.5 text-[10px] font-extrabold text-white">
                          {archivedCategoriesCount}
                        </span>
                      )}
                    </button>

                    <PrimaryButton onClick={() => setIsCategoryOpen(true)}>Add New Category</PrimaryButton>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setSelectedCatID('all')}
                className={[
                  'min-w-150px text-left rounded-2xl p-4 shadow-sm ring-1 transition',
                  selectedCatID === 'all'
                    ? 'bg-[#b80f24] text-white ring-[#b80f24]'
                    : 'bg-[#F7F7F7] text-[#1E1E1E] ring-black/5 hover:bg-black/0.03',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      'h-12 w-12 rounded-2xl grid place-items-center',
                      selectedCatID === 'all' ? 'bg-white text-[#b80f24]' : 'bg-white text-[#b80f24]',
                    ].join(' ')}
                  >
                    <MdGridView className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">All</p>
                    <p className={['text-xs', selectedCatID === 'all' ? 'text-white/85' : 'text-black/45'].join(' ')}>
                      {selectedMenuType === 'Archived Menu' ? archivedMenuItemsCount : activeMenuItemsCount} Items
                    </p>
                  </div>
                </div>
              </button>

              {activeCategoriesForDisplay.map((c) => {
                const count =
                  selectedMenuType === 'Archived Menu'
                    ? menuItems.filter(
                        (i) =>
                          i.categoryID === c.categoryID &&
                          (i.status || '').toLowerCase() === 'archived'
                      ).length
                    : categoryCounts.get(c.categoryID) || 0;

                const active = selectedCatID === c.categoryID;

                return (
                  <button
                    key={c.categoryID}
                    type="button"
                    onClick={() => setSelectedCatID(c.categoryID)}
                    className={[
                      'min-w-170px text-left rounded-2xl p-4 shadow-sm ring-1 transition',
                      active
                        ? 'bg-[#b80f24] text-white ring-[#b80f24]'
                        : 'bg-[#F7F7F7] text-[#1E1E1E] ring-black/5 hover:bg-black/0.03',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-white text-[#b80f24] grid place-items-center">
                        {getCategoryIcon(c.categoryName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold truncate">{c.categoryName}</p>
                        <p className={['text-xs', active ? 'text-white/85' : 'text-black/45'].join(' ')}>
                          {count} Items
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

              {remainingCategoriesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCategoryListOpen(true)}
                  className="min-w-170px text-left rounded-2xl p-4 shadow-sm ring-1 bg-[#F7F7F7] text-[#1E1E1E] ring-black/5 hover:bg-black/0.03 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-white text-[#b80f24] grid place-items-center">
                      <span className="text-lg font-extrabold">+</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold truncate">View All</p>
                      <p className="text-xs text-black/45">+{remainingCategoriesCount} more</p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-extrabold">
                  {selectedMenuType === 'Archived Menu' ? 'Archived Menu Items' : 'All Menu Items'}
                </p>
                <p className="text-xs text-black/45">Search, filter, and manage menu items.</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-[320px]">
                  <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-black/40" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, description, category, or ID…"
                    className="w-full rounded-xl bg-[#F3F3F3] pl-10 pr-3 py-3 text-xs outline-none ring-1 ring-transparent focus:ring-2 focus:ring-[#b80f24]/35"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-[#F3F3F3] px-3 py-2">
                    <MdTune className="h-5 w-5 text-black/40" />
                    <select
                      value={availabilityFilter}
                      onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                      className="bg-transparent text-xs font-bold outline-none"
                    >
                      <option value="all">All</option>
                      <option value="in">In Stock</option>
                      <option value="out">Out of Stock</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-[#F3F3F3] px-3 py-2">
                    <span className="text-xs font-extrabold text-black/50">Sort</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent text-xs font-bold outline-none"
                    >
                      <option value="name">Name</option>
                      <option value="price_asc">Price (Low)</option>
                      <option value="price_desc">Price (High)</option>
                      <option value="updated_desc">Recently Updated</option>
                    </select>
                  </div>

                  {selectedMenuType === 'Normal Menu' && canEditMenuItems && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefreshAvailability}
                        disabled={isRefreshing || loading}
                        className="grid h-10 w-10 place-items-center rounded-xl bg-white ring-1 ring-black/10 hover:bg-black/3 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh menu availability based on current inventory"
                      >
                        <MdRefresh className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </button>
                      <PrimaryButton onClick={openAddDrawer}>Add Menu Item</PrimaryButton>
                    </div>
                  )}
                  {selectedMenuType === 'Archived Menu' && canEditMenuItems && (
                    <button
                      onClick={handleRefreshAvailability}
                      disabled={isRefreshing || loading}
                      className="grid h-10 w-10 place-items-center rounded-xl bg-white ring-1 ring-black/10 hover:bg-black/3 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh menu availability based on current inventory"
                    >
                      <MdRefresh className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto border-b border-black/10">
              {menuTypes.map((type) => {
                const active = selectedMenuType === type;
                const count = type === 'Archived Menu' ? archivedMenuItemsCount : activeMenuItemsCount;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedMenuType(type);
                      setSelectedCatID('all');
                    }}
                    className={[
                      'px-4 py-2 text-xs font-extrabold whitespace-nowrap transition',
                      active ? 'border-b-2 text-[#b80f24] bg-[#b80f24]/5' : 'text-black/50 hover:text-[#b80f24]',
                    ].join(' ')}
                    style={active ? { borderColor: PRIMARY } : undefined}
                  >
                    {type} ({count})
                  </button>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-980px">
                  <thead className="bg-[#FAFAFA]">
                    <tr className="text-left text-[11px] font-extrabold text-black/55 uppercase">
                      <th className="p-3">Product</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Item ID</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Availability</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-black/10">
                    {loading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="p-3">
                            <div className="h-12 w-12 rounded-xl bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-44 rounded bg-black/10" />
                            <div className="mt-2 h-3 w-64 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-24 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-20 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-24 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-16 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-7 w-24 rounded-full bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="h-3 w-28 rounded bg-black/10" />
                            <div className="mt-2 h-3 w-36 rounded bg-black/10" />
                          </td>
                          <td className="p-3">
                            <div className="ml-auto flex gap-2 justify-end">
                              <div className="h-8 w-8 rounded-xl bg-black/10" />
                              <div className="h-8 w-8 rounded-xl bg-black/10" />
                              <div className="h-8 w-8 rounded-xl bg-black/10" />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : visibleItems.length ? (
                      visibleItems.map((item) => (
                        <tr key={item.menuItemID} className="hover:bg-black/0.02">
                          <td className="p-3">
                            <div className="h-12 w-12 rounded-xl bg-black/5 overflow-hidden ring-1 ring-black/10">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-black/30">
                                  <MdImage className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-[#1E1E1E] truncate">{item.name}</p>
                              <p className="text-xs text-black/45 truncate">{item.description || 'No description'}</p>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="text-sm font-extrabold text-black/65">
                              #{item.menuItemID.toString().padStart(8, '0')}
                            </span>
                          </td>

                          <td className="p-3">
                            <span className="text-sm font-extrabold text-black/65">
                              {item.Category?.categoryName || 'Uncategorized'}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-extrabold text-[#1E1E1E]">₱ {Number(item.price).toFixed(2)}</span>
                              {Number(item.regularPrice) > Number(item.price) && (
                                <span className="text-[11px] font-bold text-black/40 line-through">
                                  ₱ {Number(item.regularPrice).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <AvailabilityPill value={item.isAvailable} />
                          </td>

                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              {selectedMenuType === 'Normal Menu' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRecipeClick(item)}
                                    className="h-9 w-9 rounded-xl bg-blue-50 grid place-items-center hover:bg-blue-100 transition"
                                    title="Manage Recipe"
                                  >
                                    <MdReceiptLong className="h-4 w-4 text-blue-600" />
                                  </button>

                                  {canEditMenuItems && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleEditClick(item)}
                                        className="h-9 w-9 rounded-xl bg-black/5 grid place-items-center hover:bg-black/10 transition"
                                        title="Edit"
                                      >
                                        <MdEdit className="h-4 w-4 text-black/70" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item)}
                                        className="h-9 w-9 rounded-xl grid place-items-center text-white shadow transition active:scale-[0.99] disabled:opacity-50"
                                        style={{ backgroundColor: PRIMARY }}
                                        onMouseEnter={(e) => {
                                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_DARK;
                                        }}
                                        onMouseLeave={(e) => {
                                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
                                        }}
                                        title="Archive or Delete Permanently"
                                        disabled={isSubmitting}
                                      >
                                        <MdDelete className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreItem(item)}
                                    className="h-9 w-9 rounded-xl bg-blue-600 grid place-items-center hover:bg-blue-700 transition text-white"
                                    title="Restore"
                                    disabled={isSubmitting}
                                  >
                                    <MdRestore className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => confirmPermanentDeleteItem(item)}
                                    className="h-9 w-9 rounded-xl grid place-items-center text-white shadow transition active:scale-[0.99] disabled:opacity-50 bg-[#B80F24] hover:brightness-95"
                                    title="Delete Permanently"
                                    disabled={isSubmitting}
                                  >
                                    <MdDeleteForever className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-black/50 text-sm font-bold">
                          {selectedMenuType === 'Archived Menu'
                            ? 'No archived menu items found.'
                            : 'No menu items found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-[#FAFAFA] border-t border-black/10">
                <p className="text-xs font-bold text-black/45">
                  Showing <span className="text-black/70">{visibleItems.length}</span> item(s)
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setAvailabilityFilter('all');
                    setSortBy('name');
                    setSelectedCatID('all');
                    setSelectedMenuType('Normal Menu');
                  }}
                  className="text-xs font-extrabold text-[#b80f24] hover:underline"
                >
                  Reset filters
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      <RightDrawer open={isCategoryOpen} title="Add New Category" onClose={closeCategoryDrawer}>
        <div className="space-y-5">
          <Field label="Category Name">
            <TextInput
              value={catForm.categoryName}
              onChange={(e) => setCatForm({ ...catForm, categoryName: e.target.value })}
              placeholder="e.g. Main Course, Appetizers"
            />
          </Field>

          <Field label="Description">
            <TextArea
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Enter category description"
              rows={4}
            />
          </Field>

          <div className="pt-5 flex justify-end gap-2 border-t border-black/10">
            <GhostButton onClick={closeCategoryDrawer}>Cancel</GhostButton>
            <PrimaryButton disabled={categorySubmitting} onClick={handleAddCategory}>
              {categorySubmitting ? 'Saving...' : 'Save Category'}
            </PrimaryButton>
          </div>
        </div>
      </RightDrawer>

      <RightDrawer open={isAddOpen} title="Add New Menu Item" onClose={closeAddDrawer}>
        <div className="space-y-5">
          <Field label="Product Image (URL)">
            <div className="grid grid-cols-[96px_1fr] gap-4 items-start">
              <div className="h-24 w-24 rounded-2xl bg-black/5 ring-1 ring-black/10 overflow-hidden grid place-items-center text-black/30">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <MdImage className="h-10 w-10" />
                )}
              </div>
              <div>
                <TextInput
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="Paste image URL here"
                />
                <p className="mt-1 text-[10px] text-black/45">
                  Tip: use a direct image link (ending in .jpg/.png) if your preview doesn’t load.
                </p>
              </div>
            </div>
          </Field>

          <Field label="Item Name">
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Taiwan Fried Chicken"
            />
          </Field>

          <Field label="Description">
            <TextArea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter product description"
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Price (₱)">
              <TextInput
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: handlePriceInput(e.target.value) })}
                placeholder="0.00"
              />
            </Field>
          </div>

          <Field label="Category">
            <Select
              value={form.categoryID}
              onChange={(e) => setForm({ ...form, categoryID: e.target.value })}
            >
              <option value="">Select a category</option>
              {activeCategoriesForForms.map((c) => (
                <option key={c.categoryID} value={c.categoryID}>
                  {c.categoryName}
                </option>
              ))}
            </Select>
          </Field>

          <div className="pt-5 flex justify-end gap-2 border-t border-black/10">
            <GhostButton onClick={closeAddDrawer}>Cancel</GhostButton>
            <PrimaryButton disabled={isSubmitting} onClick={handleAddItem}>
              {isSubmitting ? 'Saving...' : 'Save Item'}
            </PrimaryButton>
          </div>
        </div>
      </RightDrawer>

      <RightDrawer open={isEditOpen} title="Edit Menu Item" onClose={closeEditDrawer}>
        <div className="space-y-5">
          <Field label="Product Image (URL)">
            <div className="space-y-2">
              <div className="h-32 w-full rounded-2xl bg-black/5 ring-1 ring-black/10 overflow-hidden grid place-items-center text-black/30">
                {editForm.imageUrl ? (
                  <img src={editForm.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <MdImage className="h-10 w-10" />
                )}
              </div>
              <TextInput
                type="text"
                value={editForm.imageUrl}
                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                placeholder="Paste image URL here"
              />
            </div>
          </Field>

          <Field label="Item Name">
            <TextInput value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </Field>

          <Field label="Description">
            <TextArea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Price (₱)">
              <TextInput
                inputMode="decimal"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: handlePriceInput(e.target.value) })}
              />
            </Field>
          </div>

          <Field label="Category">
            <Select
              value={editForm.categoryID}
              onChange={(e) => setEditForm({ ...editForm, categoryID: e.target.value })}
            >
              <option value="">Select a category</option>
              {activeCategoriesForForms.map((c) => (
                <option key={c.categoryID} value={c.categoryID}>
                  {c.categoryName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Availability">
            <span className="text-xs font-bold text-black/50">In Stock / Available</span>
          </Field>

          <div className="pt-5 flex justify-end gap-2 border-t border-black/10">
            <GhostButton onClick={closeEditDrawer}>Cancel</GhostButton>
            <PrimaryButton disabled={isSubmitting} onClick={handleUpdateItem}>
              {isSubmitting ? 'Updating...' : 'Update Item'}
            </PrimaryButton>
          </div>
        </div>
      </RightDrawer>

      <RightDrawer
        open={isCategoryListOpen}
        title="All Categories"
        onClose={closeCategoryListDrawer}
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-extrabold text-black/50 mb-3">ALL ACTIVE CATEGORIES</p>

            <div className="space-y-2 max-h-520px overflow-y-auto">
              {activeCategoriesForForms.length === 0 ? (
                <p className="text-xs text-black/45">No active categories</p>
              ) : (
                activeCategoriesForForms.map((c) => {
                  const activeItemCount = categoryCounts.get(c.categoryID) || 0;
                  const archivedItemCount = menuItems.filter(
                    (i) => i.categoryID === c.categoryID && (i.status || '').toLowerCase() === 'archived'
                  ).length;
                  const totalItemCount = totalCategoryItemCounts.get(c.categoryID) || 0;

                  return (
                    <button
                      key={c.categoryID}
                      type="button"
                      onClick={() => {
                        setSelectedCatID(c.categoryID);
                        closeCategoryListDrawer();
                      }}
                      className="w-full rounded-2xl bg-[#F7F7F7] p-4 text-left transition hover:bg-black/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-white text-[#b80f24] grid place-items-center ring-1 ring-black/5">
                            {getCategoryIcon(c.categoryName)}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-[#1E1E1E] truncate">{c.categoryName}</p>
                            <p className="text-[11px] text-black/45 truncate">
                              {c.description || 'No description'}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-xs font-extrabold text-[#1E1E1E]">{totalItemCount} total</p>
                          <p className="text-[10px] text-black/45">{activeItemCount} active</p>
                          <p className="text-[10px] text-black/45">{archivedItemCount} archived</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <p className="mt-4 text-[11px] text-black/45">
              Tap a category to filter the menu items table by that category.
            </p>
          </div>
        </div>
      </RightDrawer>

      <RightDrawer
        open={isCategoryMgmtOpen}
        title="Manage Categories"
        onClose={closeCategoryMgmtDrawer}
      >
        <div className="space-y-4">
          {editingCategoryID ? (
            <div>
              <p className="text-xs font-extrabold text-black/50 mb-3">EDITING CATEGORY</p>
              <div className="space-y-4">
                <Field label="Category Name">
                  <TextInput
                    value={editingCategoryForm.categoryName}
                    onChange={(e) => setEditingCategoryForm({ ...editingCategoryForm, categoryName: e.target.value })}
                    placeholder="e.g. Main Course"
                  />
                </Field>

                <Field label="Description">
                  <TextArea
                    value={editingCategoryForm.description}
                    onChange={(e) => setEditingCategoryForm({ ...editingCategoryForm, description: e.target.value })}
                    placeholder="Enter category description"
                    rows={3}
                  />
                </Field>

                <div className="pt-4 flex justify-end gap-2 border-t border-black/10">
                  <GhostButton
                    onClick={() => {
                      setEditingCategoryID(null);
                      setEditingCategoryForm({ categoryName: '', description: '' });
                    }}
                  >
                    Cancel
                  </GhostButton>
                  <PrimaryButton disabled={categoryMgmtSubmitting} onClick={handleUpdateCategory}>
                    {categoryMgmtSubmitting ? 'Saving...' : 'Save Changes'}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-extrabold text-black/50 mb-3">ACTIVE CATEGORIES</p>
                <div className="space-y-2 max-h-420px overflow-y-auto">
                  {activeCategoriesForForms.length === 0 ? (
                    <p className="text-xs text-black/45">No active categories</p>
                  ) : (
                    activeCategoriesForForms.map((c) => {
                      const itemCount = categoryCounts.get(c.categoryID) || 0;
                      return (
                        <div
                          key={c.categoryID}
                          className="flex items-center justify-between p-3 bg-[#F7F7F7] rounded-xl hover:bg-black/5 transition"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-black/80">{c.categoryName}</p>
                            <p className="text-[10px] text-black/45">{itemCount} item(s)</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditCategory(c)}
                              className="h-8 w-8 rounded-lg bg-black/5 grid place-items-center hover:bg-black/10 transition"
                              title="Edit"
                            >
                              <MdEdit className="h-4 w-4 text-black/70" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCategoryDeleteOptions(c)}
                              className="h-8 w-8 rounded-lg grid place-items-center text-white shadow transition active:scale-[0.99] disabled:opacity-50"
                              style={{ backgroundColor: PRIMARY }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_DARK;
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
                              }}
                              title="Archive or Delete Permanently"
                              disabled={categoryMgmtSubmitting}
                            >
                              <MdDelete className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </RightDrawer>

      <RightDrawer
        open={isArchivedCategoriesOpen}
        title="Archived Categories"
        onClose={closeArchivedCategoriesDrawer}
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-extrabold text-black/50 mb-3">
              ARCHIVED CATEGORIES ({archivedCategoriesCount})
            </p>

            <div className="space-y-2 max-h-500px overflow-y-auto">
              {archivedCategoriesCount === 0 ? (
                <p className="text-xs text-black/45">No archived categories</p>
              ) : (
                archivedCategories.map((c) => (
                  <div
                    key={c.categoryID}
                    className="flex items-center justify-between p-3 bg-black/5 rounded-xl hover:bg-black/10 transition opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-black/70">{c.categoryName}</p>
                      <p className="text-[10px] text-black/45">Archived category</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestoreCategory(c)}
                        className="h-8 w-8 rounded-lg grid place-items-center text-white shadow transition active:scale-[0.99] disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
                        title="Restore"
                        disabled={categoryMgmtSubmitting}
                      >
                        <MdRestore className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => confirmPermanentDeleteCategory(c)}
                        className="h-8 w-8 rounded-lg grid place-items-center text-white shadow transition active:scale-[0.99] disabled:opacity-50 bg-[#B80F24] hover:brightness-95"
                        title="Delete Permanently"
                        disabled={categoryMgmtSubmitting}
                      >
                        <MdDeleteForever className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </RightDrawer>

      {isRecipeOpen && activeRecipeItem && selectedMenuType === 'Normal Menu' && (
        <RecipeModal
          menuItem={activeRecipeItem}
          onClose={() => {
            setIsRecipeOpen(false);
            setActiveRecipeItem(null);
          }}
          canEdit={canEditMenuItems}
          currentUserID={currentUserID}
          onRecipeChange={async () => {
            await fetch('/api/sync-all', { method: 'POST' });
            console.log('⏳ [AFTER RECIPE CHANGE] Waiting 1.5 seconds for database replication...');
            // Wait for Supabase to replicate changes to all nodes
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log('✅ [REPLICATION COMPLETE] Now fetching fresh data...');
            await fetchAllData();
            showPopup({
              type: 'success',
              title: 'Recipe updated',
              message: 'Recipe changes were saved and menu availability was synced.',
              confirmText: 'OK',
              onConfirm: closePopup,
            });
          }}
        />
      )}

      <ActionChoiceModal
        open={actionChoice.open}
        title={actionChoice.title}
        message={actionChoice.message}
        archiveText={actionChoice.archiveText}
        deleteText={actionChoice.deleteText}
        hideArchive={actionChoice.hideArchive}
        loading={isSubmitting || categoryMgmtSubmitting}
        onArchive={actionChoice.onArchive}
        onDelete={actionChoice.onDelete || closeActionChoice}
        onCancel={closeActionChoice}
      />

      <PopupModal
        open={popup.open}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        confirmText={popup.confirmText}
        cancelText={popup.cancelText}
        loading={popup.loading}
        onConfirm={popup.onConfirm || closePopup}
        onCancel={popup.onCancel}
      />
    </div>
  );
}