"use client";

import { useState, useTransition, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, AlertTriangle, Calendar, Layers } from "lucide-react";

interface SummaryPanelClientProps {
  initialReport: any;
  defaultTimeframe: string;
  children: ReactNode;
}

const CHART_COLORS = ["#0EA5E9", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(0 0% 5%)",
  border:          "1px solid hsl(0 0% 100% / 0.08)",
  color:           "#fff",
  fontFamily:      "var(--font-mono, monospace)",
  fontSize:        "11px",
};

export default function SummaryPanelClient({
  initialReport,
  defaultTimeframe,
  children,
}: SummaryPanelClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showInRupees, setShowInRupees] = useState(false);

  function handleTimeframeChange(tf: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("timeframe", tf);
    startTransition(() => {
      router.push(`/dashboard?${params.toString()}`, { scroll: false });
    });
  }

  const report = initialReport;

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${isPending ? "opacity-40 pointer-events-none" : ""}`}>

      {/* ── CONTROL ROW ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-accent" />
          <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-muted-foreground">
            Financial Analytics
          </h2>
        </div>
        <div className="flex border border-border overflow-hidden">
          {(["week", "month", "year"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTimeframeChange(t)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest font-bold transition-colors ${
                defaultTimeframe === t
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── PRIMARY METRIC CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="panel p-4 space-y-2">
          <p className="data-label">Inflow Pool</p>
          <p className="data-value text-positive">₹{report.totalCredit.toLocaleString("en-IN")}</p>
        </div>
        <div className="panel p-4 space-y-2">
          <p className="data-label">Outflow Volume</p>
          <p className="data-value text-negative">₹{report.totalDebit.toLocaleString("en-IN")}</p>
        </div>
        <div className={`panel p-4 space-y-2 ${report.burnRatePercentage >= 70 ? "border-negative/30" : ""}`}>
          <p className="data-label">Burn Rate</p>
          <p className={`data-value ${report.burnRatePercentage >= 70 ? "text-negative" : "text-accent"}`}>
            {report.burnRatePercentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* ── MACRO COMMODITIES TRACKER ────────────────────────────────────────── */}
      {report.commodities && (
        <div className="panel p-4">
          <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
            <span className="data-label">
              Global Macro Tracker · 1 USD = ₹{report.usdInrRate?.toFixed(2)}
            </span>
            <button
              onClick={() => setShowInRupees((v) => !v)}
              className="text-[10px] font-mono border border-border px-2.5 py-1 text-accent hover:bg-surface transition-colors uppercase tracking-wide"
            >
              {showInRupees ? "₹ INR" : "$ USD"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.commodities.map((item: any) => {
              const isUp         = item.changeUSD >= 0;
              const displayPrice = showInRupees ? item.priceINR : item.priceUSD;
              const symbol       = showInRupees ? "₹" : "$";
              const digits       = showInRupees ? 0 : 2;
              return (
                <div key={item.symbol} className="flex justify-between items-center bg-surface hover:bg-surface-raised transition-colors px-4 py-3">
                  <div>
                    <p className="data-label mb-0.5">{item.name}</p>
                    <p className="text-sm font-black font-mono tabular-nums text-foreground">
                      {symbol}{displayPrice.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}
                    </p>
                  </div>
                  <div className={`text-right font-mono text-xs font-bold ${isUp ? "text-positive" : "text-negative"}`}>
                    <div>{isUp ? "+" : ""}{showInRupees ? (item.changeUSD * report.usdInrRate).toFixed(0) : item.changeUSD.toFixed(2)}</div>
                    <div className="text-[9px] opacity-70">({item.changePercentage.toFixed(2)}%)</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CHARTS ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <h3 className="data-label">Cash Flow Velocity</h3>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" stroke="hsl(0 0% 45%)" tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(0 0% 45%)" tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }} />
                <Bar dataKey="earned" name="Credits" fill="#22C55E" maxBarSize={28} radius={[2,2,0,0]} />
                <Bar dataKey="spent"  name="Debits"  fill="#EF4444" maxBarSize={28} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <h3 className="data-label">Sector Allocation</h3>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={report.categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                  {report.categoryBreakdown.map((_: any, idx: number) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-thin mt-3">
            {report.categoryBreakdown.map((item: any, idx: number) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[110px]">{item.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-foreground tabular-nums">₹{item.value.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── OUTLIERS ────────────────────────────────────────────────────────── */}
      <div className="panel p-5">
        <div className="flex items-center gap-2 mb-3 border-b border-border pb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          <h3 className="data-label">Anomalies &amp; Outliers</h3>
        </div>
        {report.outliers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-[11px] font-mono border border-dashed border-border">
            No capital leakage deviations detected.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto scrollbar-thin">
            {report.outliers.map((out: any) => (
              <div key={out.id} className="bg-surface border border-warning/20 px-4 py-3 flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{out.description}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">{out.date} · {out.reason}</p>
                </div>
                <span className="text-sm font-black font-mono tabular-nums text-warning shrink-0">₹{out.amount.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AI ADVICE SLOT ──────────────────────────────────────────────────── */}
      <div className={`panel p-6 ${report.burnRatePercentage >= 70 ? "border-negative/25" : ""}`}>
        <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
          <span className={`w-1.5 h-1.5 rounded-full ${report.burnRatePercentage >= 70 ? "bg-negative animate-live-pulse" : "bg-accent"}`} />
          <h3 className="data-label">WealthWatch Executive Review</h3>
        </div>
        {children}
      </div>
    </div>
  );
}