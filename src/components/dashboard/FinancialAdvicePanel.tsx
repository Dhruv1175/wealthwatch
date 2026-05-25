import { auth } from "@/auth";
import prisma from "@/lib/db";
import { fetchAiAdviceOnly } from "@/lib/ai/financial-analyzer";
import {
  Sparkles, ShieldAlert, TrendingUp, AlertTriangle,
} from "lucide-react";
import RazorpayUpgradeButton from "@/components/dashboard/RazorpayUpgradeButton";

interface FinancialAdvicePanelProps {
  // Pass the already-computed report so we don't re-fetch
  report: {
    timeframe:          string;
    totalCredit:        number;
    totalDebit:         number;
    burnRatePercentage: number;
    outliers:           any[];
  };
  userId: string;
}

export default async function FinancialAdvicePanel({
  report,
  userId,
}: FinancialAdvicePanelProps) {
  // Fetch active investments for richer advice context
  const [investments, user] = await Promise.all([
    prisma.investment.findMany({
      where:  { userId },
      select: { symbol: true, name: true, type: true, sharesOwned: true, avgBuyPrice: true },
    }),
    prisma.user.findUnique({
      where:  { id: userId },
      select: { tier: true, name: true, email: true, image: true },
    }),
  ]);

  const isPro = user?.tier === "PRO";

  const formattedInvestments = investments.map((i) => ({
    symbol:    i.symbol,
    name:      i.name,
    type:      i.type,
    totalCost: i.sharesOwned * i.avgBuyPrice,
  }));

  // Call Groq — this blocks the Suspense boundary intentionally
  const adviceText = await fetchAiAdviceOnly({
    timeframe:          report.timeframe,
    totalCredit:        report.totalCredit,
    totalDebit:         report.totalDebit,
    burnRatePercentage: report.burnRatePercentage,
    outliers:           report.outliers,
    activeInvestments:  formattedInvestments,
  });

  return (
    <div className="space-y-5">
      {/* Disclaimer banner — always visible */}
      <div
        className="rounded-xl px-4 py-3 flex items-start gap-3"
        style={{
          background: "hsl(var(--warning-dim))",
          border:     "1px solid hsl(var(--warning) / 0.25)",
        }}
      >
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--warning))" }} />
        <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--foreground-secondary))" }}>
          <span className="font-bold" style={{ color: "hsl(var(--warning))" }}>
            Not financial advice.{" "}
          </span>
          WealthWatch AI provides educational insights based on your personal spending patterns.
          It is not a licensed financial advisor. Always consult a SEBI-registered advisor
          before making investment decisions. Past performance does not guarantee future results.
        </p>
      </div>

      {/* AI advice content */}
      <div className="space-y-4 text-sm leading-relaxed font-sans">
        {adviceText.split("\n\n").map((paragraph, idx) => {
          if (paragraph.startsWith("###")) {
            const title = paragraph.replace(/^###\s*/, "").trim();
            return (
              <div key={idx} className="flex items-center gap-2 mt-5 mb-2">
                <div
                  className="w-1 h-4 rounded-full"
                  style={{ background: "hsl(var(--info))" }}
                />
                <h4
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "hsl(var(--info))", fontFamily: "Geist Mono" }}
                >
                  {title}
                </h4>
              </div>
            );
          }
          if (!paragraph.trim()) return null;
          return (
            <p key={idx} style={{ color: "hsl(var(--foreground-secondary))" }}>
              {paragraph}
            </p>
          );
        })}
      </div>

      {/* Money growth suggestions — user-submitted ideas section */}
      <AdditionalSuggestionsBox isPro={isPro} />
    </div>
  );
}

// ── Additional Suggestions Box (client-renderable, but kept server for simplicity) ─
function AdditionalSuggestionsBox({ isPro }: { isPro: boolean }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3 mt-2"
      style={{
        background: "hsl(var(--surface-raised))",
        border:     "1px solid hsl(var(--border-token))",
      }}
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(var(--positive))" }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(var(--positive))" }}>
          Growth Suggestions
        </p>
      </div>
      <ul className="space-y-2">
        {GROWTH_TIPS.map((tip) => (
          <li key={tip.title} className="flex items-start gap-2.5">
            <span
              className="text-xs mt-0.5 shrink-0 font-bold"
              style={{ color: "hsl(var(--positive))" }}
            >
              ›
            </span>
            <div>
              <p className="text-xs font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                {tip.title}
              </p>
              <p
                className="text-xs mt-0.5 leading-relaxed"
                style={{ color: "hsl(var(--foreground-tertiary))" }}
              >
                {tip.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const GROWTH_TIPS = [
  {
    title:       "50/30/20 Rule",
    description: "Allocate 50% of income to needs, 30% to wants, and 20% to savings or investments. Adjust the 20% upward as income grows.",
  },
  {
    title:       "Emergency Fund First",
    description: "Before investing, build 3–6 months of expenses in a liquid savings account. This prevents you from liquidating investments during emergencies.",
  },
  {
    title:       "SIP Automation",
    description: "Automate monthly SIP contributions to mutual funds. Even ₹500/month compounded at 12% over 20 years grows to ₹4.9L.",
  },
  {
    title:       "Track Discretionary Spending",
    description: "Use WealthWatch category filters to identify your top 3 discretionary spend categories each month and set personal limits.",
  },
  {
    title:       "Tax-Advantaged Accounts",
    description: "Maximize ELSS mutual fund investments under Section 80C (up to ₹1.5L) before March 31st each year to reduce taxable income.",
  },
];