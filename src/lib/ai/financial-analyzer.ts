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
}

/**
 * OPTIMIZATION: Computes numerical aggregates instantly via DB-level functions.
 * Execution target: < 15ms.
 */
export async function generateAdvancedSummary(userId: string, timeframe: Timeframe): Promise<AdvancedAnalysisReport | null> {
  try {
    // Dynamic Anchor Point Discovery based on newest statement data
    const latestTransaction = await prisma.transaction.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
    });

    if (!latestTransaction) return null;

    const anchorDate = new Date(latestTransaction.date);
    const startDate = new Date(anchorDate);

    if (timeframe === "week") {
      startDate.setDate(anchorDate.getDate() - 7);
    } else if (timeframe === "month") {
      startDate.setMonth(anchorDate.getMonth() - 1);
    } else if (timeframe === "year") {
      startDate.setFullYear(anchorDate.getFullYear() - 1);
    }

    // Parallel execution of native database aggregations
    const [creditAggregation, debitAggregation, categoryGroupings, transactions] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, date: { gte: startDate, lte: anchorDate }, amount: { gt: 0 } },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { userId, date: { gte: startDate, lte: anchorDate }, amount: { lt: 0 } },
        _sum: { amount: true }
      }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: { userId, date: { gte: startDate, lte: anchorDate }, amount: { lt: 0 } },
        _sum: { amount: true }
      }),
      prisma.transaction.findMany({
        where: { userId, date: { gte: startDate, lte: anchorDate } },
        orderBy: { date: "asc" }
      })
    ]);

    if (transactions.length === 0) return null;

    const totalCredit = creditAggregation._sum.amount || 0;
    const totalDebit = Math.abs(debitAggregation._sum.amount || 0);
    const burnRatePercentage = totalCredit > 0 ? (totalDebit / totalCredit) * 100 : 100;

    const categoryBreakdown = categoryGroupings.map((group) => ({
      name: group.category || "UNASSIGNED",
      value: parseFloat(Math.abs(group._sum.amount || 0).toFixed(2)),
    }));

    const allDebits: number[] = [];
    const trendMap: Record<string, { spent: number; earned: number }> = {};

    transactions.forEach((tx) => {
      if (tx.amount < 0) allDebits.push(Math.abs(tx.amount));

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

    // Statistical IQR Outlier Detection
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

    const trendData: TrendNode[] = Object.entries(trendMap).map(([label, data]) => ({
      label,
      spent: parseFloat(data.spent.toFixed(2)),
      earned: parseFloat(data.earned.toFixed(2)),
    }));

    return {
      timeframe,
      totalCredit,
      totalDebit,
      burnRatePercentage,
      categoryBreakdown,
      trendData,
      outliers,
    };
  } catch (error) {
    console.error("Advanced Analytics Core Breakdown:", error);
    throw error;
  }
}

export async function fetchAiAdviceOnly(profileData: {
  timeframe: string;
  totalCredit: number;
  totalDebit: number;
  burnRatePercentage: number;
  outliers: any[];
  activeInvestments: any[];
}): Promise<string> {
  try {
    const dynamicAnalysisPrompt = `
      You are the Chief Investment Officer and elite wealth director engine for WealthWatch.
      Analyze the user's micro cash flow alongside their live asset allocations for the ${profileData.timeframe.toUpperCase()} timeframe.
      
      CASH FLOW PROFILE DATA:
      - Scope Perimeter: ${profileData.timeframe.toUpperCase()} Lookback Window View
      - Total Cash Inflow (Credits): ₹${profileData.totalCredit.toFixed(2)}
      - Total Cash Outflow (Debits): ₹${profileData.totalDebit.toFixed(2)}
      - Cash Burn Velocity: ${profileData.burnRatePercentage.toFixed(1)}% of capital consumed.
      - Core Expense Anomalies/Outliers: ${JSON.stringify(profileData.outliers)}
      
      INVESTMENT PORTFOLIO MATRICES:
      - Current Asset Holdings Ledger: ${JSON.stringify(profileData.activeInvestments)}

      OUTPUT FORMAT CONTRACT:
      Generate exactly three concise, dense sections starting with markdown headers:
      ### 1. Temporal Health Diagnosis
      ### 2. Portfolio Optimization & Rebalancing
      ### 3. High-Yield Capital Allocation
      Do not include conversational intros or code blocks.
    `;

    const aiResponse = await groq.chat.completions.create({
      messages: [{ role: "system", content: dynamicAnalysisPrompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });

    return aiResponse.choices[0]?.message?.content || "Unable to synthesize structural trend metrics.";
  } catch (err) {
    console.error("Delayed AI streaming loop fault:", err);
    return "The financial intelligence director is temporarily offline.";
  }
}