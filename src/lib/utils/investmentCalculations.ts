// src/lib/utils/investmentCalculations.ts
// Client-side financial calculations for all investment types.
// All functions are pure — no side effects, no API calls.

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CalculationResult {
  investedAmount:   number;  // Total capital deployed
  currentValue:     number;  // Value today (or at current point in time)
  maturityValue:    number;  // Expected value at maturity / end of term
  profit:           number;  // currentValue - investedAmount
  maturityProfit:   number;  // maturityValue - investedAmount
  pnlPercentage:    number;  // profit / investedAmount * 100
  maturityPct:      number;  // maturityProfit / investedAmount * 100
  annualizedReturn: number;  // CAGR %
  daysElapsed:      number;
  daysRemaining:    number;
  isMatured:        boolean;
  breakdown:        BreakdownItem[];
}

export interface BreakdownItem {
  label: string;
  value: number;
}

export interface SIPProjection {
  investedAmount:   number;
  estimatedValue:   number;
  estimatedProfit:  number;
  pnlPercentage:    number;
  monthlyData:      { month: number; invested: number; value: number }[];
}

// ── Helper: days between two dates ────────────────────────────────────────────
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Helper: years (fractional) between two dates ──────────────────────────────
function yearsBetween(a: Date, b: Date): number {
  return daysBetween(a, b) / 365;
}

// ── FD / RD / Bond: compound interest ─────────────────────────────────────────
// Formula: A = P × (1 + r/n)^(n×t)
// Standard Indian bank FDs compound quarterly (n=4)
export function calculateFD(params: {
  principal:    number;   // ₹ deposited
  annualRate:   number;   // e.g. 7.25 for 7.25%
  startDate:    Date;
  maturityDate: Date;
  compoundFreq?: number;  // times per year: 4=quarterly (default), 12=monthly, 1=annual
}): CalculationResult {
  const { principal, annualRate, startDate, maturityDate, compoundFreq = 4 } = params;
  const r    = annualRate / 100;
  const n    = compoundFreq;
  const now  = new Date();

  const totalYears    = yearsBetween(startDate, maturityDate);
  const elapsedYears  = Math.min(yearsBetween(startDate, now), totalYears);
  const daysElapsed   = Math.max(0, daysBetween(startDate, now));
  const daysRemaining = Math.max(0, daysBetween(now, maturityDate));
  const isMatured     = now >= maturityDate;

  // Maturity value (full term)
  const maturityValue = principal * Math.pow(1 + r / n, n * totalYears);
  const maturityProfit = maturityValue - principal;

  // Current value (proportional to elapsed time)
  const currentValue  = isMatured
    ? maturityValue
    : principal * Math.pow(1 + r / n, n * elapsedYears);
  const profit        = currentValue - principal;
  const pnlPercentage = (profit / principal) * 100;
  const maturityPct   = (maturityProfit / principal) * 100;

  // Annualized return (CAGR)
  const annualizedReturn =
    elapsedYears > 0
      ? (Math.pow(currentValue / principal, 1 / elapsedYears) - 1) * 100
      : annualRate;

  return {
    investedAmount:   principal,
    currentValue:     parseFloat(currentValue.toFixed(2)),
    maturityValue:    parseFloat(maturityValue.toFixed(2)),
    profit:           parseFloat(profit.toFixed(2)),
    maturityProfit:   parseFloat(maturityProfit.toFixed(2)),
    pnlPercentage:    parseFloat(pnlPercentage.toFixed(2)),
    maturityPct:      parseFloat(maturityPct.toFixed(2)),
    annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
    daysElapsed,
    daysRemaining,
    isMatured,
    breakdown: [
      { label: "Principal",          value: principal },
      { label: "Interest Earned",    value: parseFloat(profit.toFixed(2)) },
      { label: "Maturity Amount",    value: parseFloat(maturityValue.toFixed(2)) },
      { label: "Remaining Interest", value: parseFloat((maturityProfit - profit).toFixed(2)) },
    ],
  };
}

