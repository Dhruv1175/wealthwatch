"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, Target, Plus, Trash2, X, CheckCircle,
  TrendingUp, Calendar, Loader2, ChevronDown, ChevronUp,
  Home, Car, GraduationCap, Briefcase, Plane, Gem,
  ShieldCheck, Gift, BarChart3, Info, Zap,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useNotifications } from "@/components/dashboard/NotificationContext";
import { formatCurrency, formatPct } from "@/lib/utils/currencyUtils";

// ── Types ──────────────────────────────────────────────────────────────────────
const GOAL_CATEGORIES = [
  { value: "RETIREMENT",    label: "Retirement",     icon: ShieldCheck },
  { value: "EDUCATION",     label: "Education",      icon: GraduationCap },
  { value: "HOME",          label: "Home / Property",icon: Home },
  { value: "VEHICLE",       label: "Vehicle",        icon: Car },
  { value: "EMERGENCY_FUND",label: "Emergency Fund", icon: Zap },
  { value: "VACATION",      label: "Vacation / Travel", icon: Plane },
  { value: "WEDDING",       label: "Wedding",        icon: Gem },
  { value: "BUSINESS",      label: "Business",       icon: Briefcase },
  { value: "OTHER",         label: "Other",          icon: Target },
] as const;

type GoalCategory = typeof GOAL_CATEGORIES[number]["value"];

interface LinkedInvestment {
  id: string; name: string; type: string;
  sharesOwned: number; avgBuyPrice: number;
  currentMarketValue: number | null;
  sipAmount: number | null; interestRate: number | null;
  maturityDate: string | null; createdAt: string;
}

interface Goal {
  id: string; name: string;
  targetAmount: number; targetDate: string;
  currentAmount: number; category: GoalCategory;
  notes: string | null;
  totalInvested: number; currentValue: number;
  progressPct: number; daysLeft: number; isAchieved: boolean;
  investments: LinkedInvestment[];
}

// ── Goal calculator ────────────────────────────────────────────────────────────
// Given current savings + monthly SIP + rate — when do we reach the target?
function projectGoalTimeline(params: {
  currentValue:  number;
  monthlyAmount: number;
  annualRate:    number;
  targetAmount:  number;
}): {
  monthsToGoal:    number | null;
  projectedValue:  number;   // value after X months
  shortfall:       number;
  requiredMonthly: number;   // SIP needed to reach goal in remaining time
  projectionData:  { month: number; value: number; target: number }[];
} {
  const { currentValue, monthlyAmount, annualRate, targetAmount } = params;
  const monthlyRate = annualRate / 100 / 12;

  // Find months to reach target
  let monthsToGoal: number | null = null;
  let value = currentValue;
  for (let m = 1; m <= 600; m++) { // max 50 years
    value = value * (1 + monthlyRate) + monthlyAmount;
    if (value >= targetAmount) { monthsToGoal = m; break; }
  }

  // Build 10-year projection data
  const projectionData: { month: number; value: number; target: number }[] = [];
  value = currentValue;
  for (let m = 0; m <= 120; m += 6) {
    projectionData.push({ month: m, value: parseFloat(value.toFixed(0)), target: targetAmount });
    for (let i = 0; i < 6; i++) value = value * (1 + monthlyRate) + monthlyAmount;
  }

  const projectedValue = projectionData[projectionData.length - 1]?.value ?? currentValue;
  const shortfall      = Math.max(0, targetAmount - projectedValue);

  // Required monthly SIP to reach target in daysLeft
  return { monthsToGoal, projectedValue, shortfall, requiredMonthly: 0, projectionData };
}

function computeRequiredSIP(params: {
  currentValue: number;
  targetAmount: number;
  monthsLeft:   number;
  annualRate:   number;
}): number {
  const { currentValue, targetAmount, monthsLeft, annualRate } = params;
  if (monthsLeft <= 0) return 0;
  const r          = annualRate / 100 / 12;
  const fvCurrent  = currentValue * Math.pow(1 + r, monthsLeft);
  const remaining  = targetAmount - fvCurrent;
  if (remaining <= 0) return 0;
  if (r === 0) return remaining / monthsLeft;
  const sip = remaining * r / (Math.pow(1 + r, monthsLeft) - 1);
  return Math.max(0, parseFloat(sip.toFixed(0)));
}

