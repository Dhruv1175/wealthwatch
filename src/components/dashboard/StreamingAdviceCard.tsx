import { fetchAiAdviceOnly } from "@/lib/ai/financial-analyzer";
import prisma from "@/lib/db";

interface StreamingAdviceProps {
  report: {
    timeframe: string;
    totalCredit: number;
    totalDebit: number;
    burnRatePercentage: number;
    outliers: any[];
  };
  userId: string;
}

export default async function StreamingAdviceCard({ report, userId }: StreamingAdviceProps) {
  // Pull holdings concurrently on the server
  const activeInvestments = await prisma.investment.findMany({ where: { userId } });
  
  const formattedInvestments = activeInvestments.map(i => ({
    symbol: i.symbol,
    name: i.name,
    type: i.type,
    totalCost: i.sharesOwned * i.avgBuyPrice
  }));

  // Block only this inner element while Groq compiles text blocks
  const adviceText = await fetchAiAdviceOnly({
    timeframe: report.timeframe,
    totalCredit: report.totalCredit,
    totalDebit: report.totalDebit,
    burnRatePercentage: report.burnRatePercentage,
    outliers: report.outliers,
    activeInvestments: formattedInvestments,
  });

  return (
    <div className="text-sm text-gray-300 space-y-4 font-sans leading-relaxed">
      {adviceText.split("\n\n").map((paragraph, idx) => {
        if (paragraph.startsWith("###")) {
          return (
            <h4 key={idx} className="text-xs font-mono font-bold uppercase tracking-widest text-sky-400 mt-4 mb-2 border-l-2 border-sky-500 pl-2">
              {paragraph.replace("###", "").trim()}
            </h4>
          );
        }
        return <p key={idx} className="text-gray-300 text-sm">{paragraph}</p>;
      })}
    </div>
  );
}