// ── RD: Recurring Deposit ─────────────────────────────────────────────────────
// Each monthly instalment earns compound interest for its remaining term.
// Indian RDs typically compound quarterly.
export function calculateRD(params: {
  monthlyInstalment: number;
  annualRate:        number;
  startDate:         Date;
  maturityDate:      Date;
}): CalculationResult {
  const { monthlyInstalment, annualRate, startDate, maturityDate } = params;
  const r   = annualRate / 100 / 4; // quarterly rate
  const now = new Date();

  const totalMonths   = Math.round(yearsBetween(startDate, maturityDate) * 12);
  const elapsedMonths = Math.min(
    Math.max(0, Math.round(yearsBetween(startDate, now) * 12)),
    totalMonths
  );
  const isMatured    = now >= maturityDate;
  const daysElapsed  = Math.max(0, daysBetween(startDate, now));
  const daysRemaining = Math.max(0, daysBetween(now, maturityDate));

  // Maturity value: sum of each instalment compounded for its remaining period
  let maturityValue = 0;
  for (let month = 1; month <= totalMonths; month++) {
    const quartersRemaining = ((totalMonths - month + 1) / 3);
    maturityValue += monthlyInstalment * Math.pow(1 + r, quartersRemaining);
  }

  const investedAmount = monthlyInstalment * totalMonths;
  const maturityProfit = maturityValue - investedAmount;

  // Current value: instalments paid so far + interest earned
  let currentValue = 0;
  for (let month = 1; month <= elapsedMonths; month++) {
    const quartersElapsed = ((elapsedMonths - month) / 3);
    currentValue += monthlyInstalment * Math.pow(1 + r, quartersElapsed);
  }

  const currentInvested   = monthlyInstalment * elapsedMonths;
  const profit            = currentValue - currentInvested;
  const pnlPercentage     = currentInvested > 0 ? (profit / currentInvested) * 100 : 0;
  const maturityPct       = investedAmount > 0 ? (maturityProfit / investedAmount) * 100 : 0;
  const elapsedYears      = elapsedMonths / 12;
  const annualizedReturn  =
    elapsedYears > 0 && currentInvested > 0
      ? (Math.pow(currentValue / currentInvested, 1 / elapsedYears) - 1) * 100
      : annualRate;

  return {
    investedAmount:   parseFloat(investedAmount.toFixed(2)),
    currentValue:     parseFloat((isMatured ? maturityValue : currentValue).toFixed(2)),
    maturityValue:    parseFloat(maturityValue.toFixed(2)),
    profit:           parseFloat(profit.toFixed(2)),
    maturityProfit:   parseFloat(maturityProfit.toFixed(2)),
    pnlPercentage:    parseFloat(pnlPercentage.toFixed(2)),
    maturityPct:      parseFloat(maturityPct.toFixed(2)),
    annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
    daysElapsed,
    daysRemaining,
    isMatured,
    breakdown: [
      { label: "Total Instalments",  value: parseFloat(currentInvested.toFixed(2)) },
      { label: "Interest Earned",    value: parseFloat(profit.toFixed(2)) },
      { label: "Maturity Amount",    value: parseFloat(maturityValue.toFixed(2)) },
    ],
  };
}

