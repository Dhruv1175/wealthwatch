"use client";

import { useState, useTransition, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, Layers,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

interface SummaryPanelClientProps {
  initialReport: any;
  defaultTimeframe: string;
  children: ReactNode;
}

const PIE_COLORS = ["#3399FF", "#25C87A", "#FBAE28", "#F04438", "#8B5CF6", "#EC4899", "#06B6D4"];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(220, 12%, 10%)",
  border:          "1px solid hsl(220, 15%, 18%)",
  borderRadius:    "8px",
  color:           "hsl(210, 20%, 94%)",
  fontFamily:      "Geist Mono, monospace",
  fontSize:        "11px",
  padding:         "8px 12px",
};

export default function SummaryPanelClient({
  initialReport: r,
  defaultTimeframe,
  children,
}: SummaryPanelClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRupees, setShowRupees]  = useState(true);

  function setTimeframe(tf: string) {
    const p = new URLSearchParams(window.location.search);
    p.set("timeframe", tf);
    startTransition(() => router.push(`/dashboard?${p}`, { scroll: false }));
  }

  const net     = r.totalCredit - r.totalDebit;
  const netPos  = net >= 0;
  const burnOk  = r.burnRatePercentage < 70;

  return (
    <div
      className={`space-y-6 transition-opacity duration-300 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* ── TIMEFRAME CONTROLS ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="label-xs mb-1">Financial Overview</p>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
            Analytics Dashboard
          </h2>
        </div>
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}
        >
          {["week", "month", "year"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={{
                background:  defaultTimeframe === tf ? "hsl(var(--surface-overlay))" : "transparent",
                color:       defaultTimeframe === tf ? "hsl(var(--foreground))"       : "hsl(var(--foreground-tertiary))",
                border:      defaultTimeframe === tf ? "1px solid hsl(var(--border-focus) / 0.3)" : "1px solid transparent",
              }}
            >
              {tf === "week" ? "7D" : tf === "month" ? "30D" : "1Y"}
            </button>
          ))}
        </div>
      </div>

      {/* ── HERO STAT CARDS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Cash Flow — HERO */}
        <div
          className="col-span-2 rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: netPos
              ? "linear-gradient(135deg, hsl(152 69% 14%), hsl(152 69% 10%))"
              : "linear-gradient(135deg, hsl(4 86% 14%), hsl(4 86% 10%))",
            border: `1px solid hsl(var(--${netPos ? "positive" : "negative"}) / 0.25)`,
          }}
        >
          {/* Background glow */}
          <div
            className="absolute -right-8 -top-8 w-40 h-40 rounded-full blur-3xl pointer-events-none"
            style={{ background: `hsl(var(--${netPos ? "positive" : "negative"}) / 0.12)` }}
          />
          <div className="relative">
            <p className="label-xs mb-3" style={{ color: `hsl(var(--${netPos ? "positive" : "negative"}) / 0.7)` }}>
              Net Cash Flow · {defaultTimeframe}
            </p>
            <div className="flex items-end gap-3">
              <p
                className="text-4xl font-black tracking-tight"
                style={{ color: `hsl(var(--${netPos ? "positive" : "negative"}))`, fontFamily: "Geist" }}
              >
                {netPos ? "+" : "−"}₹{Math.abs(net).toLocaleString("en-IN")}
              </p>
              <div
                className="mb-1 flex items-center gap-1 rounded-lg px-2.5 py-1"
                style={{ background: `hsl(var(--${netPos ? "positive" : "negative"}) / 0.15)` }}
              >
                {netPos
                  ? <TrendingUp  className="w-3 h-3" style={{ color: "hsl(var(--positive))" }} />
                  : <TrendingDown className="w-3 h-3" style={{ color: "hsl(var(--negative))" }} />}
                <span
                  className="text-xs font-bold"
                  style={{ color: `hsl(var(--${netPos ? "positive" : "negative"}))`, fontFamily: "Geist Mono" }}
                >
                  {r.burnRatePercentage.toFixed(1)}% burn
                </span>
              </div>
            </div>
            <div className="flex gap-6 mt-4 pt-4" style={{ borderTop: `1px solid hsl(var(--${netPos ? "positive" : "negative"}) / 0.15)` }}>
              <div>
                <p className="text-xs mb-0.5" style={{ color: `hsl(var(--${netPos ? "positive" : "negative"}) / 0.6)`, fontFamily: "Geist Mono" }}>
                  Inflow
                </p>
                <p className="text-sm font-bold" style={{ color: "hsl(var(--positive))", fontFamily: "Geist Mono" }}>
                  +₹{r.totalCredit.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: `hsl(var(--${netPos ? "positive" : "negative"}) / 0.6)`, fontFamily: "Geist Mono" }}>
                  Outflow
                </p>
                <p className="text-sm font-bold" style={{ color: "hsl(var(--negative))", fontFamily: "Geist Mono" }}>
                  −₹{r.totalDebit.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Burn Rate */}
        <div className="stat-card">
          <p className="label-xs">Burn Rate</p>
          <div className="flex items-end gap-2">
            <p
              className="text-3xl font-black tabular"
              style={{ color: burnOk ? "hsl(var(--info))" : "hsl(var(--negative))", fontFamily: "Geist" }}
            >
              {r.burnRatePercentage.toFixed(1)}
              <span className="text-lg font-bold" style={{ color: "hsl(var(--foreground-tertiary))" }}>%</span>
            </p>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width:      `${Math.min(r.burnRatePercentage, 100)}%`,
                background: burnOk ? "hsl(var(--info))" : "hsl(var(--negative))",
              }}
            />
          </div>
          <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
            {burnOk ? "Within healthy range" : "High spending detected"}
          </p>
        </div>

        {/* Outliers */}
        <div className="stat-card">
          <p className="label-xs">Anomalies</p>
          <div className="flex items-end gap-2">
            <p
              className="text-3xl font-black tabular"
              style={{
                color:      r.outliers.length > 0 ? "hsl(var(--warning))" : "hsl(var(--foreground-secondary))",
                fontFamily: "Geist",
              }}
            >
              {r.outliers.length}
            </p>
          </div>
          <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
            {r.outliers.length === 0
              ? "No anomalies detected"
              : `${r.outliers.length} outlier transaction${r.outliers.length > 1 ? "s" : ""} flagged`}
          </p>
          {r.outliers.length > 0 && (
            <span className="badge-warning">Review needed</span>
          )}
        </div>
      </div>

      {/* ── CHARTS ROW ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Cash flow bar chart */}
        <div className="col-span-12 lg:col-span-8 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="label-xs mb-1">Cash Flow Velocity</p>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                Income vs Expenses
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.trendData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap="30%">
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(215 14% 45%)", fontSize: 10, fontFamily: "Geist Mono" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(215 14% 45%)", fontSize: 10, fontFamily: "Geist Mono" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "hsl(220 15% 14% / 0.6)", radius: 6 }}
                  formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, undefined]}
                />
                <Bar dataKey="earned" name="Income"   fill="hsl(var(--positive))" radius={[4,4,0,0]} maxBarSize={32} />
                <Bar dataKey="spent"  name="Expenses" fill="hsl(var(--negative))" radius={[4,4,0,0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="col-span-12 lg:col-span-4 card p-6">
          <div className="mb-4">
            <p className="label-xs mb-1">Sector Allocation</p>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Spending Breakdown
            </p>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={r.categoryBreakdown}
                  cx="50%" cy="50%"
                  innerRadius={42} outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {r.categoryBreakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, undefined]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 max-h-28 overflow-y-auto mt-2">
            {r.categoryBreakdown.slice(0, 6).map((item: any, i: number) => (
              <div key={item.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-xs truncate max-w-[90px]" style={{ color: "hsl(var(--foreground-secondary))" }}>
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-bold tabular shrink-0" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
                  ₹{item.value.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MACRO TRACKER ───────────────────────────────────────────────────── */}
      {r.commodities && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="label-xs mb-1">Global Macro</p>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                Market Snapshot &nbsp;·&nbsp;
                <span style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono", fontSize: 11 }}>
                  1 USD = ₹{r.usdInrRate?.toFixed(2)}
                </span>
              </p>
            </div>
            <button
              onClick={() => setShowRupees((v) => !v)}
              className="btn-ghost text-xs"
            >
              {showRupees ? "₹ INR" : "$ USD"}
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {r.commodities.map((item: any) => {
              const up    = item.changeUSD >= 0;
              const price = showRupees ? item.priceINR : item.priceUSD;
              const sym   = showRupees ? "₹" : "$";
              const digits = showRupees ? 0 : 2;
              return (
                <div
                  key={item.symbol}
                  className="rounded-xl p-4 transition-all"
                  style={{
                    background: "hsl(var(--surface-raised))",
                    border:     "1px solid hsl(var(--border))",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border-focus) / 0.3)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))"; }}
                >
                  <p className="label-xs mb-2">{item.name}</p>
                  <p className="text-lg font-bold tabular" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist" }}>
                    {sym}{price.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {up
                      ? <ArrowUpRight   className="w-3 h-3" style={{ color: "hsl(var(--positive))" }} />
                      : <ArrowDownRight className="w-3 h-3" style={{ color: "hsl(var(--negative))" }} />
                    }
                    <span
                      className="text-xs font-semibold tabular"
                      style={{ color: up ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono" }}
                    >
                      {up ? "+" : ""}{item.changePercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── OUTLIERS ────────────────────────────────────────────────────────── */}
      {r.outliers.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(var(--warning-dim))", border: "1px solid hsl(var(--warning) / 0.25)" }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: "hsl(var(--warning))" }} />
            </div>
            <div>
              <p className="label-xs mb-0.5">Anomaly Detection</p>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                {r.outliers.length} Flagged Transaction{r.outliers.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {r.outliers.map((out: any) => (
              <div
                key={out.id}
                className="rounded-xl p-4 flex items-start justify-between gap-4"
                style={{
                  background: "hsl(var(--warning-dim))",
                  border:     "1px solid hsl(var(--warning) / 0.2)",
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                    {out.description}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
                    {out.date} · {out.reason}
                  </p>
                </div>
                <span
                  className="text-sm font-bold tabular shrink-0"
                  style={{ color: "hsl(var(--warning))", fontFamily: "Geist Mono" }}
                >
                  ₹{out.amount.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI ADVISOR SLOT ─────────────────────────────────────────────────── */}
      <div
        className="card p-6"
        style={r.burnRatePercentage >= 70 ? { borderColor: "hsl(var(--negative) / 0.3)" } : {}}
      >
        <div className="flex items-center gap-3 mb-5" style={{ borderBottom: "1px solid hsl(var(--border))", paddingBottom: "16px" }}>
          <span
            className="w-2 h-2 rounded-full animate-live-pulse"
            style={{ background: r.burnRatePercentage >= 70 ? "hsl(var(--negative))" : "hsl(var(--info))" }}
          />
          <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            WealthWatch AI Advisor
          </p>
          <span className="badge-info ml-auto">GPT-powered</span>
        </div>
        {children}
      </div>
    </div>
  );
}