// ── Category icon ──────────────────────────────────────────────────────────────
function GoalIcon({ category, className = "w-5 h-5" }: { category: string; className?: string }) {
  const cat = GOAL_CATEGORIES.find((c) => c.value === category);
  const Icon = cat?.icon ?? Target;
  return <Icon className={className} />;
}

// ── Goal card ──────────────────────────────────────────────────────────────────
function GoalCard({
  goal,
  onDelete,
}: {
  goal: Goal;
  onDelete: (id: string) => void;
}) {
  const [expanded,    setExpanded]    = useState(false);
  const [rate,        setRate]        = useState("10");
  const [monthly,     setMonthly]     = useState("5000");

  const rateNum    = parseFloat(rate)   || 10;
  const monthlyNum = parseFloat(monthly)|| 0;
  const monthsLeft = Math.max(0, goal.daysLeft / 30.44);

  const projection = useMemo(() => projectGoalTimeline({
    currentValue:  goal.currentValue,
    monthlyAmount: monthlyNum,
    annualRate:    rateNum,
    targetAmount:  goal.targetAmount,
  }), [goal.currentValue, monthlyNum, rateNum, goal.targetAmount]);

  const requiredSIP = useMemo(() => computeRequiredSIP({
    currentValue: goal.currentValue,
    targetAmount: goal.targetAmount,
    monthsLeft,
    annualRate:   rateNum,
  }), [goal.currentValue, goal.targetAmount, monthsLeft, rateNum]);

  const pct     = goal.progressPct;
  const barColor =
    pct >= 100 ? "hsl(var(--positive))" :
    pct >= 60  ? "hsl(var(--info))"     :
    pct >= 30  ? "hsl(var(--warning))"  :
    "hsl(var(--negative))";

  const yearsLeft  = (monthsLeft / 12).toFixed(1);
  const targetYear = new Date(goal.targetDate).getFullYear();

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all selection:bg-mint-500/20"
      style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}
    >
      {/* Achievement stripe */}
      {goal.isAchieved && (
        <div style={{ height: "3px", background: "linear-gradient(90deg, transparent, hsl(var(--positive)), transparent)" }} />
      )}

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: goal.isAchieved ? "hsl(var(--positive-dim))" : "hsl(var(--surface-raised))",
                border:     `1px solid ${goal.isAchieved ? "hsl(var(--positive) / 0.3)" : "hsl(var(--border-token))"}`,
              }}
            >
              <GoalIcon
                category={goal.category}
                className="w-5 h-5"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
                  {goal.name}
                </p>
                {goal.isAchieved && (
                  <CheckCircle className="w-4 h-4" style={{ color: "hsl(var(--positive))" }} />
                )}
              </div>
              <p className="label-xs mt-0.5">
                {GOAL_CATEGORIES.find((c) => c.value === goal.category)?.label} · Target {targetYear}
              </p>
            </div>
          </div>
          <button onClick={() => onDelete(goal.id)} className="btn-icon"
            style={{ color: "hsl(var(--negative) / 0.6)" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "hsl(var(--foreground-secondary))" }}>
              {formatCurrency(goal.currentValue, "INR", { compact: true })}
              <span style={{ color: "hsl(var(--foreground-tertiary))" }}> of </span>
              {formatCurrency(goal.targetAmount, "INR", { compact: true })}
            </span>
            <span
              className="text-sm font-black tabular"
              style={{ color: barColor, fontFamily: "Geist Mono" }}
            >
              {pct.toFixed(1)}%
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: "8px", background: "hsl(var(--surface-raised))" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
            <span>Invested: {formatCurrency(goal.totalInvested, "INR", { compact: true })}</span>
            <span>{goal.daysLeft > 0 ? `${Math.round(monthsLeft)} months left` : "Deadline passed"}</span>
          </div>
        </div>

        {/* Linked investments */}
        {goal.investments.length > 0 && (
          <div
            className="rounded-xl p-3 space-y-1.5"
            style={{ background: "hsl(var(--surface-raised))" }}
          >
            <p className="label-xs mb-2">Linked Investments ({goal.investments.length})</p>
            {goal.investments.slice(0, 3).map((inv) => {
              const val = inv.currentMarketValue ?? inv.avgBuyPrice * inv.sharesOwned;
              return (
                <div key={inv.id} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[160px]" style={{ color: "hsl(var(--foreground-secondary))" }}>
                    {inv.name}
                  </span>
                  <span className="tabular font-semibold" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
                    {formatCurrency(val, "INR", { compact: true })}
                  </span>
                </div>
              );
            })}
            {goal.investments.length > 3 && (
              <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                +{goal.investments.length - 3} more
              </p>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between w-full text-xs transition-colors"
          style={{ color: "hsl(var(--info))", paddingTop: "4px" }}
        >
          <span className="font-semibold">
            {expanded ? "Hide" : "Show"} projections & calculator
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* ── EXPANDED: CALCULATOR ─────────────────────────────────────── */}
        {expanded && (
          <div className="space-y-4 animate-fade-in pt-1" style={{ borderTop: "1px solid hsl(var(--border-token))" }}>

            {/* Calculator inputs */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-wide mb-3"
                style={{ color: "hsl(var(--foreground-secondary))" }}
              >
                Goal Calculator
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-xs block mb-1.5">Expected Return (% p.a.)</label>
                  <input
                    type="number" step="0.1" placeholder="10"
                    className="field text-sm"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-xs block mb-1.5">Monthly Addition (₹)</label>
                  <input
                    type="number" step="100" placeholder="5000"
                    className="field text-sm"
                    value={monthly}
                    onChange={(e) => setMonthly(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Time to goal */}
              <div
                className="rounded-xl p-3 col-span-2"
                style={{
                  background: projection.monthsToGoal
                    ? "hsl(var(--positive-dim))"
                    : "hsl(var(--warning-dim))",
                  border: `1px solid ${projection.monthsToGoal ? "hsl(var(--positive) / 0.25)" : "hsl(var(--warning) / 0.25)"}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="label-xs mb-1">
                      {projection.monthsToGoal ? "Goal reached in" : "Projected value (10yr)"}
                    </p>
                    <p
                      className="text-xl font-black tabular"
                      style={{
                        color:      projection.monthsToGoal ? "hsl(var(--positive))" : "hsl(var(--warning))",
                        fontFamily: "Geist Mono",
                      }}
                    >
                      {projection.monthsToGoal
                        ? projection.monthsToGoal >= 12
                          ? `${(projection.monthsToGoal / 12).toFixed(1)} years`
                          : `${projection.monthsToGoal} months`
                        : formatCurrency(projection.projectedValue, "INR", { compact: true })}
                    </p>
                  </div>
                  {projection.monthsToGoal && (
                    <div className="text-right">
                      <p className="label-xs mb-1">Expected by</p>
                      <p
                        className="text-sm font-bold"
                        style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}
                      >
                        {new Date(
                          Date.now() + projection.monthsToGoal * 30.44 * 86400000
                        ).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Required SIP */}
              <div className="rounded-xl p-3" style={{ background: "hsl(var(--surface-raised))" }}>
                <p className="label-xs mb-1">Required Monthly SIP</p>
                <p className="text-base font-black tabular"
                  style={{ color: "hsl(var(--info))", fontFamily: "Geist Mono" }}>
                  {requiredSIP > 0
                    ? formatCurrency(requiredSIP, "INR", { compact: true }) + "/mo"
                    : "On track ✓"}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  to reach {formatCurrency(goal.targetAmount, "INR", { compact: true })} by deadline
                </p>
              </div>

              {/* Shortfall */}
              <div className="rounded-xl p-3" style={{ background: "hsl(var(--surface-raised))" }}>
                <p className="label-xs mb-1">
                  {projection.shortfall > 0 ? "10yr Shortfall" : "10yr Surplus"}
                </p>
                <p className="text-base font-black tabular"
                  style={{
                    color:      projection.shortfall > 0 ? "hsl(var(--negative))" : "hsl(var(--positive))",
                    fontFamily: "Geist Mono",
                  }}>
                  {projection.shortfall > 0
                    ? formatCurrency(projection.shortfall, "INR", { compact: true })
                    : formatCurrency(projection.projectedValue - goal.targetAmount, "INR", { compact: true })}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  vs {formatCurrency(goal.targetAmount, "INR", { compact: true })} target
                </p>
              </div>
            </div>

            {/* Mini chart — text-based projection */}
            <div>
              <p className="label-xs mb-2">10-Year Projection Path</p>
              <div className="space-y-1.5">
                {projection.projectionData
                  .filter((_, i) => i % 2 === 0)
                  .map((point) => {
                    const pctOfTarget = Math.min(100, (point.value / goal.targetAmount) * 100);
                    const hitTarget   = point.value >= goal.targetAmount;
                    return (
                      <div key={point.month} className="flex items-center gap-3">
                        <span
                          className="text-[10px] tabular shrink-0 w-12 text-right"
                          style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}
                        >
                          {point.month === 0 ? "Now" : `${point.month / 12 >= 1 ? `${(point.month / 12).toFixed(0)}yr` : `${point.month}mo`}`}
                        </span>
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: "6px", background: "hsl(var(--surface-raised))" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width:      `${pctOfTarget}%`,
                              background: hitTarget ? "hsl(var(--positive))" : "hsl(var(--info))",
                            }}
                          />
                        </div>
                        <span
                          className="text-[10px] tabular shrink-0 w-16 text-right"
                          style={{ color: hitTarget ? "hsl(var(--positive))" : "hsl(var(--foreground-secondary))", fontFamily: "Geist Mono" }}
                        >
                          {formatCurrency(point.value, "INR", { compact: true })}
                        </span>
                      </div>
                    );
                  })}
                {/* Target line */}
                <div className="flex items-center gap-3 mt-1" style={{ borderTop: "1px dashed hsl(var(--border-token))", paddingTop: "6px" }}>
                  <span className="text-[10px] tabular shrink-0 w-12 text-right font-bold" style={{ color: "hsl(var(--premium))", fontFamily: "Geist Mono" }}>
                    Target
                  </span>
                  <div className="flex-1 rounded-full" style={{ height: "2px", background: "hsl(var(--premium) / 0.4)" }} />
                  <span className="text-[10px] tabular shrink-0 w-16 text-right font-bold" style={{ color: "hsl(var(--premium))", fontFamily: "Geist Mono" }}>
                    {formatCurrency(goal.targetAmount, "INR", { compact: true })}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {goal.notes && (
              <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                📝 {goal.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add goal form ──────────────────────────────────────────────────────────────
function AddGoalForm({ onAdded }: { onAdded: () => void }) {
  const [open,        setOpen]        = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [form,        setForm]        = useState({
    name: "", targetAmount: "", targetDate: "", category: "OTHER", notes: "",
  });
  const { triggerToast } = useNotifications();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        triggerToast("Goal Created", `"${form.name}" added to your goals.`, "SUCCESS");
        setForm({ name: "", targetAmount: "", targetDate: "", category: "OTHER", notes: "" });
        setOpen(false);
        onAdded();
      } else {
        const err = await res.json();
        triggerToast("Failed", err.error || "Could not create goal.", "WARNING");
      }
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 btn-primary text-sm px-5 py-2.5"
      >
        <Plus className="w-4 h-4" />
        New Goal
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 animate-fade-in"
      style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--info) / 0.3)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>New Financial Goal</p>
        <button onClick={() => setOpen(false)} className="btn-icon"><X className="w-4 h-4" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-xs block mb-1.5">Goal Name</label>
            <input type="text" required placeholder="Retirement corpus" className="field"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label-xs block mb-1.5">Category</label>
            <select className="field" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {GOAL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-xs block mb-1.5">Target Amount (₹)</label>
            <input type="number" step="any" required placeholder="10000000" className="field"
              value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
          </div>
          <div>
            <label className="label-xs block mb-1.5">Target Date</label>
            <input type="date" required className="field"
              value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label-xs block mb-1.5">Notes (optional)</label>
          <input type="text" placeholder="e.g. For child's college fund" className="field"
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1 justify-center text-sm">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center text-sm gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Create Goal"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Summary stats ──────────────────────────────────────────────────────────────
function GoalsSummary({ goals, allInvestments }: { goals: Goal[]; allInvestments: AllInvestment[] }) {
  const totalTargets  = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved    = goals.reduce((s, g) => s + g.currentValue, 0);
  const achieved      = goals.filter((g) => g.isAchieved).length;
  const overallPct    = totalTargets > 0 ? (totalSaved / totalTargets) * 100 : 0;
  const unlinked      = allInvestments.filter((inv) => !inv.goalId);
  const unlinkedValue = unlinked.reduce((s, inv) => s + (inv.currentMarketValue ?? inv.avgBuyPrice * inv.sharesOwned), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: "Total Goals",      value: goals.length,   unit: "",     color: "hsl(var(--info))"     },
        { label: "Goals Achieved",   value: achieved,       unit: "",     color: "hsl(var(--positive))" },
        { label: "Total Target",     value: formatCurrency(totalTargets, "INR", { compact: true }), unit: "", color: "hsl(var(--foreground))" },
        { label: "Overall Progress", value: overallPct.toFixed(1), unit: "%", color: overallPct >= 50 ? "hsl(var(--positive))" : "hsl(var(--warning))" },
      ].map((stat) => (
        <div key={stat.label} className="rounded-2xl p-4"
          style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
          <p className="label-xs mb-1">{stat.label}</p>
          <p className="text-2xl font-black tabular"
            style={{ color: stat.color, fontFamily: "Geist" }}>
            {stat.value}{stat.unit}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── AllInvestment (for linking existing investments to goals) ─────────────────
interface AllInvestment {
  id: string; name: string; type: string; goalId: string | null;
  sharesOwned: number; avgBuyPrice: number;
  currentMarketValue: number | null; sipAmount: number | null;
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const [goals,           setGoals]           = useState<Goal[]>([]);
  const [allInvestments,  setAllInvestments]  = useState<AllInvestment[]>([]);
  const [loading,         setLoading]         = useState(true);
  const { triggerToast } = useNotifications();

  async function load() {
    try {
      const res = await fetch("/api/goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals ?? data); // handle both old and new shape
        setAllInvestments(data.allInvestments ?? []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this goal? Linked investments will not be deleted.")) return;
    try {
      await fetch(`/api/goals/${id}`, { method: "DELETE" });
      triggerToast("Goal Deleted", "Removed from your goals.", "INFO");
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (e) { console.error(e); }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">

        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-8 h-16 shrink-0"
          style={{
            background:     "hsl(220 14% 6% / 0.9)",
            backdropFilter: "blur(20px)",
            borderBottom:   "1px solid hsl(var(--border-token))",
          }}
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm transition-colors text-secondary hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <span style={{ color: "hsl(var(--border-token))" }}>·</span>
            <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Financial Goals
            </span>
          </div>
          <AddGoalForm onAdded={load} />
        </header>

        <main className="flex-1 px-8 py-8 space-y-6 max-w-5xl mx-auto w-full">
          {/* Heading */}
          <div>
            <p className="label-xs mb-1">Goal Planner</p>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
              Financial Goals
            </h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--foreground-tertiary))" }}>
              Set targets, track progress, and calculate how long until you reach them.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton rounded-2xl h-48" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-24 rounded-2xl gap-4"
              style={{ background: "hsl(var(--surface))", border: "2px dashed hsl(var(--border-token))" }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border-token))" }}>
                <Target className="w-6 h-6" style={{ color: "hsl(var(--foreground-tertiary))" }} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold mb-1" style={{ color: "hsl(var(--foreground))" }}>
                  No goals yet
                </p>
                <p className="text-sm" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  Create your first financial goal — retirement, home, education, or anything else.
                </p>
              </div>
              <AddGoalForm onAdded={load} />
            </div>
          ) : (
            <>
              <GoalsSummary goals={goals} allInvestments={allInvestments} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />
                ))}
              </div>
              <div
                className="rounded-2xl p-5 flex items-start gap-4"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--info) / 0.2)" }}
              >
                <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--info))" }} />
                <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  To link investments to a goal, go to the Portfolio section and select a goal when adding a new position.
                  Projections use compound interest at the rate you set. Actual returns may vary.
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}