// ── SIP: Systematic Investment Plan ───────────────────────────────────────────
// Future value of SIP: FV = P × [(1 + i)^n - 1] / i × (1 + i)
// where i = monthly rate, n = number of months
// Expected return rate for equity MFs defaults to 12% p.a. if not provided.
export function calculateSIP(params: {
  monthlyAmount:   number;
  annualReturnPct: number;   // expected annual return % (e.g. 12)
  startDate:       Date;
  projectionYears?: number;  // how far to project (default: 10 years)
  currentNAV?:     number;
  purchaseNAV?:    number;
  unitsAccumulated?: number;
}): SIPProjection {
  const {
    monthlyAmount,
    annualReturnPct,
    startDate,
    projectionYears = 10,
    currentNAV,
    purchaseNAV,
    unitsAccumulated,
  } = params;

  const monthlyRate = annualReturnPct / 100 / 12;
  const now         = new Date();
  const elapsedMonths = Math.max(0, Math.round(yearsBetween(startDate, now) * 12));
  const totalMonths   = projectionYears * 12;

  // If we have actual NAV data, use it for current value
  let estimatedValue: number;
  let investedAmount: number;

  if (currentNAV && purchaseNAV && unitsAccumulated) {
    // Real data path: use actual units × current NAV
    investedAmount = unitsAccumulated * purchaseNAV;
    estimatedValue = unitsAccumulated * currentNAV;
  } else {
    // Projection path: assume constant monthly SIP from start to projection end
    const n = Math.min(elapsedMonths, totalMonths);
    investedAmount = monthlyAmount * n;
    estimatedValue = monthlyRate > 0
      ? monthlyAmount * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate) * (1 + monthlyRate)
      : investedAmount;
  }

  const estimatedProfit = estimatedValue - investedAmount;
  const pnlPercentage   = investedAmount > 0 ? (estimatedProfit / investedAmount) * 100 : 0;

  // Build month-by-month projection for chart
  const monthlyData: { month: number; invested: number; value: number }[] = [];
  for (let m = 1; m <= Math.min(totalMonths, 120); m += 3) { // quarterly data points
    const inv = monthlyAmount * m;
    const val = monthlyRate > 0
      ? monthlyAmount * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) * (1 + monthlyRate)
      : inv;
    monthlyData.push({ month: m, invested: parseFloat(inv.toFixed(0)), value: parseFloat(val.toFixed(0)) });
  }

  return {
    investedAmount:  parseFloat(investedAmount.toFixed(2)),
    estimatedValue:  parseFloat(estimatedValue.toFixed(2)),
    estimatedProfit: parseFloat(estimatedProfit.toFixed(2)),
    pnlPercentage:   parseFloat(pnlPercentage.toFixed(2)),
    monthlyData,
  };
}

// ── MF Lumpsum ────────────────────────────────────────────────────────────────
// Simple: units × current NAV vs units × purchase NAV
export function calculateMFLumpsum(params: {
  units:       number;
  purchaseNAV: number;
  currentNAV:  number;
}): { investedAmount: number; currentValue: number; profit: number; pnlPercentage: number } {
  const { units, purchaseNAV, currentNAV } = params;
  const investedAmount = units * purchaseNAV;
  const currentValue   = units * currentNAV;
  const profit         = currentValue - investedAmount;
  const pnlPercentage  = investedAmount > 0 ? (profit / investedAmount) * 100 : 0;
  return {
    investedAmount:  parseFloat(investedAmount.toFixed(2)),
    currentValue:    parseFloat(currentValue.toFixed(2)),
    profit:          parseFloat(profit.toFixed(2)),
    pnlPercentage:   parseFloat(pnlPercentage.toFixed(2)),
  };
}

// ── PPF ───────────────────────────────────────────────────────────────────────
// PPF compounds annually. Current rate: 7.1% p.a.
// Balance grows as: each year's contribution earns interest for remaining years.
export function calculatePPF(params: {
  currentBalance:      number;
  annualContribution:  number;
  startDate:           Date;
  maturityDate:        Date;
  annualRate?:         number;  // default 7.1%
}): CalculationResult {
  const { currentBalance, annualContribution, startDate, maturityDate, annualRate = 7.1 } = params;
  const r   = annualRate / 100;
  const now = new Date();

  const totalYears    = Math.max(1, Math.round(yearsBetween(startDate, maturityDate)));
  const elapsedYears  = Math.min(Math.max(0, yearsBetween(startDate, now)), totalYears);
  const daysElapsed   = Math.max(0, daysBetween(startDate, now));
  const daysRemaining = Math.max(0, daysBetween(now, maturityDate));
  const isMatured     = now >= maturityDate;

  // Project maturity from current balance + future contributions
  const yearsLeft     = Math.max(0, totalYears - elapsedYears);
  const maturityValue =
    currentBalance * Math.pow(1 + r, yearsLeft) +
    annualContribution * ((Math.pow(1 + r, yearsLeft) - 1) / r) * (1 + r);

  const totalInvested = annualContribution * totalYears;
  const maturityProfit = maturityValue - (currentBalance + annualContribution * yearsLeft);

  return {
    investedAmount:   parseFloat((currentBalance).toFixed(2)),
    currentValue:     parseFloat(currentBalance.toFixed(2)),
    maturityValue:    parseFloat(maturityValue.toFixed(2)),
    profit:           0, // PPF shows projected, not realised
    maturityProfit:   parseFloat(maturityProfit.toFixed(2)),
    pnlPercentage:    0,
    maturityPct:      currentBalance > 0 ? parseFloat(((maturityProfit / currentBalance) * 100).toFixed(2)) : 0,
    annualizedReturn: annualRate,
    daysElapsed,
    daysRemaining,
    isMatured,
    breakdown: [
      { label: "Current Balance",      value: currentBalance },
      { label: "Projected Maturity",   value: parseFloat(maturityValue.toFixed(2)) },
      { label: "Projected Interest",   value: parseFloat(maturityProfit.toFixed(2)) },
      { label: "Annual Contribution",  value: annualContribution },
    ],
  };
}

