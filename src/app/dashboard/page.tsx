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
import Link from "next/link";
import { Activity, ArrowUpRight, FileText, Newspaper, ReceiptText } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ timeframe?: string }>;
}

export default async function Dashboard({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const resolvedParams = await searchParams;
  const timeframe = resolvedParams.timeframe || "month";

  const [transactions, totalInvestmentsCount] = await Promise.all([
    prisma.transaction.findMany({
      where:   { userId: session.user.id },
      orderBy: { date: "desc" },
      take:    10,
    }),
    prisma.investment.count({
      where: { userId: session.user.id },
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
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* ── TOP NAV BAR ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-6 h-14">
          {/* Wordmark */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 border border-border bg-surface">
              <Activity className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className="text-sm font-black tracking-tight text-foreground">
              WealthWatch
            </span>
            <span className="hidden sm:block text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 uppercase tracking-wider">
              Core
            </span>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/billing"
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 transition-colors hover:bg-surface"
            >
              Billing
              <ArrowUpRight className="w-3 h-3" />
            </Link>
            <UserProfileDropdown
              sessionUser={{
                id:    session.user.id,
                name:  session.user.name,
                email: session.user.email,
                image: session.user.image,
              }}
              stats={aggregateStats}
              signOutAction={handleGlobalSignOut}
            />
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ──────────────────────────────────────────────────────── */}
      <main className="px-6 py-8 space-y-8 max-w-[1400px] mx-auto">

        {/* Page heading */}
        <div className="flex items-end justify-between">
          <div>
            <p className="data-label mb-1">Authenticated workspace</p>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {session.user?.name?.split(" ")[0] ?? "Dashboard"}
            </h1>
          </div>
          <p className="hidden md:block text-[10px] font-mono text-muted-foreground">
            ID:{" "}
            <span className="text-foreground/60">
              {session.user?.id.slice(0, 20)}…
            </span>
          </p>
        </div>

        {/* ── SUMMARY + ANALYTICS ─────────────────────────────────────────────── */}
        <Suspense key={timeframe} fallback={<AnalyticsSkeleton />}>
          <SummarySection searchParams={{ timeframe }} />
        </Suspense>

        {/* ── THREE-COLUMN LOWER GRID ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── COL 1: PDF PIPELINE ─────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            <div className="panel p-5 space-y-4">
              <div className="flex items-center gap-2 divider pb-3">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
                  AI PDF Pipeline
                </h2>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                Drop an unencrypted passbook or bank statement. Streamed
                directly to the Groq extraction engine.
              </p>
              <UploadForm />
            </div>

            {/* ── NEWS PANEL ────────────────────────────────────────────────── */}
            <div className="panel p-5">
              <Suspense
                fallback={
                  <div className="h-48 skeleton" />
                }
              >
                <MacroNewsPanel userId={session.user.id} />
              </Suspense>
            </div>
          </div>

          {/* ── COL 2–3: TRANSACTION FEED ───────────────────────────────────── */}
          <div className="lg:col-span-9 panel p-5">
            <div className="flex items-center justify-between divider pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-3.5 h-3.5 text-positive" />
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
                  Transaction Feed
                </h2>
              </div>
              <span className="text-[10px] font-mono bg-muted border border-border px-2 py-1 text-muted-foreground">
                {transactions.length} records
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-border text-muted-foreground text-xs font-mono">
                No ledger records. Execute a PDF ingest to populate.
              </div>
            ) : (
              <div className="space-y-px max-h-[520px] overflow-y-auto scrollbar-thin">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border">
                  <span>Description</span>
                  <span>Category</span>
                  <span className="text-right">Amount</span>
                </div>

                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 bg-surface hover:bg-surface-raised transition-colors items-center group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">
                        {tx.description}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {new Date(tx.date).toLocaleDateString("en-IN", {
                          day:   "2-digit",
                          month: "short",
                          year:  "numeric",
                        })}
                      </p>
                    </div>

                    <span className="ticker-chip hidden sm:inline">
                      {tx.category ?? "Unclassified"}
                    </span>

                    <span
                      className={`text-sm font-black font-mono tabular-nums ${
                        tx.amount >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {tx.amount >= 0
                        ? `+₹${tx.amount.toFixed(2)}`
                        : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── INVESTMENT MANAGER ──────────────────────────────────────────────── */}
        <div className="border-t border-border pt-8">
          <InvestmentManager  />
        </div>
      </main>
    </div>
  );
}