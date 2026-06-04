import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Lock, Zap } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import InvestmentManager from "@/components/dashboard/InvestmentManager";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { tier: true, name: true, email: true, image: true },
  });

  const isPro = user?.tier === "PRO";
  const [investmentCount, goals] = await Promise.all([
    prisma.investment.count({ where: { userId: session.user.id } }),
    prisma.financialGoal.findMany({
      where:   { userId: session.user.id },
      select:  { id: true, name: true, category: true },
      orderBy: { targetDate: "asc" },
    }),
  ]);

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

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/goals"
              className="text-xs font-semibold transition-colors"
              style={{ color: "hsl(var(--info))" }}
            >
              Manage Goals →
            </Link>
            {isPro ? (
              <span className="badge-premium flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Pro — Unlimited
              </span>
            ) : (
              <span className="badge-muted flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Basic — {Math.min(investmentCount, 5)}/5
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 px-8 py-8 max-w-7xl mx-auto w-full">
          {/* InvestmentManager handles all add/delete/sell/analytics */}
          <InvestmentManager
            totalInvestmentsCount={investmentCount}
            sessionUser={{
              id:    session.user.id,
              name:  session.user.name,
              email: session.user.email,
              image: session.user.image,
            }}
            availableGoals={goals}
          />
        </main>
      </div>
    </div>
  );
}