"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, TrendingUp, TrendingDown, Trash2, LineChart,
  X, DollarSign, Lock, Loader2, Bell, BarChart3,
  ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp,
  Building2, Coins, Landmark, Wallet, Calendar,
  Zap, Info,
} from "lucide-react";
import TradingViewChart from "./TradingViewChart";
import { useNotifications } from "@/components/dashboard/NotificationContext";
import RazorpayUpgradeButton from "./RazorpayUpgradeButton";
import {
  getCurrencySymbol,
  formatCurrency,
  formatPnL,
  formatPct,
} from "@/lib/utils/currencyUtils";
import {
  calculateFD,
  calculateRD,
  calculateSIP,
  calculatePPF,
  computeLivePreview,
  type LivePreview,
} from "@/lib/utils/investmentCalculations";

// ── Asset types ────────────────────────────────────────────────────────────────
const ASSET_TYPES = [
  { value: "EQUITY_STOCK",        label: "Direct Equity",           group: "Equity",       formShape: "equity"     },
  { value: "ETF",                  label: "ETF",                     group: "Equity",       formShape: "equity"     },
  { value: "US_STOCK",             label: "US Stock",                group: "Equity",       formShape: "equity"     },
  { value: "SIP_MUTUAL_FUND",      label: "SIP / Mutual Fund",       group: "Mutual Funds", formShape: "sip"        },
  { value: "MUTUAL_FUND_LUMPSUM",  label: "Mutual Fund (Lumpsum)",   group: "Mutual Funds", formShape: "mf_lump"    },
  { value: "FIXED_DEPOSIT",        label: "Fixed Deposit",           group: "Fixed Income", formShape: "fd"         },
  { value: "RECURRING_DEPOSIT",    label: "Recurring Deposit",       group: "Fixed Income", formShape: "rd"         },
  { value: "BOND",                 label: "Bond / Debenture",        group: "Fixed Income", formShape: "bond"       },
  { value: "GOLD",                 label: "Gold",                    group: "Commodity",    formShape: "gold"       },
  { value: "CRYPTO",               label: "Cryptocurrency",          group: "Crypto",       formShape: "crypto"     },
  { value: "PPF",                  label: "PPF",                     group: "Retirement",   formShape: "ppf"        },
  { value: "EPF",                  label: "EPF",                     group: "Retirement",   formShape: "epf"        },
  { value: "NPS",                  label: "NPS",                     group: "Retirement",   formShape: "nps"        },
  { value: "REAL_ESTATE",          label: "Real Estate",             group: "Real Assets",  formShape: "realestate" },
  { value: "OTHER",                label: "Other",                   group: "Other",        formShape: "other"      },
] as const;

type FormShape =
  | "equity" | "sip" | "mf_lump" | "fd" | "rd"
  | "bond" | "gold" | "crypto" | "ppf" | "epf"
  | "nps" | "realestate" | "other";

const BROKERS   = ["Zerodha","Groww","Upstox","Angel One","HDFC Securities","ICICI Direct","Kotak Securities","SBI Securities","Kuvera","Coin (Zerodha)","Paytm Money","Other"];
const EXCHANGES = ["NSE","BSE","NASDAQ","NYSE","MCX","Other"];
const SECTORS   = ["Technology","Financial Services","Healthcare","Consumer Goods","Energy","Industrials","Materials","Real Estate","Utilities","Communication","Other"];
const GOLD_FORMS = ["Physical Gold","Sovereign Gold Bond (SGB)","Gold ETF","Gold Mutual Fund"];
const NPS_TIERS  = ["Tier I","Tier II"];
const CURRENCIES = ["INR","USD","EUR","GBP","JPY","SGD","AED","CAD","AUD"];

// ── Types ──────────────────────────────────────────────────────────────────────
interface Position {
  id: string; symbol: string; name: string; type: string;
  sharesOwned: number; avgBuyPrice: number;
  sipAmount: number | null; sipDay: number | null;
  currentPrice: number; currentValue: number;
  profitOrLoss: number; pnlPercentage: number;
  xirr: number | null;
  broker: string | null; currency: string;
  exchange: string | null; sector: string | null;
  isin: string | null; folioNumber: string | null;
  maturityDate: string | null; interestRate: number | null;
  notes: string | null; tags: string[];
  portfolio: { id: string; name: string; color: string | null } | null;
  goal: { id: string; name: string; targetAmount: number } | null;
  createdAt: string; 
  updatedAt: string;
}

interface PortfolioData {
  positions: Position[];
  totalValue: number; totalPnl: number; totalCost: number;
  sipReminders: string[]; portfolioXirr: number | null;
  allocation: { byType: { label: string; value: number; percentage: number }[]; concentration: { topHolding: string; topHoldingWeight: number; isConcentrated: boolean }; };
  healthScore: { score: number; grade: string; factors: { diversification: number; returns: number; riskBalance: number; consistency: number }; flags: string[]; };
  taxSummary: { shortTermGains: number; shortTermLoss: number; longTermGains: number; longTermLoss: number; estimatedSTCGTax: number; estimatedLTCGTax: number; };
  meta: { totalCount: number; hiddenCount: number; tierCapped: boolean; upgradeRequired: boolean; isPro: boolean };
}

