import { getPortfolioNews } from "@/lib/market/stock-engine";
import prisma from "@/lib/db";
import { Newspaper, ExternalLink, Radio } from "lucide-react";

interface MacroNewsPanelProps {
  userId: string;
}

export default async function MacroNewsPanel({ userId }: MacroNewsPanelProps) {
  const userInvestments = await prisma.investment.findMany({
    where:  { userId },
    select: { symbol: true },
    take:   5,
  });

  const tickers = userInvestments.map((i) => i.symbol);
  const news    = await getPortfolioNews(tickers);

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Newspaper className="w-3.5 h-3.5 text-accent" />
          <span className="data-label">Portfolio Intelligence</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Radio className="w-2.5 h-2.5 text-positive animate-live-pulse" />
          <span className="text-[9px] text-positive/70 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Ticker chips */}
      {tickers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tickers.map((t) => (
            <span key={t} className="ticker-chip">{t}</span>
          ))}
        </div>
      )}

      {/* News items */}
      {news.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border text-muted-foreground text-[11px]">
          No market developments for active holdings.
        </div>
      ) : (
        <div className="space-y-px max-h-[320px] overflow-y-auto scrollbar-thin">
          {news.map((item, idx) => (
            <div
              key={idx}
              className="bg-surface hover:bg-surface-raised transition-colors p-3 space-y-2"
            >
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/80 font-sans font-medium text-xs hover:text-accent transition-colors block leading-snug"
              >
                {item.title}
              </a>
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span className="uppercase tracking-wider">{item.publisher}</span>
                <span className="flex items-center gap-1 opacity-60">
                  {item.providerPublishTime}
                  <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}