// ── SGB: Sovereign Gold Bond ──────────────────────────────────────────────────
// SGB pays 2.5% p.a. interest on issue price + gold price appreciation
export function calculateSGB(params: {
  units:       number;
  issuePrice:  number;
  currentGoldPrice: number; // per gram (1 unit = 1 gram)
  issueDate:   Date;
  maturityDate: Date;
}): CalculationResult & { interestEarned: number; goldAppreciation: number } {
  const { units, issuePrice, currentGoldPrice, issueDate, maturityDate } = params;
  const INTEREST_RATE = 2.5 / 100; // 2.5% p.a. on issue price
  const now           = new Date();

  const elapsedYears  = Math.max(0, yearsBetween(issueDate, now));
  const totalYears    = yearsBetween(issueDate, maturityDate);
  const daysElapsed   = Math.max(0, daysBetween(issueDate, now));
  const daysRemaining = Math.max(0, daysBetween(now, maturityDate));
  const isMatured     = now >= maturityDate;

  const investedAmount    = units * issuePrice;
  const interestEarned    = investedAmount * INTEREST_RATE * elapsedYears;
  const currentGoldValue  = units * currentGoldPrice;
  const goldAppreciation  = currentGoldValue - investedAmount;
  const currentValue      = currentGoldValue + interestEarned;
  const profit            = currentValue - investedAmount;
  const pnlPercentage     = (profit / investedAmount) * 100;

  // Maturity: gold price assumed to continue at current rate (simple projection)
  const goldCAGR        = elapsedYears > 0
    ? (Math.pow(currentGoldPrice / issuePrice, 1 / elapsedYears) - 1)
    : 0.08; // 8% default if no elapsed time
  const maturityGoldPrice = issuePrice * Math.pow(1 + goldCAGR, totalYears);
  const maturityValue     = units * maturityGoldPrice + investedAmount * INTEREST_RATE * totalYears;
  const maturityProfit    = maturityValue - investedAmount;

  return {
    investedAmount:   parseFloat(investedAmount.toFixed(2)),
    currentValue:     parseFloat(currentValue.toFixed(2)),
    maturityValue:    parseFloat(maturityValue.toFixed(2)),
    profit:           parseFloat(profit.toFixed(2)),
    maturityProfit:   parseFloat(maturityProfit.toFixed(2)),
    pnlPercentage:    parseFloat(pnlPercentage.toFixed(2)),
    maturityPct:      parseFloat((maturityProfit / investedAmount * 100).toFixed(2)),
    annualizedReturn: parseFloat(((Math.pow(currentValue / investedAmount, 1 / Math.max(elapsedYears, 0.01)) - 1) * 100).toFixed(2)),
    daysElapsed,
    daysRemaining,
    isMatured,
    interestEarned:    parseFloat(interestEarned.toFixed(2)),
    goldAppreciation:  parseFloat(goldAppreciation.toFixed(2)),
    breakdown: [
      { label: "Issue Value",         value: investedAmount },
      { label: "Gold Appreciation",   value: parseFloat(goldAppreciation.toFixed(2)) },
      { label: "Interest (2.5% p.a.)", value: parseFloat(interestEarned.toFixed(2)) },
      { label: "Current Value",       value: parseFloat(currentValue.toFixed(2)) },
    ],
  };
}