interface InvestmentManagerProps {
  totalInvestmentsCount?: number;
  sessionUser?: { id: string; name?: string | null; email?: string | null; image?: string | null };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getShape(type: string): FormShape {
  return (ASSET_TYPES.find((a) => a.value === type)?.formShape ?? "other") as FormShape;
}

function TypeIcon({ type, className = "w-3.5 h-3.5" }: { type: string; className?: string }) {
  if (["EQUITY_STOCK","ETF","US_STOCK"].includes(type))            return <TrendingUp  className={className} />;
  if (["SIP_MUTUAL_FUND","MUTUAL_FUND_LUMPSUM"].includes(type))    return <BarChart3   className={className} />;
  if (["FIXED_DEPOSIT","RECURRING_DEPOSIT","BOND"].includes(type)) return <Landmark   className={className} />;
  if (type === "GOLD")                                              return <Coins      className={className} />;
  if (type === "REAL_ESTATE")                                       return <Building2  className={className} />;
  if (["PPF","EPF","NPS"].includes(type))                           return <Wallet     className={className} />;
  return <BarChart3 className={className} />;
}

function gradeColor(grade: string) {
  if (grade === "A") return "hsl(var(--positive))";
  if (grade === "B") return "hsl(var(--info))";
  if (grade === "C") return "hsl(var(--warning))";
  return "hsl(var(--negative))";
}

// ── Compute client-side returns for fixed-income / retirement positions ────────
function computePositionReturns(pos: Position): {
  investedAmount: number; displayValue: number; profit: number;
  pnlPct: number; maturityValue: number | null; label: string;
  isProjection: boolean; breakdown?: { label: string; value: number }[];
} {
  const shape = getShape(pos.type);

  if (shape === "fd" && pos.interestRate && pos.maturityDate) {
    const calc = calculateFD({
      principal:    pos.avgBuyPrice * pos.sharesOwned,
      annualRate:   pos.interestRate,
      startDate:    new Date(pos.updatedAt ?? pos.createdAt ?? new Date()),
      maturityDate: new Date(pos.maturityDate),
    });
    return { investedAmount: calc.investedAmount, displayValue: calc.currentValue, profit: calc.profit, pnlPct: calc.pnlPercentage, maturityValue: calc.maturityValue, label: "Interest Earned", isProjection: false, breakdown: calc.breakdown };
  }

  if (shape === "rd" && pos.sipAmount && pos.interestRate && pos.maturityDate) {
    const calc = calculateRD({
      monthlyInstalment: pos.sipAmount,
      annualRate:        pos.interestRate,
      startDate:         new Date(pos.updatedAt ?? pos.createdAt ?? new Date()),
      maturityDate:      new Date(pos.maturityDate),
    });
    return { investedAmount: calc.investedAmount, displayValue: calc.currentValue, profit: calc.profit, pnlPct: calc.pnlPercentage, maturityValue: calc.maturityValue, label: "Interest Earned", isProjection: false, breakdown: calc.breakdown };
  }

  if (shape === "sip" && pos.sipAmount) {
    const calc = calculateSIP({
      monthlyAmount:    pos.sipAmount,
      annualReturnPct:  12, // default 12% for equity MF
      startDate:        new Date(pos.createdAt ?? new Date()),
      currentNAV:       pos.currentPrice,
      purchaseNAV:      pos.avgBuyPrice,
      unitsAccumulated: pos.sharesOwned,
    });
    return { investedAmount: calc.investedAmount, displayValue: calc.estimatedValue, profit: calc.estimatedProfit, pnlPct: calc.pnlPercentage, maturityValue: null, label: "Estimated Returns", isProjection: false };
  }

  if (shape === "ppf" && pos.maturityDate) {
    const calc = calculatePPF({
      currentBalance:     pos.avgBuyPrice * pos.sharesOwned,
      annualContribution: pos.sipAmount ?? 150000,
      startDate:          new Date(pos.createdAt ?? new Date()),
      maturityDate:       new Date(pos.maturityDate),
    });
    return { investedAmount: calc.investedAmount, displayValue: calc.currentValue, profit: calc.maturityProfit, pnlPct: calc.maturityPct, maturityValue: calc.maturityValue, label: "Projected Returns", isProjection: true, breakdown: calc.breakdown };
  }

  // Default: use live price data
  const invested = pos.avgBuyPrice * pos.sharesOwned;
  return { investedAmount: invested, displayValue: pos.currentValue, profit: pos.profitOrLoss, pnlPct: pos.pnlPercentage, maturityValue: null, label: "P&L", isProjection: false };
}

// ── Field wrapper ──────────────────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label-xs block mb-1.5">
        {label}
        {hint && <span className="ml-1.5 normal-case" style={{ color: "hsl(var(--foreground-tertiary))", fontSize: "9px" }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ── Live Preview Card ──────────────────────────────────────────────────────────
function LivePreviewCard({ preview, currency }: { preview: LivePreview; currency: string }) {
  const sym = getCurrencySymbol(currency);
  return (
    <div className="rounded-xl p-4 space-y-3 animate-fade-in"
      style={{ background: "hsl(var(--info-dim))", border: "1px solid hsl(var(--info) / 0.25)" }}>
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5" style={{ color: "hsl(var(--info))" }} />
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "hsl(var(--info))" }}>
          Live Calculation Preview
          {preview.isProjection && <span className="ml-2 text-[9px] normal-case font-normal opacity-70">(projected estimate)</span>}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg p-2.5" style={{ background: "hsl(var(--surface))" }}>
          <p className="label-xs mb-1">Invested</p>
          <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
            {formatCurrency(preview.investedAmount, currency)}
          </p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: "hsl(var(--surface))" }}>
          <p className="label-xs mb-1">Current Value</p>
          <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
            {formatCurrency(preview.currentValue, currency)}
          </p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: "hsl(var(--surface))" }}>
          <p className="label-xs mb-1">{preview.label}</p>
          <p className="text-sm font-bold tabular" style={{ color: preview.profit >= 0 ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono" }}>
            {formatPnL(preview.profit, currency)}
          </p>
        </div>
        {preview.maturityValue > preview.currentValue && (
          <div className="rounded-lg p-2.5" style={{ background: "hsl(var(--surface))" }}>
            <p className="label-xs mb-1">At Maturity</p>
            <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--positive))", fontFamily: "Geist Mono" }}>
              {formatCurrency(preview.maturityValue, currency)}
            </p>
          </div>
        )}
      </div>
      <div className="flex gap-3 text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
        <span>Return: <span className="font-bold" style={{ color: preview.pnlPct >= 0 ? "hsl(var(--positive))" : "hsl(var(--negative))" }}>{formatPct(preview.pnlPct)}</span></span>
        {preview.maturityPct !== preview.pnlPct && (
          <span>· Maturity: <span className="font-bold" style={{ color: "hsl(var(--positive))" }}>{formatPct(preview.maturityPct)}</span></span>
        )}
      </div>
    </div>
  );
}

