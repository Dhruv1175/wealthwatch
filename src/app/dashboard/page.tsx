import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import prisma from "@/lib/db";
import UploadForm from "@/components/dashboard/UploadForm";
import SummarySection from "@/components/dashboard/SummarySection";
import AnalyticsSkeleton from "@/components/dashboard/AnalyticsSkeleton";
import InvestmentManager from "@/components/dashboard/InvestmentManager";
import MacroNewsPanel from "@/components/dashboard/MacroNewsPanel";

interface PageProps {
  searchParams: Promise<{ timeframe?: string }>;
}

export default async function Dashboard({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const resolvedParams = await searchParams;
  const timeframe = resolvedParams.timeframe || "month";
  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 10,
  });

  return (
    <div className="p-8 text-white min-h-screen bg-black font-sans">
      {/* Header Section */}
      <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WealthWatch Core</h1>
          <p className="text-sm text-gray-500">Welcome, {session.user?.name} (ID: {session.user?.id})</p>
        </div>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}>
          <button type="submit" className="bg-zinc-900 border border-white/10 px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors">
            Sign Out
          </button>
        </form>
      </div>

      {/* PROGRESSIVE SSR STREAMING LAYER */}
      <Suspense key={timeframe} fallback={<AnalyticsSkeleton />}>
        <SummarySection searchParams={{ timeframe }} />
      </Suspense>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        {/* Left Column Stack Wrapper: Holds both the PDF test bench and live news panel inside column 1 */}
        <div className="md:col-span-1 space-y-6">
          <div className="border border-white/10 p-6 bg-zinc-950">
            <h2 className="text-sm font-mono text-sky-400 tracking-wider uppercase mb-4">1. Test AI PDF Pipeline</h2>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Upload an unencrypted passbook or bank statement PDF. The client will stream the document directly to your API route, invoking the custom Groq engine.
            </p>
            <UploadForm />
          </div>
          
          <div className="border border-white/10 p-6 bg-zinc-950">
            <Suspense fallback={<div className="h-40 bg-zinc-900 animate-pulse font-mono text-[10px] text-zinc-500 p-4">CONNECTING REALTIME LIVE MACRO MEDIA CHANNELS...</div>}>
              <MacroNewsPanel userId={session.user.id} />
            </Suspense>
          </div>
        </div>

        {/* Right Column: Live Transaction Feed occupying remaining 2 columns */}
        <div className="md:col-span-2 border border-white/10 p-6 bg-zinc-950">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-mono text-emerald-400 tracking-wider uppercase">2. Database Transaction Feed</h2>
            <span className="text-xs font-mono bg-zinc-900 px-2.5 py-1 rounded border border-white/5 text-gray-400">
              Recent {transactions.length} Records
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/5 text-gray-600 text-sm font-mono">
              No ledger records caught. Execute a PDF ingest to populate this panel automatically.
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex justify-between items-center py-3 px-4 bg-black border border-white/[0.04] text-xs font-mono"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-200 text-sm font-sans font-medium">{tx.description}</span>
                    <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                      {tx.category || "UNCLASSIFIED"} • {new Date(tx.date).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-red-500"}`}>
                    {tx.amount >= 0 ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <InvestmentManager />
    </div>
  );
}