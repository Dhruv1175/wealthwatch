import { generateAdvancedSummary, Timeframe } from "@/lib/ai/financial-analyzer";
import { auth } from "@/auth";
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
      >
        <StreamingAdviceCard report={report} userId={session.user.id} />
      </Suspense>
    </SummaryPanelClient>
  );
}