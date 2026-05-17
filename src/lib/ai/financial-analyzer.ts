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
  label: string; // Day name, Date string, or Month string depending on scaling
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

    // 1. Calculate precise lookback date boundaries
    if (timeframe === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    // Pull transactions within the chosen time window
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });

    if (transactions.length === 0) return null;

    // 2. Compute Primary Aggregations & Categorical Matrix
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

    // 3. Statistical Outlier Detection using the Interquartile Range (IQR) Rule
    // Anomaly threshold = Q3 + (1.5 * IQR). Perfect for highlighting erratic spending blocks.
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

    // 4. Temporal Trend Mapping & Adaptive Scaling Label Generation
    const trendMap: Record<string, { spent: number; earned: number }> = {};

    transactions.forEach((tx) => {
      let label = "";
      const d = tx.date;

      if (timeframe === "week") {
        label = d.toLocaleDateString("en-IN", { weekday: "short" }); // e.g., "Mon", "Tue"
      } else if (timeframe === "month") {
        label = `${d.getDate()} ${d.toLocaleDateString("en-IN", { month: "short" })}`; // e.g., "12 Apr"
      } else {
        label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }); // e.g., "Apr 26"
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

    // 5. Deep-Reasoning Strategic LLM Evaluation
    const dynamicAnalysisPrompt = `
      You are the ultimate automated financial intelligence director for WealthWatch.
      Analyze the user's spending telemetry for the following explicit timeframe window: ${timeframe.toUpperCase()}.
      
      STATISTICAL PROFILE DATA:
      - Scope Context: ${timeframe.toUpperCase()} Lookback View
      - Gross Income (Credits): ₹${totalCredit.toFixed(2)}
      - Gross Spending (Debits): ₹${totalDebit.toFixed(2)}
      - Burn Velocity Ratio: ${burnRatePercentage.toFixed(1)}% of capital consumed this period.
      - Sector Inefficiency Breakdown: ${JSON.stringify(categoriesMap)}
      - Detected Outliers/Anomalies: ${JSON.stringify(outliers)}
      
      CRITICAL ADVISORY MANDATE:
      Provide a highly rigorous, specific, and macro-aware financial health critique based on the specified timeframe.
      - If evaluating a WEEK, focus on tactical, micro-spending traps, behavioral adjustments, and instant balance corrections.
      - If evaluating a MONTH, focus on systemic leaking subscription patterns, fixed overhead structural adjustments, and variance analysis.
      - If evaluating a YEAR, focus on long-term compound growth trajectories, macro asset allocations, structural income scaling metrics, and big-ticket capital anomalies.
      
      OUTPUT FORMAT CONTRACT:
      Generate exactly three concise, dense sections:
      ### 1. Temporal Health Diagnosis
      [Detailed critique of their burn velocity ratio specifically inside this ${timeframe} scope]
      
      ### 2. Anomaly & Outlier Assessment
      [Critique of their specific transaction outliers or warning patterns if non-essential spikes are present]
      
      ### 3. Tactical Wealth Capital Allocation
      [Precision high-yield wealth strategies, indicating how to lower spending variables or redirect liquidity into compounding vectors]

      Do not include generic prefaces, conversational intros, filler phrasing, or markdown code blocks.
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