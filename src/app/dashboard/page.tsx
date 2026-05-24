import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import prisma from "@/lib/db";
import UploadForm from "@/components/dashboard/UploadForm";
import SummarySection from "@/components/dashboard/SummarySection";
import AnalyticsSkeleton from "@/components/dashboard/AnalyticsSkeleton";
import InvestmentManager from "@/components/dashboard/InvestmentManager";
import MacroNewsPanel from "@/components/dashboard/MacroNewsPanel";
import UserProfileDropdown from "@/components/dashboard/UserProfileDropdown";
import Sidebar from "@/components/dashboard/Sidebar";
import Link from "next/link";
import {
  FileText, ReceiptText,
  ArrowUpRight, ArrowDownRight, ArrowRight,
  Activity,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{ timeframe?: string }>;
}

export default async function Dashboard({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const resolvedParams = await searchParams;
  const timeframe = resolvedParams.timeframe || "month";

  const [recentTransactions, totalTransactionCount, totalInvestmentsCount, user] =
    await Promise.all([
      // Only fetch 5 for the preview — full list lives on /dashboard/transactions
      prisma.transaction.findMany({
        where:   { userId: session.user.id },
        orderBy: { date: "desc" },
        take:    5,
      }),
      prisma.transaction.count({ where: { userId: session.user.id } }),
      prisma.investment.count({ where: { userId: session.user.id } }),
      prisma.user.findUnique({
        where:  { id: session.user.id },
        select: { tier: true, name: true, email: true, image: true },
      }),
    ]);

  const aggregateStats = {
    totalTransactions: totalTransactionCount,
    totalInvestments:  totalInvestmentsCount,
  };

  const isPro = user?.tier === "PRO";

  async function handleGlobalSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-content">
        {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-8 h-16 shrink-0"
          style={{
            background:     "hsl(220 14% 6% / 0.9)",
            backdropFilter: "blur(20px)",
            borderBottom:   "1px solid hsl(var(--border-token))",
          }}
        >
          <div>
            <p
              className="text-xl font-bold tracking-tight"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Good {getGreeting()},{" "}
              <span style={{ color: "hsl(var(--info))" }}>
                {session.user?.name?.split(" ")[0] ?? "Investor"}
              </span>
            </p>
            <p
              className="text-xs mt-0.5"
              style={{
                color:      "hsl(var(--foreground-tertiary))",
                fontFamily: "Geist Mono",
              }}
            >
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day:     "numeric",
                month:   "long",
                year:    "numeric",
              })}
            </p>
          </div>
          <UserProfileDropdown
            sessionUser={{
              id:    session.user.id,
              name:  session.user.name,
              email: session.user.email,
              image: session.user.image,
              tier:  user?.tier ?? "BASIC",
            }}
            stats={aggregateStats}
            signOutAction={handleGlobalSignOut}
          />
        </header>

        {/* ── PAGE BODY ───────────────────────────────────────────────────── */}
        <main className="flex-1 px-8 py-8 space-y-8">

          {/* Analytics */}
          <Suspense key={timeframe} fallback={<AnalyticsSkeleton />}>
            <SummarySection searchParams={{ timeframe }} />
          </Suspense>

          {/* PDF + News + Transaction Preview */}
          <div className="grid grid-cols-12 gap-6">

            {/* Left column */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* PDF pipeline */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "hsl(var(--surface))",
                  border:     "1px solid hsl(var(--border-token))",
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: "hsl(var(--info-dim))",
                      border:     "1px solid hsl(var(--info) / 0.25)",
                    }}
                  >
                    <FileText className="w-4 h-4" style={{ color: "hsl(var(--info))" }} />
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "hsl(var(--foreground))" }}
                    >
                      AI PDF Pipeline
                    </p>
                    <p className="label-xs">Groq extraction engine</p>
                  </div>
                </div>
                <p
                  className="text-xs leading-relaxed mb-5"
                  style={{ color: "hsl(var(--foreground-secondary))" }}
                >
                  Upload a passbook or bank statement. Transactions are automatically
                  extracted and committed to your ledger.
                </p>
                <UploadForm />
              </div>

              {/* News */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "hsl(var(--surface))",
                  border:     "1px solid hsl(var(--border-token))",
                }}
              >
                <Suspense
                  fallback={
                    <div className="space-y-3">
                      {[80, 60, 70].map((w) => (
                        <div key={w} className="skeleton h-10 rounded-xl" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  }
                >
                  <MacroNewsPanel userId={session.user.id} />
                </Suspense>
              </div>
            </div>

            {/* Transaction preview */}
            <div
              className="col-span-12 lg:col-span-8 rounded-2xl flex flex-col"
              style={{
                background: "hsl(var(--surface))",
                border:     "1px solid hsl(var(--border-token))",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 shrink-0"
                style={{ borderBottom: "1px solid hsl(var(--border-token))" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: "hsl(var(--positive-dim))",
                      border:     "1px solid hsl(var(--positive) / 0.25)",
                    }}
                  >
                    <ReceiptText className="w-4 h-4" style={{ color: "hsl(var(--positive))" }} />
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "hsl(var(--foreground))" }}
                    >
                      Recent Transactions
                    </p>
                    <p className="label-xs">Latest 5 entries</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Real total — not capped */}
                  <span
                    className="badge-muted"
                    style={{ fontFamily: "Geist Mono" }}
                  >
                    {totalTransactionCount} total
                  </span>
                  <Link
                    href="/dashboard/transactions"
                    className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    style={{ color: "hsl(var(--info))" }}
                  >
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Rows */}
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-16 gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: "hsl(var(--surface-raised))",
                      border:     "1px solid hsl(var(--border-token))",
                    }}
                  >
                    <ReceiptText
                      className="w-5 h-5"
                      style={{ color: "hsl(var(--foreground-tertiary))" }}
                    />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                    No transactions yet
                  </p>
                  <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                    Upload a bank statement to get started
                  </p>
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div
                    className="grid px-6 py-2.5 shrink-0"
                    style={{
                      gridTemplateColumns: "1fr 140px 110px",
                      borderBottom:       "1px solid hsl(var(--border-subtle))",
                    }}
                  >
                    <span className="label-xs">Description</span>
                    <span className="label-xs">Category</span>
                    <span className="label-xs text-right">Amount</span>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {recentTransactions.map((tx, i) => {
                      const positive = tx.amount >= 0;
                      return (
                        <div
                          key={tx.id}
                          className="grid px-6 py-3.5 tx-row-hover transition-colors"
                          style={{
                            gridTemplateColumns: "1fr 140px 110px",
                            borderBottom:
                              i < recentTransactions.length - 1
                                ? "1px solid hsl(var(--border-subtle))"
                                : "none",
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                              style={{
                                background: positive
                                  ? "hsl(var(--positive-dim))"
                                  : "hsl(var(--negative-dim))",
                                border: `1px solid hsl(var(--${positive ? "positive" : "negative"}) / 0.2)`,
                              }}
                            >
                              {positive
                                ? <ArrowUpRight   className="w-3.5 h-3.5" style={{ color: "hsl(var(--positive))" }} />
                                : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: "hsl(var(--negative))" }} />
                              }
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-sm font-medium truncate"
                                style={{ color: "hsl(var(--foreground))" }}
                              >
                                {tx.description}
                              </p>
                              <p
                                className="text-xs"
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
                            </div>
                          </div>
                          <span className="badge-muted self-center truncate max-w-[120px]">
                            {tx.category ?? "Unclassified"}
                          </span>
                          <p
                            className="text-sm font-bold tabular text-right self-center"
                            style={{
                              color:      positive ? "hsl(var(--positive))" : "hsl(var(--negative))",
                              fontFamily: "Geist Mono",
                            }}
                          >
                            {positive ? "+" : "−"}₹{Math.abs(tx.amount).toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer CTA */}
                  <div
                    className="px-6 py-3.5 shrink-0 flex items-center justify-between"
                    style={{ borderTop: "1px solid hsl(var(--border-token))" }}
                  >
                    <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                      Showing 5 of {totalTransactionCount} transactions
                      {!isPro && totalTransactionCount > 50 && (
                        <span style={{ color: "hsl(var(--warning))", marginLeft: "6px" }}>
                          · Upgrade to Pro to unlock all records
                        </span>
                      )}
                    </p>
                    <Link
                      href="/dashboard/transactions"
                      className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{ color: "hsl(var(--info))" }}
                    >
                      View all transactions <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Investment Manager */}
          <InvestmentManager
            totalInvestmentsCount={totalInvestmentsCount}
            sessionUser={{
              id:    session.user.id,
              name:  session.user?.name,
              email: session.user?.email,
              image: session.user?.image,
            }}
          />
        </main>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}