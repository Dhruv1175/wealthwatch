"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, Plus, TrendingUp, TrendingDown, Landmark,
  Trash2, LineChart, X, DollarSign, Lock, Loader2,
} from "lucide-react";
import TradingViewChart from "./TradingViewChart";
import { useNotifications } from "@/components/dashboard/NotificationContext";
import RazorpayUpgradeButton from "./RazorpayUpgradeButton";

const BASIC_LIMIT = 5;

// ── Types ──────────────────────────────────────────────────────────────────────
interface Position {
  id: string; symbol: string; name: string;
  type: "EQUITY_STOCK" | "SIP_MUTUAL_FUND";
  sharesOwned: number; avgBuyPrice: number;
  sipAmount: number | null; sipDay: number | null;
  currentPrice: number; currentValue: number;
  profitOrLoss: number; pnlPercentage: number;
}
interface PortfolioData {
  positions: Position[]; totalValue: number;
  totalPnl: number; sipReminders: string[];
}
type FormState = {
  symbol: string; name: string;
  type: "EQUITY_STOCK" | "SIP_MUTUAL_FUND";
  sharesOwned: string; avgBuyPrice: string;
  sipAmount: string; sipDay: string;
};
const EMPTY: FormState = {
  symbol: "", name: "", type: "EQUITY_STOCK",
  sharesOwned: "", avgBuyPrice: "", sipAmount: "", sipDay: "",
};

interface InvestmentManagerProps {
  totalInvestmentsCount?: number;
  sessionUser?: { id: string; name?: string | null; email?: string | null; image?: string | null };
}

