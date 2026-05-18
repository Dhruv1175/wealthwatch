import prisma from "@/lib/db";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export type Timeframe = "week" | "month" | "year";

interface OutlierNode {
  id: string;
  date: string;
  description: string;
  amount: number;
  reason: string;
}

interface TrendNode {
  label: string; 
  spent: number;
  earned: number;
}

interface AdvancedAnalysisReport {
  timeframe: Timeframe;
  totalCredit: number;
  totalDebit: number;
  burnRatePercentage: number;
  categoryBreakdown: { name: string; value: number }[];
  trendData: TrendNode[];
  outliers: OutlierNode[];
  deepAdvice: string;
}

export async function generateAdvancedSummary(userId: string, timeframe: Timeframe): Promise<AdvancedAnalysisReport | null> {
  try {
    const now = new Date();
    let startDate = new Date();
    if (timeframe === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });
    const activeInvestments = await prisma.investment.findMany({ where: { userId } });

    if (transactions.length === 0) return null;


    let totalCredit = 0;
    let totalDebit = 0;
    const categoriesMap: Record<string, number> = {};
    const allDebits: number[] = [];

    transactions.forEach((tx) => {
      const amt = tx.amount;
      if (amt > 0) {
        totalCredit += amt;
      } else {
        const absAmt = Math.abs(amt);
        totalDebit += absAmt;
        allDebits.push(absAmt);
        const cat = tx.category || "UNASSIGNED";
        categoriesMap[cat] = (categoriesMap[cat] || 0) + absAmt;
      }
    });

    const categoryBreakdown = Object.entries(categoriesMap).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));

    const burnRatePercentage = totalCredit > 0 ? (totalDebit / totalCredit) * 100 : 100;

    const outliers: OutlierNode[] = [];
    if (allDebits.length > 0) {
      const sortedDebits = [...allDebits].sort((a, b) => a - b);
      const q1 = sortedDebits[Math.floor(sortedDebits.length * 0.25)];
      const q3 = sortedDebits[Math.floor(sortedDebits.length * 0.75)];
      const iqr = q3 - q1;
      const outlierThreshold = q3 + 1.5 * iqr;

      transactions.forEach((tx) => {
        if (tx.amount < 0 && Math.abs(tx.amount) > outlierThreshold) {
          outliers.push({
            id: tx.id,
            date: tx.date.toISOString().split("T")[0],
            description: tx.description,
            amount: Math.abs(tx.amount),
            reason: `Exceeded local deviation margin (Threshold: ₹${outlierThreshold.toFixed(0)})`,
          });
        }
      });
    }
    const trendMap: Record<string, { spent: number; earned: number }> = {};

    transactions.forEach((tx) => {
      let label = "";
      const d = tx.date;

      if (timeframe === "week") {
        label = d.toLocaleDateString("en-IN", { weekday: "short" }); 
      } else if (timeframe === "month") {
        label = `${d.getDate()} ${d.toLocaleDateString("en-IN", { month: "short" })}`; 
      } else {
        label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }); 
      }

      if (!trendMap[label]) trendMap[label] = { spent: 0, earned: 0 };
      if (tx.amount > 0) {
        trendMap[label].earned += tx.amount;
      } else {
        trendMap[label].spent += Math.abs(tx.amount);
      }
    });

    const trendData: TrendNode[] = Object.entries(trendMap).map(([label, data]) => ({
      label,
      spent: parseFloat(data.spent.toFixed(2)),
      earned: parseFloat(data.earned.toFixed(2)),
    }));

    const dynamicAnalysisPrompt = `
  You are the Chief Investment Officer and elite wealth director engine for WealthWatch.
  Analyze the user's micro cash flow alongside their live asset allocations for the ${timeframe.toUpperCase()} timeframe.
  
  CASH FLOW PROFILE DATA:
  - Scope Perimeter: ${timeframe.toUpperCase()} Lookback Window View
  - Total Cash Inflow (Credits): ₹${totalCredit.toFixed(2)}
  - Total Cash Outflow (Debits): ₹${totalDebit.toFixed(2)}
  - Cash Burn Velocity: ${burnRatePercentage.toFixed(1)}% of capital consumed.
  - Core Expense Anomalies/Outliers: ${JSON.stringify(outliers)}
  
  INVESTMENT PORTFOLIO MATRICES:
  - Current Asset Holdings Ledger: ${JSON.stringify(activeInvestments.map(i => ({ symbol: i.symbol, name: i.name, type: i.type, totalCost: i.sharesOwned * i.avgBuyPrice })))}

  CRITICAL STRATEGIC MANDATE:
  Synthesize a comprehensive wealth critique matching their temporal constraints:
  - If evaluating a WEEK: Focus on instant capital preservation, cutting cash leakages, and routing immediate micro-surpluses directly into their active investments.
  - If evaluating a MONTH: Evaluate their monthly recurring SIP impact against their monthly income pools. Advise whether they can safely ramp up SIP allocations or if they need to protect cash reserves.
  - If evaluating a YEAR: Focus on macro financial freedom trajectories, capital asset growth, rebalancing equity risk profiles, and wealth compounding targets.
  
  OUTPUT FORMAT CONTRACT:
  Generate exactly three concise, dense sections:
  ### 1. Temporal Health Diagnosis
  [Critique of cash flow burn velocity and liquidity health]
  
  ### 2. Portfolio Optimization & Rebalancing
  [Explicit tactical advice regarding their active Equity/SIP holdings based on their current cash-flow baseline]
  
  ### 3. High-Yield Capital Allocation
  [Precision wealth growth playbook outlining how to safely compound cash lines into long-term assets]

  Do not include generic prefaces, conversational fillers, or markdown code blocks.
`;

    const aiResponse = await groq.chat.completions.create({
      messages: [{ role: "system", content: dynamicAnalysisPrompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2, // Low temperature for consistent financial logic stability
    });

    const deepAdvice = aiResponse.choices[0]?.message?.content || "Unable to synthesize structural trend metrics.";

    return {
      timeframe,
      totalCredit,
      totalDebit,
      burnRatePercentage,
      categoryBreakdown,
      trendData,
      outliers,
      deepAdvice,
    };
  } catch (error) {
    console.error("Advanced Analytics Core Breakdown:", error);
    throw error;
  }
}