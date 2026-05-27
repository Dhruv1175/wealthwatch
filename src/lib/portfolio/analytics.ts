

interface CashFlow {
  date:   Date;
  amount: number;
}

export function calculateXIRR(cashFlows: CashFlow[]): number | null {
  if (cashFlows.length < 2) return null;

  // Verify we have at least one negative (investment) and one positive (return)
  const hasNegative = cashFlows.some((cf) => cf.amount < 0);
  const hasPositive = cashFlows.some((cf) => cf.amount > 0);
  if (!hasNegative || !hasPositive) return null;

  // Use the first cash flow date as the base date (day 0)
  const baseDate  = cashFlows[0].date.getTime();
  const DAYS_YEAR = 365;

  // NPV function: sum of amount / (1 + rate)^(days/365)
  function npv(rate: number): number {
    return cashFlows.reduce((sum, cf) => {
      const days = (cf.date.getTime() - baseDate) / (1000 * 60 * 60 * 24);
      return sum + cf.amount / Math.pow(1 + rate, days / DAYS_YEAR);
    }, 0);
  }

  // NPV derivative for Newton-Raphson
  function npvDerivative(rate: number): number {
    return cashFlows.reduce((sum, cf) => {
      const days = (cf.date.getTime() - baseDate) / (1000 * 60 * 60 * 24);
      const t    = days / DAYS_YEAR;
      return sum - (t * cf.amount) / Math.pow(1 + rate, t + 1);
    }, 0);
  }

  // Newton-Raphson iteration
  let rate    = 0.1; // Starting guess: 10%
  const MAX_ITER = 100;
  const TOLERANCE = 1e-7;

  for (let i = 0; i < MAX_ITER; i++) {
    const npvVal  = npv(rate);
    const npvDeriv = npvDerivative(rate);

    if (Math.abs(npvDeriv) < 1e-12) break; // Avoid division by near-zero

    const newRate = rate - npvVal / npvDeriv;

    if (Math.abs(newRate - rate) < TOLERANCE) {
      return parseFloat((newRate * 100).toFixed(2)); // Return as percentage
    }

    rate = newRate;

    // Clamp to prevent divergence
    if (rate < -0.999) rate = -0.999;
    if (rate > 100)    rate = 100;
  }

  return null; // Did not converge
}

// ── Allocation analysis ────────────────────────────────────────────────────────
export interface AllocationBreakdown {
  byType:   { label: string; value: number; percentage: number }[];
  byCurrency: { label: string; value: number; percentage: number }[];
  concentration: {
    topHolding:       string;
    topHoldingWeight: number; // % of total portfolio
    isConcentrated:   boolean; // >30% in one holding is a risk flag
  };
}

export function analyzeAllocation(
  positions: {
    name:         string;
    type:         string;
    currentValue: number;
    currency?:    string;
  }[]
): AllocationBreakdown {
  const total = positions.reduce((s, p) => s + p.currentValue, 0);
  if (total === 0) return { byType: [], byCurrency: [], concentration: { topHolding: "", topHoldingWeight: 0, isConcentrated: false } };

  // By asset type
  const typeMap: Record<string, number> = {};
  for (const p of positions) {
    const key = formatAssetType(p.type);
    typeMap[key] = (typeMap[key] ?? 0) + p.currentValue;
  }
  const byType = Object.entries(typeMap)
    .map(([label, value]) => ({ label, value, percentage: parseFloat(((value / total) * 100).toFixed(1)) }))
    .sort((a, b) => b.value - a.value);

  // By currency
  const currencyMap: Record<string, number> = {};
  for (const p of positions) {
    const key = p.currency ?? "INR";
    currencyMap[key] = (currencyMap[key] ?? 0) + p.currentValue;
  }
  const byCurrency = Object.entries(currencyMap)
    .map(([label, value]) => ({ label, value, percentage: parseFloat(((value / total) * 100).toFixed(1)) }))
    .sort((a, b) => b.value - a.value);

  // Concentration risk
  const sortedByValue = [...positions].sort((a, b) => b.currentValue - a.currentValue);
  const topHolding    = sortedByValue[0];
  const topWeight     = topHolding ? (topHolding.currentValue / total) * 100 : 0;

  return {
    byType,
    byCurrency,
    concentration: {
      topHolding:       topHolding?.name ?? "",
      topHoldingWeight: parseFloat(topWeight.toFixed(1)),
      isConcentrated:   topWeight > 30,
    },
  };
}

// ── Portfolio health score ─────────────────────────────────────────────────────
// Returns a 0–100 score based on diversification, XIRR, and concentration.
export interface HealthScore {
  score:        number;        // 0–100
  grade:        "A" | "B" | "C" | "D" | "F";
  factors: {
    diversification: number;   // 0–25
    returns:         number;   // 0–25
    riskBalance:     number;   // 0–25
    consistency:     number;   // 0–25
  };
  flags: string[];             // Human-readable issues
}

