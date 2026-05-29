import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight,
  ReceiptText, Lock, Zap, Search, Filter,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import RazorpayUpgradeButton from "@/components/dashboard/RazorpayUpgradeButton";
import AddTransactionButtonInline from "@/components/dashboard/AddTransactionButton";

// ── Tier limits ────────────────────────────────────────────────────────────────
const BASIC_TX_LIMIT   = 50;
const PAGE_SIZE        = 20;

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const params   = await searchParams;
  const page     = Math.max(1, parseInt(params.page ?? "1", 10));
  const category = params.category ?? "";

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { tier: true, name: true, email: true, image: true },
  });

  const isPro  = user?.tier === "PRO";
  const offset = (page - 1) * PAGE_SIZE;

  const [allCount, categories] = await Promise.all([
    prisma.transaction.count({ where: { userId: session.user.id } }),
    prisma.transaction.groupBy({
      by:    ["category"],
      where: { userId: session.user.id },
    }),
  ]);

  const effectiveLimit = isPro ? allCount : Math.min(allCount, BASIC_TX_LIMIT);
  const totalPages     = Math.ceil(effectiveLimit / PAGE_SIZE);
  const isAtLimit      = !isPro && allCount > BASIC_TX_LIMIT;

  const where = {
    userId:   session.user.id,
    ...(category ? { category } : {}),
  };

  let transactions;
  if (!isPro) {
    const allowedIds = await prisma.transaction.findMany({
      where:   { userId: session.user.id },
      orderBy: { date: "desc" },
      take:    BASIC_TX_LIMIT,
      select:  { id: true },
    });
    const idSet = allowedIds.map((t) => t.id);
    transactions = await prisma.transaction.findMany({
      where:   { ...where, id: { in: idSet } },
      orderBy: { date: "desc" },
      skip:    offset,
      take:    PAGE_SIZE,
    });
  } else {
    transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip:    offset,
      take:    PAGE_SIZE,
    });
  }

  const totalIncome   = transactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 h-16 shrink-0"
          style={{
            background:     "hsl(220 14% 6% / 0.9)",
            backdropFilter: "blur(20px)",
            borderBottom:   "1px solid hsl(var(--border-token))",
          }}
        >
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 md:gap-2 text-sm transition-colors text-secondary hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span style={{ color: "hsl(var(--border-token))" }} className="hidden sm:inline">·</span>
            <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Transactions
            </span>
          </div>

          {/* Tier badge */}
          {isPro ? (
            <span className="badge-premium flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Pro — Unlimited
            </span>
          ) : (
            <span className="badge-muted flex items-center gap-1.5 text-xs">
              <Lock className="w-3 h-3" /> Basic — {Math.min(allCount, BASIC_TX_LIMIT)}/{BASIC_TX_LIMIT}
            </span>
          )}
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 space-y-6 max-w-6xl mx-auto w-full">
          {/* Page heading + summary stats */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="label-xs mb-1">Ledger</p>
              <h1
                className="text-2xl md:text-3xl font-black tracking-tight"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Transactions
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="label-xs mb-0.5">Total Income</p>
                <p
                  className="text-sm font-bold tabular"
                  style={{ color: "hsl(var(--positive))", fontFamily: "Geist Mono" }}
                >
                  +₹{totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div
                className="w-px h-8"
                style={{ background: "hsl(var(--border-token))" }}
              />
              <div className="text-right">
                <p className="label-xs mb-0.5">Total Expenses</p>
                <p
                  className="text-sm font-bold tabular"
                  style={{ color: "hsl(var(--negative))", fontFamily: "Geist Mono" }}
                >
                  −₹{totalExpenses.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Limit banner */}
          {isAtLimit && (
            <div
              className="rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
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
                    Transaction limit reached — {allCount - BASIC_TX_LIMIT} records hidden
                  </p>
                  <p
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: "hsl(var(--foreground-secondary))" }}
                  >
                    Basic tier shows only the most recent {BASIC_TX_LIMIT}. Upgrade to Pro for complete history.
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
                className="btn-premium text-xs shrink-0 px-5 py-2.5 w-full md:w-auto text-center"
              />
            </div>
          )}

          {/* Filter bar + Add transaction button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div
              className="rounded-2xl px-4 md:px-5 py-3 flex items-center gap-3 flex-wrap flex-1"
              style={{
                background: "hsl(var(--surface))",
                border:     "1px solid hsl(var(--border-token))",
              }}
            >
              <Filter className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--foreground-tertiary))" }} />
              <span className="label-xs shrink-0">Filter:</span>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/transactions"
                  className={`badge transition-colors ${!category ? "badge-info" : "badge-muted"}`}
                >
                  All
                </Link>
                {categories
                  .filter((c) => c.category)
                  .map((c) => (
                    <Link
                      key={c.category}
                      href={`/dashboard/transactions?category=${encodeURIComponent(c.category!)}`}
                      className={`badge transition-colors ${category === c.category ? "badge-info" : "badge-muted"}`}
                    >
                      {c.category}
                    </Link>
                  ))}
              </div>
            </div>

            <AddTransactionButtonInline />
          </div>

          {/* Transaction table */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "hsl(var(--surface))",
              border:     "1px solid hsl(var(--border-token))",
            }}
          >
            <div className="overflow-x-auto">
              <div style={{ minWidth: "640px" }} className="md:min-w-0">
                <div
                  className="grid px-4 md:px-6 py-3"
                  style={{
                    gridTemplateColumns: "1fr 140px 110px 120px",
                    borderBottom:       "1px solid hsl(var(--border-token))",
                    background:         "hsl(var(--surface-raised))",
                  }}
                >
                  <span className="label-xs">Description</span>
                  <span className="label-xs">Category</span>
                  <span className="label-xs">Date</span>
                  <span className="label-xs text-right">Amount</span>
                </div>

                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Search className="w-8 h-8" style={{ color: "hsl(var(--foreground-tertiary))" }} />
                    <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      No transactions found
                    </p>
                    <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                      {category ? "Try clearing the category filter" : "Upload a statement to populate your ledger"}
                    </p>
                    {category && (
                      <Link href="/dashboard/transactions" className="text-xs font-semibold" style={{ color: "hsl(var(--info))" }}>
                        Clear filter
                      </Link>
                    )}
                  </div>
                ) : (
                  transactions.map((tx, i) => {
                    const positive = tx.amount >= 0;
                    return (
                      <div
                        key={tx.id}
                        className="grid px-4 md:px-6 py-4 tx-row-hover transition-colors items-center"
                        style={{
                          gridTemplateColumns: "1fr 140px 110px 120px",
                          borderBottom:
                            i < transactions.length - 1
                              ? "1px solid hsl(var(--border-subtle))"
                              : "none",
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                            style={{
                              background: positive ? "hsl(var(--positive-dim))" : "hsl(var(--negative-dim))",
                              border:     `1px solid hsl(var(--${positive ? "positive" : "negative"}) / 0.2)`,
                            }}
                          >
                            {positive
                              ? <ArrowUpRight   className="w-3.5 h-3.5" style={{ color: "hsl(var(--positive))" }} />
                              : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: "hsl(var(--negative))" }} />
                            }
                          </div>
                          <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                            {tx.description}
                          </p>
                        </div>
                        <span className="badge-muted truncate max-w-[120px]">
                          {tx.category ?? "Unclassified"}
                        </span>
                        <p
                          className="text-xs tabular"
                          style={{
                            color:      "hsl(var(--foreground-tertiary))",
                            fontFamily: "Geist Mono",
                          }}
                        >
                          {new Date(tx.date).toLocaleDateString("en-IN", {
                            day:   "2-digit",
                            month: "short",
                            year:  "numeric",
                          })}
                        </p>
                        <p
                          className="text-sm font-bold tabular text-right"
                          style={{
                            color:      positive ? "hsl(var(--positive))" : "hsl(var(--negative))",
                            fontFamily: "Geist Mono",
                          }}
                        >
                          {positive ? "+" : "−"}₹{Math.abs(tx.amount).toFixed(2)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Pagination – original left/right layout */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs order-1 sm:order-none" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
                Page {page} of {totalPages} · {effectiveLimit} accessible records
                {isAtLimit && ` (${allCount} total)`}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/dashboard/transactions?page=${page - 1}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
                    className="btn-ghost text-xs px-3 py-1.5 md:px-4 md:py-2"
                  >
                    ← Previous
                  </Link>
                )}
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <Link
                        key={p}
                        href={`/dashboard/transactions?page=${p}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
                        className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors"
                        style={{
                          background:  page === p ? "hsl(var(--info))" : "hsl(var(--surface-raised))",
                          color:       page === p ? "hsl(var(--foreground))" : "hsl(var(--foreground-tertiary))",
                          border:      page === p ? "1px solid hsl(var(--info) / 0.4)" : "1px solid hsl(var(--border-token))",
                          fontFamily:  "Geist Mono",
                        }}
                      >
                        {p}
                      </Link>
                    );
                  })}
                </div>
                {page < totalPages && (
                  <Link
                    href={`/dashboard/transactions?page=${page + 1}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
                    className="btn-ghost text-xs px-3 py-1.5 md:px-4 md:py-2"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Upgrade wall */}
          {!isPro && (
            <div
              className="rounded-2xl p-6 md:p-8 text-center space-y-4 relative overflow-hidden"
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
                <p className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
                  Unlock unlimited transaction history
                </p>
                <p
                  className="text-sm leading-relaxed mt-1.5 max-w-md mx-auto"
                  style={{ color: "hsl(var(--foreground-secondary))" }}
                >
                  Pro subscribers get full access to every transaction ever recorded —
                  no caps, no hidden records, with complete category filtering and export.
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
                  className="btn-premium text-sm px-6 md:px-8 py-3 inline-flex items-center gap-2"
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}