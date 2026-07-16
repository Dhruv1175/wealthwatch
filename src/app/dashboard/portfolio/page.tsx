import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Lock, Zap, TrendingUp, TrendingDown,
  BarChart3, ArrowUpRight, ArrowDownRight, Calendar,
  Landmark, Coins, Building2, Wallet, Activity,
  ShieldCheck,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import RazorpayUpgradeButton from "@/components/dashboard/RazorpayUpgradeButton";
import { getTrackedInvestments } from "@/lib/market/stock-engine";
import {
  calculateXIRR,
  analyzeAllocation,
  calculateHealthScore,
} from "@/lib/portfolio/analytics";
import {
  calculateFD,
  calculateRD,
  calculateSIP,
  calculatePPF,
} from "@/lib/utils/investmentCalculations";
import {
  getCurrencySymbol,
  formatCurrency,
  formatPnL,
  formatPct,
} from "@/lib/utils/currencyUtils";
import prisma from "@/lib/db";

const BASIC_LIMIT = 5;

// ── Asset type label ───────────────────────────────────────────────────────────
function assetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    EQUITY_STOCK:        "Equity",
    SIP_MUTUAL_FUND:     "SIP / MF",
    MUTUAL_FUND_LUMPSUM: "MF Lumpsum",
    ETF:                 "ETF",
    BOND:                "Bond",
    FIXED_DEPOSIT:       "Fixed Deposit",
    RECURRING_DEPOSIT:   "RD",
    GOLD:                "Gold",
    CRYPTO:              "Crypto",
    PPF:                 "PPF",
    EPF:                 "EPF",
    NPS:                 "NPS",
    REAL_ESTATE:         "Real Estate",
    US_STOCK:            "US Stock",
    OTHER:               "Other",
  };
  return map[type] ?? type;
}

// ── Badge variant per type ─────────────────────────────────────────────────────
function typeBadgeClass(type: string): string {
  if (["EQUITY_STOCK","ETF","US_STOCK"].includes(type))           return "badge-info";
  if (["SIP_MUTUAL_FUND","MUTUAL_FUND_LUMPSUM"].includes(type))   return "badge-positive";
  if (["FIXED_DEPOSIT","RECURRING_DEPOSIT","BOND"].includes(type)) return "badge-warning";
  if (type === "GOLD")                                             return "badge-premium";
  if (type === "CRYPTO")                                          return "badge-negative";
  if (["PPF","EPF","NPS"].includes(type))                          return "badge-muted";
  return "badge-muted";
}

