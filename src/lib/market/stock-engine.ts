import YahooFinance from "yahoo-finance2"; 
import prisma from "@/lib/db";

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface AssetPosition {
  id: string;
  symbol: string;
  name: string;
  type: "EQUITY_STOCK" | "SIP_MUTUAL_FUND";
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

  await Promise.all(
    investments.map(async (asset) => {
      try {
        // Query the free live price feed matrix
        const quote = await yahooFinance.quote(asset.symbol);
        
        // DEFENSIVE CHECK: Fallback to avgBuyPrice if Yahoo returns undefined for the ticker
        let currentPrice = asset.avgBuyPrice;

        if (quote) {
          // Indian mutual funds (.BO) often use 'regularMarketPrice' or 'nav' 
          // Direct equities (.NS) use 'regularMarketPrice' or 'regularMarketPreviousClose' during weekends/holidays
          currentPrice = 
            quote.regularMarketPrice || 
            (quote as any).nav || 
            quote.regularMarketPreviousClose || 
            asset.avgBuyPrice;
        } else {
          console.warn(`Yahoo Finance returned an empty quote object for symbol: ${asset.symbol}`);
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
        // CATCH-ALL: Prevent an single unparseable ticker from crashing the entire user dashboard query loop
        console.error(`Market feed failed to resolve ticker symbol: ${asset.symbol}. Using buy price fallback.`, err);
        
        const totalCost = asset.sharesOwned * asset.avgBuyPrice;
        positions.push({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          sharesOwned: asset.sharesOwned,
          avgBuyPrice: asset.avgBuyPrice,
          currentPrice: asset.avgBuyPrice, // Fallback safely to prevent crashing the UI
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

    const commodities = targets.map((target, index) => {
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
    });
    
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