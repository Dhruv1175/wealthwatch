import { generateAdvancedSummary, Timeframe } from "@/lib/ai/financial-analyzer";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import SummaryPanelClient from "./SummaryPanelClient";
import StreamingAdviceCard from "./StreamingAdviceCard";
import { Suspense } from "react";
import RazorpayUpgradeButton from "./RazorpayUpgradeButton";

interface SummarySectionProps {
  searchParams: { timeframe?: string };
}

export default async function SummarySection({ searchParams }: SummarySectionProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="text-xs font-mono text-negative border border-negative/20 bg-negative/5 px-4 py-3">
        Identity validation expired. Please sign in again.
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
    (userMetadata.subscriptionEnd
      ? userMetadata.subscriptionEnd > new Date()
      : false);

  /* Year-view gate */
  if (timeframe === "year" && !isPro) {
    return (
      <div className="panel p-8 space-y-4 text-center border-premium/25">
        <div className="w-10 h-10 border border-premium/30 bg-premium/10 flex items-center justify-center mx-auto">
          <span className="text-premium text-lg">★</span>
        </div>
        <div>
          <p className="data-label text-premium mb-1">Pro Feature</p>
          <h3 className="text-lg font-black tracking-tight text-foreground">Annual Lookback Locked</h3>
          <p className="text-sm text-muted-foreground font-mono mt-2 max-w-md mx-auto leading-relaxed">
            The macro annual trend visualizer is restricted to Pro subscribers. Upgrade to unlock long-term compounding forecasts.
          </p>
        </div>
        <RazorpayUpgradeButton
          sessionUser={{
            id:    session.user.id,
            name:  userMetadata?.name,
            email: userMetadata?.email,
            image: userMetadata?.image,
          }}
          buttonText="Upgrade to Pro Tier (₹1,299)"
          className="inline-flex items-center gap-2 bg-premium hover:bg-premium/90 text-background font-black text-xs uppercase tracking-widest px-6 py-3 transition-colors"
        />
      </div>
    );
  }

  const report = await generateAdvancedSummary(session.user.id, timeframe);

  if (!report) {
    return (
      <div className="py-20 text-center border border-dashed border-border text-muted-foreground text-xs font-mono">
        No records captured for this period. Try parsing a statement file.
      </div>
    );
  }

  return (
    <SummaryPanelClient initialReport={report} defaultTimeframe={timeframe}>
      <Suspense
        fallback={
          <div className="space-y-3 py-4">
            {[100, 80, 60].map((w) => (
              <div key={w} className={`h-2 skeleton rounded`} style={{ width: `${w}%` }} />
            ))}
          </div>
        }
      >
        {isPro ? (
          <StreamingAdviceCard report={report} userId={session.user.id} />
        ) : (
          <div className="flex items-center justify-between py-2">
            <p className="text-[11px] font-mono text-muted-foreground">
              Upgrade to Pro to unlock AI financial advisor insights.
            </p>
            <RazorpayUpgradeButton
              sessionUser={{ id: session.user.id, name: userMetadata?.name, email: userMetadata?.email, image: userMetadata?.image }}
              buttonText="Unlock Pro"
              className="flex items-center gap-1.5 text-[11px] font-mono text-premium hover:text-premium/80 transition-colors"
            />
          </div>
        )}
      </Suspense>
    </SummaryPanelClient>
  );
}