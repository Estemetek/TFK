"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  MdArrowBack,
  MdSave,
  MdSearch,
  MdChecklist,
  MdInventory2,
  MdWarningAmber,
  MdRefresh,
  MdLockClock,
  MdInfoOutline
} from "react-icons/md";

const SURFACE =
  "rounded-2xl bg-white/70 shadow-sm ring-1 ring-card-border " +
  "backdrop-blur supports-[backdrop-filter]:bg-white/60";

const CARD =
  "rounded-2xl bg-white shadow-sm ring-1 ring-card-border transition";

const INPUT_BASE =
  "w-full rounded-xl bg-white px-3 py-2 text-sm " +
  "border-2 border-black/15 " +
  "shadow-[0_1px_0_rgba(0,0,0,0.06)] " +
  "placeholder:text-text-muted/80 " +
  "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 " +
  "transition";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold " +
  "ring-1 ring-black/10 shadow-[0_1px_0_rgba(0,0,0,0.06)] transition active:scale-[0.99] focus:outline-none focus:ring-4";

const BTN_PRIMARY =
  BTN_BASE +
  " bg-primary text-white ring-0 shadow-sm hover:brightness-95 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed";

const BTN_NEUTRAL =
  BTN_BASE +
  " bg-white text-foreground ring-1 ring-card-border hover:bg-black/3 focus:ring-black/10";

const CHIP_BASE =
  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-card-border";