export default function InvestmentManager({
  totalInvestmentsCount = 0,
  sessionUser,
}: InvestmentManagerProps) {
  const [data, setData]           = useState<PortfolioData>({ positions: [], totalValue: 0, totalPnl: 0, sipReminders: [] });
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeChart, setActiveChart] = useState<string | null>(null);
  const [sellingAsset, setSellingAsset] = useState<Position | null>(null);
  const [sellForm, setSellForm]   = useState({ sharesToSell: "", salePrice: "" });
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { triggerToast } = useNotifications();

  // Live count from API (may differ from SSR prop after adds/deletes)
  const liveCount = data.positions.length;
  const atLimit   = liveCount >= BASIC_LIMIT;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/investments");
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (atLimit) { setShowLimitModal(true); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 403) {
        const err = await res.json();
        if (err.code === "TIER_LIMIT_EXCEEDED") { setShowLimitModal(true); return; }
      }
      if (res.ok) {
        setForm(EMPTY);
        await load();
        triggerToast("Position Committed", `${form.symbol.toUpperCase()} added to portfolio.`, "SUCCESS");
      } else {
        const err = await res.json();
        triggerToast("Commit Failed", err.error || "Failed to add position.", "WARNING");
      }
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("CRITICAL: This permanently removes this item from tracking WITHOUT updating your bank cash feed balance. Proceed?")) return;
    try {
      const res = await fetch(`/api/investments/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (activeChart === data.positions.find((p) => p.id === id)?.symbol) setActiveChart(null);
        triggerToast("Asset Entry Removed", "Ledger records hard deleted from PostgreSQL.", "INFO");
        await load();
      }
    } catch (e) { console.error(e); }
  }

  async function handleSale(e: React.FormEvent) {
    e.preventDefault();
    if (!sellingAsset) return;
    try {
      const res = await fetch(`/api/investments/${sellingAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sellForm),
      });
      if (res.ok) {
        triggerToast("Liquidation Settled", `Sale processed for ${sellingAsset.symbol}.`, "SUCCESS");
        setSellingAsset(null);
        setSellForm({ sharesToSell: "", salePrice: "" });
        await load();
      } else {
        const err = await res.json();
        triggerToast("Sale Failed", err.error || "Failed to process sale.", "WARNING");
      }
    } catch (e) { console.error(e); }
  }

  const totalPnlPos = data.totalPnl >= 0;

  return (
    <div className="space-y-6">

      {/* ── SECTION HEADER ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="data-label mb-0.5">Portfolio Tracker</p>
          <h2 className="text-lg font-black tracking-tight text-foreground">Investment Ledger</h2>
        </div>
        {!atLimit && (
          <span className="text-[10px] font-mono border border-border bg-surface px-2.5 py-1 text-muted-foreground">
            {liveCount} / {BASIC_LIMIT} positions
          </span>
        )}
      </div>

      {/* ── LIVE CHART PANEL ────────────────────────────────────────────────── */}
      {activeChart && (
        <div className="panel border-accent/25 p-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-border pb-2.5 mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent flex items-center gap-2">
              <LineChart className="w-3.5 h-3.5" /> Live Terminal: {activeChart}
            </span>
            <button
              onClick={() => setActiveChart(null)}
              className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border bg-background px-2 py-1 transition-colors uppercase"
            >
              <X className="w-3 h-3" /> Close
            </button>
          </div>
          <TradingViewChart symbol={activeChart} />
        </div>
      )}

      {/* ── SELL MODAL ──────────────────────────────────────────────────────── */}
      {sellingAsset && (
        <div className="panel border-negative/25 p-4 max-w-xl animate-fade-in">
          <div className="flex justify-between items-center border-b border-border pb-2.5 mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-negative flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Liquidation Order: {sellingAsset.symbol}
            </span>
            <button onClick={() => setSellingAsset(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <form onSubmit={handleSale} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="data-label block mb-1.5">Units (max {sellingAsset.sharesOwned})</label>
              <input type="number" step="any" required max={sellingAsset.sharesOwned}
                className="field" value={sellForm.sharesToSell}
                onChange={(e) => setSellForm({ ...sellForm, sharesToSell: e.target.value })} />
            </div>
            <div>
              <label className="data-label block mb-1.5">Sale Price (₹) · current ₹{sellingAsset.currentPrice.toFixed(2)}</label>
              <input type="number" step="any" required
                className="field" value={sellForm.salePrice}
                onChange={(e) => setSellForm({ ...sellForm, salePrice: e.target.value })} />
            </div>
            <button type="submit" className="bg-negative hover:bg-negative/90 text-white font-black text-xs uppercase tracking-widest py-2.5 px-4 transition-colors h-9">
              Confirm Sale
            </button>
          </form>
        </div>
      )}

      {/* ── LIMIT MODAL ─────────────────────────────────────────────────────── */}
      {showLimitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLimitModal(false); }}
          role="dialog" aria-modal="true"
        >
          <div className="w-full max-w-md bg-card border border-border shadow-2xl animate-fade-up">
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-premium/60 to-transparent" />

            <div className="flex items-start justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted border border-border">
                  <Lock className="w-4 h-4 text-premium" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Asset Tracking Limit Reached</h2>
                  <p className="data-label mt-0.5">{BASIC_LIMIT}/{BASIC_LIMIT} Investments used · Basic Tier</p>
                </div>
              </div>
              <button onClick={() => setShowLimitModal(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Slot visualiser */}
              <div className="bg-background border border-border p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="data-label">Investment Positions</span>
                  <span className="text-[11px] font-mono font-bold text-negative">{BASIC_LIMIT}/{BASIC_LIMIT} — Full</span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: BASIC_LIMIT }).map((_, i) => (
                    <div key={i} className="flex-1 h-2 bg-negative" />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed font-mono">
                  Your Basic tier has reached the <span className="text-foreground font-bold">{BASIC_LIMIT}-position hard limit</span>. Upgrade to add unlimited positions.
                </p>
              </div>

              {/* Feature list */}
              <div className="space-y-2">
                <p className="data-label">Pro Tier Unlocks</p>
                {["Unlimited investment positions", "No transaction record caps", "Tax-loss harvesting signals", "SIP reminder engine", "Security audit log access"].map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-[11px] font-mono text-muted-foreground">
                    <span className="w-1.5 h-1.5 bg-premium/60 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                {sessionUser ? (
                  <RazorpayUpgradeButton
                    sessionUser={sessionUser}
                    buttonText="Upgrade to Pro Tier (₹1,299)"
                    className="w-full flex items-center justify-center gap-3 bg-premium hover:bg-premium/90 text-background font-black text-sm uppercase tracking-widest py-4 px-6 transition-colors"
                  />
                ) : (
                  <a href="/dashboard/billing" className="w-full flex items-center justify-center gap-2 bg-premium hover:bg-premium/90 text-background font-black text-sm uppercase tracking-widest py-4 px-6 transition-colors">
                    View Upgrade Options →
                  </a>
                )}
              </div>

              <button onClick={() => setShowLimitModal(false)} className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors py-1">
                Stay on Basic — Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIP REMINDERS ───────────────────────────────────────────────────── */}
      {data.sipReminders.length > 0 && (
        <div className="border border-info/25 bg-info/5 p-4 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 text-info font-bold uppercase tracking-wider text-[10px]">
            <Bell className="w-3.5 h-3.5" /> SIP Reminders
          </div>
          {data.sipReminders.map((rem, i) => (
            <p key={i} className="text-[10px] text-muted-foreground">› {rem}</p>
          ))}
        </div>
      )}

      {/* ── MAIN GRID ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── ADD FORM ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 panel p-5 h-fit">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Capital Allocation Entry
            </h3>
            <span className={`text-[9px] font-mono border px-1.5 py-0.5 ${
              atLimit
                ? "text-negative border-negative/30 bg-negative/10"
                : liveCount >= BASIC_LIMIT - 1
                ? "text-warning border-warning/30 bg-warning/10"
                : "text-muted-foreground border-border"
            }`}>
              {liveCount}/{BASIC_LIMIT}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="data-label block mb-1.5">Ticker Symbol</label>
              <input type="text" placeholder="RELIANCE.NS" required
                className="field uppercase" value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
            </div>
            <div>
              <label className="data-label block mb-1.5">Asset Name</label>
              <input type="text" placeholder="Reliance Industries" required
                className="field" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="data-label block mb-1.5">Position Variant</label>
              <select className="field" value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as FormState["type"] })}>
                <option value="EQUITY_STOCK">Direct Equity Stock</option>
                <option value="SIP_MUTUAL_FUND">SIP / Mutual Fund</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="data-label block mb-1.5">Units Owned</label>
                <input type="number" step="any" placeholder="10" required
                  className="field" value={form.sharesOwned}
                  onChange={(e) => setForm({ ...form, sharesOwned: e.target.value })} />
              </div>
              <div>
                <label className="data-label block mb-1.5">Avg Buy (₹)</label>
                <input type="number" step="any" placeholder="₹" required
                  className="field" value={form.avgBuyPrice}
                  onChange={(e) => setForm({ ...form, avgBuyPrice: e.target.value })} />
              </div>
            </div>

            {form.type === "SIP_MUTUAL_FUND" && (
              <div className="grid grid-cols-2 gap-2 border-l-2 border-info/30 pl-3">
                <div>
                  <label className="data-label block mb-1.5">SIP Amount (₹)</label>
                  <input type="number" placeholder="₹" className="field" value={form.sipAmount}
                    onChange={(e) => setForm({ ...form, sipAmount: e.target.value })} />
                </div>
                <div>
                  <label className="data-label block mb-1.5">Reminder Day</label>
                  <input type="number" placeholder="1–31" min={1} max={31} className="field" value={form.sipDay}
                    onChange={(e) => setForm({ ...form, sipDay: e.target.value })} />
                </div>
              </div>
            )}

            {/* Gate: show lock state when at limit */}
            {atLimit ? (
              <button
                type="button"
                onClick={() => setShowLimitModal(true)}
                className="w-full flex items-center justify-center gap-2 border border-premium/40 bg-premium/8 text-premium text-xs font-bold uppercase tracking-widest py-2.5 px-4 transition-colors hover:bg-premium/15"
              >
                <Lock className="w-3.5 h-3.5" /> Limit Reached — Upgrade to Add
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Committing…</>
                ) : (
                  "Commit Position to Ledger"
                )}
              </button>
            )}
          </form>
        </div>

        {/* ── ASSET GRID ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">
          <div className="panel p-5">
            {/* Grid header */}
            <div className="flex justify-between items-start border-b border-border pb-3 mb-4">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                <Landmark className="w-3.5 h-3.5 text-accent" /> Tracked Assets
              </h3>
              <div className="text-right space-y-0.5">
                <p className="data-label">Net Asset Worth</p>
                <p className="text-lg font-black font-mono tabular-nums text-foreground">
                  ₹{data.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
                <p className={`text-xs font-mono font-bold tabular-nums flex items-center justify-end gap-1 ${totalPnlPos ? "text-positive" : "text-negative"}`}>
                  {totalPnlPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {totalPnlPos ? "+" : ""}₹{Math.abs(data.totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-muted-foreground font-mono text-[10px] uppercase tracking-widest animate-pulse">
                Refreshing Telemetry…
              </div>
            ) : data.positions.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                No assets registered. Commit your first position.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
                {data.positions.map((pos) => {
                  const profit = pos.profitOrLoss >= 0;
                  return (
                    <div
                      key={pos.id}
                      className="bg-background border border-border p-4 flex flex-col justify-between hover:border-border/60 hover:bg-surface transition-colors"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <span className="text-sm font-black text-foreground tracking-tight block">{pos.symbol}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[130px] block">{pos.name}</span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => setActiveChart(pos.symbol)}
                              className="p-1.5 bg-muted border border-border text-accent hover:bg-accent/10 hover:border-accent/40 transition-colors"
                              title="View chart"
                            >
                              <LineChart className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setSellingAsset(pos)}
                              className="px-2 py-1 bg-muted border border-border text-positive hover:bg-positive/10 hover:border-positive/40 transition-colors text-[9px] font-bold uppercase"
                              title="Sell"
                            >
                              Sell
                            </button>
                            <button
                              onClick={() => handleDelete(pos.id)}
                              className="p-1.5 bg-muted border border-border text-negative/70 hover:bg-negative/10 hover:border-negative/40 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-dashed border-border flex justify-between">
                          <div>
                            <p className="data-label mb-0.5">Current</p>
                            <p className="text-xs font-bold font-mono tabular-nums text-foreground">₹{pos.currentPrice.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="data-label mb-0.5">Avg Cost</p>
                            <p className="text-xs font-mono tabular-nums text-muted-foreground">₹{pos.avgBuyPrice.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-border flex justify-between items-end">
                        <div>
                          <p className="data-label mb-0.5">Holding Value</p>
                          <p className="text-sm font-black font-mono tabular-nums text-foreground">
                            ₹{pos.currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-bold font-mono tabular-nums ${profit ? "text-positive" : "text-negative"}`}>
                          {profit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <div className="text-right">
                            <div>{profit ? "+" : ""}₹{pos.profitOrLoss.toFixed(0)}</div>
                            <div className="text-[9px] font-medium opacity-70">({pos.pnlPercentage.toFixed(1)}%)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}