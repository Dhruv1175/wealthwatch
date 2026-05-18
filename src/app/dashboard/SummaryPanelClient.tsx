"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, AlertTriangle, Calendar, Layers } from "lucide-react";

interface SummaryPanelClientProps {
  initialReport: any;
  defaultTimeframe: string;
  children: React.ReactNode;
}

const BRAND_COLORS = ["#00f2fe", "#4facfe", "#0066ff", "#7f00ff", "#ff007f", "#333333"];

export default function SummaryPanelClient({ initialReport, defaultTimeframe, children }: SummaryPanelClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleTimeframeChange(newTimeframe: string) {
    // SSR URL State synchronization pattern
    startTransition(() => {
      router.push(`/dashboard?timeframe=${newTimeframe}`);
    });
  }

  return (
    <div className={`space-y-6 mb-8 transition-opacity duration-200 ${isPending ? "opacity-50" : "opacity-100"}`}>
      {/* Control Row */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-gray-300">Financial Analytics Core</h2>
        </div>
        <div className="flex bg-zinc-950 border border-white/5 p-1 rounded font-mono text-xs">
          {["week", "month", "year"].map((t) => (
            <button
              key={t}
              onClick={() => handleTimeframeChange(t)}
              className={`px-3 py-1.5 uppercase transition-all font-medium ${defaultTimeframe === t ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Visual Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-white/5 bg-zinc-950 p-4 font-mono">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Inflow Pool</span>
          <div className="text-xl font-black text-emerald-400 mt-1">₹{initialReport.totalCredit.toLocaleString("en-IN")}</div>
        </div>
        <div className="border border-white/5 bg-zinc-950 p-4 font-mono">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Outflow Volume</span>
          <div className="text-xl font-black text-red-400 mt-1">₹{initialReport.totalDebit.toLocaleString("en-IN")}</div>
        </div>
        <div className={`border p-4 font-mono ${initialReport.burnRatePercentage >= 70 ? "border-red-900 bg-red-950/10" : "border-white/5 bg-zinc-950"}`}>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Velocity Core Burn</span>
          <div className={`text-xl font-black mt-1 ${initialReport.burnRatePercentage >= 70 ? "text-red-400" : "text-sky-400"}`}>
            {initialReport.burnRatePercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart Layout Matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-white/10 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400">Cash Flow Velocity Progression</h3>
          </div>
          <div className="h-64 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={initialReport.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" stroke="#555" tickLine={false} />
                <YAxis stroke="#555" tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#222", color: "#fff" }} />
                <Legend />
                <Bar dataKey="earned" name="Credits" fill="#34d399" maxBarSize={30} />
                <Bar dataKey="spent" name="Debits" fill="#f87171" maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-white/10 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400">Volumetric Sectors Allocation</h3>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={initialReport.categoryBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {initialReport.categoryBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#222", color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[10px] mt-2 pr-1">
            {initialReport.categoryBreakdown.map((item: any, idx: number) => (
              <div key={item.name} className="flex justify-between items-center text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND_COLORS[idx % BRAND_COLORS.length] }} />
                  <span className="truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="text-gray-200 font-bold">₹{item.value.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outliers Node Display */}
      <div className="border border-white/10 bg-zinc-950 p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400">Statistical Anomalies & Outliers Tracked</h3>
        </div>
        {initialReport.outliers.length === 0 ? (
          <div className="text-xs font-mono text-zinc-600 border border-dashed border-white/5 py-4 text-center">
            No major single-point capital leakage deviations caught within this temporal window perimeter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
            {initialReport.outliers.map((out: any) => (
              <div key={out.id} className="bg-black border border-amber-900/30 p-3 font-mono text-xs flex justify-between items-start gap-4">
                <div>
                  <div className="text-gray-200 font-medium truncate max-w-[200px]">{out.description}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{out.date} • {out.reason}</div>
                </div>
                <span className="text-amber-500 font-bold text-sm shrink-0">₹{out.amount.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Server Component Stream Drop Zone */}
      <div className={`border p-6 font-sans bg-zinc-950 relative overflow-hidden ${initialReport.burnRatePercentage >= 70 ? "border-red-900/60" : "border-white/10"}`}>
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
          <span className={`w-2 h-2 rounded-full ${initialReport.burnRatePercentage >= 70 ? "bg-red-500 animate-ping" : "bg-sky-500"}`} />
          <h3 className="text-xs font-mono uppercase tracking-wider font-black text-gray-400">
            WealthWatch Executive Strategic Review
          </h3>
        </div>
        {children}
      </div>
    </div>
  );
}