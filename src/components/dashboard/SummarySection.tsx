import { generateAdvancedSummary, Timeframe } from "@/lib/ai/financial-analyzer";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import SummaryPanelClient from "./SummaryPanelClient";
import StreamingAdviceCard from "./StreamingAdviceCard";
import { Suspense } from "react";

interface SummarySectionProps {
  searchParams: { timeframe?: string };
}

export default async function SummarySection({ searchParams }: SummarySectionProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return <div className="text-xs font-mono text-red-500">Identity validation expired.</div>;
  }

  const timeframe = (searchParams?.timeframe as Timeframe) || "month";
  const userMetadata = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true, subscriptionEnd: true }
  });
  const isPro = userMetadata?.tier === "PRO" && (userMetadata.subscriptionEnd ? userMetadata.subscriptionEnd > new Date() : false);
  if (timeframe === "year" && !isPro) {
    return (
      <div className="border border-amber-500/20 bg-amber-950/10 p-8 font-mono text-xs text-center text-amber-400 space-y-3 rounded my-4">
        <div className="font-bold uppercase tracking-widest">Premium Analytics Blocked</div>
        <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
          The macro annual lookback trend visualizer is restricted to subscribers. Upgrade your account plan to unlock long-term compounding forecasts.
        </p>
        <button className="bg-amber-500 text-black font-black px-4 py-1.5 uppercase tracking-wider hover:bg-amber-400 transition-all mt-2">
          Unlock Pro Access ($15/Mo)
        </button>
      </div>
    );
  }
  
  // Fast Database Calculations Execute Instantly via native aggregates (<15ms)
  const report = await generateAdvancedSummary(session.user.id, timeframe);

  if (!report) {
    return (
      <div className="text-center py-16 border border-dashed border-white/5 text-xs font-mono text-zinc-600">
        No records captured for this period perimeter. Try parsing a statement file.
      </div>
    );
  }

  return (
    <SummaryPanelClient initialReport={report} defaultTimeframe={timeframe}>
      {/* Only block and delay the isolated AI element using an inline suspense placeholder */}
      <Suspense 
        fallback={
          <div className="space-y-3 font-mono text-xs text-zinc-500 animate-pulse py-4">
            <div className="h-3 bg-zinc-900 w-1/4 rounded mb-2" />
            <div className="h-2 bg-zinc-900 w-full rounded animate-pulse" />
            <div className="h-2 bg-zinc-900 w-5/6 rounded animate-pulse" />
            <div className="h-2 bg-zinc-900 w-2/3 rounded animate-pulse" />
          </div>
        }
      >{isPro ? (
          <StreamingAdviceCard report={report} userId={session.user.id}/>
        ) : (
          <div className="text-zinc-500 text-xs font-mono py-2">Upgrade to Pro Tier to unlock real-time financial advisor insights blocks.</div>
        )}
      </Suspense>
    </SummaryPanelClient>
  );
}