// ── Position returns detail ────────────────────────────────────────────────────
function ReturnsBreakdown({ breakdown, currency }: { breakdown: { label: string; value: number }[]; currency: string }) {
  return (
    <div className="space-y-1 mt-2">
      {breakdown.map((item) => (
        <div key={item.label} className="flex justify-between text-xs">
          <span style={{ color: "hsl(var(--foreground-tertiary))" }}>{item.label}</span>
          <span className="tabular font-semibold" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
            {formatCurrency(item.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Per-shape form sections ────────────────────────────────────────────────────
function EquityFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ticker Symbol" hint="e.g. RELIANCE.NS">
          <input type="text" placeholder="RELIANCE.NS" required className="field-mono"
            value={f.symbol ?? ""} onChange={(e) => set("symbol", e.target.value)} />
        </Field>
        <Field label="Company Name">
          <input type="text" placeholder="Reliance Industries" required className="field"
            value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Shares Owned">
          <input type="number" step="any" placeholder="10" required className="field"
            value={f.sharesOwned ?? ""} onChange={(e) => set("sharesOwned", e.target.value)} />
        </Field>
        <Field label={`Avg Buy Price (${getCurrencySymbol(f.currency ?? "INR")})`}>
          <input type="number" step="any" placeholder="0.00" required className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => set("avgBuyPrice", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Exchange">
          <select className="field" value={f.exchange ?? ""} onChange={(e) => set("exchange", e.target.value)}>
            <option value="">Select</option>
            {EXCHANGES.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
          </select>
        </Field>
        <Field label="Currency">
          <select className="field" value={f.currency ?? "INR"} onChange={(e) => set("currency", e.target.value)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c} ({getCurrencySymbol(c)})</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sector">
          <select className="field" value={f.sector ?? ""} onChange={(e) => set("sector", e.target.value)}>
            <option value="">Select</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Broker">
          <select className="field" value={f.broker ?? ""} onChange={(e) => set("broker", e.target.value)}>
            <option value="">Select</option>
            {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
      </div>
    </>
  );
}

function SIPFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fund Name">
          <input type="text" placeholder="Mirae Asset Large Cap" required className="field"
            value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Fund House / AMC">
          <input type="text" placeholder="Mirae Asset" className="field"
            value={f.symbol ?? ""} onChange={(e) => set("symbol", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monthly SIP (₹)">
          <input type="number" step="any" placeholder="5000" required className="field"
            value={f.sipAmount ?? ""} onChange={(e) => set("sipAmount", e.target.value)} />
        </Field>
        <Field label="Expected Return % p.a." hint="for projection">
          <input type="number" step="0.1" placeholder="12" className="field"
            value={f.expectedReturn ?? ""} onChange={(e) => set("expectedReturn", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="SIP Start Date">
          <input type="date" className="field"
            value={f.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="SIP Debit Day" hint="1–31">
          <input type="number" min={1} max={31} placeholder="5" className="field"
            value={f.sipDay ?? ""} onChange={(e) => set("sipDay", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Units Accumulated" hint="from statement">
          <input type="number" step="any" placeholder="234.56" className="field"
            value={f.sharesOwned ?? ""} onChange={(e) => set("sharesOwned", e.target.value)} />
        </Field>
        <Field label="Current NAV (₹)">
          <input type="number" step="any" placeholder="45.23" className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => set("avgBuyPrice", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Folio Number">
          <input type="text" placeholder="12345678" className="field-mono"
            value={f.folioNumber ?? ""} onChange={(e) => set("folioNumber", e.target.value)} />
        </Field>
        <Field label="ISIN">
          <input type="text" placeholder="INF123A01234" className="field-mono"
            value={f.isin ?? ""} onChange={(e) => set("isin", e.target.value)} />
        </Field>
      </div>
      <Field label="Platform">
        <select className="field" value={f.broker ?? ""} onChange={(e) => set("broker", e.target.value)}>
          <option value="">Select</option>
          {["Kuvera","Coin (Zerodha)","Groww","Paytm Money","MF Central","Direct (AMC)","Other"].map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </Field>
    </>
  );
}

function MFLumpFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fund Name">
          <input type="text" placeholder="Parag Parikh Flexi Cap" required className="field"
            value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="AMC / Fund House">
          <input type="text" placeholder="PPFAS" className="field"
            value={f.symbol ?? ""} onChange={(e) => set("symbol", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Units Purchased">
          <input type="number" step="any" placeholder="1000" required className="field"
            value={f.sharesOwned ?? ""} onChange={(e) => set("sharesOwned", e.target.value)} />
        </Field>
        <Field label="Purchase NAV (₹)">
          <input type="number" step="any" placeholder="52.40" required className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => set("avgBuyPrice", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Folio Number">
          <input type="text" placeholder="12345678" className="field-mono"
            value={f.folioNumber ?? ""} onChange={(e) => set("folioNumber", e.target.value)} />
        </Field>
        <Field label="ISIN">
          <input type="text" placeholder="INF123A01234" className="field-mono"
            value={f.isin ?? ""} onChange={(e) => set("isin", e.target.value)} />
        </Field>
      </div>
    </>
  );
}

function FDFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Bank / NBFC Name">
        <input type="text" placeholder="SBI / HDFC Bank" required className="field"
          value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Principal Amount (₹)">
          <input type="number" step="any" placeholder="100000" required className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => { set("avgBuyPrice", e.target.value); set("sharesOwned", "1"); }} />
        </Field>
        <Field label="Interest Rate (% p.a.)">
          <input type="number" step="0.01" placeholder="7.25" required className="field"
            value={f.interestRate ?? ""} onChange={(e) => set("interestRate", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date">
          <input type="date" required className="field"
            value={f.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Maturity Date">
          <input type="date" required className="field"
            value={f.maturityDate ?? ""} onChange={(e) => set("maturityDate", e.target.value)} />
        </Field>
      </div>
      <Field label="FD Reference Number" hint="optional">
        <input type="text" placeholder="FD Ref No." className="field-mono"
          value={f.folioNumber ?? ""} onChange={(e) => set("folioNumber", e.target.value)} />
      </Field>
    </>
  );
}

function RDFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Bank Name">
        <input type="text" placeholder="Post Office / HDFC Bank" required className="field"
          value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monthly Instalment (₹)">
          <input type="number" step="any" placeholder="5000" required className="field"
            value={f.sipAmount ?? ""} onChange={(e) => { set("sipAmount", e.target.value); set("sharesOwned", "1"); }} />
        </Field>
        <Field label="Interest Rate (% p.a.)">
          <input type="number" step="0.01" placeholder="6.5" required className="field"
            value={f.interestRate ?? ""} onChange={(e) => set("interestRate", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date">
          <input type="date" required className="field"
            value={f.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Maturity Date">
          <input type="date" required className="field"
            value={f.maturityDate ?? ""} onChange={(e) => set("maturityDate", e.target.value)} />
        </Field>
      </div>
      <Field label="Total Deposited (₹)" hint="for current value tracking">
        <input type="number" step="any" placeholder="60000" className="field"
          value={f.avgBuyPrice ?? ""} onChange={(e) => set("avgBuyPrice", e.target.value)} />
      </Field>
    </>
  );
}

function BondFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bond Name">
          <input type="text" placeholder="NHAI Bonds 2024" required className="field"
            value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="ISIN">
          <input type="text" placeholder="INE001A07JQ4" className="field-mono"
            value={f.isin ?? ""} onChange={(e) => set("isin", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Units / Face Value Count">
          <input type="number" step="any" placeholder="10" required className="field"
            value={f.sharesOwned ?? ""} onChange={(e) => set("sharesOwned", e.target.value)} />
        </Field>
        <Field label="Purchase Price per Unit (₹)">
          <input type="number" step="any" placeholder="1000" required className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => set("avgBuyPrice", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Coupon Rate (% p.a.)">
          <input type="number" step="0.01" placeholder="7.50" required className="field"
            value={f.interestRate ?? ""} onChange={(e) => set("interestRate", e.target.value)} />
        </Field>
        <Field label="Maturity Date">
          <input type="date" required className="field"
            value={f.maturityDate ?? ""} onChange={(e) => set("maturityDate", e.target.value)} />
        </Field>
      </div>
    </>
  );
}

function GoldFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  const isPhysical = !f.goldForm || f.goldForm === "Physical Gold";
  const isSGB      = f.goldForm === "Sovereign Gold Bond (SGB)";
  return (
    <>
      <Field label="Gold Form">
        <select className="field" value={f.goldForm ?? "Physical Gold"}
          onChange={(e) => set("goldForm", e.target.value)}>
          {GOLD_FORMS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>
      {isPhysical && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (grams)">
              <input type="number" step="0.001" placeholder="10" required className="field"
                value={f.sharesOwned ?? ""} onChange={(e) => set("sharesOwned", e.target.value)} />
            </Field>
            <Field label="Avg Purchase Price (₹/gram)">
              <input type="number" step="any" placeholder="6200" required className="field"
                value={f.avgBuyPrice ?? ""} onChange={(e) => set("avgBuyPrice", e.target.value)} />
            </Field>
          </div>
          <Field label="Description" hint="e.g. 24K gold coins, jewellery">
            <input type="text" placeholder="24K gold coins" required className="field"
              value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
        </>
      )}
      {isSGB && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Units (1 unit = 1 gram)">
              <input type="number" step="any" placeholder="10" required className="field"
                value={f.sharesOwned ?? ""} onChange={(e) => set("sharesOwned", e.target.value)} />
            </Field>
            <Field label="Issue Price (₹/unit)">
              <input type="number" step="any" placeholder="6000" required className="field"
                value={f.avgBuyPrice ?? ""} onChange={(e) => set("avgBuyPrice", e.target.value)} />
            </Field>
          </div>
          <Field label="SGB Series / Name" hint="required">
            <input type="text" placeholder="SGB 2023-24 Series I" required className="field"
              value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Issue Date">
              <input type="date" className="field"
                value={f.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="Maturity Date" hint="8 years from issue">
              <input type="date" className="field"
                value={f.maturityDate ?? ""} onChange={(e) => set("maturityDate", e.target.value)} />
            </Field>
          </div>
        </>
      )}
      {!isPhysical && !isSGB && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ticker / Fund Name">
              <input type="text" placeholder="GOLDBEES.NS" required className="field-mono"
                value={f.symbol ?? ""} onChange={(e) => { set("symbol", e.target.value); if (!f.name) set("name", e.target.value); }} />
            </Field>
            <Field label="Units">
              <input type="number" step="any" placeholder="50" required className="field"
                value={f.sharesOwned ?? ""} onChange={(e) => set("sharesOwned", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Avg Buy Price (₹)">
              <input type="number" step="any" placeholder="48.50" required className="field"
                value={f.avgBuyPrice ?? ""} onChange={(e) => set("avgBuyPrice", e.target.value)} />
            </Field>
            <Field label="Broker">
              <select className="field" value={f.broker ?? ""} onChange={(e) => set("broker", e.target.value)}>
                <option value="">Select</option>
                {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          </div>
        </>
      )}
    </>
  );
}

function CryptoFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Coin / Token">
          <input type="text" placeholder="Bitcoin" required className="field"
            value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Ticker Symbol">
          <input type="text" placeholder="BTC" required className="field-mono"
            value={f.symbol ?? ""} onChange={(e) => set("symbol", e.target.value.toUpperCase())} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" hint="e.g. 0.005 BTC">
          <input type="number" step="any" placeholder="0.005" required className="field"
            value={f.sharesOwned ?? ""} onChange={(e) => set("sharesOwned", e.target.value)} />
        </Field>
        <Field label="Avg Buy Price (₹)">
          <input type="number" step="any" placeholder="3200000" required className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => set("avgBuyPrice", e.target.value)} />
        </Field>
      </div>
      <Field label="Exchange / Wallet">
        <select className="field" value={f.broker ?? ""} onChange={(e) => set("broker", e.target.value)}>
          <option value="">Select</option>
          {["CoinDCX","WazirX","Binance","Coinbase","Self-custody Wallet","Other"].map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </Field>
    </>
  );
}

function PPFFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Bank / Post Office">
        <input type="text" placeholder="SBI / Post Office" required className="field"
          value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Current Balance (₹)">
          <input type="number" step="any" placeholder="250000" required className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => { set("avgBuyPrice", e.target.value); set("sharesOwned", "1"); }} />
        </Field>
        <Field label="Annual Contribution (₹)">
          <input type="number" step="any" placeholder="150000" className="field"
            value={f.sipAmount ?? ""} onChange={(e) => set("sipAmount", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account Opened Date">
          <input type="date" className="field"
            value={f.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Maturity Date" hint="15 years from opening">
          <input type="date" className="field"
            value={f.maturityDate ?? ""} onChange={(e) => set("maturityDate", e.target.value)} />
        </Field>
      </div>
      <Field label="PPF Account Number" hint="optional">
        <input type="text" placeholder="PPF/ACC/12345" className="field-mono"
          value={f.folioNumber ?? ""} onChange={(e) => set("folioNumber", e.target.value)} />
      </Field>
    </>
  );
}

function EPFFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Employer / Company">
        <input type="text" placeholder="Company Name" required className="field"
          value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Total EPF Balance (₹)">
          <input type="number" step="any" placeholder="500000" required className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => { set("avgBuyPrice", e.target.value); set("sharesOwned", "1"); }} />
        </Field>
        <Field label="Monthly Contribution (₹)">
          <input type="number" step="any" placeholder="4000" className="field"
            value={f.sipAmount ?? ""} onChange={(e) => set("sipAmount", e.target.value)} />
        </Field>
      </div>
      <Field label="UAN Number" hint="optional">
        <input type="text" placeholder="100123456789" className="field-mono"
          value={f.folioNumber ?? ""} onChange={(e) => set("folioNumber", e.target.value)} />
      </Field>
    </>
  );
}

function NPSFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="NPS Fund Manager">
          <input type="text" placeholder="SBI Pension / HDFC Pension" required className="field"
            value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Tier">
          <select className="field" value={f.nTier ?? "Tier I"} onChange={(e) => set("nTier", e.target.value)}>
            {NPS_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Total Balance (₹)">
          <input type="number" step="any" placeholder="300000" required className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => { set("avgBuyPrice", e.target.value); set("sharesOwned", "1"); }} />
        </Field>
        <Field label="Monthly Contribution (₹)">
          <input type="number" step="any" placeholder="5000" className="field"
            value={f.sipAmount ?? ""} onChange={(e) => set("sipAmount", e.target.value)} />
        </Field>
      </div>
      <Field label="PRAN Number" hint="optional">
        <input type="text" placeholder="110012345678" className="field-mono"
          value={f.folioNumber ?? ""} onChange={(e) => set("folioNumber", e.target.value)} />
      </Field>
    </>
  );
}

function RealEstateFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Property Name / Description">
        <input type="text" placeholder="2BHK Flat, Powai Mumbai" required className="field"
          value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Purchase Price (₹)">
          <input type="number" step="any" placeholder="5000000" required className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => { set("avgBuyPrice", e.target.value); set("sharesOwned", "1"); }} />
        </Field>
        <Field label="Current Market Value (₹)">
          <input type="number" step="any" placeholder="6500000" className="field"
            value={f.currentValOverride ?? ""} onChange={(e) => set("currentValOverride", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Purchase Date">
          <input type="date" className="field"
            value={f.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Rental Income / month (₹)" hint="if applicable">
          <input type="number" step="any" placeholder="25000" className="field"
            value={f.rentalIncome ?? ""} onChange={(e) => set("rentalIncome", e.target.value)} />
        </Field>
      </div>
    </>
  );
}

function OtherFields({ f, set }: { f: Record<string,string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Asset Name">
        <input type="text" placeholder="Angel investment / ESOP / Other" required className="field"
          value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Current Value (₹)">
          <input type="number" step="any" placeholder="100000" required className="field"
            value={f.avgBuyPrice ?? ""} onChange={(e) => { set("avgBuyPrice", e.target.value); set("sharesOwned", "1"); }} />
        </Field>
        <Field label="Cost / Investment (₹)">
          <input type="number" step="any" placeholder="80000" className="field"
            value={f.costOverride ?? ""} onChange={(e) => set("costOverride", e.target.value)} />
        </Field>
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function InvestmentManager({ totalInvestmentsCount = 0, sessionUser }: InvestmentManagerProps) {
  const [data, setData]             = useState<PortfolioData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeChart, setChart]     = useState<string | null>(null);
  const [selling, setSelling]       = useState<Position | null>(null);
  const [sellForm, setSellForm]     = useState({ sharesToSell: "", salePrice: "" });
  const [limitModal, setLimitModal] = useState(false);
  const [activeTab, setTab]         = useState<"positions"|"analytics"|"tax">("positions");
  const [showNotes, setShowNotes]   = useState(false);
  const [expandedId, setExpanded]   = useState<string | null>(null);
  const { triggerToast }            = useNotifications();

  const [form, setFormRaw] = useState<Record<string, string>>({ type: "EQUITY_STOCK", currency: "INR" });
  const shape = getShape(form.type ?? "EQUITY_STOCK");

  function setField(key: string, val: string) {
    setFormRaw((prev) => ({ ...prev, [key]: val }));
  }
  function handleTypeChange(newType: string) {
    setFormRaw({ type: newType, currency: "INR" });
    setShowNotes(false);
  }

  // Live preview — recomputes on every form keystroke
  const livePreview = useMemo(() => computeLivePreview(form), [form]);

  const positions = data?.positions ?? [];
  const isPro     = data?.meta.isPro ?? false;
  const atLimit   = !isPro && positions.length >= 5;
  const pnlPos    = (data?.totalPnl ?? 0) >= 0;

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
      const payload = { ...form, name: (form.name ?? "").trim() || form.symbol || form.type || "Asset" };
      const res = await fetch("/api/investments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 403) { const err = await res.json(); if (err.code === "TIER_LIMIT_EXCEEDED") { setLimitModal(true); return; } }
      if (res.ok) {
        setFormRaw({ type: form.type, currency: "INR" }); setShowNotes(false);
        await load();
        triggerToast("Position Added", `${(form.name || form.symbol || "Asset").slice(0, 30)} committed to portfolio.`, "SUCCESS");
      } else {
        const err = await res.json();
        triggerToast("Failed", err.error || "Could not add position.", "WARNING");
      }
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently remove this position?")) return;
    try {
      const res = await fetch(`/api/investments/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (activeChart === positions.find((p) => p.id === id)?.symbol) setChart(null);
        triggerToast("Position Removed", "Deleted from portfolio.", "INFO");
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
        triggerToast("Sale Executed", `Liquidation for ${selling.symbol}.`, "SUCCESS");
        setSelling(null); setSellForm({ sharesToSell: "", salePrice: "" }); await load();
      } else {
        const err = await res.json();
        triggerToast("Sale Failed", err.error || "Error.", "WARNING");
      }
    } catch (e) { console.error(e); }
  }

  function renderShapeForm() {
    const props = { f: form, set: setField };
    switch (shape) {
      case "equity":     return <EquityFields     {...props} />;
      case "sip":        return <SIPFields        {...props} />;
      case "mf_lump":    return <MFLumpFields     {...props} />;
      case "fd":         return <FDFields         {...props} />;
      case "rd":         return <RDFields         {...props} />;
      case "bond":       return <BondFields       {...props} />;
      case "gold":       return <GoldFields       {...props} />;
      case "crypto":     return <CryptoFields     {...props} />;
      case "ppf":        return <PPFFields        {...props} />;
      case "epf":        return <EPFFields        {...props} />;
      case "nps":        return <NPSFields        {...props} />;
      case "realestate": return <RealEstateFields {...props} />;
      default:           return <OtherFields      {...props} />;
    }
  }

  function positionLabel(pos: Position) {
    const shp = getShape(pos.type);
    if (["fd","rd","ppf","epf","nps","realestate","other"].includes(shp)) return pos.name;
    return pos.symbol || pos.name;
  }
  function positionSublabel(pos: Position) {
    const shp = getShape(pos.type);
    if (shp === "sip" || shp === "mf_lump") return pos.name;
    if (shp === "fd")   return `FD · ${pos.interestRate ?? "—"}% p.a.`;
    if (shp === "bond") return `Bond · ${pos.interestRate ?? "—"}% coupon`;
    return pos.name;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="label-xs mb-1">Investment Tracker</p>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>Portfolio Ledger</h2>
        </div>
        {positions.length > 0 && data && (
          <div className="hidden md:flex items-center gap-4 rounded-xl px-5 py-3"
            style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
            <div className="text-right">
              <p className="label-xs mb-0.5">Net Worth</p>
              <p className="text-sm font-bold tabular" style={{ fontFamily: "Geist", color: "hsl(var(--foreground))" }}>
                {formatCurrency(data.totalValue, "INR", { compact: true })}
              </p>
            </div>
            <div className="w-px h-8" style={{ background: "hsl(var(--border-token))" }} />
            <div className="text-right">
              <p className="label-xs mb-0.5">Total P&L</p>
              <p className="text-sm font-bold tabular flex items-center gap-1"
                style={{ color: pnlPos ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono" }}>
                {pnlPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {formatPnL(data.totalPnl, "INR", 0)}
              </p>
            </div>
            {data.portfolioXirr !== null && (
              <>
                <div className="w-px h-8" style={{ background: "hsl(var(--border-token))" }} />
                <div className="text-right">
                  <p className="label-xs mb-0.5">XIRR</p>
                  <p className="text-sm font-bold tabular"
                    style={{ color: data.portfolioXirr >= 0 ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono" }}>
                    {formatPct(data.portfolioXirr)}
                  </p>
                </div>
              </>
            )}
            {data.healthScore && (
              <>
                <div className="w-px h-8" style={{ background: "hsl(var(--border-token))" }} />
                <div className="text-right">
                  <p className="label-xs mb-0.5">Health</p>
                  <p className="text-sm font-black" style={{ color: gradeColor(data.healthScore.grade) }}>
                    {data.healthScore.grade}
                    <span className="text-xs font-normal ml-1" style={{ color: "hsl(var(--foreground-tertiary))" }}>{data.healthScore.score}/100</span>
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* SIP reminders */}
      {(data?.sipReminders.length ?? 0) > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: "hsl(var(--info-dim))", border: "1px solid hsl(var(--info) / 0.25)" }}>
          <Bell className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--info))" }} />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "hsl(var(--info))" }}>SIP Reminders</p>
            {data?.sipReminders.map((r, i) => (
              <p key={i} className="text-xs" style={{ color: "hsl(var(--foreground-secondary))" }}>› {r}</p>
            ))}
          </div>
        </div>
      )}

      {/* Live chart */}
      {activeChart && (
        <div className="rounded-2xl overflow-hidden animate-fade-in" style={{ border: "1px solid hsl(var(--info) / 0.3)" }}>
          <div className="flex items-center justify-between px-5 py-3"
            style={{ background: "hsl(var(--surface))", borderBottom: "1px solid hsl(var(--border-token))" }}>
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4" style={{ color: "hsl(var(--info))" }} />
              <span className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>{activeChart}</span>
              <span className="badge-info">Live Chart</span>
            </div>
            <button onClick={() => setChart(null)} className="btn-icon"><X className="w-3.5 h-3.5" /></button>
          </div>
          <TradingViewChart symbol={activeChart} />
        </div>
      )}

      {/* Sell panel */}
      {selling && (
        <div className="rounded-2xl p-5 animate-fade-in"
          style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--negative) / 0.3)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: "hsl(var(--negative))" }} />
              <span className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Liquidate {positionLabel(selling)}</span>
              <span className="badge-negative">Sell Order</span>
            </div>
            <button onClick={() => setSelling(null)} className="btn-icon"><X className="w-3.5 h-3.5" /></button>
          </div>
          <form onSubmit={handleSale} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="label-xs block mb-2">Units / Amount (max {selling.sharesOwned})</label>
              <input type="number" step="any" required max={selling.sharesOwned} className="field"
                value={sellForm.sharesToSell} onChange={(e) => setSellForm({ ...sellForm, sharesToSell: e.target.value })} />
            </div>
            <div>
              <label className="label-xs block mb-2">Sale price ({getCurrencySymbol(selling.currency ?? "INR")}) · current {formatCurrency(selling.currentPrice, selling.currency)}</label>
              <input type="number" step="any" required className="field"
                value={sellForm.salePrice} onChange={(e) => setSellForm({ ...sellForm, salePrice: e.target.value })} />
            </div>
            <button type="submit" className="btn-danger h-10">Confirm Sale</button>
          </form>
        </div>
      )}

      {/* Limit modal */}
      {limitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "hsl(220 14% 3% / 0.85)", backdropFilter: "blur(12px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setLimitModal(false); }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale-in"
            style={{ background: "hsl(var(--surface-overlay))", border: "1px solid hsl(var(--border-token))", boxShadow: "0 32px 80px hsl(220 14% 3% / 0.8)" }}>
            <div style={{ height: "3px", background: "linear-gradient(90deg, transparent, hsl(var(--premium)), transparent)" }} />
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "hsl(var(--premium-dim))", border: "1px solid hsl(var(--premium) / 0.3)" }}>
                    <Lock className="w-5 h-5" style={{ color: "hsl(var(--premium))" }} />
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>Position Limit Reached</p>
                    <p className="label-xs mt-0.5" style={{ color: "hsl(var(--premium) / 0.7)" }}>5/5 positions · Basic Tier</p>
                  </div>
                </div>
                <button onClick={() => setLimitModal(false)} className="btn-icon"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-1 h-2 rounded-full" style={{ background: "hsl(var(--negative))" }} />
                ))}
              </div>
              <div className="space-y-2">
                {["Unlimited positions across all asset classes","XIRR analytics per position","Tax-loss harvesting signals","Goal-linked portfolio tracking","Portfolio health scoring"].map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-xs" style={{ color: "hsl(var(--foreground-secondary))" }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--premium))" }} />
                    {f}
                  </div>
                ))}
              </div>
              {sessionUser
                ? <RazorpayUpgradeButton sessionUser={sessionUser} buttonText="Upgrade to Pro Tier (₹1,299)" className="btn-premium w-full justify-center text-sm" />
                : <a href="/dashboard/billing" className="btn-premium w-full justify-center text-sm inline-flex items-center gap-2">View Upgrade Options</a>
              }
              <button onClick={() => setLimitModal(false)} className="w-full text-center text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>Stay on Basic</button>
            </div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Add form */}
        <div className="lg:col-span-4 rounded-2xl p-5"
          style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="label-xs mb-0.5">New Position</p>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Add to Portfolio</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold"
              style={{
                background: atLimit ? "hsl(var(--negative-dim))" : isPro ? "hsl(var(--premium-dim))" : "hsl(var(--surface-raised))",
                border:     `1px solid ${atLimit ? "hsl(var(--negative) / 0.3)" : isPro ? "hsl(var(--premium) / 0.25)" : "hsl(var(--border-token))"}`,
                color:      atLimit ? "hsl(var(--negative))" : isPro ? "hsl(var(--premium))" : "hsl(var(--foreground-secondary))",
                fontFamily: "Geist Mono",
              }}>
              {atLimit && <Lock className="w-3 h-3 mr-1" />}
              {isPro ? (
                <>{positions.length}<span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: "hsl(var(--premium-dim))", color: "hsl(var(--premium))" }}>∞</span></>
              ) : (
                <>{positions.length}/5</>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-xs block mb-1.5">Asset Type</label>
              <select className="field" value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
                {["Equity","Mutual Funds","Fixed Income","Commodity","Crypto","Retirement","Real Assets","Other"].map((group) => (
                  <optgroup key={group} label={group}>
                    {ASSET_TYPES.filter((t) => t.group === group).map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {renderShapeForm()}

            {/* Live calculation preview */}
            {livePreview && <LivePreviewCard preview={livePreview} currency={form.currency ?? "INR"} />}

            {/* Notes */}
            <div>
              <button type="button" onClick={() => setShowNotes((v) => !v)}
                className="flex items-center gap-1.5 text-xs w-full transition-colors"
                style={{ color: "hsl(var(--foreground-tertiary))", borderTop: "1px solid hsl(var(--border-token))", paddingTop: "12px" }}>
                {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Notes {showNotes ? "(hide)" : "(optional)"}
              </button>
              {showNotes && (
                <textarea rows={2} placeholder="Any notes about this position…" className="field resize-none mt-2"
                  value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} />
              )}
            </div>

            {atLimit ? (
              <button type="button" onClick={() => setLimitModal(true)} className="btn w-full justify-center text-sm"
                style={{ background: "hsl(var(--premium-dim))", border: "1px solid hsl(var(--premium) / 0.35)", color: "hsl(var(--premium))", borderRadius: "10px" }}>
                <Lock className="w-4 h-4" /> Limit Reached — Upgrade
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center text-sm">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : "Add to Portfolio"}
              </button>
            )}
          </form>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-8 space-y-4">

          {/* Tabs */}
          <div className="flex rounded-xl p-1 gap-1"
            style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))", width: "fit-content" }}>
            {(["positions","analytics","tax"] as const).map((tab) => (
              <button key={tab} onClick={() => setTab(tab)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  background: activeTab === tab ? "hsl(var(--surface-overlay))" : "transparent",
                  color:      activeTab === tab ? "hsl(var(--foreground))"       : "hsl(var(--foreground-tertiary))",
                  border:     activeTab === tab ? "1px solid hsl(var(--border-focus) / 0.3)" : "1px solid transparent",
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Positions tab */}
          {activeTab === "positions" && (
            loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-44" />)}
              </div>
            ) : positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[280px] rounded-2xl gap-4"
                style={{ background: "hsl(var(--surface))", border: "2px dashed hsl(var(--border-token))" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border-token))" }}>
                  <BarChart3 className="w-6 h-6" style={{ color: "hsl(var(--foreground-tertiary))" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--foreground))" }}>No positions yet</p>
                  <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>Select an asset type and add your first position</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {positions.map((pos) => {
                  const sym      = getCurrencySymbol(pos.currency ?? "INR");
                  const cur      = pos.currency ?? "INR";
                  const returns  = computePositionReturns(pos as any);
                  const profit   = returns.profit >= 0;
                  const shp      = getShape(pos.type);
                  const showChart = ["equity","mf_lump","crypto","gold"].includes(shp) && !!pos.symbol;
                  const isExpanded = expandedId === pos.id;

                  return (
                    <div key={pos.id} className="rounded-2xl p-5 flex flex-col justify-between server-card-hover transition-all"
                      style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
                      <div>
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border-token))" }}>
                              <TypeIcon type={pos.type} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-black tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
                                  {positionLabel(pos)}
                                </p>
                                {pos.broker && <span className="badge-muted text-[9px]">{pos.broker}</span>}
                                {cur !== "INR" && (
                                  <span className="badge-info text-[9px]">{cur} ({sym})</span>
                                )}
                              </div>
                              <p className="text-xs truncate max-w-[160px]" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                                {positionSublabel(pos)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {showChart && (
                              <button onClick={() => setChart(pos.symbol)} className="btn-icon" title="View chart">
                                <LineChart className="w-3.5 h-3.5" style={{ color: "hsl(var(--info))" }} />
                              </button>
                            )}
                            <button onClick={() => setSelling(pos)} className="btn-icon" title="Sell / Redeem"
                              style={{ color: "hsl(var(--positive))" }}>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(pos.id)} className="btn-icon" title="Delete"
                              style={{ color: "hsl(var(--negative) / 0.7)" }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Data grid — contextual per shape */}
                        <div className="grid grid-cols-2 gap-2 rounded-xl p-3 mb-3"
                          style={{ background: "hsl(var(--surface-raised))" }}>
                          <div>
                            <p className="label-xs mb-0.5">Invested</p>
                            <p className="text-sm font-bold tabular"
                              style={{ color: "hsl(var(--foreground-secondary))", fontFamily: "Geist Mono" }}>
                              {formatCurrency(returns.investedAmount, cur)}
                            </p>
                          </div>
                          <div>
                            <p className="label-xs mb-0.5">Current Value</p>
                            <p className="text-sm font-bold tabular"
                              style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
                              {formatCurrency(returns.displayValue, cur)}
                            </p>
                          </div>
                          {pos.interestRate && (
                            <div>
                              <p className="label-xs mb-0.5">Interest Rate</p>
                              <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--info))", fontFamily: "Geist Mono" }}>
                                {pos.interestRate}% p.a.
         
                            </p>
                          </div>
                          )}
                          {pos.sipAmount && (
                            <div>
                              <p className="label-xs mb-0.5">{shp === "rd" ? "Monthly" : "SIP"}</p>
                              <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--info))", fontFamily: "Geist Mono" }}>
                                {formatCurrency(pos.sipAmount, cur)}/mo
                              </p>
                            </div>
                          )}
                          {returns.maturityValue && (
                            <div>
                              <p className="label-xs mb-0.5">At Maturity</p>
                              <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--positive))", fontFamily: "Geist Mono" }}>
                                {formatCurrency(returns.maturityValue, cur)}
                              </p>
                            </div>
                          )}
                          {pos.maturityDate && (
                            <div>
                              <p className="label-xs mb-0.5">Matures</p>
                              <p className="text-xs font-bold" style={{ color: "hsl(var(--foreground-secondary))", fontFamily: "Geist Mono" }}>
                                {new Date(pos.maturityDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                              </p>
                            </div>
                          )}
                          {pos.xirr !== null && (
                            <div>
                              <p className="label-xs mb-0.5">XIRR</p>
                              <p className="text-sm font-bold tabular"
                                style={{ color: pos.xirr >= 0 ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono" }}>
                                {formatPct(pos.xirr)}
                              </p>
                            </div>
                          )}
                        </div>

                        {returns.breakdown && (
                          <button onClick={() => setExpanded(isExpanded ? null : pos.id)}
                            className="flex items-center gap-1 text-xs w-full mb-2 transition-colors"
                            style={{ color: "hsl(var(--foreground-tertiary))" }}>
                            <Info className="w-3 h-3" />
                            {isExpanded ? "Hide" : "Show"} breakdown
                            {isExpanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                          </button>
                        )}
                        {isExpanded && returns.breakdown && (
                          <div className="rounded-xl p-3 mb-3 animate-fade-in"
                            style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border-token))" }}>
                            <ReturnsBreakdown breakdown={returns.breakdown} currency={cur} />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3"
                        style={{ borderTop: "1px solid hsl(var(--border-token))" }}>
                        <div>
                          <p className="label-xs mb-0.5">{returns.label}</p>
                          <p className="text-sm font-bold tabular"
                            style={{ color: profit ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono" }}>
                            {formatPnL(returns.profit, cur, 0)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                          style={{
                            background: profit ? "hsl(var(--positive-dim))" : "hsl(var(--negative-dim))",
                            border:     `1px solid hsl(var(--${profit ? "positive" : "negative"}) / 0.2)`,
                          }}>
                          {profit
                            ? <ArrowUpRight   className="w-3.5 h-3.5" style={{ color: "hsl(var(--positive))" }} />
                            : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: "hsl(var(--negative))" }} />}
                          <div>
                            <p className="text-xs font-bold tabular leading-none"
                              style={{ color: profit ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono" }}>
                              {formatPct(returns.pnlPct)}
                            </p>
                            {returns.isProjection && (
                              <p className="text-[9px]" style={{ color: "hsl(var(--foreground-tertiary))" }}>projected</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Analytics tab */}
          {activeTab === "analytics" && data && (
            <div className="space-y-4">
              <div className="rounded-2xl p-5" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Portfolio Health</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black" style={{ color: gradeColor(data.healthScore.grade) }}>{data.healthScore.grade}</span>
                    <span className="text-sm" style={{ color: "hsl(var(--foreground-tertiary))" }}>{data.healthScore.score}/100</span>
                  </div>
                </div>
                <div className="progress-track mb-4">
                  <div className="progress-fill" style={{ width: `${data.healthScore.score}%`, background: gradeColor(data.healthScore.grade) }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(data.healthScore.factors).map(([key, val]) => (
                    <div key={key} className="rounded-xl p-3" style={{ background: "hsl(var(--surface-raised))" }}>
                      <p className="label-xs mb-1 capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 progress-track">
                          <div className="progress-fill" style={{ width: `${(val / 25) * 100}%`, background: "hsl(var(--info))" }} />
                        </div>
                        <span className="text-xs font-bold tabular" style={{ fontFamily: "Geist Mono", color: "hsl(var(--foreground))" }}>{val}/25</span>
                      </div>
                    </div>
                  ))}
                </div>
                {data.healthScore.flags.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    {data.healthScore.flags.map((flag) => (
                      <div key={flag} className="flex items-start gap-2 text-xs" style={{ color: "hsl(var(--warning))" }}>
                        <span className="shrink-0 mt-0.5">⚠</span><span>{flag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl p-5" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
                <p className="text-sm font-semibold mb-4" style={{ color: "hsl(var(--foreground))" }}>Allocation</p>
                <div className="space-y-2.5">
                  {data.allocation.byType.map((item, i) => {
                    const colors = ["hsl(var(--info))","hsl(var(--positive))","hsl(var(--warning))","hsl(var(--negative))","hsl(var(--premium))"];
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: colors[i % colors.length] }} />
                            <span className="text-xs" style={{ color: "hsl(var(--foreground-secondary))" }}>{item.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs tabular" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
                              {formatCurrency(item.value, "INR", { compact: true })}
                            </span>
                            <span className="text-xs font-bold tabular" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono", minWidth: "36px", textAlign: "right" }}>
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${item.percentage}%`, background: colors[i % colors.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {data.allocation.concentration.isConcentrated && (
                  <div className="mt-3 rounded-xl p-3 text-xs"
                    style={{ background: "hsl(var(--warning-dim))", border: "1px solid hsl(var(--warning) / 0.25)", color: "hsl(var(--warning))" }}>
                    ⚠ {data.allocation.concentration.topHolding} is {data.allocation.concentration.topHoldingWeight}% of portfolio.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tax tab */}
          {activeTab === "tax" && data && (
            <div className="rounded-2xl p-5 space-y-5"
              style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Tax Summary (FY Estimate)</p>
                <p className="label-xs mt-0.5">Unrealised gains · Post-budget 2024 rates</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Short-Term Gains",  val: data.taxSummary.shortTermGains, color: "hsl(var(--positive))", prefix: "+" },
                  { label: "Short-Term Losses", val: data.taxSummary.shortTermLoss,  color: "hsl(var(--negative))", prefix: "−" },
                  { label: "Long-Term Gains",   val: data.taxSummary.longTermGains,  color: "hsl(var(--positive))", prefix: "+" },
                  { label: "Long-Term Losses",  val: data.taxSummary.longTermLoss,   color: "hsl(var(--negative))", prefix: "−" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-3" style={{ background: "hsl(var(--surface-raised))" }}>
                    <p className="label-xs mb-1">{item.label}</p>
                    <p className="text-base font-bold tabular" style={{ color: item.color, fontFamily: "Geist Mono" }}>
                      {item.prefix}{formatCurrency(item.val, "INR", { decimals: 0 })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-4 space-y-3"
                style={{ background: "hsl(var(--warning-dim))", border: "1px solid hsl(var(--warning) / 0.25)" }}>
                <p className="text-xs font-bold" style={{ color: "hsl(var(--warning))" }}>Estimated Tax Liability</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="label-xs mb-0.5">STCG Tax (20%)</p>
                    <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
                      {formatCurrency(data.taxSummary.estimatedSTCGTax, "INR", { decimals: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="label-xs mb-0.5">LTCG Tax (12.5% &gt; ₹1.25L)</p>
                    <p className="text-sm font-bold tabular" style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
                      {formatCurrency(data.taxSummary.estimatedLTCGTax, "INR", { decimals: 0 })}
                    </p>
                  </div>
                </div>
                <p className="text-[10px]" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  Estimates only. Consult a CA for accurate tax filing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}