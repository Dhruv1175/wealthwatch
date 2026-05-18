import YahooFinance from "yahoo-finance2"; 
import prisma from "@/lib/db";

const yahooFinance = new YahooFinance();

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