// ── Live preview for the add form ─────────────────────────────────────────────
// Called as the user types to show projected returns before saving.
export interface LivePreview {
  investedAmount: number;
  currentValue:   number;
  maturityValue:  number;
  profit:         number;
  maturityProfit: number;
  pnlPct:         number;
  maturityPct:    number;
  label:          string;   // what to call the "return" metric
  isProjection:   boolean;  // true = estimated future, false = actual current
}

export function computeLivePreview(form: Record<string, string>): LivePreview | null {
  const type = form.type;

  try {
    if (type === "FIXED_DEPOSIT") {
      const principal    = parseFloat(form.avgBuyPrice);
      const rate         = parseFloat(form.interestRate);
      const startDate    = form.startDate ? new Date(form.startDate) : new Date();
      const maturityDate = form.maturityDate ? new Date(form.maturityDate) : null;
      if (!principal || !rate || !maturityDate) return null;
      const calc = calculateFD({ principal, annualRate: rate, startDate, maturityDate });
      return {
        investedAmount: calc.investedAmount,
        currentValue:   calc.currentValue,
        maturityValue:  calc.maturityValue,
        profit:         calc.profit,
        maturityProfit: calc.maturityProfit,
        pnlPct:         calc.pnlPercentage,
        maturityPct:    calc.maturityPct,
        label:          "Interest Earned",
        isProjection:   false,
      };
    }

    if (type === "RECURRING_DEPOSIT") {
      const monthly      = parseFloat(form.sipAmount || form.avgBuyPrice);
      const rate         = parseFloat(form.interestRate);
      const startDate    = form.startDate ? new Date(form.startDate) : new Date();
      const maturityDate = form.maturityDate ? new Date(form.maturityDate) : null;
      if (!monthly || !rate || !maturityDate) return null;
      const calc = calculateRD({ monthlyInstalment: monthly, annualRate: rate, startDate, maturityDate });
      return {
        investedAmount: calc.investedAmount,
        currentValue:   calc.currentValue,
        maturityValue:  calc.maturityValue,
        profit:         calc.profit,
        maturityProfit: calc.maturityProfit,
        pnlPct:         calc.pnlPercentage,
        maturityPct:    calc.maturityPct,
        label:          "Interest Earned",
        isProjection:   false,
      };
    }

    if (type === "SIP_MUTUAL_FUND") {
      const monthly  = parseFloat(form.sipAmount);
      const rate     = parseFloat(form.expectedReturn || "12");
      const startDate = form.startDate ? new Date(form.startDate) : new Date();
      if (!monthly) return null;
      const calc = calculateSIP({ monthlyAmount: monthly, annualReturnPct: rate, startDate });
      return {
        investedAmount: calc.investedAmount,
        currentValue:   calc.estimatedValue,
        maturityValue:  calc.estimatedValue,
        profit:         calc.estimatedProfit,
        maturityProfit: calc.estimatedProfit,
        pnlPct:         calc.pnlPercentage,
        maturityPct:    calc.pnlPercentage,
        label:          "Estimated Returns",
        isProjection:   true,
      };
    }

    if (type === "PPF") {
      const balance      = parseFloat(form.avgBuyPrice);
      const annual       = parseFloat(form.sipAmount || "150000");
      const startDate    = form.startDate ? new Date(form.startDate) : new Date();
      const maturityDate = form.maturityDate ? new Date(form.maturityDate) : null;
      if (!balance || !maturityDate) return null;
      const calc = calculatePPF({ currentBalance: balance, annualContribution: annual, startDate, maturityDate });
      return {
        investedAmount: calc.investedAmount,
        currentValue:   calc.currentValue,
        maturityValue:  calc.maturityValue,
        profit:         calc.profit,
        maturityProfit: calc.maturityProfit,
        pnlPct:         calc.pnlPercentage,
        maturityPct:    calc.maturityPct,
        label:          "Projected Returns",
        isProjection:   true,
      };
    }

    return null;
  } catch {
    return null;
  }
}