export function calculateHealthScore(params: {
  positions:   { type: string; currentValue: number; name: string }[];
  xirr:        number | null;
  totalPnl:    number;
  totalCost:   number;
}): HealthScore {
  const { positions, xirr, totalPnl, totalCost } = params;
  const flags: string[] = [];
  let diversification = 0;
  let returns         = 0;
  let riskBalance     = 0;
  let consistency     = 0;

  // ── Diversification (0–25) ────────────────────────────────────────────────
  const uniqueTypes = new Set(positions.map((p) => p.type)).size;
  diversification   = Math.min(25, uniqueTypes * 5);
  if (positions.length < 3) flags.push("Portfolio has fewer than 3 positions — consider diversifying.");
  if (uniqueTypes === 1)    flags.push("All assets are in one asset class — concentration risk.");

  // ── Returns (0–25) ────────────────────────────────────────────────────────
  if (xirr !== null) {
    if (xirr >= 15)       returns = 25;
    else if (xirr >= 12)  returns = 20;
    else if (xirr >= 8)   returns = 15;
    else if (xirr >= 4)   returns = 8;
    else if (xirr >= 0)   returns = 4;
    else {
      returns = 0;
      flags.push("Portfolio XIRR is negative — review underperforming holdings.");
    }
  } else {
    returns = 10; // Neutral if XIRR not computable
  }

  // ── Risk balance (0–25) ───────────────────────────────────────────────────
  const total      = positions.reduce((s, p) => s + p.currentValue, 0);
  const maxWeight  = total > 0
    ? Math.max(...positions.map((p) => (p.currentValue / total) * 100))
    : 0;

  if (maxWeight < 25)      riskBalance = 25;
  else if (maxWeight < 35) riskBalance = 18;
  else if (maxWeight < 50) { riskBalance = 10; flags.push("Single holding exceeds 35% of portfolio."); }
  else                     { riskBalance = 0;  flags.push("Single holding exceeds 50% of portfolio — high concentration risk."); }

  // ── Consistency (0–25) — based on overall P&L ratio ──────────────────────
  const pnlRatio = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  if (pnlRatio >= 20)      consistency = 25;
  else if (pnlRatio >= 10) consistency = 20;
  else if (pnlRatio >= 0)  consistency = 15;
  else                     { consistency = 5; flags.push("Overall portfolio is in loss territory."); }

  const score = diversification + returns + riskBalance + consistency;
  const grade =
    score >= 85 ? "A" :
    score >= 70 ? "B" :
    score >= 55 ? "C" :
    score >= 40 ? "D" : "F";

  return {
    score,
    grade,
    factors: { diversification, returns, riskBalance, consistency },
    flags,
  };
}

// ── Tax summary ────────────────────────────────────────────────────────────────
export interface TaxSummary {
  shortTermGains: number;
  shortTermLoss:  number;
  longTermGains:  number;
  longTermLoss:   number;
  harvestableSTCL: number; // Unrealised STCL that could be harvested
  harvestableLTCL: number; // Unrealised LTCL that could be harvested
  estimatedSTCGTax: number; // At 20% flat rate (post-2024 budget)
  estimatedLTCGTax: number; // At 12.5% above ₹1.25L exemption (post-2024 budget)
}

export function calculateTaxSummary(
  positions: {
    currentValue:  number;
    costBasis:     number;
    purchaseDate:  Date;
    type:          string;
  }[]
): TaxSummary {
  const now = new Date();
  let stcg = 0, stcl = 0, ltcg = 0, ltcl = 0;
  let harvestableSTCL = 0, harvestableLTCL = 0;

  for (const pos of positions) {
    const holdingDays = (now.getTime() - pos.purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
    const gain        = pos.currentValue - pos.costBasis;

    // Equity/ETF: LTCG if held > 1 year; Debt/FD: > 3 years
    const ltcgThreshold = ["BOND", "FIXED_DEPOSIT", "RECURRING_DEPOSIT"].includes(pos.type)
      ? 1095 // 3 years
      : 365; // 1 year for equity

    const isLongTerm = holdingDays >= ltcgThreshold;

    if (gain > 0) {
      if (isLongTerm) ltcg += gain;
      else            stcg += gain;
    } else {
      const loss = Math.abs(gain);
      if (isLongTerm) { ltcl += loss; harvestableLTCL += loss; }
      else            { stcl += loss; harvestableSTCL += loss; }
    }
  }

  // Post-budget 2024 rates: STCG 20%, LTCG 12.5% above ₹1.25L exemption
  const LTCG_EXEMPTION   = 125000;
  const taxableSTCG      = Math.max(0, stcg - stcl);          // Net STCG
  const taxableLTCG      = Math.max(0, ltcg - ltcl - LTCG_EXEMPTION); // After exemption

  return {
    shortTermGains:   parseFloat(stcg.toFixed(2)),
    shortTermLoss:    parseFloat(stcl.toFixed(2)),
    longTermGains:    parseFloat(ltcg.toFixed(2)),
    longTermLoss:     parseFloat(ltcl.toFixed(2)),
    harvestableSTCL:  parseFloat(harvestableSTCL.toFixed(2)),
    harvestableLTCL:  parseFloat(harvestableLTCL.toFixed(2)),
    estimatedSTCGTax: parseFloat((taxableSTCG * 0.20).toFixed(2)),
    estimatedLTCGTax: parseFloat((Math.max(0, taxableLTCG) * 0.125).toFixed(2)),
  };
}

// ── Utility ────────────────────────────────────────────────────────────────────
function formatAssetType(type: string): string {
  const map: Record<string, string> = {
    EQUITY_STOCK:        "Equity",
    SIP_MUTUAL_FUND:     "Mutual Fund (SIP)",
    MUTUAL_FUND_LUMPSUM: "Mutual Fund",
    ETF:                 "ETF",
    BOND:                "Bonds",
    FIXED_DEPOSIT:       "Fixed Deposit",
    RECURRING_DEPOSIT:   "Recurring Deposit",
    GOLD:                "Gold",
    CRYPTO:              "Crypto",
    PPF:                 "PPF",
    EPF:                 "EPF",
    NPS:                 "NPS",
    REAL_ESTATE:         "Real Estate",
    US_STOCK:            "US Equity",
    OTHER:               "Other",
  };
  return map[type] ?? type;
}