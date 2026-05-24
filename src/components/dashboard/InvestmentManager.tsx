"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, TrendingUp, TrendingDown, Trash2,
  LineChart, X, DollarSign, Lock, Loader2,
  Bell, BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import TradingViewChart from "./TradingViewChart";
import { useNotifications } from "@/components/dashboard/NotificationContext";
import RazorpayUpgradeButton from "./RazorpayUpgradeButton";

const BASIC_LIMIT = 5;

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

type Form = {
  symbol: string; name: string;
  type: "EQUITY_STOCK" | "SIP_MUTUAL_FUND";
  sharesOwned: string; avgBuyPrice: string;
  sipAmount: string; sipDay: string;
};

const EMPTY_FORM: Form = {
  symbol: "", name: "", type: "EQUITY_STOCK",
  sharesOwned: "", avgBuyPrice: "", sipAmount: "", sipDay: "",
};

interface InvestmentManagerProps {
  totalInvestmentsCount?: number;
  sessionUser?: { id: string; name?: string | null; email?: string | null; image?: string | null };
}

export default function InvestmentManager({ totalInvestmentsCount = 0, sessionUser }: InvestmentManagerProps) {
  const [data, setData]               = useState<PortfolioData>({ positions: [], totalValue: 0, totalPnl: 0, sipReminders: [] });
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [activeChart, setActiveChart] = useState<string | null>(null);
  const [selling, setSelling]         = useState<Position | null>(null);
  const [sellForm, setSellForm]       = useState({ sharesToSell: "", salePrice: "" });
  const [form, setForm]               = useState<Form>(EMPTY_FORM);
  const [limitModal, setLimitModal]   = useState(false);
  const { triggerToast }              = useNotifications();

  const atLimit = data.positions.length >= BASIC_LIMIT;

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
    if (atLimit) { setLimitModal(true); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/investments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 403) { const err = await res.json(); if (err.code === "TIER_LIMIT_EXCEEDED") { setLimitModal(true); return; } }
      if (res.ok) {
        setForm(EMPTY_FORM); await load();
        triggerToast("Position Added", `${form.symbol.toUpperCase()} committed to ledger.`, "SUCCESS");
      } else {
        const err = await res.json();
        triggerToast("Failed", err.error || "Could not add position.", "WARNING");
      }
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently remove this position? This will NOT update your cash balance.")) return;
    try {
      const res = await fetch(`/api/investments/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (activeChart === data.positions.find((p) => p.id === id)?.symbol) setActiveChart(null);
        triggerToast("Position Removed", "Entry deleted from ledger.", "INFO");
        await load();
      }
    } catch (e) { console.error(e); }
  }

  async function handleSale(e: React.FormEvent) {
    e.preventDefault();
    if (!selling) return;
    try {
      const res = await fetch(`/api/investments/${selling.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sellForm),
      });
      if (res.ok) {
        triggerToast("Sale Executed", `Liquidation processed for ${selling.symbol}.`, "SUCCESS");
        setSelling(null); setSellForm({ sharesToSell: "", salePrice: "" }); await load();
      } else {
        const err = await res.json();
        triggerToast("Sale Failed", err.error || "Could not process sale.", "WARNING");
      }
    } catch (e) { console.error(e); }
  }

  const totalPnlPos = data.totalPnl >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="label-xs mb-1">Investment Tracker</p>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
            Portfolio Ledger
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {data.positions.length > 0 && (
            <div className="flex items-center gap-4 rounded-xl px-4 py-2.5"
              style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}
            >
              <div className="text-right">
                <p className="label-xs mb-0.5">Net Worth</p>
                <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist" }}>
                  ₹{data.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div
                className="w-px h-8 self-center"
                style={{ background: "hsl(var(--border))" }}
              />
              <div className="text-right">
                <p className="label-xs mb-0.5">Total P&amp;L</p>
                <p
                  className="text-sm font-bold tabular flex items-center gap-1"
                  style={{ color: totalPnlPos ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono" }}
                >
                  {totalPnlPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {totalPnlPos ? "+" : "−"}₹{Math.abs(data.totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SIP Reminders */}
      {data.sipReminders.length > 0 && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: "hsl(var(--info-dim))", border: "1px solid hsl(var(--info) / 0.25)" }}
        >
          <Bell className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--info))" }} />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "hsl(var(--info))" }}>
              SIP Reminders
            </p>
            {data.sipReminders.map((r, i) => (
              <p key={i} className="text-xs" style={{ color: "hsl(var(--foreground-secondary))" }}>
                › {r}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Live chart */}
      {activeChart && (
        <div
          className="rounded-2xl overflow-hidden animate-fade-in"
          style={{ border: "1px solid hsl(var(--info) / 0.3)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ background: "hsl(var(--surface))", borderBottom: "1px solid hsl(var(--border))" }}
          >
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4" style={{ color: "hsl(var(--info))" }} />
              <span className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
                {activeChart}
              </span>
              <span className="badge-info">Live Chart</span>
            </div>
            <button onClick={() => setActiveChart(null)} className="btn-icon">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <TradingViewChart symbol={activeChart} />
        </div>
      )}

      {/* Sell panel */}
      {selling && (
        <div
          className="rounded-2xl p-5 animate-fade-in"
          style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--negative) / 0.3)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: "hsl(var(--negative))" }} />
              <span className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
                Liquidate {selling.symbol}
              </span>
              <span className="badge-negative">Sell Order</span>
            </div>
            <button onClick={() => setSelling(null)} className="btn-icon">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <form onSubmit={handleSale} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="label-xs block mb-2">Units to sell (max {selling.sharesOwned})</label>
              <input type="number" step="any" required max={selling.sharesOwned} className="field"
                value={sellForm.sharesToSell}
                onChange={(e) => setSellForm({ ...sellForm, sharesToSell: e.target.value })}
              />
            </div>
            <div>
              <label className="label-xs block mb-2">Sale price (₹) · current ₹{selling.currentPrice.toFixed(2)}</label>
              <input type="number" step="any" required className="field"
                value={sellForm.salePrice}
                onChange={(e) => setSellForm({ ...sellForm, salePrice: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-danger h-10">Confirm Sale</button>
          </form>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Add form */}
        <div className="lg:col-span-4 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="label-xs mb-0.5">New Position</p>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                Add to Portfolio
              </p>
            </div>
            {/* Limit indicator */}
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold tabular"
              style={{
                background: atLimit ? "hsl(var(--negative-dim))" : "hsl(var(--surface-raised))",
                border:     `1px solid ${atLimit ? "hsl(var(--negative) / 0.3)" : "hsl(var(--border))"}`,
                color:      atLimit ? "hsl(var(--negative))" : "hsl(var(--foreground-secondary))",
                fontFamily: "Geist Mono",
              }}
            >
              {atLimit && <Lock className="w-3 h-3" />}
              {data.positions.length}/{BASIC_LIMIT}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-xs block mb-2">Ticker Symbol</label>
              <input type="text" placeholder="RELIANCE.NS" required className="field-mono"
                value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
            </div>
            <div>
              <label className="label-xs block mb-2">Asset Name</label>
              <input type="text" placeholder="Reliance Industries" required className="field"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label-xs block mb-2">Type</label>
              <select className="field"
                value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Form["type"] })}>
                <option value="EQUITY_STOCK">Direct Equity Stock</option>
                <option value="SIP_MUTUAL_FUND">SIP / Mutual Fund</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-xs block mb-2">Units</label>
                <input type="number" step="any" placeholder="10" required className="field"
                  value={form.sharesOwned} onChange={(e) => setForm({ ...form, sharesOwned: e.target.value })} />
              </div>
              <div>
                <label className="label-xs block mb-2">Avg Cost (₹)</label>
                <input type="number" step="any" placeholder="0.00" required className="field"
                  value={form.avgBuyPrice} onChange={(e) => setForm({ ...form, avgBuyPrice: e.target.value })} />
              </div>
            </div>

            {form.type === "SIP_MUTUAL_FUND" && (
              <div
                className="grid grid-cols-2 gap-3 rounded-xl p-3"
                style={{ background: "hsl(var(--info-dim))", border: "1px solid hsl(var(--info) / 0.2)" }}
              >
                <div>
                  <label className="label-xs block mb-2">SIP Amount (₹)</label>
                  <input type="number" placeholder="0" className="field"
                    value={form.sipAmount} onChange={(e) => setForm({ ...form, sipAmount: e.target.value })} />
                </div>
                <div>
                  <label className="label-xs block mb-2">Day of Month</label>
                  <input type="number" placeholder="1–31" min={1} max={31} className="field"
                    value={form.sipDay} onChange={(e) => setForm({ ...form, sipDay: e.target.value })} />
                </div>
              </div>
            )}

            {atLimit ? (
              <button
                type="button"
                onClick={() => setLimitModal(true)}
                className="btn w-full justify-center text-sm"
                style={{
                  background: "hsl(var(--premium-dim))",
                  border:     "1px solid hsl(var(--premium) / 0.35)",
                  color:      "hsl(var(--premium))",
                  borderRadius: "10px",
                }}
              >
                <Lock className="w-4 h-4" />
                Limit Reached — Upgrade to Add
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center text-sm">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : "Add to Portfolio"}
              </button>
            )}
          </form>
        </div>

        {/* Asset grid */}
        <div className="lg:col-span-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton rounded-2xl h-44" />
              ))}
            </div>
          ) : data.positions.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full min-h-[280px] rounded-2xl gap-4"
              style={{ background: "hsl(var(--surface))", border: "2px dashed hsl(var(--border))" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border))" }}
              >
                <BarChart3 className="w-6 h-6" style={{ color: "hsl(var(--foreground-tertiary))" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--foreground))" }}>
                  No positions tracked
                </p>
                <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  Add your first position using the form
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-1">
              {data.positions.map((pos) => {
                const profit = pos.profitOrLoss >= 0;
                return (
                  <div
                    key={pos.id}
                    className="card-hover rounded-2xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-base font-black tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
                              {pos.symbol}
                            </p>
                            <span className={`badge-${pos.type === "SIP_MUTUAL_FUND" ? "info" : "muted"}`}>
                              {pos.type === "SIP_MUTUAL_FUND" ? "SIP" : "EQ"}
                            </span>
                          </div>
                          <p className="text-xs truncate max-w-[140px]" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                            {pos.name}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => setActiveChart(pos.symbol)}
                            className="btn-icon"
                            title="View chart"
                          >
                            <LineChart className="w-3.5 h-3.5" style={{ color: "hsl(var(--info))" }} />
                          </button>
                          <button
                            onClick={() => setSelling(pos)}
                            className="btn-icon text-xs font-bold"
                            title="Sell"
                            style={{ color: "hsl(var(--positive))" }}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(pos.id)}
                            className="btn-icon"
                            title="Delete"
                            style={{ color: "hsl(var(--negative) / 0.7)" }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Price row */}
                      <div
                        className="grid grid-cols-2 gap-3 rounded-xl p-3 mb-3"
                        style={{ background: "hsl(var(--surface-raised))" }}
                      >
                        <div>
                          <p className="label-xs mb-1">Current Price</p>
                          <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
                            ₹{pos.currentPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="label-xs mb-1">Avg Cost</p>
                          <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--foreground-secondary))", fontFamily: "Geist Mono" }}>
                            ₹{pos.avgBuyPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: "1px solid hsl(var(--border))" }}
                    >
                      <div>
                        <p className="label-xs mb-1">Holdings Value</p>
                        <p className="text-sm font-black tabular" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist" }}>
                          ₹{pos.currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                        style={{
                          background: profit ? "hsl(var(--positive-dim))" : "hsl(var(--negative-dim))",
                          border:     `1px solid hsl(var(--${profit ? "positive" : "negative"}) / 0.2)`,
                        }}
                      >
                        {profit
                          ? <ArrowUpRight   className="w-3.5 h-3.5" style={{ color: "hsl(var(--positive))" }} />
                          : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: "hsl(var(--negative))" }} />
                        }
                        <div>
                          <p
                            className="text-xs font-bold tabular leading-none"
                            style={{ color: profit ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono" }}
                          >
                            {profit ? "+" : "−"}₹{Math.abs(pos.profitOrLoss).toFixed(0)}
                          </p>
                          <p
                            className="text-[10px] tabular"
                            style={{ color: profit ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono", opacity: 0.7 }}
                          >
                            {pos.pnlPercentage.toFixed(1)}%
                          </p>
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

      {/* Limit Modal */}
      {limitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "hsl(220 14% 3% / 0.85)", backdropFilter: "blur(12px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setLimitModal(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden animate-scale-in"
            style={{ background: "hsl(var(--surface-overlay))", border: "1px solid hsl(var(--border))", boxShadow: "0 32px 80px hsl(220 14% 3% / 0.8)" }}
          >
            {/* Gold accent stripe */}
            <div style={{ height: "3px", background: "linear-gradient(90deg, transparent, hsl(var(--premium)), transparent)" }} />

            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "hsl(var(--premium-dim))", border: "1px solid hsl(var(--premium) / 0.3)" }}
                  >
                    <Lock className="w-5 h-5" style={{ color: "hsl(var(--premium))" }} />
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>Limit Reached</p>
                    <p className="label-xs mt-0.5" style={{ color: "hsl(var(--premium) / 0.7)" }}>
                      {BASIC_LIMIT}/{BASIC_LIMIT} positions · Basic Tier
                    </p>
                  </div>
                </div>
                <button onClick={() => setLimitModal(false)} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Slot visualiser */}
              <div
                className="rounded-xl p-4 mb-5"
                style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="label-xs">Investment Positions</p>
                  <span className="badge-negative">{BASIC_LIMIT}/{BASIC_LIMIT} Full</span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: BASIC_LIMIT }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 h-2 rounded-full"
                      style={{ background: "hsl(var(--negative))" }}
                    />
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  Upgrade to Pro to add unlimited positions to your portfolio.
                </p>
              </div>

              {/* Feature list */}
              <div className="space-y-2 mb-5">
                {["Unlimited investment positions", "No transaction caps", "Tax-loss harvesting", "SIP reminder engine", "Export to CSV & PDF"].map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-xs" style={{ color: "hsl(var(--foreground-secondary))" }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--premium))" }} />
                    {f}
                  </div>
                ))}
              </div>

              {sessionUser ? (
                <RazorpayUpgradeButton
                  sessionUser={sessionUser}
                  buttonText="Upgrade to Pro Tier (₹1,299)"
                  className="btn-premium w-full justify-center text-sm"
                />
              ) : (
                <a href="/dashboard/billing" className="btn-premium w-full justify-center text-sm inline-flex items-center gap-2">
                  View Upgrade Options
                </a>
              )}

              <button
                onClick={() => setLimitModal(false)}
                className="w-full text-center text-xs mt-3 transition-colors"
                style={{ color: "hsl(var(--foreground-tertiary))" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground-secondary))"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground-tertiary))"; }}
              >
                Stay on Basic Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}