type IngredientItem = {
  ingredientID: number;
  name: string;
  currentStock: number;
  unit: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toWholeNumber(value: number) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function toDecimal(value: number | string, decimals = 2): number {
  const parsed = Number(value);
  if (isNaN(parsed)) return 0;
  return Math.max(0, parseFloat(parsed.toFixed(decimals)));
}

export default function EODAuditPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [auditCounts, setAuditCounts] = useState<Record<number, number>>({});
  const [query, setQuery] = useState("");

  // For Lock and Confirmation before submission
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [auditSummary, setAuditSummary] = useState({
    sessionID: 0,
    totalItems: 0,
    transactionsLogged: 0,
  });

  const fetchIngredients = async () => {
    setLoading(true);

    // 1. Check if an audit already exists for today (Singapore Time)
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
    const { data: existingSession } = await supabase
      .from("AuditSession")
      .select("sessionID")
      .gte("createdAt", `${today}T00:00:00`)
      .lte("createdAt", `${today}T23:59:59`)
      .limit(1);

    if (existingSession && existingSession.length > 0) {
      setHasSubmittedToday(true);
      setLoading(false);
      return;
    }

    // 2. Fetch ingredients
    const { data, error } = await supabase
      .from("Ingredient")
      .select("ingredientID, name, currentStock, unit")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching ingredients:", error);
      setLoading(false);
      return;
    }

    const rows = (data || []) as IngredientItem[];
    setIngredients(rows);

    const initialCounts: Record<number, number> = {};
    rows.forEach((item) => {
      initialCounts[item.ingredientID] = toDecimal(item.currentStock);
    });
    setAuditCounts(initialCounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const handleInputChange = (id: number, value: string) => {
    const ingredient = ingredients.find((item) => item.ingredientID === id);
    const systemStock = toDecimal(ingredient?.currentStock ?? 0);

    if (value.trim() === "") {
      setAuditCounts((prev) => ({ ...prev, [id]: 0 }));
      return;
    }

    if (!/^\d*\.?\d{0,2}$/.test(value)) return;

    const parsed = parseFloat(value);
    if (isNaN(parsed)) return;

    const clamped = Math.max(0, Math.min(parsed, systemStock));
    setAuditCounts((prev) => ({ ...prev, [id]: clamped }));
  };

  const filteredIngredients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ingredients;

    return ingredients.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.unit.toLowerCase().includes(q)
    );
  }, [ingredients, query]);

  const totals = useMemo(() => {
    let totalItems = ingredients.length;
    let changedItems = 0;
    let totalUsage = 0;
    let overages = 0;

    for (const item of ingredients) {
      const system = toDecimal(item.currentStock);
      const rawPhysical = Number(auditCounts[item.ingredientID] ?? item.currentStock);
      const physical = Math.max(0, Math.min(toDecimal(rawPhysical), system));
      const variance = parseFloat((physical - system).toFixed(2));
      const usedToday = parseFloat((system - physical).toFixed(2));

      if (variance !== 0) changedItems++;
      if (usedToday > 0) totalUsage = parseFloat((totalUsage + usedToday).toFixed(2));
      if (variance > 0) overages += 1;
    }

    return { totalItems, changedItems, totalUsage, overages };
  }, [ingredients, auditCounts]);

  const hasChanges = useMemo(() => {
    return ingredients.some((item) => {
      const system = toDecimal(item.currentStock);
      const rawPhysical = Number(auditCounts[item.ingredientID] ?? item.currentStock);
      const physical = Math.max(0, Math.min(toDecimal(rawPhysical), system));
      return physical !== system;
    });
  }, [ingredients, auditCounts]);

  // REVISED: Two-Step Submission Logic
  const handleSubmitAudit = async () => {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // STEP 1: Create the Batch Session Header
      const { data: session, error: sessionError } = await supabase
        .from("AuditSession")
        .insert([
          {
            recordedBy: user?.id,
            notes: "End of Day Manual Audit",
          },
        ])
        .select()
        .single();

      if (sessionError) throw sessionError;

      // STEP 2: Prepare the Detail Items linked to the SessionID
      const auditItems = ingredients.map((item) => {
        const system = Number(item.currentStock) || 0;
        const physical = Number(auditCounts[item.ingredientID] ?? 0);
        return {
          sessionID: session.sessionID,
          ingredientID: item.ingredientID,
          systemStock: system,
          physicalStock: physical,
          variance: physical - system,
        };
      });

      const { error: itemsError } = await supabase
        .from("AuditItem")
        .insert(auditItems);

      if (itemsError) throw itemsError;

      const consumedCount = ingredients.filter((item) => {
        const system = Number(item.currentStock) || 0;
        const physical = Number(auditCounts[item.ingredientID] ?? 0);
        return system - physical > 0;
      }).length;

    setAuditSummary({
      sessionID: session.sessionID,
      totalItems: ingredients.length,
      transactionsLogged: consumedCount,
    });
    setShowConfirmModal(false);
    setShowSuccessModal(true);
    setIsSubmitting(false);
    } catch (err: any) {
      alert("Audit failed: " + err.message);
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  // UI: Locked State View
  if (!loading && hasSubmittedToday) {
    return (
      <div className="mx-auto max-w-2xl p-20 text-center">
        <div className={cn(SURFACE, "p-10 flex flex-col items-center gap-4")}>
          <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-full grid place-items-center">
            <MdLockClock size={32} />
          </div>
          <h1 className="text-2xl font-bold">Audit Already Submitted</h1>
          <p className="text-text-muted">
            The End-of-Day inventory audit for today has already been recorded.
            Only one audit session is allowed per day to maintain data integrity.
          </p>
          <button onClick={() => router.push("/inventory")} className={BTN_PRIMARY}>
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(0,0,0,0.05),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_0%_30%,rgba(0,0,0,0.04),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_100%_30%,rgba(0,0,0,0.04),transparent)]" />
        </div>

        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className={cn(SURFACE, "p-6")}>
            <div className="flex items-center gap-3">
              <MdRefresh className="animate-spin text-primary" size={22} />
              <div>
                <p className="text-sm font-semibold">Loading EOD Audit Sheet</p>
                <p className="text-xs text-text-muted mt-1">
                  Fetching the latest inventory records...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(0,0,0,0.05),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_0%_30%,rgba(0,0,0,0.04),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_100%_30%,rgba(0,0,0,0.04),transparent)]" />
      </div>

      <div className="mx-auto max-w-7xl p-5 md:p-7 space-y-5">
        <header className="sticky top-0 z-20 bg-background/70 backdrop-blur pb-3">
          <div className={cn(SURFACE, "px-4 py-4")}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <button
                  onClick={() => router.push("/inventory")}
                  className="mb-3 inline-flex items-center gap-2 text-sm text-text-muted hover:text-foreground transition"
                >
                  <MdArrowBack size={18} />
                  Back to Inventory
                </button>

                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-card-border">
                    <MdChecklist size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-text-muted">
                      End of Day Reports
                    </p>
                    <h1 className="text-xl md:text-2xl font-semibold">
                      Manual EOD Stock Audit
                    </h1>
                    <p className="text-sm text-text-muted mt-1">
                      Review physical counts, verify variances, and submit your daily inventory audit.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={fetchIngredients} className={BTN_NEUTRAL}>
                  <MdRefresh size={18} />
                  Refresh
                </button>

                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isSubmitting || ingredients.length === 0}
                  className={BTN_PRIMARY}
                >
                  <MdSave size={18} />
                  {isSubmitting ? "Finalizing Audit..." : "Finalize & Submit EOD Audit"}
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <StatCard
                title="Ingredients"
                value={totals.totalItems}
                subtitle="Items included in this audit"
                icon={<MdInventory2 size={20} />}
              />
              <StatCard
                title="Changed Counts"
                value={totals.changedItems}
                subtitle="Items with variance"
                icon={<MdWarningAmber size={20} />}
                accent={totals.changedItems > 0 ? "warning" : "default"}
              />
              <StatCard
                title="Total Used Today"
                value={totals.totalUsage.toFixed(2)}
                subtitle="Based on system minus physical"
                icon={<MdChecklist size={20} />}
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <MdSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  size={18}
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ingredient or unit..."
                  className={cn(INPUT_BASE, "pl-10")}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={cn(CHIP_BASE, "bg-white")}>
                  <span className="text-text-muted">Showing</span>
                  <span className="font-bold">{filteredIngredients.length}</span>
                </span>
                <span
                  className={cn(
                    CHIP_BASE,
                    hasChanges
                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : "bg-white"
                  )}
                >
                  <span className="text-text-muted">Status</span>
                  <span className="font-bold">
                    {hasChanges ? "Pending changes" : "Ready to submit"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className={cn(SURFACE, "overflow-hidden")}>
          {filteredIngredients.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold">No ingredients found</p>
              <p className="text-xs text-text-muted mt-1">
                Try changing your search keyword.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[1.3fr_0.7fr_0.9fr_0.8fr_0.8fr] gap-4 border-b bg-white/80 px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                <div>Ingredient</div>
                <div className="text-center">System Stock</div>
                <div>Physical Stocks Left</div>
                <div className="text-right">Used Today</div>
                <div className="text-right">Variance</div>
              </div>

              <div className="divide-y divide-black/5">
                {filteredIngredients.map((item) => {
                  const system = toDecimal(item.currentStock);
                  const rawPhysical = Number(auditCounts[item.ingredientID] ?? 0);
                  const physical = Math.max(0, Math.min(toDecimal(rawPhysical), system));
                  const usedToday = parseFloat((system - physical).toFixed(2));
                  const variance = parseFloat((physical - system).toFixed(2));

                  const usedTodayClass =
                    usedToday > 0
                      ? "text-primary"
                      : usedToday < 0
                      ? "text-amber-600"
                      : "text-text-muted";

                  const varianceClass =
                    variance > 0
                      ? "text-amber-600"
                      : variance < 0
                      ? "text-red-600"
                      : "text-text-muted";

                  return (
                    <div
                      key={item.ingredientID}
                      className="grid gap-4 px-4 py-4 md:grid-cols-[1.3fr_0.7fr_0.9fr_0.8fr_0.8fr] md:px-5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{item.name}</p>
                        <p className="text-xs text-text-muted mt-1">
                          Unit: <span className="font-medium">{item.unit}</span>
                        </p>
                      </div>

                      <div className="flex items-center md:justify-center">
                        <div className="rounded-xl bg-black/5 px-3 py-2 text-sm font-semibold ring-1 ring-card-border">
                          {system.toFixed(2)}{" "}
                          <span className="text-[10px] font-medium uppercase text-text-muted">
                            {item.unit}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted md:hidden">
                          Physical Count
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={system}
                            step="0.01"
                            inputMode="decimal"
                            className={INPUT_BASE}
                            value={auditCounts[item.ingredientID] ?? 0}
                            onChange={(e) => handleInputChange(item.ingredientID, e.target.value)}
                            onKeyDown={(e) => {
                              // Block invalid characters but allow decimal point
                              if ([",", "-", "e", "E", "+"].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onPaste={(e) => {
                              const pasted = e.clipboardData.getData("text");
                              if (!/^\d*\.?\d{0,2}$/.test(pasted)) {
                                e.preventDefault();
                              }
                            }}
                          />
                          <span className="w-10 text-xs text-text-muted">
                            {item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted md:hidden">
                          Used Today
                        </span>
                        <span className={cn("text-sm font-semibold", usedTodayClass)}>
                          {usedToday.toFixed(2)}{" "}
                          <span className="text-[10px] uppercase">{item.unit}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between md:justify-end">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted md:hidden">
                          Variance
                        </span>
                        <span className={cn("text-sm font-semibold", varianceClass)}>
                          {variance > 0 ? "+" : ""}
                          {variance.toFixed(2)}{" "}
                          <span className="text-[10px] uppercase">{item.unit}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* FOOTER ACTION AREA */}
            <div className="flex justify-end mt-4">
                <button
                  onClick={() => router.push("/inventory")}
                  className={cn(BTN_NEUTRAL, "w-full")}
                >
                  Cancel
                </button>
            </div>
      </div>

      {/* CONFIRMATION MODAL OVERLAY */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-primary mb-4">
              <div className="p-2 bg-primary/10 rounded-xl">
                <MdInfoOutline size={24} />
              </div>
              <h2 className="text-xl font-bold text-foreground">Confirm Submission</h2>
            </div>

            <p className="text-sm text-text-muted leading-relaxed">
              You are about to submit the EOD Audit. This will <strong>lock</strong> inventory records for today and cannot be edited later.
            </p>

            <div className="mt-6 space-y-3 bg-black/5 p-4 rounded-2xl border border-black/5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-text-muted">Items Audited</span>
                <span>{totals.totalItems}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-text-muted">Detected Variances</span>
                <span className={totals.changedItems > 0 ? "text-amber-600" : ""}>
                  {totals.changedItems}
                </span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className={BTN_NEUTRAL}
                disabled={isSubmitting}
              >
                Go Back
              </button>
              <button
                onClick={handleSubmitAudit}
                className={BTN_PRIMARY}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Confirm & Lock"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuditSuccessModal
        show={showSuccessModal}
        summary={auditSummary}
        onDone={() => {
          setShowSuccessModal(false);
          router.push("/inventory");
        }}
      />
    </div>
  );
}

function AuditSuccessModal({
  show,
  summary,
  onDone,
}: {
  show: boolean;
  summary: { sessionID: number; totalItems: number; transactionsLogged: number };
  onDone: () => void;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl ring-1 ring-black/5 flex flex-col items-center text-center">

        {/* Success icon */}
        <div className="h-20 w-20 rounded-full bg-green-50 ring-1 ring-green-200 flex items-center justify-center mb-5">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-foreground">Audit Submitted!</h2>
        <p className="text-sm text-text-muted mt-2 leading-relaxed">
          The EOD inventory audit has been finalized, locked, and recorded to the database.
        </p>

        {/* Summary details */}
        <div className="mt-6 w-full rounded-2xl bg-black/5 border border-black/5 p-4 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Session ID
            </span>
            <span className="text-sm font-semibold text-foreground">
              AUDIT-SESSION-{summary.sessionID}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Ingredients Audited
            </span>
            <span className="text-sm font-semibold text-foreground">
              {summary.totalItems}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-black/10 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Transactions Logged
            </span>
            <span className="text-sm font-semibold text-green-700">
              {summary.transactionsLogged} OUT record{summary.transactionsLogged !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-text-muted">
          This audit is now locked. No further changes can be made for today.
        </p>

        <button
          onClick={onDone}
          className={cn(BTN_PRIMARY, "mt-6 w-full justify-center py-3")}
        >
          Done — Back to Inventory
        </button>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "default",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  accent?: "default" | "warning";
}) {
  return (
    <div className={cn(SURFACE, "p-4")}>
      <p className="text-[11px] uppercase tracking-wide text-text-muted">{title}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p
          className={cn(
            "text-2xl font-semibold",
            accent === "warning" && "text-amber-600"
          )}
        >
          {value}
        </p>
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-2xl ring-1 ring-card-border",
            accent === "warning"
              ? "bg-amber-50 text-amber-600"
              : "bg-primary/10 text-primary"
          )}
        >
          {icon}
        </div>
      </div>
      <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
    </div>
  );
}