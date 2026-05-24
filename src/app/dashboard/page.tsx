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
import { FileText, Newspaper, ReceiptText, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ timeframe?: string }>;
}

export default async function Dashboard({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const resolvedParams = await searchParams;
  const timeframe = resolvedParams.timeframe || "month";

  const [transactions, totalInvestmentsCount, user] = await Promise.all([
    prisma.transaction.findMany({
      where:   { userId: session.user.id },
      orderBy: { date: "desc" },
      take:    10,
    }),
    prisma.investment.count({ where: { userId: session.user.id } }),
    prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { tier: true, name: true, email: true, image: true },
    }),
  ]);

  const aggregateStats = {
    totalTransactions: transactions.length,
    totalInvestments:  totalInvestmentsCount,
  };

  async function handleGlobalSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="app-shell">
      <Sidebar />

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div className="app-content">
        {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-8 h-16 shrink-0"
          style={{
            background:   "hsl(220 14% 6% / 0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <div>
            <p className="text-xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
              Good {getGreeting()},{" "}
              <span style={{ color: "hsl(var(--info))" }}>
                {session.user?.name?.split(" ")[0] ?? "Investor"}
              </span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <UserProfileDropdown
            sessionUser={{
              id:    session.user.id,
              name:  session.user.name,
              email: session.user.email,
              image: session.user.image ,
              tier:  user?.tier,
            }}
            stats={aggregateStats}
            signOutAction={handleGlobalSignOut}
          />
        </header>

        {/* ── PAGE BODY ───────────────────────────────────────────────────── */}
        <main className="flex-1 px-8 py-8 space-y-8">

          {/* ── ANALYTICS (SSR streamed) ─────────────────────────────────── */}
          <Suspense key={timeframe} fallback={<AnalyticsSkeleton />}>
            <SummarySection searchParams={{ timeframe }} />
          </Suspense>

          {/* ── SECONDARY ROW: PDF + NEWS + TRANSACTIONS ─────────────────── */}
          <div className="grid grid-cols-12 gap-6">

            {/* PDF pipeline */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "hsl(var(--info-dim))", border: "1px solid hsl(var(--info) / 0.25)" }}
                  >
                    <FileText className="w-4 h-4" style={{ color: "hsl(var(--info))" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      AI PDF Pipeline
                    </p>
                    <p className="label-xs">Groq extraction engine</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed mb-5" style={{ color: "hsl(var(--foreground-secondary))" }}>
                  Upload a passbook or bank statement. Transactions are automatically extracted and committed to your ledger.
                </p>
                <UploadForm />
              </div>

              {/* News panel */}
              <div className="card p-6">
                <Suspense fallback={
                  <div className="space-y-3">
                    {[80, 60, 70].map((w) => (
                      <div key={w} className="skeleton h-10" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                }>
                  <MacroNewsPanel userId={session.user.id} />
                </Suspense>
              </div>
            </div>

            {/* Transaction feed */}
            <div className="col-span-12 lg:col-span-8 card" id="transactions" >
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: "1px solid hsl(var(--border))" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "hsl(var(--positive-dim))", border: "1px solid hsl(var(--positive) / 0.25)" }}
                  >
                    <ReceiptText className="w-4 h-4" style={{ color: "hsl(var(--positive))" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      Recent Transactions
                    </p>
                    <p className="label-xs">Live ledger feed</p>
                  </div>
                </div>
                <span
                  className="badge-muted"
                  style={{ fontFamily: "Geist Mono" }}
                >
                  {transactions.length} records
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border))" }}
                  >
                    <ReceiptText className="w-5 h-5" style={{ color: "hsl(var(--foreground-tertiary))" }} />
                  </div>
                  <p className="text-sm" style={{ color: "hsl(var(--foreground-tertiary))" }}>
                    No ledger records. Upload a statement to get started.
                  </p>
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div
                    className="grid items-center px-6 py-2.5"
                    style={{
                      gridTemplateColumns: "1fr 140px 100px",
                      borderBottom: "1px solid hsl(var(--border-subtle))",
                    }}
                  >
                    <span className="label-xs">Description</span>
                    <span className="label-xs">Category</span>
                    <span className="label-xs text-right">Amount</span>
                  </div>

                  <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
                    {transactions.map((tx, i) => {
                      const positive = tx.amount >= 0;
                      return (
                        <div
                          key={tx.id}
                          className="grid items-center px-6 py-3.5 transition-colors"
                          style={{
                            gridTemplateColumns: "1fr 140px 100px",
                            borderBottom: i < transactions.length - 1 ? "1px solid hsl(var(--border-subtle))" : "none",
                            cursor: "default",
                          }}

                        >
                          {/* Description + date */}
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
                            <div className="min-w-0">
                              <p
                                className="text-sm font-medium truncate"
                                style={{ color: "hsl(var(--foreground))" }}
                              >
                                {tx.description}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}
                              >
                                {new Date(tx.date).toLocaleDateString("en-IN", {
                                  day: "2-digit", month: "short", year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Category */}
                          <span className="badge-muted truncate max-w-[120px]">
                            {tx.category ?? "Unclassified"}
                          </span>

                          {/* Amount */}
                          <p
                            className="text-sm font-bold tabular text-right"
                            style={{
                              color:       positive ? "hsl(var(--positive))" : "hsl(var(--negative))",
                              fontFamily:  "Geist Mono",
                            }}
                          >
                            {positive ? "+" : "−"}₹{Math.abs(tx.amount).toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── INVESTMENT MANAGER ──────────────────────────────────────────── */}
          <div id="portfolio">
          <InvestmentManager
            totalInvestmentsCount={totalInvestmentsCount}
            sessionUser={{
              id:    session.user.id,
              name:  session.user?.name,
              email: session.user?.email,
              image: session.user?.image,
            }}
          /></div>
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