// ── Server-side returns calculation per position type ─────────────────────────
function computeReturns(inv: any, livePrice: number): {
  investedAmount: number;
  currentValue:   number;
  maturityValue:  number | null;
  profit:         number;
  pnlPct:         number;
  label:          string;
  isProjection:   boolean;
} {
  const type = inv.type;

  if (type === "FIXED_DEPOSIT" && inv.interestRate && inv.maturityDate) {
    const calc = calculateFD({
      principal:    inv.avgBuyPrice * inv.sharesOwned,
      annualRate:   inv.interestRate,
      startDate:    new Date(inv.createdAt),
      maturityDate: new Date(inv.maturityDate),
    });
    return {
      investedAmount: calc.investedAmount,
      currentValue:   calc.currentValue,
      maturityValue:  calc.maturityValue,
      profit:         calc.profit,
      pnlPct:         calc.pnlPercentage,
      label:          "Interest Earned",
      isProjection:   false,
    };
  }

  if (type === "RECURRING_DEPOSIT" && inv.sipAmount && inv.interestRate && inv.maturityDate) {
    const calc = calculateRD({
      monthlyInstalment: inv.sipAmount,
      annualRate:        inv.interestRate,
      startDate:         new Date(inv.createdAt),
      maturityDate:      new Date(inv.maturityDate),
    });
    return {
      investedAmount: calc.investedAmount,
      currentValue:   calc.currentValue,
      maturityValue:  calc.maturityValue,
      profit:         calc.profit,
      pnlPct:         calc.pnlPercentage,
      label:          "Interest Earned",
      isProjection:   false,
    };
  }

  if (type === "SIP_MUTUAL_FUND" && inv.sipAmount) {
    const calc = calculateSIP({
      monthlyAmount:    inv.sipAmount,
      annualReturnPct:  12,
      startDate:        new Date(inv.createdAt),
      currentNAV:       livePrice,
      purchaseNAV:      inv.avgBuyPrice,
      unitsAccumulated: inv.sharesOwned,
    });
    return {
      investedAmount: calc.investedAmount,
      currentValue:   calc.estimatedValue,
      maturityValue:  null,
      profit:         calc.estimatedProfit,
      pnlPct:         calc.pnlPercentage,
      label:          "Estimated Returns",
      isProjection:   false,
    };
  }

  if (type === "PPF" && inv.maturityDate) {
    const calc = calculatePPF({
      currentBalance:     inv.avgBuyPrice * inv.sharesOwned,
      annualContribution: inv.sipAmount ?? 150000,
      startDate:          new Date(inv.createdAt),
      maturityDate:       new Date(inv.maturityDate),
    });
    return {
      investedAmount: calc.investedAmount,
      currentValue:   calc.currentValue,
      maturityValue:  calc.maturityValue,
      profit:         calc.maturityProfit,
      pnlPct:         calc.maturityPct,
      label:          "Projected Returns",
      isProjection:   true,
    };
  }

  if (type === "REAL_ESTATE") {
    const invested   = inv.avgBuyPrice * inv.sharesOwned;
    const currentVal = inv.currentMarketValue ?? invested;
    const profit     = currentVal - invested;
    return {
      investedAmount: invested,
      currentValue:   currentVal,
      maturityValue:  null,
      profit,
      pnlPct:         invested > 0 ? (profit / invested) * 100 : 0,
      label:          "Appreciation",
      isProjection:   !inv.currentMarketValue,
    };
  }

  // Default: equity / ETF / crypto / gold — use live price
  const invested   = inv.avgBuyPrice * inv.sharesOwned;
  const currentVal = livePrice * inv.sharesOwned;
  const profit     = currentVal - invested;
  return {
    investedAmount: invested,
    currentValue:   currentVal,
    maturityValue:  null,
    profit,
    pnlPct:         invested > 0 ? (profit / invested) * 100 : 0,
    label:          "Unrealised P&L",
    isProjection:   livePrice === inv.avgBuyPrice,
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  
  const { isUserPro } = await import("@/lib/auth/tier-utils");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { tier: true, name: true, email: true, image: true },
  });

  const isPro = isUserPro(user);

  const allInvestments = await prisma.investment.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      cashFlows: { orderBy: { date: "asc" } },
      goal:      { select: { id: true, name: true } },
    },
  });

  const totalCount  = allInvestments.length;
  const hiddenCount = !isPro ? Math.max(0, totalCount - BASIC_LIMIT) : 0;
  const visible     = isPro ? allInvestments : allInvestments.slice(0, BASIC_LIMIT);

  // Live prices from Yahoo Finance
  const { positions: livePrices, sipReminders } =
    await getTrackedInvestments(session.user.id);

  // Build enriched positions with per-type returns calculation
  const positions = visible.map((inv) => {
    const live       = livePrices.find((p) => p.id === inv.id);
    const livePrice  = live?.currentPrice ?? inv.avgBuyPrice;
    const returns    = computeReturns(inv, livePrice);

    // XIRR per position
    const flows = inv.cashFlows.map((cf) => ({
      date:   new Date(cf.date),
      amount: cf.amount,
    }));
    flows.push({ date: new Date(), amount: returns.currentValue });
    const xirr = flows.length >= 2 ? calculateXIRR(flows) : null;

    return { ...inv, ...returns, livePrice, xirr };
  });

  // Portfolio-wide analytics
  const totalValue    = positions.reduce((s, p) => s + p.currentValue, 0);
  const totalInvested = positions.reduce((s, p) => s + p.investedAmount, 0);
  const totalProfit   = positions.reduce((s, p) => s + p.profit, 0);
  const overallPct    = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const allFlows = positions.flatMap((p) =>
    p.cashFlows.map((cf) => ({ date: new Date(cf.date), amount: cf.amount }))
  );
  allFlows.push({ date: new Date(), amount: totalValue });
  const portfolioXirr = allFlows.length >= 2 ? calculateXIRR(allFlows) : null;

  const allocation  = analyzeAllocation(
    positions.map((p) => ({ name: p.name, type: p.type, currentValue: p.currentValue, currency: p.currency }))
  );

  const healthScore = calculateHealthScore({
    positions:  positions.map((p) => ({ name: p.name, type: p.type, currentValue: p.currentValue })),
    xirr:       portfolioXirr,
    totalPnl:   totalProfit,
    totalCost:  totalInvested,
  });

  const pnlPos = totalProfit >= 0;

  function gradeColor(grade: string) {
    if (grade === "A") return "hsl(var(--positive))";
    if (grade === "B") return "hsl(var(--info))";
    if (grade === "C") return "hsl(var(--warning))";
    return "hsl(var(--negative))";
  }

  const ALLOC_COLORS = [
    "hsl(var(--info))", "hsl(var(--positive))", "hsl(var(--warning))",
    "hsl(var(--negative))", "hsl(var(--premium))",
  ];

  return (
    <div className="app-shell selection:bg-mint-500/20">
      <Sidebar />
      <div className="app-content">

        {/* ── TOP BAR (Perfectly Responsive) ────────────────────────────────── */}
        <header
          className="sticky top-0 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-8 py-3 sm:py-0 sm:h-16 shrink-0 gap-3 sm:gap-0"
          style={{
            background:     "hsl(220 14% 6% / 0.9)",
            backdropFilter: "blur(20px)",
            borderBottom:   "1px solid hsl(var(--border-token))",
          }}
        >
          {/* Left Breadcrumbs Group */}
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs sm:text-sm transition-colors text-secondary hover:text-foreground shrink-0">
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Dashboard
            </Link>
            <span className="text-secondary/40 select-none text-xs sm:text-sm">/</span>
            <span className="text-xs sm:text-sm font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
              Portfolio
            </span>
          </div>

          {/* Right Navigation Actions Group */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto border-t border-token-border/20 pt-2 sm:pt-0 sm:border-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/dashboard/goals" className="text-[11px] sm:text-xs font-bold transition-opacity hover:opacity-80 whitespace-nowrap" style={{ color: "hsl(var(--info))" }}>
                Goals →
              </Link>
              <Link href="/dashboard" className="btn-ghost text-[11px] sm:text-xs py-1.5 px-2.5 sm:px-3 whitespace-nowrap">
                <span className="hidden xs:inline">Add / Manage Positions</span>
                <span className="xs:hidden">Manage</span>
              </Link>
            </div>
            
            <div className="shrink-0">
              {isPro ? (
                <span className="badge-premium flex items-center gap-1.5 text-[10px] sm:text-xs">
                  <Zap className="w-3 h-3" /> Pro
                </span>
              ) : (
                <span className="badge-muted flex items-center gap-1.5 text-[10px] sm:text-xs">
                  <Lock className="w-3 h-3" /> {Math.min(totalCount, BASIC_LIMIT)}/5
                </span>
              )}
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT (Responsive Paddings adjusted) ───────────────────── */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">

          {/* ── PAGE HEADING ──────────────────────────────────────────────── */}
          <div>
            <p className="label-xs mb-1">Investment Overview</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
              Portfolio
            </h1>
          </div>

          {/* ── HERO STATS ────────────────────────────────────────────────── */}
          {positions.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">

              {/* Total Value */}
              <div className="rounded-2xl p-4 sm:p-6 space-y-1 sm:space-y-2 col-span-2 md:col-span-1"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
                <p className="label-xs">Total Value</p>
                <p className="text-2xl sm:text-3xl font-black tracking-tight tabular"
                  style={{ color: "hsl(var(--foreground))", fontFamily: "Geist" }}>
                  {formatCurrency(totalValue, "INR", { compact: true })}
                </p>
                <p className="text-[11px] sm:text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  {positions.length} position{positions.length !== 1 ? "s" : ""}
                  {hiddenCount > 0 && <span style={{ color: "hsl(var(--warning))", marginLeft: 4 }}>· +{hiddenCount} hidden</span>}
                </p>
              </div>

              {/* Total P&L */}
              <div className="rounded-2xl p-4 sm:p-6 space-y-1 sm:space-y-2 relative overflow-hidden"
                style={{
                  background: pnlPos ? "linear-gradient(135deg, hsl(152 69% 12%), hsl(152 69% 8%))" : "linear-gradient(135deg, hsl(4 86% 12%), hsl(4 86% 8%))",
                  border:     `1px solid hsl(var(--${pnlPos ? "positive" : "negative"}) / 0.3)`,
                }}>
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-3xl pointer-events-none"
                  style={{ background: `hsl(var(--${pnlPos ? "positive" : "negative"}) / 0.12)` }} />
                <p className="label-xs relative" style={{ color: `hsl(var(--${pnlPos ? "positive" : "negative"}) / 0.7)` }}>
                  Total P&amp;L
                </p>
                <p className="text-xl sm:text-2xl font-black tabular relative"
                  style={{ color: `hsl(var(--${pnlPos ? "positive" : "negative"}))`, fontFamily: "Geist" }}>
                  {formatPnL(totalProfit, "INR", 0)}
                </p>
                <p className="text-xs sm:text-sm font-bold tabular relative"
                  style={{ color: `hsl(var(--${pnlPos ? "positive" : "negative"}))`, fontFamily: "Geist Mono" }}>
                  {formatPct(overallPct)}
                </p>
              </div>

              {/* XIRR */}
              <div className="rounded-2xl p-4 sm:p-6 space-y-1 sm:space-y-2"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
                <p className="label-xs">Portfolio XIRR</p>
                <p className="text-2xl sm:text-3xl font-black tabular"
                  style={{
                    color: portfolioXirr === null ? "hsl(var(--foreground-tertiary))"
                      : portfolioXirr >= 0 ? "hsl(var(--positive))" : "hsl(var(--negative))",
                    fontFamily: "Geist Mono",
                  }}>
                  {portfolioXirr !== null ? formatPct(portfolioXirr) : "—"}
                </p>
                <p className="text-[11px] sm:text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  Annualised return
                </p>
              </div>

              {/* Health Score */}
              <div className="rounded-2xl p-4 sm:p-6 space-y-1 sm:space-y-2"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
                <p className="label-xs">Health Score</p>
                <div className="flex items-end gap-1.5">
                  <p className="text-3xl sm:text-4xl font-black leading-none" style={{ color: gradeColor(healthScore.grade) }}>
                    {healthScore.grade}
                  </p>
                  <p className="text-[11px] sm:text-sm font-bold" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
                    {healthScore.score}/100
                  </p>
                </div>
                <div className="progress-track mt-1">
                  <div className="progress-fill" style={{ width: `${healthScore.score}%`, background: gradeColor(healthScore.grade) }} />
                </div>
              </div>
            </div>
          )}

          {/* ── SIP REMINDERS ─────────────────────────────────────────────── */}
          {sipReminders.length > 0 && (
            <div className="rounded-2xl px-4 sm:px-5 py-3 sm:py-4 flex items-start gap-3"
              style={{ background: "hsl(var(--info-dim))", border: "1px solid hsl(var(--info) / 0.25)" }}>
              <Activity className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--info))" }} />
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "hsl(var(--info))" }}>SIP Reminders</p>
                {sipReminders.map((r, i) => (
                  <p key={i} className="text-xs" style={{ color: "hsl(var(--foreground-secondary))" }}>› {r}</p>
                ))}
              </div>
            </div>
          )}

          {/* ── ALLOCATION + HEALTH FACTORS ───────────────────────────────── */}
          {positions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

              {/* Allocation */}
              <div className="rounded-2xl p-4 sm:p-6"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
                <p className="text-sm font-semibold mb-4" style={{ color: "hsl(var(--foreground))" }}>Asset Allocation</p>
                <div className="space-y-3">
                  {allocation.byType.map((item, i) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0" style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
                          <span className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground-secondary))" }}>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <span className="text-xs tabular" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
                            {formatCurrency(item.value, "INR", { compact: true })}
                          </span>
                          <span className="text-xs font-bold tabular w-10 text-right"
                            style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="progress-track" style={{ height: "4px" }}>
                        <div className="progress-fill" style={{ width: `${item.percentage}%`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
                {allocation.concentration.isConcentrated && (
                  <div className="mt-4 rounded-xl p-3 text-xs"
                    style={{ background: "hsl(var(--warning-dim))", border: "1px solid hsl(var(--warning) / 0.2)", color: "hsl(var(--warning))" }}>
                    ⚠ {allocation.concentration.topHolding} is {allocation.concentration.topHoldingWeight}% of portfolio — high concentration.
                  </div>
                )}
              </div>

              {/* Health factors + flags */}
              <div className="rounded-2xl p-4 sm:p-6"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>
                <p className="text-sm font-semibold mb-4" style={{ color: "hsl(var(--foreground))" }}>Health Breakdown</p>
                <div className="space-y-3">
                  {Object.entries(healthScore.factors).map(([key, val]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium capitalize truncate pr-2" style={{ color: "hsl(var(--foreground-secondary))" }}>
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="text-xs font-bold tabular shrink-0" style={{ fontFamily: "Geist Mono", color: "hsl(var(--foreground))" }}>
                          {val}/25
                        </span>
                      </div>
                      <div className="progress-track" style={{ height: "4px" }}>
                        <div className="progress-fill" style={{ width: `${(val / 25) * 100}%`, background: "hsl(var(--info))" }} />
                      </div>
                    </div>
                  ))}
                </div>
                {healthScore.flags.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {healthScore.flags.map((flag) => (
                      <div key={flag} className="flex items-start gap-2 text-xs"
                        style={{ color: "hsl(var(--warning))" }}>
                        <span className="shrink-0">⚠</span>
                        <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── HIDDEN POSITIONS BANNER ───────────────────────────────────── */}
          {hiddenCount > 0 && (
            <div className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              style={{ background: "hsl(var(--warning-dim))", border: "1px solid hsl(var(--warning) / 0.3)" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(var(--warning) / 0.15)", border: "1px solid hsl(var(--warning) / 0.3)" }}>
                  <Lock className="w-4 h-4" style={{ color: "hsl(var(--warning))" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "hsl(var(--warning))" }}>
                    {hiddenCount} position{hiddenCount !== 1 ? "s" : ""} hidden — Basic tier limit
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(var(--foreground-secondary))" }}>
                    You have {totalCount} tracked positions. Showing first {BASIC_LIMIT}. Upgrade to see all.
                  </p>
                </div>
              </div>
              <RazorpayUpgradeButton
                sessionUser={{ id: session.user.id!, name: user?.name, email: user?.email, image: user?.image }}
                buttonText="Upgrade to Pro"
                className="btn-premium text-xs w-full sm:w-auto text-center justify-center shrink-0 px-5 py-2.5"
              />
            </div>
          )}

          {/* ── POSITION CARDS ────────────────────────────────────────────── */}
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 rounded-2xl gap-4 px-4 text-center"
              style={{ background: "hsl(var(--surface))", border: "2px dashed hsl(var(--border-token))" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border-token))" }}>
                <BarChart3 className="w-6 h-6" style={{ color: "hsl(var(--foreground-tertiary))" }} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold mb-1" style={{ color: "hsl(var(--foreground))" }}>No positions yet</p>
                <p className="text-sm px-4 max-w-sm mx-auto" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  Add positions from the dashboard to see your portfolio here.
                </p>
              </div>
              <Link href="/dashboard" className="btn-ghost text-sm">← Go to Dashboard</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {positions.map((pos) => {
                const profit  = pos.profit >= 0;
                const cur     = pos.currency ?? "INR";
                const sym     = getCurrencySymbol(cur);

                return (
                  <div key={pos.id}
                    className="rounded-2xl p-4 sm:p-5 flex flex-col gap-4 server-card-hover transition-all"
                    style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}>

                    {/* Card header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className="text-base font-black tracking-tight truncate max-w-[140px]" style={{ color: "hsl(var(--foreground))" }}>
                            {["FIXED_DEPOSIT","RECURRING_DEPOSIT","PPF","EPF","NPS","REAL_ESTATE","OTHER"].includes(pos.type)
                              ? pos.name
                              : pos.symbol}
                          </p>
                          <span className={`${typeBadgeClass(pos.type)} text-[9px] shrink-0`}>
                            {assetTypeLabel(pos.type)}
                          </span>
                          {pos.broker && (
                            <span className="badge-muted text-[9px] shrink-0 max-w-[70px] truncate">{pos.broker}</span>
                          )}
                          {cur !== "INR" && (
                            <span className="badge-info text-[9px] shrink-0">{cur} ({sym})</span>
                          )}
                        </div>
                        <p className="text-xs truncate max-w-[180px]" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                          {["FIXED_DEPOSIT","RECURRING_DEPOSIT","PPF","EPF","NPS","REAL_ESTATE"].includes(pos.type)
                            ? pos.interestRate ? `${pos.interestRate}% p.a.` : ""
                            : pos.name}
                        </p>
                        {pos.goal && (
                          <p className="text-[10px] mt-0.5 font-semibold truncate" style={{ color: "hsl(var(--premium))" }}>
                            🎯 {pos.goal.name}
                          </p>
                        )}
                      </div>

                      {/* P&L badge */}
                      <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 shrink-0"
                        style={{
                          background: profit ? "hsl(var(--positive-dim))" : "hsl(var(--negative-dim))",
                          border:     `1px solid hsl(var(--${profit ? "positive" : "negative"}) / 0.2)`,
                        }}>
                        {profit
                          ? <ArrowUpRight   className="w-3 h-3" style={{ color: "hsl(var(--positive))" }} />
                          : <ArrowDownRight className="w-3 h-3" style={{ color: "hsl(var(--negative))" }} />
                        }
                        <div>
                          <p className="text-xs font-bold tabular leading-none"
                            style={{ color: profit ? "hsl(var(--positive))" : "hsl(var(--negative))", fontFamily: "Geist Mono" }}>
                            {formatPct(pos.pnlPct)}
                          </p>
                          {pos.isProjection && (
                            <p className="text-[9px] leading-none mt-0.5" style={{ color: "hsl(var(--foreground-tertiary))" }}>est.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Data grid */}
                    <div className="grid grid-cols-2 gap-2.5 rounded-xl p-3"
                      style={{ background: "hsl(var(--surface-raised))" }}>

                      <div>
                        <p className="label-xs mb-0.5">Invested</p>
                        <p className="text-sm font-bold tabular"
                          style={{ color: "hsl(var(--foreground-secondary))", fontFamily: "Geist Mono" }}>
                          {formatCurrency(pos.investedAmount, cur)}
                        </p>
                      </div>

                      <div>
                        <p className="label-xs mb-0.5">Current Value</p>
                        <p className="text-sm font-bold tabular"
                          style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
                          {formatCurrency(pos.currentValue, cur)}
                        </p>
                      </div>

                      {/* Price per unit */}
                      {!["FIXED_DEPOSIT","RECURRING_DEPOSIT","PPF","EPF","NPS","REAL_ESTATE","OTHER","SIP_MUTUAL_FUND"].includes(pos.type) && (
                        <>
                          <div>
                            <p className="label-xs mb-0.5">Avg Cost</p>
                            <p className="text-sm font-bold tabular"
                              style={{ color: "hsl(var(--foreground-secondary))", fontFamily: "Geist Mono" }}>
                              {formatCurrency(pos.avgBuyPrice, cur)}
                            </p>
                          </div>
                          <div>
                            <p className="label-xs mb-0.5">Live Price</p>
                            <p className="text-sm font-bold tabular"
                              style={{ color: "hsl(var(--foreground))", fontFamily: "Geist Mono" }}>
                              {pos.livePrice !== pos.avgBuyPrice
                                ? formatCurrency(pos.livePrice, cur)
                                : <span style={{ color: "hsl(var(--foreground-tertiary))" }}>—</span>}
                            </p>
                          </div>
                        </>
                      )}

                      {/* Units */}
                      {["EQUITY_STOCK","ETF","US_STOCK","MUTUAL_FUND_LUMPSUM","CRYPTO","GOLD"].includes(pos.type) && (
                        <div>
                          <p className="label-xs mb-0.5">Units</p>
                          <p className="text-sm font-bold tabular"
                            style={{ color: "hsl(var(--foreground-secondary))", fontFamily: "Geist Mono" }}>
                            {pos.sharesOwned}
                          </p>
                        </div>
                      )}

                      {/* SIP monthly amount */}
                      {pos.sipAmount && (
                        <div>
                          <p className="label-xs mb-0.5">{pos.type === "RECURRING_DEPOSIT" ? "Monthly" : "SIP"}</p>
                          <p className="text-sm font-bold tabular"
                            style={{ color: "hsl(var(--info))", fontFamily: "Geist Mono" }}>
                            {formatCurrency(pos.sipAmount, cur)}/mo
                          </p>
                        </div>
                      )}

                      {/* Interest rate */}
                      {pos.interestRate && (
                        <div>
                          <p className="label-xs mb-0.5">Rate</p>
                          <p className="text-sm font-bold tabular"
                            style={{ color: "hsl(var(--info))", fontFamily: "Geist Mono" }}>
                            {pos.interestRate}% p.a.
                          </p>
                        </div>
                      )}

                      {/* Maturity value */}
                      {pos.maturityValue && (
                        <div>
                          <p className="label-xs mb-0.5">At Maturity</p>
                          <p className="text-sm font-bold tabular"
                            style={{ color: "hsl(var(--positive))", fontFamily: "Geist Mono" }}>
                            {formatCurrency(pos.maturityValue, cur)}
                          </p>
                        </div>
                      )}

                      {/* Maturity date */}
                      {pos.maturityDate && (
                        <div>
                          <p className="label-xs mb-0.5">Matures</p>
                          <p className="text-xs font-bold flex items-center gap-1"
                            style={{ color: "hsl(var(--foreground-secondary))", fontFamily: "Geist Mono" }}>
                            <Calendar className="w-2.5 h-2.5 shrink-0" />
                            {new Date(pos.maturityDate.toString()).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "2-digit",
                            })}
                          </p>
                        </div>
                      )}

                      {/* XIRR */}
                      {pos.xirr !== null && (
                        <div>
                          <p className="label-xs mb-0.5">XIRR</p>
                          <p className="text-sm font-bold tabular"
                            style={{
                              color: pos.xirr >= 0 ? "hsl(var(--positive))" : "hsl(var(--negative))",
                              fontFamily: "Geist Mono",
                            }}>
                            {formatPct(pos.xirr)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom P&L row */}
                    <div className="flex items-center justify-between pt-1"
                      style={{ borderTop: "1px solid hsl(var(--border-token))" }}>
                      <div>
                        <p className="label-xs mb-0.5">{pos.label}</p>
                        <p className="text-base font-black tabular"
                          style={{
                            color:       profit ? "hsl(var(--positive))" : "hsl(var(--negative))",
                            fontFamily: "Geist Mono",
                          }}>
                          {formatPnL(pos.profit, cur, 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="label-xs mb-0.5">Holding Value</p>
                        <p className="text-base sm:text-lg font-black tabular"
                          style={{ color: "hsl(var(--foreground))", fontFamily: "Geist" }}>
                          {formatCurrency(pos.currentValue, cur, { compact: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── UPGRADE WALL ──────────────────────────────────────────────── */}
          {!isPro && (
            <div className="rounded-2xl p-6 sm:p-8 text-center space-y-4 relative overflow-hidden"
              style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--premium) / 0.2)" }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, hsl(var(--premium) / 0.05), transparent)" }} />
              <div className="relative">
                <span className="badge-premium mb-3 inline-flex">Pro Feature</span>
                <p className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
                  Unlimited portfolio tracking
                </p>
                <p className="text-sm leading-relaxed mt-1.5 max-w-md mx-auto"
                  style={{ color: "hsl(var(--foreground-secondary))" }}>
                  Track unlimited positions with live XIRR, allocation analytics, tax estimates, and goal linking.
                </p>
              </div>
              <div className="relative pt-2">
                <RazorpayUpgradeButton
                  sessionUser={{ id: session.user.id!, name: user?.name, email: user?.email, image: user?.image }}
                  buttonText="Upgrade to Pro (₹1,299 / year)"
                  className="btn-premium text-sm w-full sm:w-auto px-8 py-3 inline-flex items-center justify-center gap-2"
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}