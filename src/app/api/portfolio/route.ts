// src/app/api/portfolio/route.ts
// GET /api/portfolio
//
// Returns all investments with price hydration.
// BASIC users see only first 5 positions in the response.
// Replace simulatePrice() with your real market data source.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

const BASIC_INVESTMENT_LIMIT = 5;

// ── Price stub — swap with Yahoo Finance / NSE API ────────────────────────────
async function fetchCurrentPrice(symbol: string, avgBuyPrice: number): Promise<number> {
  // TODO: replace with real price fetch
  // e.g. const price = await yahooFinance.quote(symbol).then(q => q.regularMarketPrice);
  const variance = 0.85 + Math.random() * 0.3;
  return parseFloat((avgBuyPrice * variance).toFixed(2));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { tier: true },
  });

  const isPro = user?.tier === "PRO";

  const allInvestments = await prisma.investment.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  const totalCount  = allInvestments.length;
  const hiddenCount = isPro ? 0 : Math.max(0, totalCount - BASIC_INVESTMENT_LIMIT);

  // Slice for BASIC users — data beyond limit not returned
  const visibleInvestments = isPro
    ? allInvestments
    : allInvestments.slice(0, BASIC_INVESTMENT_LIMIT);

  // ── Hydrate prices (parallel) ─────────────────────────────────────────────
  const positions = await Promise.all(
    visibleInvestments.map(async (inv) => {
      const currentPrice = await fetchCurrentPrice(inv.symbol, inv.avgBuyPrice);
      const currentValue = parseFloat((currentPrice * inv.sharesOwned).toFixed(2));
      const costBasis    = parseFloat((inv.avgBuyPrice * inv.sharesOwned).toFixed(2));
      const profitOrLoss = parseFloat((currentValue - costBasis).toFixed(2));
      const pnlPercentage = parseFloat(
        (((currentPrice - inv.avgBuyPrice) / inv.avgBuyPrice) * 100).toFixed(2)
      );

      return {
        id:           inv.id,
        symbol:       inv.symbol,
        name:         inv.name,
        type:         inv.type,
        sharesOwned:  inv.sharesOwned,
        avgBuyPrice:  inv.avgBuyPrice,
        sipAmount:    inv.sipAmount,
        sipDay:       inv.sipDay,
        currentPrice,
        currentValue,
        profitOrLoss,
        pnlPercentage,
      };
    })
  );

  const totalValue = positions.reduce((s, p) => s + p.currentValue, 0);
  const totalPnl   = positions.reduce((s, p) => s + p.profitOrLoss, 0);

  // ── SIP reminders ─────────────────────────────────────────────────────────
  const today = new Date().getDate();
  const sipReminders = allInvestments
    .filter(
      (inv) =>
        inv.type === "SIP_MUTUAL_FUND" &&
        inv.sipDay !== null &&
        Math.abs((inv.sipDay ?? 0) - today) <= 2
    )
    .map(
      (inv) =>
        `SIP due: ${inv.name} (${inv.symbol}) — ₹${inv.sipAmount?.toLocaleString("en-IN")} on day ${inv.sipDay}`
    );

  return NextResponse.json({
    positions,
    totalValue,
    totalPnl,
    sipReminders,
    meta: {
      totalCount,
      visibleCount:    visibleInvestments.length,
      hiddenCount,
      tierCapped:      !isPro,
      upgradeRequired: !isPro && totalCount >= BASIC_INVESTMENT_LIMIT,
    },
  });
}