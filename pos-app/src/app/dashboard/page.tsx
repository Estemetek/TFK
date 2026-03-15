'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  MdChevronLeft,
  MdChevronRight,
  MdWarning,
  MdCheckCircle,
  MdCancel,
  MdInsights,
  MdPieChart,
  MdRefresh,
  MdTrendingUp,
  MdPayments,
  MdCategory,
  MdToday,
  MdDateRange,
  MdClose,
  MdInfo,
  MdVisibility,
  MdDownload,
  MdAttachMoney,
} from 'react-icons/md';

// -------------------- Types --------------------
type UserRole = 'Manager' | 'Staff';
type Metric = { label: string; value: string; note: string; icon: React.ReactNode; accentVar?: string };
type Dish = { id: string; name: string; subtitle: string; status: 'In Stock' | 'Out of stock'; price: string };
type NavItem = { name: string; path?: string };

type DonutSeg = {
  id?: string;
  label: string;
  value: number;
  color: string;
  meta?: { pct?: number };
};

type LowStockItem = { name: string; currentStock: number; reorderLevel: number; unit: string };
type StockAlertKind = 'Critical' | 'Warning' | 'Healthy';
type StockAlertRow = LowStockItem & { kind: StockAlertKind; ratio: number; pct: number };

// -------------------- Helpers --------------------
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoneyPhp(amount: number) {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function clampMin1(n: number) {
  return n <= 0 ? 1 : n;
}

function buildPaletteColor(accentVar: string, strengthPct: number) {
  const pct = Math.max(30, Math.min(90, strengthPct));
  return `color-mix(in oklab, var(${accentVar}) ${pct}%, white ${100 - pct}%)`;
}

function formatWeekLabel(start: Date, end: Date) {
  const a = start.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
  const b = end.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
  return `${a} - ${b}`;
}

function genSegmentsFromMap(
  entries: Array<{ id?: string; label: string; value: number }>,
  accentVar: string,
  topN = 6
): DonutSeg[] {
  const cleaned = entries.filter((e) => e.value > 0).sort((a, b) => b.value - a.value);

  if (!cleaned.length) return [{ label: 'No data', value: 1, color: 'rgba(0,0,0,0.12)' }];

  const top = cleaned.slice(0, topN);
  const rest = cleaned.slice(topN);
  const othersValue = rest.reduce((a, x) => a + x.value, 0);

  const strengths = [86, 80, 74, 68, 62, 56, 50, 46];

  const segs: DonutSeg[] = top.map((t, idx) => ({
    id: t.id,
    label: t.label,
    value: t.value,
    color: buildPaletteColor(accentVar, strengths[idx] ?? 52),
  }));

  if (othersValue > 0) segs.push({ label: 'Others', value: othersValue, color: 'rgba(0,0,0,0.18)' });

  const total = segs.reduce((a, s) => a + s.value, 0) || 1;
  return segs.map((s) => ({ ...s, meta: { pct: Math.round((s.value / total) * 1000) / 10 } }));
}

function downloadCSV(filename: string, rows: Array<Record<string, any>>) {
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const esc = (v: any) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv = [headers.join(',')].concat(rows.map((r) => headers.map((h) => esc(r[h])).join(','))).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function calcStockAlertRow(i: LowStockItem): StockAlertRow {
  const level = Math.max(1, safeNum(i.reorderLevel));
  const stock = safeNum(i.currentStock);

  const ratio = stock / level;
  const pct = Math.max(0, Math.min(160, ratio * 100));

  let kind: StockAlertKind = 'Healthy';
  if (stock <= level) kind = 'Critical';
  else if (stock <= level * 1.25) kind = 'Warning';

  return { ...i, kind, ratio, pct };
}

function getExpenseAmount(row: any) {
  return safeNum(row?.amount ?? row?.expenseAmount ?? row?.totalAmount ?? row?.value ?? row?.cost ?? row?.price ?? 0);
}

function getExpenseDate(row: any) {
  return row?.createdAt ?? row?.expenseDate ?? row?.dateCreated ?? row?.date ?? row?.transactionDate ?? null;
}

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <MdDashboard className="h-5 w-5" />,
  Menu: <MdRestaurantMenu className="h-5 w-5" />,
  'User Management': <MdPeople className="h-5 w-5" />,
  Inventory: <MdInventory2 className="h-5 w-5" />,
  Reports: <MdAssessment className="h-5 w-5" />,
  Order: <MdShoppingCart className="h-5 w-5" />,
};

// -------------------- UI Bits --------------------
const StatusPill = ({ status }: { status: 'In Stock' | 'Out of stock' }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ring-1',
      status === 'In Stock' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-red-50 text-red-700 ring-red-200'
    )}
  >
    {status === 'In Stock' ? <MdCheckCircle className="h-3.5 w-3.5" /> : <MdCancel className="h-3.5 w-3.5" />}
    {status}
  </span>
);

const DishRow = ({ dish }: { dish: Dish }) => (
  <div className="group flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur px-3 py-3 shadow-sm ring-1 ring-card-border transition hover:-translate-y-0.5 hover:shadow">
    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-card ring-1 ring-card-border">
      <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-primary/70 via-primary-dark/50 to-surface-dark" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-black text-foreground">{dish.name}</p>
      <p className="truncate text-xs text-text-muted">{dish.subtitle}</p>
    </div>
    <div className="flex flex-col items-end gap-1 text-right">
      <StatusPill status={dish.status} />
      <span className="text-sm font-black text-foreground/80">{dish.price}</span>
    </div>
  </div>
);

const LowStockRow = ({
  item,
}: {
  item: { name: string; stock: number; level: number; unit: string; kind?: StockAlertKind };
}) => {
  const kind = item.kind ?? 'Critical';
  const isCritical = kind === 'Critical';
  const isWarning = kind === 'Warning';

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur px-3 py-3 shadow-sm ring-1 ring-card-border">
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl',
          isCritical ? 'bg-red-50 text-red-500' : isWarning ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
        )}
      >
        <MdWarning size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-foreground">{item.name}</p>
        <p className="text-[10px] text-text-muted">
          Threshold: {item.level} {item.unit}{' '}
          <span className={cn('ml-2 font-black', isCritical ? 'text-red-600' : isWarning ? 'text-amber-700' : 'text-green-700')}>
            {kind}
          </span>
        </p>
      </div>
      <div className="text-right">
        <p className={cn('text-sm font-black', isCritical ? 'text-red-600' : isWarning ? 'text-amber-700' : 'text-green-700')}>
          {item.stock} {item.unit}
        </p>
      </div>
    </div>
  );
};

