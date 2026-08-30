import YahooFinance from "yahoo-finance2"; 
import prisma from "@/lib/db";

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface AssetPosition {
  id: string;
  symbol: string;
  name: string;
  type: string ;
  sharesOwned: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  profitOrLoss: number;
  pnlPercentage: number;
  sipReminderDue: boolean;
}
export interface CommodityPosition {
  symbol: string;
  name: string;
  priceUSD: number;
  priceINR: number;
  changeUSD: number;
  changePercentage: number;
}
export interface NewsNode {
  title: string;
  link: string;
  publisher: string;
  providerPublishTime: string;
}
export async function getTrackedInvestments(userId: string): Promise<{ positions: AssetPosition[]; totalValue: number; totalPnl: number; sipReminders: string[] }> {
  const investments = await prisma.investment.findMany({ where: { userId } });
  if (investments.length === 0) return { positions: [], totalValue: 0, totalPnl: 0, sipReminders: [] };

  const currentDay = new Date().getDate();
  const positions: AssetPosition[] = [];
  const sipReminders: string[] = [];
  let totalValue = 0;
  let totalPnl = 0;
  type DynamicAssetType = (typeof investments)[number];
  await Promise.all(
    investments.map(async (asset: DynamicAssetType) => {
      try {
        const nonMarketTypes = [
          "FIXED_DEPOSIT", "RECURRING_DEPOSIT", "PPF", "EPF", "NPS", 
          "REAL_ESTATE", "GOLD", "OTHER"
        ];
        const isNonMarket = nonMarketTypes.includes(asset.type) || asset.symbol.includes("_");

        let currentPrice = (asset.currentMarketValue && asset.currentMarketValue > 0)
          ? (asset.sharesOwned > 0 ? asset.currentMarketValue / asset.sharesOwned : asset.currentMarketValue)
          : asset.avgBuyPrice;

        if (!isNonMarket) {
          try {
            const quote = await yahooFinance.quote(asset.symbol) as any;
            if (quote) {
              currentPrice = 
                quote.regularMarketPrice || 
                quote.nav || 
                quote.regularMarketPreviousClose || 
                currentPrice;
            }
          } catch {
            // Quietly fall back to avgBuyPrice/currentMarketValue if symbol is not on Yahoo Finance
          }
        }

        const totalCost = asset.sharesOwned * asset.avgBuyPrice;
        const currentValue = asset.sharesOwned * currentPrice;
        const profitOrLoss = currentValue - totalCost;
        const pnlPercentage = totalCost > 0 ? (profitOrLoss / totalCost) * 100 : 0;

        let sipReminderDue = false;
        if (asset.type === "SIP_MUTUAL_FUND" && asset.sipDay) {
          if (currentDay >= asset.sipDay - 2 && currentDay <= asset.sipDay) {
            sipReminderDue = true;
            sipReminders.push(`Your recurring SIP for ${asset.name} (₹${asset.sipAmount}) is due on the ${asset.sipDay}th.`);
          }
        }

        totalValue += currentValue;
        totalPnl += profitOrLoss;

        positions.push({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          sharesOwned: asset.sharesOwned,
          avgBuyPrice: asset.avgBuyPrice,
          currentPrice,
          totalCost,
          currentValue,
          profitOrLoss,
          pnlPercentage,
          sipReminderDue,
        });
      } catch (err) {
        console.error(`Error processing investment position ${asset.symbol}:`, err);
        const totalCost = asset.sharesOwned * asset.avgBuyPrice;
        positions.push({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          sharesOwned: asset.sharesOwned,
          avgBuyPrice: asset.avgBuyPrice,
          currentPrice: asset.avgBuyPrice,
          totalCost,
          currentValue: totalCost,
          profitOrLoss: 0,
          pnlPercentage: 0,
          sipReminderDue: false,
        });
      }
    })
  );

  return { positions, totalValue, totalPnl, sipReminders };
}

export async function getMacroCommodities(): Promise<{ commodities: CommodityPosition[]; usdInrRate: number }> {
  const targets = [
    { ticker: "GC=F", name: "Gold Futures (per oz)" },
    { ticker: "CL=F", name: "Crude Oil WTI (per bbl)" }
  ];

  try {
    // Concurrently fetch commodity data AND the live currency translation multiplier loop
    const [forexQuote, ...commodityQuotes] = await Promise.all([
      yahooFinance.quote("USDINR=X"),
      ...targets.map(t => yahooFinance.quote(t.ticker))
    ]);

    // Live translation multiplier fallback anchor if network state dips
    const usdInrRate = forexQuote?.regularMarketPrice || 83.50; 

    const commodities = targets.map((target, index:number) => {
      const quote = commodityQuotes[index];
      const priceUSD = quote?.regularMarketPrice || quote?.regularMarketPreviousClose || 0;
      const changeUSD = quote?.regularMarketChange || 0;
      const changePercentage = quote?.regularMarketChangePercent || 0;
      
      return {
        symbol: target.ticker,
        name: target.name,
        priceUSD,
        priceINR: priceUSD * usdInrRate, // Atomic server-side conversion mapping
        changeUSD,
        changePercentage
      };
    });

    return { commodities, usdInrRate };
  } catch (err) {
    console.error("Forex conversion pipeline asset breakdown:", err);
    return { 
      commodities: targets.map(t => ({ symbol: t.ticker, name: t.name, priceUSD: 0, priceINR: 0, changeUSD: 0, changePercentage: 0 })), 
      usdInrRate: 83.50 
    };
  }
}
export async function getPortfolioNews(symbols: string[]): Promise<NewsNode[]> {
  if (!symbols || symbols.length === 0) {
    // Fallback to macro indices news if user has no tickers added yet
    symbols = ["RELIANCE.NS", "TCS.NS"];
  }

  try {
    // Querying the primary holding ticker returns a clean news array payload
    const data = await yahooFinance.search(symbols[0], { newsCount: 4 },{
      validateResult:false
    }) as any;
    
    return (data.news || []).map((item: any) => ({
      title: item.title,
      link: item.link,
      publisher: item.publisher || "Market Wire",
      providerPublishTime: new Date(item.providerPublishTime).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      })
    }));
  } catch (err) {
    console.error("Failed to parse market news context elements:", err);
    return [];
  }
}