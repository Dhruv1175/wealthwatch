import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, TrendingDown,
  Lock, Zap, BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import RazorpayUpgradeButton from "@/components/dashboard/RazorpayUpgradeButton";

// ── Tier limits ────────────────────────────────────────────────────────────────
const BASIC_INVESTMENT_LIMIT = 5;

// Stub price fetch — replace with your real market data source
function simulatePrice(avgBuyPrice: number) {
  // In production replace with Yahoo Finance / NSE API call
  const variance = 0.85 + Math.random() * 0.3;
  return parseFloat((avgBuyPrice * variance).toFixed(2));
}

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { tier: true, name: true, email: true, image: true },
  });

  const isPro = user?.tier === "PRO";

  // Fetch ALL investments from DB regardless of tier
  // Tier enforcement = display limit, not data deletion
  const allInvestments = await prisma.investment.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  const totalCount  = allInvestments.length;
  const isAtLimit   = !isPro && totalCount >= BASIC_INVESTMENT_LIMIT;
  const hiddenCount = !isPro ? Math.max(0, totalCount - BASIC_INVESTMENT_LIMIT) : 0;

  // For BASIC users only show the first BASIC_INVESTMENT_LIMIT positions
  const visibleInvestments = isPro
    ? allInvestments
    : allInvestments.slice(0, BASIC_INVESTMENT_LIMIT);

  // Hydrate with prices
  const positions = visibleInvestments.map((inv) => {
    const currentPrice = simulatePrice(inv.avgBuyPrice);
    const currentValue = parseFloat((currentPrice * inv.sharesOwned).toFixed(2));
    const costBasis    = parseFloat((inv.avgBuyPrice * inv.sharesOwned).toFixed(2));
    const profitOrLoss = parseFloat((currentValue - costBasis).toFixed(2));
    const pnlPct       = parseFloat(
      (((currentPrice - inv.avgBuyPrice) / inv.avgBuyPrice) * 100).toFixed(2)
    );
    return { ...inv, currentPrice, currentValue, profitOrLoss, pnlPct };
  });

  const totalValue    = positions.reduce((s, p) => s + p.currentValue, 0);
  const totalPnl      = positions.reduce((s, p) => s + p.profitOrLoss, 0);
  const totalCost     = positions.reduce((s, p) => s + p.avgBuyPrice * p.sharesOwned, 0);
  const overallPnlPct = totalCost > 0 ? ((totalPnl / totalCost) * 100).toFixed(2) : "0.00";
  const pnlPositive   = totalPnl >= 0;

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
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm transition-colors text-secondary hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <span style={{ color: "hsl(var(--border-token))" }}>·</span>
            <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Portfolio
            </span>
          </div>

          {isPro ? (
            <span className="badge-premium flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Pro — Unlimited Positions
            </span>
          ) : (
            <span className="badge-muted flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Basic — {Math.min(totalCount, BASIC_INVESTMENT_LIMIT)}/{BASIC_INVESTMENT_LIMIT} positions
            </span>
          )}
        </header>

        <main className="flex-1 px-8 py-8 space-y-6 max-w-6xl mx-auto w-full">

          {/* Page heading */}
          <div>
            <p className="label-xs mb-1">Investment Tracker</p>
            <h1
              className="text-3xl font-black tracking-tight"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Portfolio
            </h1>
          </div>

          {/* ── PORTFOLIO SUMMARY HERO ──────────────────────────────────── */}
          {positions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Net Asset Value */}
              <div
                className="md:col-span-1 rounded-2xl p-6 space-y-2"
                style={{
                  background: "hsl(var(--surface))",
                  border:     "1px solid hsl(var(--border-token))",
                }}
              >
                <p className="label-xs">Total Portfolio Value</p>
                <p
                  className="text-3xl font-black tracking-tight tabular"
                  style={{ color: "hsl(var(--foreground))", fontFamily: "Geist" }}
                >
                  ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  Across {positions.length} position{positions.length !== 1 ? "s" : ""}
                  {hiddenCount > 0 && (
                    <span style={{ color: "hsl(var(--warning))", marginLeft: "4px" }}>
                      · +{hiddenCount} hidden
                    </span>
                  )}
                </p>
              </div>

              {/* Total P&L */}
              <div
                className="rounded-2xl p-6 space-y-2 relative overflow-hidden"
                style={{
                  background: pnlPositive
                    ? "linear-gradient(135deg, hsl(152 69% 12%), hsl(152 69% 8%))"
                    : "linear-gradient(135deg, hsl(4 86% 12%), hsl(4 86% 8%))",
                  border: `1px solid hsl(var(--${pnlPositive ? "positive" : "negative"}) / 0.3)`,
                }}
              >
                <div
                  className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-3xl pointer-events-none"
                  style={{
                    background: `hsl(var(--${pnlPositive ? "positive" : "negative"}) / 0.12)`,
                  }}
                />
                <p
                  className="label-xs relative"
                  style={{ color: `hsl(var(--${pnlPositive ? "positive" : "negative"}) / 0.7)` }}
                >
                  Total P&amp;L
                </p>
                <div className="flex items-end gap-2 relative">
                  <p
                    className="text-2xl font-black tabular"
                    style={{
                      color:      `hsl(var(--${pnlPositive ? "positive" : "negative"}))`,
                      fontFamily: "Geist",
                    }}
                  >
                    {pnlPositive ? "+" : "−"}₹{Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </p>
                  <div
                    className="flex items-center gap-1 mb-0.5 px-2 py-0.5 rounded-lg"
                    style={{
                      background: `hsl(var(--${pnlPositive ? "positive" : "negative"}) / 0.15)`,
                    }}
                  >
                    {pnlPositive
                      ? <TrendingUp   className="w-3 h-3" style={{ color: "hsl(var(--positive))" }} />
                      : <TrendingDown className="w-3 h-3" style={{ color: "hsl(var(--negative))" }} />
                    }
                    <span
                      className="text-xs font-bold tabular"
                      style={{
                        color:      `hsl(var(--${pnlPositive ? "positive" : "negative"}))`,
                        fontFamily: "Geist Mono",
                      }}
                    >
                      {pnlPositive ? "+" : ""}{overallPnlPct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Positions count */}
              <div
                className="rounded-2xl p-6 space-y-2"
                style={{
                  background: "hsl(var(--surface))",
                  border:     "1px solid hsl(var(--border-token))",
                }}
              >
                <p className="label-xs">Positions Tracked</p>
                <div className="flex items-end gap-2">
                  <p
                    className="text-3xl font-black tabular"
                    style={{ color: "hsl(var(--info))", fontFamily: "Geist" }}
                  >
                    {isPro ? totalCount : Math.min(totalCount, BASIC_INVESTMENT_LIMIT)}
                  </p>
                  {!isPro && (
                    <p
                      className="text-sm mb-1"
                      style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}
                    >
                      / {BASIC_INVESTMENT_LIMIT} max
                    </p>
                  )}
                </div>
                {!isPro && (
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width:      `${Math.min((totalCount / BASIC_INVESTMENT_LIMIT) * 100, 100)}%`,
                        background: isAtLimit ? "hsl(var(--negative))" : "hsl(var(--info))",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LIMIT BANNER ─────────────────────────────────────────────── */}
          {isAtLimit && hiddenCount > 0 && (
            <div
              className="rounded-2xl p-5 flex items-center justify-between gap-6"
              style={{
                background: "hsl(var(--warning-dim))",
                border:     "1px solid hsl(var(--warning) / 0.3)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "hsl(var(--warning) / 0.15)",
                    border:     "1px solid hsl(var(--warning) / 0.3)",
                  }}
                >
                  <Lock className="w-4 h-4" style={{ color: "hsl(var(--warning))" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "hsl(var(--warning))" }}>
                    {hiddenCount} position{hiddenCount !== 1 ? "s" : ""} hidden by Basic tier limit
                  </p>
                  <p
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: "hsl(var(--foreground-secondary))" }}
                  >
                    You have {totalCount} tracked positions. Basic tier displays only{" "}
                    {BASIC_INVESTMENT_LIMIT}. Your data is safe — upgrade to view everything.
                  </p>
                </div>
              </div>
              <RazorpayUpgradeButton
                sessionUser={{
                  id:    session.user.id!,
                  name:  user?.name,
                  email: user?.email,
                  image: user?.image,
                }}
                buttonText="Upgrade to Pro"
                className="btn-premium text-xs shrink-0 px-5 py-2.5"
              />
            </div>
          )}

          {/* ── POSITION CARDS ───────────────────────────────────────────── */}
          {positions.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-24 rounded-2xl gap-4"
              style={{
                background: "hsl(var(--surface))",
                border:     "2px dashed hsl(var(--border-token))",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "hsl(var(--surface-raised))",
                  border:     "1px solid hsl(var(--border-token))",
                }}
              >
                <BarChart3 className="w-6 h-6" style={{ color: "hsl(var(--foreground-tertiary))" }} />
              </div>
              <div className="text-center">
                <p
                  className="text-base font-bold mb-1"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  No positions tracked yet
                </p>
                <p className="text-sm" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                  Add your first position from the dashboard
                </p>
              </div>
              <Link href="/dashboard" className="btn-ghost text-sm">
                ← Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {positions.map((pos) => {
                const profit = pos.profitOrLoss >= 0;
                return (
                  <div
                    key={pos.id}
                    className="rounded-2xl p-5 flex flex-col justify-between transition-all server-card-hover"
                    style={{
                      background: "hsl(var(--surface))",
                      border:     "1px solid hsl(var(--border-token))",
                    }}
                  >
                    {/* Top */}
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p
                              className="text-base font-black tracking-tight"
                              style={{ color: "hsl(var(--foreground))" }}
                            >
                              {pos.symbol}
                            </p>
                            <span
                              className={
                                pos.type === "SIP_MUTUAL_FUND" ? "badge-info" : "badge-muted"
                              }
                            >
                              {pos.type === "SIP_MUTUAL_FUND" ? "SIP" : "EQ"}
                            </span>
                          </div>
                          <p
                            className="text-xs truncate max-w-[180px]"
                            style={{ color: "hsl(var(--foreground-tertiary))" }}
                          >
                            {pos.name}
                          </p>
                        </div>

                        {/* P&L badge */}
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0"
                          style={{
                            background: profit
                              ? "hsl(var(--positive-dim))"
                              : "hsl(var(--negative-dim))",
                            border: `1px solid hsl(var(--${profit ? "positive" : "negative"}) / 0.2)`,
                          }}
                        >
                          {profit
                            ? <ArrowUpRight   className="w-3 h-3" style={{ color: "hsl(var(--positive))" }} />
                            : <ArrowDownRight className="w-3 h-3" style={{ color: "hsl(var(--negative))" }} />
                          }
                          <span
                            className="text-xs font-bold tabular"
                            style={{
                              color:      profit ? "hsl(var(--positive))" : "hsl(var(--negative))",
                              fontFamily: "Geist Mono",
                            }}
                          >
                            {profit ? "+" : ""}{pos.pnlPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Price grid */}
                      <div
                        className="grid grid-cols-2 gap-3 rounded-xl p-3 mb-3"
                        style={{ background: "hsl(var(--surface-raised))" }}
                      >
                        <div>
                          <p className="label-xs mb-1">Current Price</p>
                          <p
                            className="text-sm font-bold tabular"
                            style={{
                              color:      "hsl(var(--foreground))",
                              fontFamily: "Geist Mono",
                            }}
                          >
                            ₹{pos.currentPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="label-xs mb-1">Avg Cost</p>
                          <p
                            className="text-sm font-bold tabular"
                            style={{
                              color:      "hsl(var(--foreground-secondary))",
                              fontFamily: "Geist Mono",
                            }}
                          >
                            ₹{pos.avgBuyPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="label-xs mb-1">Units</p>
                          <p
                            className="text-sm font-bold tabular"
                            style={{
                              color:      "hsl(var(--foreground-secondary))",
                              fontFamily: "Geist Mono",
                            }}
                          >
                            {pos.sharesOwned}
                          </p>
                        </div>
                        <div>
                          <p className="label-xs mb-1">Type</p>
                          <p
                            className="text-xs font-semibold"
                            style={{ color: "hsl(var(--foreground-secondary))" }}
                          >
                            {pos.type === "SIP_MUTUAL_FUND"
                              ? "SIP / Mutual Fund"
                              : "Direct Equity"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom */}
                    <div
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: "1px solid hsl(var(--border-token))" }}
                    >
                      <div>
                        <p className="label-xs mb-0.5">Holding Value</p>
                        <p
                          className="text-lg font-black tabular"
                          style={{ color: "hsl(var(--foreground))", fontFamily: "Geist" }}
                        >
                          ₹{pos.currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="label-xs mb-0.5">Unrealised P&amp;L</p>
                        <p
                          className="text-sm font-bold tabular"
                          style={{
                            color:      profit ? "hsl(var(--positive))" : "hsl(var(--negative))",
                            fontFamily: "Geist Mono",
                          }}
                        >
                          {profit ? "+" : "−"}₹{Math.abs(pos.profitOrLoss).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PRO UPGRADE WALL ─────────────────────────────────────────── */}
          {!isPro && (
            <div
              className="rounded-2xl p-8 text-center space-y-4 relative overflow-hidden"
              style={{
                background: "hsl(var(--surface))",
                border:     "1px solid hsl(var(--premium) / 0.2)",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 60% 50% at 50% 100%, hsl(var(--premium) / 0.05), transparent)",
                }}
              />
              <div className="relative">
                <span className="badge-premium mb-3 inline-flex">Pro Feature</span>
                <p
                  className="text-base font-bold"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  Unlimited portfolio tracking
                </p>
                <p
                  className="text-sm leading-relaxed mt-1.5 max-w-md mx-auto"
                  style={{ color: "hsl(var(--foreground-secondary))" }}
                >
                  Pro subscribers can track unlimited positions across equities, SIPs,
                  mutual funds, and ETFs with no data caps.
                </p>
              </div>
              <div className="relative">
                <RazorpayUpgradeButton
                  sessionUser={{
                    id:    session.user.id!,
                    name:  user?.name,
                    email: user?.email,
                    image: user?.image,
                  }}
                  buttonText="Upgrade to Pro (₹1,299 / year)"
                  className="btn-premium text-sm px-8 py-3 inline-flex items-center gap-2"
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}