function Tooltip({
  open,
  x,
  y,
  title,
  lines,
}: {
  open: boolean;
  x: number;
  y: number;
  title?: string;
  lines: string[];
}) {
  if (!open) return null;
  return (
    <div className="fixed z-9999 pointer-events-none" style={{ left: x + 12, top: y + 12, maxWidth: 260 }}>
      <div className="rounded-2xl bg-white shadow-lg ring-1 ring-card-border px-3 py-2">
        {title && <div className="text-xs font-black text-foreground mb-0.5">{title}</div>}
        {lines.map((t, i) => (
          <div key={i} className="text-[11px] text-foreground/80">
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

function SegLegend({
  segments,
  activeLabel,
  onHover,
  rightLabel,
}: {
  segments: DonutSeg[];
  activeLabel?: string | null;
  onHover?: (label: string | null) => void;
  rightLabel?: (s: DonutSeg) => React.ReactNode;
}) {
  return (
    <div className="max-h-170px overflow-auto pr-2 space-y-2 w-full">
      {segments.map((s) => {
        const active = activeLabel === s.label;
        return (
          <button
            key={s.label}
            type="button"
            onMouseEnter={() => onHover?.(s.label)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(s.label)}
            onBlur={() => onHover?.(null)}
            className={cn(
              'w-full flex items-center justify-between gap-4 rounded-xl px-2 py-1 transition text-left',
              active ? 'bg-surface-dark/10' : 'hover:bg-surface-dark/5'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ background: s.color }} />
              <p className="text-xs font-black truncate">{s.label}</p>
            </div>
            <div className="text-xs font-black">{rightLabel ? rightLabel(s) : s.value}</div>
          </button>
        );
      })}
    </div>
  );
}

function DonutChart({
  segments,
  size = 150,
  strokeWidth = 18,
  centerLabel,
  activeLabel,
  onActiveChange,
  onClickSeg,
}: {
  segments: DonutSeg[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: { top: string; bottom: string };
  activeLabel?: string | null;
  onActiveChange?: (label: string | null) => void;
  onClickSeg?: (label: string) => void;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth} />
        {segments.map((s, idx) => {
          const segLen = (s.value / total) * circumference;
          const dasharray = `${segLen} ${circumference - segLen}`;
          const dashoffset = -offset;
          offset += segLen;

          const active = !activeLabel || activeLabel === s.label;

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              style={{
                opacity: active ? 1 : 0.25,
                cursor: 'pointer',
                transition: 'opacity 160ms ease',
              }}
              onMouseEnter={() => onActiveChange?.(s.label)}
              onMouseLeave={() => onActiveChange?.(null)}
              onClick={() => onClickSeg?.(s.label)}
            />
          );
        })}
      </svg>

      {centerLabel && (
        <div className="absolute inset-0 grid place-items-center select-none">
          <div className="text-center">
            <p className="text-xl font-black">{centerLabel.top}</p>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{centerLabel.bottom}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: Array<{ value: string; label: string; icon?: React.ReactNode }>;
}) {
  return (
    <div className="inline-flex rounded-2xl bg-white/70 ring-1 ring-card-border p-1">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition',
              active ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-foreground'
            )}
            type="button"
          >
            {it.icon}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-90 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-95 h-screen w-full sm:w-420px bg-white shadow-2xl ring-1 ring-card-border">
        <div className="flex items-center justify-between p-4 border-b border-card-border">
          <div className="min-w-0">
            <p className="text-xs font-black text-text-muted uppercase tracking-widest">Details</p>
            <h3 className="text-lg font-black truncate">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-2xl bg-white ring-1 ring-card-border hover:bg-slate-50 grid place-items-center"
            type="button"
            title="Close"
          >
            <MdClose />
          </button>
        </div>
        <div className="p-4 overflow-auto h-[calc(100vh-72px)]">{children}</div>
      </div>
    </>
  );
}

function AppSidebar({
  isMobile,
  collapsed,
  navItems,
  activeNav,
  onNavigate,
  onLogout,
}: {
  isMobile?: boolean;
  collapsed: boolean;
  navItems: NavItem[];
  activeNav: string;
  onNavigate: (path?: string) => void;
  onLogout: () => void;
}) {
  const isCollapsed = isMobile ? false : collapsed;

  return (
    <aside className={cn('flex h-full flex-col items-stretch gap-4 bg-surface/80 backdrop-blur px-3 py-5 shadow-md ring-1 ring-card-border', !isMobile && 'rounded-r-2xl')}>
      <div className="mb-2 flex items-center gap-3 px-2">
        <img src="/TFK.png" alt="TFK Logo" className="h-12 w-12 rounded-full shadow ring-1 ring-card-border" />
        {!isCollapsed && (
          <div className="min-w-0">
            <span className="block truncate text-sm font-black text-foreground">Taiwan Fried Kitchen</span>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">POS Dashboard</span>
          </div>
        )}
      </div>

      <nav className={cn('flex w-full flex-col gap-2', isCollapsed ? 'items-center' : '')}>
        {navItems.map((item) => {
          const isActive = item.name === activeNav;
          return (
            <button
              key={item.name}
              onClick={() => onNavigate(item.path)}
              className={cn(
                'flex items-center rounded-2xl ring-1 ring-card-border transition hover:-translate-y-0.5 hover:shadow',
                isCollapsed ? 'h-14 w-14 self-center bg-card/70 justify-center' : 'h-12 w-full bg-card/70 px-2 gap-3'
              )}
              type="button"
            >
              <span className={cn('grid h-10 w-10 place-items-center rounded-full shadow-inner transition', isActive ? 'bg-primary text-white' : 'bg-white text-text-muted')}>
                {iconMap[item.name]}
              </span>
              {!isCollapsed && <span className={cn('text-xs font-extrabold', isActive ? 'text-foreground' : 'text-text-muted')}>{item.name}</span>}
            </button>
          );
        })}
      </nav>

      <div className={cn('mt-auto', isCollapsed ? '' : 'px-2')}>
        <button
          onClick={onLogout}
          className={cn(
            'ring-1 ring-card-border transition hover:shadow',
            isCollapsed ? 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-dark text-white' : 'flex w-full items-center gap-3 rounded-2xl bg-card/70 px-2 py-2'
          )}
          type="button"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-text-muted shadow-inner">
            <MdLogout className="h-5 w-5" />
          </span>
          {!isCollapsed && <span className="text-xs font-extrabold text-text-muted">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

function StockAlertMeter({
  total,
  critical,
  warning,
  topRows,
  onViewAll,
}: {
  total: number;
  critical: number;
  warning: number;
  topRows: StockAlertRow[];
  onViewAll: () => void;
}) {
  const healthy = Math.max(0, total - critical - warning);
  const denom = Math.max(1, total);
  const criticalPct = (critical / denom) * 100;
  const warningPct = (warning / denom) * 100;
  const healthyPct = (healthy / denom) * 100;

  const chip = (label: string, value: number, cls: string) => (
    <span className={cn('inline-flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-black ring-1', cls)}>
      <span className="tabular-nums">{value}</span>
      <span className="uppercase tracking-widest">{label}</span>
    </span>
  );

  const barSeg = (pct: number, varName: string) => (
    <div style={{ width: `${pct}%`, background: buildPaletteColor(varName, 80) }} className="h-full" aria-hidden />
  );

  const meterRow = (r: StockAlertRow) => {
    const varName = r.kind === 'Critical' ? '--accent-red' : r.kind === 'Warning' ? '--accent-gold' : '--accent-green';
    const labelRight = r.kind === 'Critical' ? 'Critical' : r.kind === 'Warning' ? 'Warning' : 'Healthy';

    return (
      <div key={`${r.name}-${r.unit}`} className="rounded-2xl bg-white/80 ring-1 ring-card-border px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black truncate">{r.name}</p>
          <span
            className={cn(
              'shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full ring-1',
              r.kind === 'Critical'
                ? 'bg-red-50 text-red-700 ring-red-200'
                : r.kind === 'Warning'
                ? 'bg-amber-50 text-amber-700 ring-amber-200'
                : 'bg-green-50 text-green-700 ring-green-200'
            )}
          >
            {labelRight}
          </span>
        </div>

        <div className="mt-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-dark/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, r.pct))}%`,
                background: buildPaletteColor(varName, 84),
              }}
            />
          </div>

          <div className="mt-1 flex items-center justify-between text-[10px] text-text-muted">
            <span className="font-black tabular-nums text-foreground/80">
              {safeNum(r.currentStock)} {r.unit}
            </span>
            <span className="font-bold">
              Reorder: <span className="font-black">{safeNum(r.reorderLevel)}</span> {r.unit}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-white/70 ring-1 ring-card-border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
            <MdWarning /> Stock Alert Level
          </p>
          <p className="text-[10px] text-text-muted mt-1">Visible summary beside the graphs</p>
        </div>

        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
          type="button"
          title="View all stock levels"
        >
          <MdVisibility className="h-4 w-4" />
          View all
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chip('Critical', critical, 'bg-red-50 text-red-700 ring-red-200')}
        {chip('Warning', warning, 'bg-amber-50 text-amber-700 ring-amber-200')}
        {chip('Healthy', healthy, 'bg-green-50 text-green-700 ring-green-200')}
        <span className="ml-auto text-[10px] font-black px-2 py-1 rounded-full bg-white/80 ring-1 ring-card-border">
          Total: <span className="tabular-nums">{total}</span>
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-dark/10 ring-1 ring-card-border">
        <div className="flex h-full w-full">
          {barSeg(criticalPct, '--accent-red')}
          {barSeg(warningPct, '--accent-gold')}
          {barSeg(healthyPct, '--accent-green')}
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {topRows.length ? (
          topRows.map(meterRow)
        ) : (
          <div className="p-4 rounded-2xl bg-green-50/50 ring-1 ring-green-200 text-[10px] font-black uppercase tracking-widest text-green-700 text-center">
            Inventory Healthy
          </div>
        )}
      </div>

      <div className="mt-3 text-[10px] text-text-muted">Rule: Critical = stock ≤ reorder level, Warning = stock ≤ 125% of reorder level.</div>
    </div>
  );
}

function SalesExpensesChart({
  salesPoints,
  expensePoints,
  labels,
  onHoverPoint,
}: {
  salesPoints: number[];
  expensePoints: number[];
  labels: string[];
  onHoverPoint?: (payload: { index: number | null; x: number; y: number; kind: 'sales' | 'expenses' | null }) => void;
}) {
  const w = 720;
  const h = 240;
  const padX = 24;
  const padY = 18;

  const all = [...salesPoints, ...expensePoints];
  const maxV = Math.max(...all, 1);
  const minV = 0;

  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const scaleX = (i: number) => padX + (i * innerW) / Math.max(1, salesPoints.length - 1);
  const scaleY = (v: number) => {
    const denom = maxV - minV || 1;
    const t = (v - minV) / denom;
    return h - padY - t * innerH;
  };

  const makeLine = (points: number[]) =>
    points
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(2)} ${scaleY(v).toFixed(2)}`)
      .join(' ');

  const makeArea = (points: number[]) => {
    const line = makeLine(points);
    return `${line} L ${scaleX(points.length - 1).toFixed(2)} ${(h - padY).toFixed(2)} L ${scaleX(0).toFixed(2)} ${(h - padY).toFixed(2)} Z`;
  };

  const salesLine = makeLine(salesPoints);
  const salesArea = makeArea(salesPoints);
  const expensesLine = makeLine(expensePoints);
  const expensesArea = makeArea(expensePoints);

  return (
    <div className="rounded-2xl bg-white/75 ring-1 ring-card-border p-4 overflow-visible">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-foreground">Sales and Expenses</p>
          <p className="text-[10px] text-text-muted uppercase tracking-widest">4-week comparison</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 ring-1 ring-card-border">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: buildPaletteColor('--primary', 82) }} />
            Sales
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 ring-1 ring-card-border">
            <span className="h-2.5 w-2.5 rounded-full bg-black" />
            Expenses
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-250px overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
          const y = padY + innerH * t;
          return <line key={idx} x1={padX} x2={w - padX} y1={y} y2={y} stroke="rgba(0,0,0,0.08)" strokeDasharray="4 4" />;
        })}

        <path d={salesArea} fill={buildPaletteColor('--primary', 20)} />
        <path d={expensesArea} fill="rgba(0,0,0,0.12)" />

        <path
          d={salesLine}
          fill="none"
          stroke={buildPaletteColor('--primary', 84)}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d={expensesLine} fill="none" stroke="black" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {salesPoints.map((v, i) => {
          const cx = scaleX(i);
          const cy = scaleY(v);
          return (
            <g key={`sales-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r="12"
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={(e: any) => onHoverPoint?.({ index: i, x: e.clientX, y: e.clientY, kind: 'sales' })}
                onMouseLeave={() => onHoverPoint?.({ index: null, x: 0, y: 0, kind: null })}
              />
              <circle cx={cx} cy={cy} r="4" fill={buildPaletteColor('--primary', 84)} />
            </g>
          );
        })}

        {expensePoints.map((v, i) => {
          const cx = scaleX(i);
          const cy = scaleY(v);
          return (
            <g key={`expenses-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r="12"
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={(e: any) => onHoverPoint?.({ index: i, x: e.clientX, y: e.clientY, kind: 'expenses' })}
                onMouseLeave={() => onHoverPoint?.({ index: null, x: 0, y: 0, kind: null })}
              />
              <circle cx={cx} cy={cy} r="4" fill="black" />
            </g>
          );
        })}
      </svg>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {labels.map((label, idx) => (
          <div key={idx} className="text-center">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{label}</p>
            <p className="mt-1 text-[10px] text-red-500">{fmtMoneyPhp(salesPoints[idx] ?? 0)}</p>
            <p className="text-[10px] text-black">{fmtMoneyPhp(expensePoints[idx] ?? 0)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  // -------------------- State --------------------
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [popularDishes, setPopularDishes] = useState<Dish[]>([]);
  const [recentOrders, setRecentOrders] = useState<Dish[]>([]);
  const [lowStockIngredients, setLowStockIngredients] = useState<LowStockItem[]>([]);

  const [stockTotal, setStockTotal] = useState(0);
  const [stockCritical, setStockCritical] = useState(0);
  const [stockWarning, setStockWarning] = useState(0);
  const [stockTopRows, setStockTopRows] = useState<StockAlertRow[]>([]);

  const [range, setRange] = useState<'today' | '7d'>('today');

  const [salesWeekly, setSalesWeekly] = useState<number[]>([0, 0, 0, 0]);
  const [expensesWeekly, setExpensesWeekly] = useState<number[]>([0, 0, 0, 0]);

  const [salesWeeklyLabels, setSalesWeeklyLabels] = useState<string[]>([]);
  const [expensesWeeklyLabels, setExpensesWeeklyLabels] = useState<string[]>([]);

  const [mixMenuToday, setMixMenuToday] = useState<DonutSeg[]>([]);
  const [mixMenuAll, setMixMenuAll] = useState<DonutSeg[]>([]);
  const [mixPaymentsToday, setMixPaymentsToday] = useState<DonutSeg[]>([]);
  const [mixCategoryToday, setMixCategoryToday] = useState<DonutSeg[]>([]);

  const [activeDonut, setActiveDonut] = useState<{ key: string; label: string | null }>({ key: 'menu', label: null });
  const [lockedDonut, setLockedDonut] = useState<{ key: string; label: string | null }>({ key: 'menu', label: null });

  const [tip, setTip] = useState<{ open: boolean; x: number; y: number; title?: string; lines: string[] }>({
    open: false,
    x: 0,
    y: 0,
    title: '',
    lines: [],
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerRows, setDrawerRows] = useState<Array<Record<string, any>>>([]);

  const pageRef = useRef<HTMLDivElement | null>(null);

  // -------------------- Derived --------------------
  const activeNav = useMemo(() => {
    const all = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Menu', path: '/menu' },
      { name: 'User Management', path: '/staff' },
      { name: 'Inventory', path: '/inventory' },
      { name: 'Reports', path: '/reports' },
      { name: 'Order', path: '/order' },
    ];
    return all.find((x) => x.path === pathname)?.name ?? 'Dashboard';
  }, [pathname]);

  const donutMenu = useMemo(() => {
    const segs = range === 'today' ? mixMenuToday : mixMenuAll;
    return segs.length ? segs : [{ label: 'No data', value: 1, color: 'rgba(0,0,0,0.12)', meta: { pct: 100 } }];
  }, [mixMenuToday, mixMenuAll, range]);

  const donutPayments = useMemo(() => {
    return mixPaymentsToday.length ? mixPaymentsToday : [{ label: 'No data', value: 1, color: 'rgba(0,0,0,0.12)', meta: { pct: 100 } }];
  }, [mixPaymentsToday]);

  const donutCategory = useMemo(() => {
    return mixCategoryToday.length ? mixCategoryToday : [{ label: 'No data', value: 1, color: 'rgba(0,0,0,0.12)', meta: { pct: 100 } }];
  }, [mixCategoryToday]);

  const totalOrdersMenu = useMemo(() => donutMenu.reduce((a, s) => a + s.value, 0), [donutMenu]);
  const totalPaymentsToday = useMemo(() => donutPayments.reduce((a, s) => a + s.value, 0), [donutPayments]);
  const totalCategoryToday = useMemo(() => donutCategory.reduce((a, s) => a + s.value, 0), [donutCategory]);

  const activeLabelFor = (key: string) => {
    if (lockedDonut.key === key && lockedDonut.label) return lockedDonut.label;
    if (activeDonut.key === key) return activeDonut.label;
    return null;
  };

  // -------------------- Actions --------------------
  const handleLogout = async () => {
    await logout();
  };

  const openDrawer = (title: string, rows: Array<Record<string, any>>) => {
    setDrawerTitle(title);
    setDrawerRows(rows);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerTitle('');
    setDrawerRows([]);
  };

  const fetchExpenseRows = async (todayIso: string, startWeeklyIso: string) => {
    const expenseSelect = '*';

    const todayExpenseFromExpense = supabase.from('Expense').select(expenseSelect).gte('createdAt', todayIso);
    const weeklyExpenseFromExpense = supabase.from('Expense').select(expenseSelect).gte('createdAt', startWeeklyIso);

    const todayExpenseFromExpenses = supabase.from('Expenses').select(expenseSelect).gte('createdAt', todayIso);
    const weeklyExpenseFromExpenses = supabase.from('Expenses').select(expenseSelect).gte('createdAt', startWeeklyIso);

    let todayRows: any[] = [];
    let weeklyRows: any[] = [];

    const firstTry = await Promise.allSettled([todayExpenseFromExpense, weeklyExpenseFromExpense]);

    const firstToday = firstTry[0].status === 'fulfilled' ? firstTry[0].value : null;
    const firstWeekly = firstTry[1].status === 'fulfilled' ? firstTry[1].value : null;

    const firstHasData = !firstToday?.error || !firstWeekly?.error;

    if (firstHasData && (!firstToday?.error || !firstWeekly?.error)) {
      todayRows = firstToday?.data || [];
      weeklyRows = firstWeekly?.data || [];
      return { todayRows, weeklyRows };
    }

    const secondTry = await Promise.allSettled([todayExpenseFromExpenses, weeklyExpenseFromExpenses]);

    const secondToday = secondTry[0].status === 'fulfilled' ? secondTry[0].value : null;
    const secondWeekly = secondTry[1].status === 'fulfilled' ? secondTry[1].value : null;

    todayRows = secondToday?.data || [];
    weeklyRows = secondWeekly?.data || [];

    return { todayRows, weeklyRows };
  };

  const fetchDashboardData = async () => {
    const today = startOfDay(new Date());
    const currentWeekStart = startOfWeek(today);
    const start4Weeks = startOfWeek(addDays(currentWeekStart, -21));

    try {
      const ordersTodayQ = supabase.from('Order').select('orderID, amount, createdAt, paymentmethod').gte('createdAt', today.toISOString());

      const ordersWeeklyQ = supabase.from('Order').select('orderID, amount, createdAt').gte('createdAt', start4Weeks.toISOString());

      const ingredientsQ = supabase.from('Ingredient').select('name, currentStock, reorderLevel, unit');

      const itemsQ = supabase
        .from('MenuItem')
        .select(`menuItemID, name, price, isAvailable, Category(categoryName)`)
        .order('menuItemID', { ascending: false })
        .limit(5);

      const recentOrdersQ = supabase.from('Order').select('*').order('createdAt', { ascending: false }).limit(5);

      const orderItemsAllQ = supabase.from('OrderItem').select('orderID, menuItemID, quantity, MenuItem(name, Category(categoryName))');

      const orderItemsTodayQ = supabase
        .from('OrderItem')
        .select('orderID, menuItemID, quantity, MenuItem(name, Category(categoryName)), Order(createdAt)')
        .gte('Order.createdAt', today.toISOString());

      const expenseBundlePromise = fetchExpenseRows(today.toISOString(), start4Weeks.toISOString());

      const [
        { data: ordersToday, error: ordersTodayErr },
        { data: ordersWeeklyData, error: ordersWeeklyErr },
        { data: ingredients, error: ingErr },
        { data: items, error: itemsErr },
        { data: recentTx, error: txErr },
        { data: oiAll, error: oiAllErr },
        { data: oiToday, error: oiTodayErr },
        expenseBundle,
      ] = await Promise.all([
        ordersTodayQ,
        ordersWeeklyQ,
        ingredientsQ,
        itemsQ,
        recentOrdersQ,
        orderItemsAllQ,
        orderItemsTodayQ,
        expenseBundlePromise,
      ]);

      if (ordersTodayErr) console.error(ordersTodayErr);
      if (ordersWeeklyErr) console.error(ordersWeeklyErr);
      if (ingErr) console.error(ingErr);
      if (itemsErr) console.error(itemsErr);
      if (txErr) console.error(txErr);
      if (oiAllErr) console.error('OrderItem all query error:', oiAllErr);
      if (oiTodayErr) console.error('OrderItem today query error:', oiTodayErr);

      const expenseTodayRows = expenseBundle.todayRows || [];
      const expenseWeeklyRows = expenseBundle.weeklyRows || [];

      const dailyTotal = (ordersToday || []).reduce((acc: number, curr: any) => acc + safeNum(curr.amount), 0);
      const dailyExpenseTotal = expenseTodayRows.reduce((acc: number, curr: any) => acc + getExpenseAmount(curr), 0);
      const ordersTodayCount = (ordersToday || []).length;

      // --- STOCK LEVELS ---
      const ingRows: LowStockItem[] =
        (ingredients || []).map((i: any) => ({
          name: i.name,
          currentStock: safeNum(i.currentStock),
          reorderLevel: safeNum(i.reorderLevel),
          unit: i.unit ?? '',
        })) || [];

      const alertRows = ingRows.map(calcStockAlertRow);
      const criticalRows = alertRows.filter((r) => r.kind === 'Critical');
      const warningRows = alertRows.filter((r) => r.kind === 'Warning');

      setStockTotal(alertRows.length);
      setStockCritical(criticalRows.length);
      setStockWarning(warningRows.length);

      const top = [...criticalRows, ...warningRows].sort((a, b) => a.ratio - b.ratio).slice(0, 4);
      setStockTopRows(top);

      const lowItems: LowStockItem[] = criticalRows.map((r) => ({
        name: r.name,
        currentStock: r.currentStock,
        reorderLevel: r.reorderLevel,
        unit: r.unit,
      }));

      setLowStockIngredients(lowItems.slice(0, 4));

      const lowNote = criticalRows.length > 0 ? 'Critical' : warningRows.length > 0 ? 'Warning' : 'All Good';

      setMetrics([
        {
          label: 'Daily Sales',
          value: fmtMoneyPhp(dailyTotal),
          note: 'Current Today',
          icon: <span className="font-black">₱</span>,
          accentVar: '--primary',
        },
        {
          label: 'Daily Expenses',
          value: fmtMoneyPhp(dailyExpenseTotal),
          note: expenseTodayRows.length ? 'Tracked Today' : 'No expense rows',
          icon: <MdAttachMoney />,
          accentVar: '--accent-red',
        },
        {
          label: 'Stock Alerts',
          value: `${criticalRows.length} Critical`,
          note: warningRows.length ? `+${warningRows.length} Warn` : lowNote,
          icon: <MdWarning />,
          accentVar: '--accent-gold',
        },
        {
          label: 'Orders Today',
          value: ordersTodayCount.toString(),
          note: 'Live Traffic',
          icon: <MdInsights />,
          accentVar: '--accent-green',
        },
      ]);

      setPopularDishes(
        (items || []).map((i: any) => ({
          id: String(i.menuItemID),
          name: i.name,
          subtitle: (i.Category as any)?.categoryName || 'Menu Item',
          status: i.isAvailable ? 'In Stock' : 'Out of stock',
          price: `₱${safeNum(i.price).toFixed(2)}`,
        }))
      );

      setRecentOrders(
        (recentTx || []).map((t: any) => ({
          id: String(t.orderID),
          name: `Order #${t.orderID}`,
          subtitle: t.paymentmethod || 'Walk-in',
          status: 'In Stock',
          price: `₱${safeNum(t.amount).toFixed(2)}`,
        }))
      );

      // ---- Weekly Sales & Expenses (4 weeks) ----
      const weekLabels: string[] = [];

      for (let i = 0; i < 4; i++) {
        const ws = addDays(start4Weeks, i * 7);
        const we = addDays(ws, 6);
        weekLabels.push(formatWeekLabel(ws, we));
      }

      const idxByWeek = (d: Date) => {
        const s = startOfWeek(d).getTime();
        const base = start4Weeks.getTime();
        return Math.round((s - base) / (7 * 24 * 60 * 60 * 1000));
      };

      const salesArr = new Array(4).fill(0);
      const expenseArr = new Array(4).fill(0);

      for (const o of ordersWeeklyData || []) {
        const created = new Date((o as any).createdAt);
        const i = idxByWeek(created);
        if (i >= 0 && i < 4) {
          salesArr[i] += safeNum((o as any).amount);
        }
      }

      for (const e of expenseWeeklyRows) {
        const rawDate = getExpenseDate(e);
        if (!rawDate) continue;
        const created = new Date(rawDate);
        const i = idxByWeek(created);
        if (i >= 0 && i < 4) {
          expenseArr[i] += getExpenseAmount(e);
        }
      }

      setSalesWeekly(salesArr);
      setExpensesWeekly(expenseArr);
      setSalesWeeklyLabels(weekLabels);
      setExpensesWeeklyLabels(weekLabels);

      // ---- Payment method mix (today) ----
      const pm = new Map<string, number>();
      for (const o of ordersToday || []) {
        const key = ((o as any).paymentmethod || 'Unknown').toString().trim() || 'Unknown';
        pm.set(key, (pm.get(key) || 0) + 1);
      }
      setMixPaymentsToday(genSegmentsFromMap(Array.from(pm.entries()).map(([label, value]) => ({ label, value })), '--accent-gold', 6));

      // ---- Menu item mix ----
      const mapMenuToday = new Map<string, number>();
      if (!oiTodayErr && Array.isArray(oiToday)) {
        for (const row of oiToday as any[]) {
          const qty = clampMin1(safeNum(row.quantity ?? 1));
          const name = row?.MenuItem?.name || `Item #${row.menuItemID}`;
          mapMenuToday.set(name, (mapMenuToday.get(name) || 0) + qty);
        }
        setMixMenuToday(genSegmentsFromMap(Array.from(mapMenuToday.entries()).map(([label, value]) => ({ label, value })), '--primary', 6));
      } else {
        setMixMenuToday([]);
      }

      const mapMenuAll = new Map<string, number>();
      if (!oiAllErr && Array.isArray(oiAll)) {
        for (const row of oiAll as any[]) {
          const qty = clampMin1(safeNum(row.quantity ?? 1));
          const name = row?.MenuItem?.name || `Item #${row.menuItemID}`;
          mapMenuAll.set(name, (mapMenuAll.get(name) || 0) + qty);
        }
        setMixMenuAll(genSegmentsFromMap(Array.from(mapMenuAll.entries()).map(([label, value]) => ({ label, value })), '--primary', 6));
      } else {
        setMixMenuAll([]);
      }

      // ---- Category mix (today) ----
      const mapCatToday = new Map<string, number>();
      if (!oiTodayErr && Array.isArray(oiToday)) {
        for (const row of oiToday as any[]) {
          const qty = clampMin1(safeNum(row.quantity ?? 1));
          const cat = row?.MenuItem?.Category?.categoryName || 'Uncategorized';
          mapCatToday.set(cat, (mapCatToday.get(cat) || 0) + qty);
        }
        setMixCategoryToday(genSegmentsFromMap(Array.from(mapCatToday.entries()).map(([label, value]) => ({ label, value })), '--accent-green', 6));
      } else {
        setMixCategoryToday([]);
      }

      setActiveDonut({ key: 'menu', label: null });
      setLockedDonut({ key: 'menu', label: null });
    } catch (err) {
      console.error('Fetch Error:', err);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // -------------------- Init --------------------
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile, error: profErr } = await supabase.from('UsersAccount').select('Role(roleName)').eq('userID', user.id).single();
      if (profErr) console.error(profErr);

      const role = ((profile?.Role as any)?.roleName as UserRole) || 'Staff';
      setUserRole(role);

      const all = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Menu', path: '/menu' },
        { name: 'User Management', path: '/staff' },
        { name: 'Inventory', path: '/inventory' },
        { name: 'Reports', path: '/reports' },
        { name: 'Order', path: '/order' },
      ];
      const allowed = role === 'Manager' ? ['Dashboard', 'Menu', 'User Management', 'Inventory', 'Reports', 'Order'] : ['Dashboard', 'Menu', 'Inventory', 'Order'];
      setNavItems(all.filter((n) => allowed.includes(n.name)));

      await fetchDashboardData();
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // -------------------- Tooltip tracking --------------------
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (tip.open) setTip((t) => ({ ...t, x: e.clientX, y: e.clientY }));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [tip.open]);

  // -------------------- Loading --------------------
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-primary font-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          Connecting to TFK System...
        </div>
      </div>
    );
  }

  // -------------------- Drilldown data builders --------------------
  const exportSalesWeekly = () =>
    downloadCSV(
      'sales_per_week.csv',
      salesWeekly.map((v, i) => ({
        week: salesWeeklyLabels[i] ?? `Week ${i + 1}`,
        sales_php: v,
      }))
    );

  const exportExpensesWeekly = () =>
    downloadCSV(
      'expenses_per_week.csv',
      expensesWeekly.map((v, i) => ({
        week: expensesWeeklyLabels[i] ?? `Week ${i + 1}`,
        expenses_php: v,
      }))
    );

  const drilldownFromSegments = (title: string, segments: DonutSeg[]) => {
    openDrawer(
      title,
      segments.map((s) => ({ label: s.label, value: s.value, percent: `${s.meta?.pct ?? 0}%` }))
    );
  };

  const viewAllStockLevels = () => {
    openDrawer('Stock Levels (Summary)', [
      { item: 'Total ingredients', value: stockTotal },
      { item: 'Critical', value: stockCritical },
      { item: 'Warning', value: stockWarning },
      { item: 'Healthy', value: Math.max(0, stockTotal - stockCritical - stockWarning) },
      { item: 'Rule', value: 'Critical ≤ reorder, Warning ≤ 125% reorder' },
    ]);
  };

  // -------------------- Render --------------------
  return (
    <div ref={pageRef} className="h-screen overflow-hidden bg-background text-foreground lg:flex">
      <Tooltip open={tip.open} x={tip.x} y={tip.y} title={tip.title} lines={tip.lines} />

      <Drawer open={drawerOpen} onClose={closeDrawer} title={drawerTitle}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            onClick={() => downloadCSV(`${drawerTitle.replace(/\s+/g, '_').toLowerCase()}.csv`, drawerRows)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
            type="button"
          >
            <MdDownload className="h-4 w-4" />
            Export CSV
          </button>

          <button
            onClick={() => setDrawerRows([])}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
            type="button"
            title="Clear"
          >
            <MdClose className="h-4 w-4" />
            Clear
          </button>
        </div>

        {drawerRows.length ? (
          <div className="overflow-hidden rounded-2xl ring-1 ring-card-border">
            <div className="grid grid-cols-3 bg-surface-dark/5 text-[10px] font-black uppercase tracking-widest text-text-muted">
              {Object.keys(drawerRows[0]).slice(0, 3).map((h) => (
                <div key={h} className="px-3 py-2 border-b border-card-border">
                  {h}
                </div>
              ))}
            </div>
            <div className="divide-y divide-card-border">
              {drawerRows.map((r, idx) => {
                const keys = Object.keys(r).slice(0, 3);
                return (
                  <div key={idx} className="grid grid-cols-3 text-xs">
                    {keys.map((k) => (
                      <div key={k} className="px-3 py-2">
                        {String(r[k])}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-dark/5 ring-1 ring-card-border p-6 text-xs text-text-muted">No details loaded.</div>
        )}
      </Drawer>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className={cn('fixed left-0 top-0 z-50 h-screen w-72 transition-transform duration-300 lg:hidden', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <AppSidebar
          isMobile
          collapsed={collapsed}
          navItems={navItems}
          activeNav={activeNav}
          onNavigate={(path) => {
            if (path) router.push(path);
            setMobileOpen(false);
          }}
          onLogout={handleLogout}
        />
      </div>

      <div className="hidden lg:block">
        <div className={cn('h-screen transition-all duration-300', collapsed ? 'w-24' : 'w-64')}>
          <AppSidebar collapsed={collapsed} navItems={navItems} activeNav={activeNav} onNavigate={(path) => path && router.push(path)} onLogout={handleLogout} />
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="relative overflow-hidden rounded-2xl ring-1 ring-card-border bg-white/70 backdrop-blur shadow-sm">
          <div className="absolute inset-0 opacity-60 bg-linear-to-br from-primary/10 via-white to-surface-dark/10" />
          <div className="relative flex flex-col gap-3 p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 bg-card/70 rounded-xl ring-1 ring-card-border hover:shadow transition" type="button">
                  <MdMenu />
                </button>

                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-white shadow-sm">
                      <MdDashboard />
                    </span>
                    <span className="truncate">Dashboard Overview</span>
                  </h1>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">{userRole ? `${userRole} View` : 'User'} • Live Insights</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-xl ring-1 ring-card-border bg-white hover:bg-slate-50 transition text-xs font-black', refreshing && 'opacity-70')}
                  disabled={refreshing}
                  title="Refresh"
                  type="button"
                >
                  <MdRefresh className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                  Refresh
                </button>

                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="hidden lg:flex h-10 w-10 items-center justify-center bg-white ring-1 ring-card-border rounded-2xl shadow-sm hover:bg-slate-50 transition-all"
                  title="Collapse sidebar"
                  type="button"
                >
                  {collapsed ? <MdChevronRight /> : <MdChevronLeft />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs
                value={range}
                onChange={(v) => setRange(v as 'today' | '7d')}
                items={[
                  { value: 'today', label: 'Today Mix', icon: <MdToday className="h-4 w-4" /> },
                  { value: '7d', label: 'All-time Mix', icon: <MdDateRange className="h-4 w-4" /> },
                ]}
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLockedDonut({ key: 'menu', label: null });
                    setActiveDonut({ key: 'menu', label: null });
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                  type="button"
                  title="Clear selection"
                >
                  <MdClose className="h-4 w-4" />
                  Clear selection
                </button>

                <button
                  onClick={() =>
                    openDrawer('How graphs work', [
                      { item: 'Sales & Expenses', detail: 'Hover chart points to see exact weekly amounts. Export CSV is available.' },
                      { item: 'Donut Charts', detail: 'Hover legend or segments. Click to lock selection.' },
                      { item: 'Stock Alert Level', detail: 'Critical/Warning/Healthy shown beside the graphs.' },
                      { item: 'Details', detail: 'Click “View details” to open breakdown, export CSV.' },
                    ])
                  }
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                  type="button"
                >
                  <MdInfo className="h-4 w-4" />
                  Help
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="relative overflow-hidden bg-card/70 backdrop-blur p-5 rounded-2xl ring-1 ring-card-border shadow-sm">
              <div className="absolute inset-0 opacity-60 bg-linear-to-br from-white via-white to-surface-dark/10" />
              <div className="relative">
                <div className="flex justify-between text-text-muted text-[10px] font-black uppercase tracking-widest mb-2">
                  {m.label}
                  <div className="text-primary">{m.icon}</div>
                </div>
                <div className="text-3xl font-black">{m.value}</div>
                <div className="text-[10px] opacity-60 mt-1">{m.note}</div>

                <div className="mt-4 flex h-12 items-end gap-1">
                  {[30, 60, 45, 80, 50, 90, 70].map((v, idx) => (
                    <div
                      key={idx}
                      className="w-2.5 rounded-md"
                      style={{
                        height: `${Math.max(12, v)}%`,
                        background: buildPaletteColor(m.accentVar || '--primary', 78),
                        opacity: 0.95,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5 bg-card/70 backdrop-blur rounded-2xl ring-1 ring-card-border shadow-sm p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <MdTrendingUp /> Sales & Expenses Per Week
                </p>
                <p className="text-[10px] text-text-muted mt-1">Enhanced weekly financial graph</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportSalesWeekly}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                  type="button"
                  title="Export Sales CSV"
                >
                  <MdDownload className="h-4 w-4" />
                  Sales CSV
                </button>
                <button
                  onClick={exportExpensesWeekly}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                  type="button"
                  title="Export Expenses CSV"
                >
                  <MdDownload className="h-4 w-4" />
                  Expenses CSV
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <SalesExpensesChart
                salesPoints={salesWeekly}
                expensePoints={expensesWeekly}
                labels={salesWeeklyLabels}
                onHoverPoint={({ index, x, y, kind }) => {
                  if (index === null || !kind) {
                    setTip((t) => ({ ...t, open: false }));
                    return;
                  }

                  const label = salesWeeklyLabels[index] ?? `Week ${index + 1}`;
                  const salesVal = salesWeekly[index] ?? 0;
                  const expensesVal = expensesWeekly[index] ?? 0;

                  if (kind === 'sales') {
                    setTip({
                      open: true,
                      x,
                      y,
                      title: 'Sales',
                      lines: [label, `Sales: ${fmtMoneyPhp(salesVal)}`, `Expenses: ${fmtMoneyPhp(expensesVal)}`],
                    });
                  } else {
                    setTip({
                      open: true,
                      x,
                      y,
                      title: 'Expenses',
                      lines: [label, `Expenses: ${fmtMoneyPhp(expensesVal)}`, `Sales: ${fmtMoneyPhp(salesVal)}`],
                    });
                  }
                }}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/75 ring-1 ring-card-border p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">4-Week Sales Total</p>
                  <p className="mt-1 text-xl font-black text-red-900">{fmtMoneyPhp(salesWeekly.reduce((a, b) => a + b, 0))}</p>
                </div>
                <div className="rounded-2xl bg-white/75 ring-1 ring-card-border p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">4-Week Expenses Total</p>
                  <p className="mt-1 text-xl font-black text-black">{fmtMoneyPhp(expensesWeekly.reduce((a, b) => a + b, 0))}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-card-border flex items-center justify-between">
                <button
                  onClick={() =>
                    openDrawer(
                      'Sales & Expenses Per Week',
                      salesWeekly.map((v, i) => ({
                        week: salesWeeklyLabels[i] ?? `Week ${i + 1}`,
                        sales_php: v,
                        expenses_php: expensesWeekly[i] ?? 0,
                      }))
                    )
                  }
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                  type="button"
                >
                  <MdVisibility className="h-4 w-4" />
                  View details
                </button>

                <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest flex items-center gap-1">
                  <MdInfo className="h-4 w-4" />
                  Sales from Order • Expenses from Expense/Expenses
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-3">
            <StockAlertMeter
              total={stockTotal}
              critical={stockCritical}
              warning={stockWarning}
              topRows={stockTopRows}
              onViewAll={() => {
                openDrawer(
                  'Stock Levels (Critical + Warning)',
                  stockTopRows.length
                    ? stockTopRows.map((r) => ({
                        ingredient: r.name,
                        kind: r.kind,
                        currentStock: `${safeNum(r.currentStock)} ${r.unit}`,
                        reorderLevel: `${safeNum(r.reorderLevel)} ${r.unit}`,
                        ratio: `${Math.round(r.ratio * 100) / 100}`,
                      }))
                    : [{ message: 'No critical/warning items right now.' }]
                );
              }}
            />
            <div className="mt-3">
              <button
                onClick={viewAllStockLevels}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                type="button"
              >
                <MdInfo className="h-4 w-4" />
                See summary counts
              </button>
            </div>
          </div>

          <div className="xl:col-span-4 bg-card/70 backdrop-blur rounded-2xl ring-1 ring-card-border shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <p className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <MdPieChart /> Orders Mix (Menu)
                </p>
                <p className="text-[10px] text-text-muted mt-1">Hover to preview, click segment to lock selection</p>
              </div>
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white/80 ring-1 ring-card-border">Total: {totalOrdersMenu}</span>
            </div>

            <div className="flex items-center gap-5">
              <div onMouseLeave={() => setActiveDonut((d) => (d.key === 'menu' ? { key: 'menu', label: null } : d))}>
                <DonutChart
                  segments={donutMenu}
                  size={150}
                  strokeWidth={18}
                  centerLabel={{ top: `${totalOrdersMenu || 0}`, bottom: 'Items' }}
                  activeLabel={activeLabelFor('menu')}
                  onActiveChange={(label) => setActiveDonut({ key: 'menu', label })}
                  onClickSeg={(label) => {
                    setLockedDonut((cur) => (cur.key === 'menu' && cur.label === label ? { key: 'menu', label: null } : { key: 'menu', label }));
                  }}
                />
              </div>

              <SegLegend
                segments={donutMenu}
                activeLabel={activeLabelFor('menu')}
                onHover={(label) => setActiveDonut({ key: 'menu', label })}
                rightLabel={(s) => (
                  <span className="tabular-nums">
                    {s.value} <span className="text-[10px] text-text-muted font-bold">({s.meta?.pct ?? 0}%)</span>
                  </span>
                )}
              />
            </div>

            <div className="mt-3 pt-3 border-t border-card-border flex items-center justify-between">
              <button
                onClick={() => drilldownFromSegments('Orders Mix (Menu)', donutMenu)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                type="button"
              >
                <MdVisibility className="h-4 w-4" />
                View details
              </button>
              <button
                onClick={() => downloadCSV('orders_mix_menu.csv', donutMenu.map((s) => ({ label: s.label, value: s.value, percent: `${s.meta?.pct ?? 0}%` })))}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                type="button"
              >
                <MdDownload className="h-4 w-4" />
                Export
              </button>
            </div>

            <div className="mt-3 text-[10px] text-text-muted">Source: OrderItem.quantity joined to MenuItem. If empty, check table name/relations.</div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-6 bg-card/70 backdrop-blur rounded-2xl ring-1 ring-card-border shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <p className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <MdPayments /> Payments Mix
                </p>
                <p className="text-[10px] text-text-muted mt-1">Orders today by payment method</p>
              </div>
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white/80 ring-1 ring-card-border">Total: {totalPaymentsToday}</span>
            </div>

            <div className="flex items-center gap-4">
              <DonutChart
                segments={donutPayments}
                size={120}
                strokeWidth={16}
                centerLabel={{ top: `${totalPaymentsToday || 0}`, bottom: 'Orders' }}
                activeLabel={activeLabelFor('pay')}
                onActiveChange={(label) => setActiveDonut({ key: 'pay', label })}
                onClickSeg={(label) => setLockedDonut((cur) => (cur.key === 'pay' && cur.label === label ? { key: 'pay', label: null } : { key: 'pay', label }))}
              />
              <SegLegend
                segments={donutPayments}
                activeLabel={activeLabelFor('pay')}
                onHover={(label) => setActiveDonut({ key: 'pay', label })}
                rightLabel={(s) => (
                  <span className="tabular-nums">
                    {s.value} <span className="text-[10px] text-text-muted font-bold">({s.meta?.pct ?? 0}%)</span>
                  </span>
                )}
              />
            </div>

            <div className="mt-3 pt-3 border-t border-card-border flex items-center justify-between">
              <button
                onClick={() => drilldownFromSegments('Payments Mix (Today)', donutPayments)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                type="button"
              >
                <MdVisibility className="h-4 w-4" />
                Details
              </button>
              <button
                onClick={() => downloadCSV('payments_mix_today.csv', donutPayments.map((s) => ({ label: s.label, value: s.value, percent: `${s.meta?.pct ?? 0}%` })))}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                type="button"
              >
                <MdDownload className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          <div className="xl:col-span-6 bg-card/70 backdrop-blur rounded-2xl ring-1 ring-card-border shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <p className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <MdCategory /> Category Mix
                </p>
                <p className="text-[10px] text-text-muted mt-1">Today line-items grouped by category</p>
              </div>
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white/80 ring-1 ring-card-border">Total: {totalCategoryToday}</span>
            </div>

            <div className="flex items-center gap-4">
              <DonutChart
                segments={donutCategory}
                size={120}
                strokeWidth={16}
                centerLabel={{ top: `${totalCategoryToday || 0}`, bottom: 'Items' }}
                activeLabel={activeLabelFor('cat')}
                onActiveChange={(label) => setActiveDonut({ key: 'cat', label })}
                onClickSeg={(label) => setLockedDonut((cur) => (cur.key === 'cat' && cur.label === label ? { key: 'cat', label: null } : { key: 'cat', label }))}
              />
              <SegLegend
                segments={donutCategory}
                activeLabel={activeLabelFor('cat')}
                onHover={(label) => setActiveDonut({ key: 'cat', label })}
                rightLabel={(s) => (
                  <span className="tabular-nums">
                    {s.value} <span className="text-[10px] text-text-muted font-bold">({s.meta?.pct ?? 0}%)</span>
                  </span>
                )}
              />
            </div>

            <div className="mt-3 pt-3 border-t border-card-border flex items-center justify-between">
              <button
                onClick={() => drilldownFromSegments('Category Mix (Today)', donutCategory)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                type="button"
              >
                <MdVisibility className="h-4 w-4" />
                Details
              </button>
              <button
                onClick={() => downloadCSV('category_mix_today.csv', donutCategory.map((s) => ({ label: s.label, value: s.value, percent: `${s.meta?.pct ?? 0}%` })))}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-card-border hover:bg-slate-50 text-xs font-black"
                type="button"
              >
                <MdDownload className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs text-text-muted uppercase tracking-widest flex items-center gap-2">
                <MdInsights /> Trending Items
              </h3>
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white/70 ring-1 ring-card-border">Latest menu items</span>
            </div>

            <div className="space-y-3">
              {popularDishes.length > 0 ? (
                popularDishes.map((d) => <DishRow key={d.id} dish={d} />)
              ) : (
                <div className="p-10 text-center text-xs opacity-50 bg-card/70 rounded-2xl ring-1 ring-card-border">No Menu Data</div>
              )}
            </div>
          </div>

          <div className="xl:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs text-text-muted uppercase tracking-widest flex items-center gap-2">
                <MdTrendingUp /> Recent Sales
              </h3>
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white/70 ring-1 ring-card-border">Latest transactions</span>
            </div>

            <div className="space-y-3">
              {recentOrders.length > 0 ? (
                recentOrders.map((d) => <DishRow key={d.id} dish={d} />)
              ) : (
                <div className="p-10 text-center text-xs opacity-50 bg-card/70 rounded-2xl ring-1 ring-card-border">No Recent Orders</div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xs text-red-500 uppercase tracking-widest flex items-center gap-2">
              <MdWarning /> Stock Alerts
            </h3>
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white/70 ring-1 ring-card-border">Critical ingredients</span>
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8 space-y-3">
              {lowStockIngredients.length > 0 ? (
                lowStockIngredients.map((ing, idx) => (
                  <LowStockRow
                    key={idx}
                    item={{
                      name: ing.name,
                      stock: safeNum(ing.currentStock),
                      level: safeNum(ing.reorderLevel),
                      unit: ing.unit,
                      kind: 'Critical',
                    }}
                  />
                ))
              ) : (
                <div className="p-10 text-center bg-green-50/50 border-dashed border-2 border-green-200 rounded-2xl text-green-700 text-[10px] font-black uppercase">
                  Inventory Healthy
                </div>
              )}
            </div>

            <div className="xl:col-span-4 bg-card/70 backdrop-blur rounded-2xl ring-1 ring-card-border shadow-sm p-5">
              <p className="text-xs font-black text-text-muted uppercase tracking-widest mb-2">Quick Notes</p>
              <ul className="space-y-2 text-xs text-foreground/80">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  Stock Alert Level stays visible beside the main graph for fast scanning.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  The trends panel is now an enhanced Sales and Expenses per week comparison chart.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  Export buttons remain available for charts and detail drawers.
                </li>
              </ul>

              <div className="mt-4 pt-4 border-t border-card-border">
                <button onClick={() => router.push('/reports')} className="w-full rounded-2xl bg-primary text-white text-xs font-black py-3 shadow-sm hover:opacity-95 transition" type="button">
                  Go to Reports
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}