import { getPortfolioNews } from "@/lib/market/stock-engine";
import prisma from "@/lib/db";
import { Newspaper, ExternalLink } from "lucide-react";

export default async function MacroNewsPanel({ userId }: { userId: string }) {
  // Grab active tickers to customize the news context matching what they own
  const userInvestments = await prisma.investment.findMany({
    where: { userId },
    select: { symbol: true },
    take: 3
  });

  const tickers = userInvestments.map(i => i.symbol);
  const news = await getPortfolioNews(tickers);

  return (
    <div className="border border-white/10 bg-zinc-950 p-5 font-mono text-xs h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
          <Newspaper className="w-4 h-4 text-sky-400" />
          <h3 className="uppercase tracking-widest text-gray-400 font-bold">Portfolio Intelligence News</h3>
        </div>

        {news.length === 0 ? (
          <div className="text-zinc-600 text-center py-8 border border-dashed border-white/5">
            No market developments reported for active holdings.
          </div>
        ) : (
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {news.map((item, idx) => (
              <div key={idx} className="border-b border-white/[0.03] pb-3 last:border-0 last:pb-0">
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-200 font-sans font-medium text-xs hover:text-sky-400 transition-colors block leading-snug"
                >
                  {item.title}
                </a>
                <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2">
                  <span>{item.publisher}</span>
                  <span className="opacity-60 flex items-center gap-0.5">{item.providerPublishTime}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}