import { generateAdvancedSummary, Timeframe } from "@/lib/ai/financial-analyzer";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import SummaryPanelClient from "./SummaryPanelClient";
import StreamingAdviceCard from "./StreamingAdviceCard";
import { Suspense } from "react";
import RazorpayUpgradeButton from "./RazorpayUpgradeButton";
import { Lock } from "lucide-react";
import Link from "next/link";

interface SummarySectionProps {
  searchParams: { timeframe?: string };
}

// Pure server-rendered timeframe switcher — no client JS needed,
// just links that set the ?timeframe= query param.
function TimeframeSwitcher({ current }: { current: string }) {
  const tabs = [
    { key: "week",  label: "7D"  },
    { key: "month", label: "30D" },
    { key: "year",  label: "1Y"  },
  ] as const;

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <p className="label-xs mb-1">Financial Overview</p>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
          Analytics Dashboard
        </h2>
      </div>
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-token))" }}
      >
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/dashboard?timeframe=${key}`}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background:  current === key ? "hsl(var(--surface-overlay))" : "transparent",
              color:       current === key ? "hsl(var(--foreground))"       : "hsl(var(--foreground-tertiary))",
              border:      current === key ? "1px solid hsl(var(--border-focus) / 0.3)" : "1px solid transparent",
              textDecoration: "none",
            }}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function SummarySection({ searchParams }: SummarySectionProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div
        className="rounded-2xl px-5 py-3 text-sm"
        style={{
          background: "hsl(var(--negative-dim))",
          border:     "1px solid hsl(var(--negative) / 0.25)",
          color:      "hsl(var(--negative))",
          fontFamily: "Geist Mono",
        }}
      >
        Session expired — please sign in again.
      </div>
    );
  }

  const timeframe = (searchParams?.timeframe as Timeframe) || "month";

  const userMetadata = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { tier: true, subscriptionEnd: true, name: true, email: true, image: true },
  });

  const isPro =
    userMetadata?.tier === "PRO" &&
    (userMetadata.subscriptionEnd ? userMetadata.subscriptionEnd > new Date() : true);

  /* ── Year-view gate — shows switcher so user can escape ─────────────── */
  if (timeframe === "year" && !isPro) {
    return (
      <div className="space-y-0">
        {/* Switcher always visible — user can click 7D or 30D to escape */}
        <TimeframeSwitcher current={timeframe} />

        <div
          className="rounded-2xl p-10 text-center space-y-5 relative overflow-hidden"
          style={{
            background: "hsl(var(--surface))",
            border:     "1px solid hsl(var(--premium) / 0.25)",
          }}
        >
          {/* Subtle glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 50% 60% at 50% 0%, hsl(var(--premium) / 0.06), transparent)",
            }}
          />

          {/* Lock icon */}
          <div
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              background: "hsl(var(--premium-dim))",
              border:     "1px solid hsl(var(--premium) / 0.3)",
            }}
          >
            <Lock className="w-6 h-6" style={{ color: "hsl(var(--premium))" }} />
          </div>

          <div className="relative">
            <span className="badge-premium mb-3 inline-flex">Pro Feature</span>
            <h3
              className="text-xl font-black tracking-tight mb-2"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Annual Lookback Locked
            </h3>
            <p
              className="text-sm leading-relaxed max-w-md mx-auto"
              style={{ color: "hsl(var(--foreground-secondary))" }}
            >
              The 12-month analytics view is restricted to Pro subscribers. Upgrade to unlock
              long-term compounding forecasts, or switch back to the 30-day view above.
            </p>
          </div>

          <div className="relative flex flex-col items-center gap-3">
            <RazorpayUpgradeButton
              sessionUser={{
                id:    session.user.id,
                name:  userMetadata?.name,
                email: userMetadata?.email,
                image: userMetadata?.image,
              }}
              buttonText="Upgrade to Pro Tier (₹1,299)"
              className="btn-premium text-sm px-8 py-3 inline-flex items-center gap-2"
            />
            {/* Explicit escape link */}
            <Link
              href="/dashboard?timeframe=month"
              className="text-xs transition-colors"
              style={{ color: "hsl(var(--foreground-tertiary))", textDecoration: "none" }}
            >
              ← Back to 30-day view
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const report = await generateAdvancedSummary(session.user.id, timeframe);

  if (!report) {
    return (
      <div className="space-y-0">
        <TimeframeSwitcher current={timeframe} />
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl gap-3"
          style={{
            background: "hsl(var(--surface))",
            border:     "2px dashed hsl(var(--border-token))",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            No records for this period
          </p>
          <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
            Upload a bank statement to populate your dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <SummaryPanelClient initialReport={report} defaultTimeframe={timeframe}>
      <Suspense
        fallback={
          <div className="space-y-3 py-2">
            {[100, 85, 70, 55].map((w) => (
              <div key={w} className="skeleton h-3 rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        }
      >
        {isPro ? (
          <StreamingAdviceCard report={report} userId={session.user.id} />
        ) : (
          <div className="flex items-center justify-between py-1 gap-4">
            <p className="text-sm" style={{ color: "hsl(var(--foreground-tertiary))" }}>
              Upgrade to Pro to unlock AI financial advisor insights.
            </p>
            <RazorpayUpgradeButton
              sessionUser={{
                id:    session.user.id,
                name:  userMetadata?.name,
                email: userMetadata?.email,
                image: userMetadata?.image,
              }}
              buttonText="Unlock Pro"
              className="text-sm font-semibold whitespace-nowrap transition-colors"
              style={{ color: "hsl(var(--premium))" } as React.CSSProperties}
            />
          </div>
        )}
      </Suspense>
    </SummaryPanelClient>
  );
}