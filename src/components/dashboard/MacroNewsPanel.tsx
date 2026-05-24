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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "hsl(var(--info-dim))",
              border:     "1px solid hsl(var(--info) / 0.25)",
            }}
          >
            <Newspaper className="w-4 h-4" style={{ color: "hsl(var(--info))" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Market Intelligence
            </p>
            <p className="label-xs">Portfolio news feed</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 animate-live-pulse" style={{ color: "hsl(var(--positive))" }} />
          <span
            className="text-xs font-semibold"
            style={{ color: "hsl(var(--positive))", fontFamily: "Geist Mono" }}
          >
            Live
          </span>
        </div>
      </div>

      {/* Ticker chips */}
      {tickers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tickers.map((t) => (
            <span key={t} className="badge-info text-[9px]">{t}</span>
          ))}
        </div>
      )}

      {/* News list */}
      {news.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-10 rounded-xl gap-2"
          style={{
            background: "hsl(var(--surface-raised))",
            border:     "1px dashed hsl(var(--border-token))",
          }}
        >
          <Newspaper className="w-6 h-6" style={{ color: "hsl(var(--foreground-tertiary))" }} />
          <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
            No news for active holdings
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: "300px" }}>
          {news.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl p-3.5 transition-colors duration-150 news-item-hover"
              style={{
                background: "hsl(var(--surface-raised))",
                border:     "1px solid hsl(var(--border-token))",
              }}
            >
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium leading-snug block mb-2"
                style={{ color: "hsl(var(--foreground))" }}
              >
                {item.title}
              </a>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}
                >
                  {item.publisher}
                </span>
                <div
                  className="flex items-center gap-1 text-xs"
                  style={{ color: "hsl(var(--foreground-tertiary))" }}
                >
                  <span style={{ fontFamily: "Geist Mono", fontSize: 10 }}>
                    {item.providerPublishTime}
                  </span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}