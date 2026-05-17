"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
  PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, AlertTriangle, Calendar, Layers, EyeOff } from "lucide-react";

type Timeframe = "week" | "month" | "year";

interface AdvancedReport {
  timeframe: Timeframe;
  totalCredit: number;
  totalDebit: number;
  burnRatePercentage: number;
  categoryBreakdown: { name: string; value: number }[];
  trendData: { label: string; spent: number; earned: number }[];
  outliers: { id: string; date: string; description: string; amount: number; reason: string }[];
  deepAdvice: string;
}

const BRAND_COLORS = ["#00f2fe", "#4facfe", "#0066ff", "#7f00ff", "#ff007f", "#333333"];

export default function SummaryPanel() {
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [report, setReport] = useState<AdvancedReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdvancedMetrics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/summary?timeframe=${timeframe}`);
        if (res.ok) {
          const data = await res.json();
          if (data.burnRatePercentage !== undefined) {
            setReport(data);
          } else {
            setReport(null);
          }
        }
      } catch (err) {
        console.error("Fatal error loading advanced analytics grid:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAdvancedMetrics();
  }, [timeframe]);

  return (
    <div className="space-y-6 mb-8">
      {/* Timeframe Selector Button Array Group */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-gray-300">Financial Analytics Core</h2>
        </div>
        <div className="flex bg-zinc-950 border border-white/5 p-1 rounded font-mono text-xs">
          {(["week", "month", "year"] as Timeframe[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 uppercase transition-all font-medium ${timeframe === t ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-xs font-mono text-zinc-500 animate-pulse tracking-widest">
          COMPUTING AGGREGATED TELEMETRY MATRICES...
        </div>
      ) : !report ? (
        <div className="text-center py-16 border border-dashed border-white/5 text-xs font-mono text-zinc-600">
          No records captured for this specified parameter perimeter. Try parsing a statement file.
        </div>
      ) : (
        <>
          {/* Primary Metrics Layer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-white/5 bg-zinc-950 p-4 font-mono">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Inflow Pool</span>
              <div className="text-xl font-black text-emerald-400 mt-1">₹{report.totalCredit.toLocaleString("en-IN")}</div>
            </div>
            <div className="border border-white/5 bg-zinc-950 p-4 font-mono">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Outflow Volume</span>
              <div className="text-xl font-black text-red-400 mt-1">₹{report.totalDebit.toLocaleString("en-IN")}</div>
            </div>
            <div className={`border p-4 font-mono ${report.burnRatePercentage >= 70 ? "border-red-900 bg-red-950/10" : "border-white/5 bg-zinc-950"}`}>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Velocity Core Burn</span>
              <div className={`text-xl font-black mt-1 ${report.burnRatePercentage >= 70 ? "text-red-400" : "text-sky-400"}`}>
                {report.burnRatePercentage.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Core Graphical Charts Complex Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Cash-Flow Temporal Trend Graph Panel */}
            <div className="lg:col-span-2 border border-white/10 bg-zinc-950 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400">Cash Flow Velocity Progression</h3>
              </div>
              <div className="h-64 w-full text-xs font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

            {/* 2. Categorical Allocation Distribution Area */}
            <div className="border border-white/10 bg-zinc-950 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400">Volumetric Sectors Allocation</h3>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {report.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#222", color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend Meta List View */}
              <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[10px] mt-2 pr-1">
                {report.categoryBreakdown.map((item, idx) => (
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

          {/* 3. IQR Outliers Tracking Vector Board Panel */}
          <div className="border border-white/10 bg-zinc-950 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400">Statistical Anomalies & Outliers Tracked</h3>
            </div>
            {report.outliers.length === 0 ? (
              <div className="text-xs font-mono text-zinc-600 border border-dashed border-white/5 py-4 text-center">
                No major single-point capital leakage deviations caught within this temporal window perimeter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
                {report.outliers.map((out) => (
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

          {/* 4. Timeframe-Relative Deep Advice Panel Output */}
          <div className={`border p-6 font-sans bg-zinc-950 relative overflow-hidden ${report.burnRatePercentage >= 70 ? "border-red-900/60" : "border-white/10"}`}>
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <span className={`w-2 h-2 rounded-full ${report.burnRatePercentage >= 70 ? "bg-red-500 animate-ping" : "bg-sky-500"}`} />
              <h3 className="text-xs font-mono uppercase tracking-wider font-black text-gray-400">
                WealthWatch Executive Strategic Review — {timeframe.toUpperCase()} Lookback
              </h3>
            </div>
            <div className="text-sm text-gray-300 leading-relaxed font-normal space-y-4 prose prose-invert max-w-none">
              {report.deepAdvice.split("\n\n").map((paragraph, idx) => {
                if (paragraph.startsWith("###")) {
                  return <h4 key={idx} className="text-xs font-mono font-bold uppercase tracking-widest text-sky-400 mt-4 mb-2">{paragraph.replace("###", "").trim()}</h4>;
                }
                return <p key={idx} className="text-gray-300 text-sm">{paragraph}</p>;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}