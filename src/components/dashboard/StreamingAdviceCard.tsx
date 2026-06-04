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
interface ActiveInvestmentItem {
  symbol: string;
  userId: string;
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  type: any; // handles your custom $Enums.InvestmentType seamlessly
  portfolioId: string | null;
  goalId: string | null;
  sharesOwned: number;
  avgBuyPrice: number;
  sipAmount: number | null;
  sipDay: number | null;
  isin: string | null;
  folioNumber: string | null;
  broker: string | null;
  currency: string;
  exchange: string | null;
  sector: string | null;
  maturityDate: Date | null;
  interestRate: number | null;
  lockInDate: Date | null;
  notes: string | null;
  tags: string[];
  currentMarketValue: number | null;
}

export default async function StreamingAdviceCard({ report, userId }: StreamingAdviceProps) {
  // Pull holdings concurrently on the server
  const activeInvestments = await prisma.investment.findMany({ where: { userId } });
  
  const formattedInvestments = activeInvestments.map((i:ActiveInvestmentItem) => ({
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
      {adviceText.split("\n\n").map((paragraph:string, idx:number) => {
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