// src/app/api/investments/route.ts
// GET  /api/investments          — fetch portfolio with live prices + analytics
// POST /api/investments          — add new position with extended fields

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { getTrackedInvestments } from "@/lib/market/stock-engine";
import {
  calculateXIRR,
  analyzeAllocation,
  calculateHealthScore,
  calculateTaxSummary,
} from "@/lib/portfolio/analytics";

const BASIC_INVESTMENT_LIMIT = 5;

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { tier: true },
    });

    const isPro = user?.tier === "PRO";

    // Fetch investments with all relations
    const investments = await prisma.investment.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      include: {
        cashFlows: { orderBy: { date: "asc" } },
        portfolio: { select: { id: true, name: true, color: true } },
        goal:      { select: { id: true, name: true, targetAmount: true, targetDate: true } },
      },
    });

    // Tier enforcement — BASIC sees first 5 only
    const visible = isPro
      ? investments
      : investments.slice(0, BASIC_INVESTMENT_LIMIT);

    // Live prices via Yahoo Finance
    const { positions, totalValue, totalPnl, sipReminders } =
      await getTrackedInvestments(session.user.id);

    // Map live prices back onto visible investments
    const enriched = visible.map((inv) => {
      const live = positions.find((p) => p.id === inv.id);
      return {
        ...inv,
        currentPrice:  live?.currentPrice  ?? inv.avgBuyPrice,
        currentValue:  live?.currentValue  ?? inv.sharesOwned * inv.avgBuyPrice,
        profitOrLoss:  live?.profitOrLoss  ?? 0,
        pnlPercentage: live?.pnlPercentage ?? 0,
        sipReminderDue: live?.sipReminderDue ?? false,
      };
    });

    // ── Analytics ─────────────────────────────────────────────────────────────

    // XIRR per position
    const positionsWithXirr = enriched.map((pos) => {
      const flows = pos.cashFlows.map((cf) => ({
        date:   new Date(cf.date),
        amount: cf.amount,
      }));

      // Add current market value as the terminal positive cash flow
      flows.push({ date: new Date(), amount: pos.currentValue });

      const xirr = calculateXIRR(flows);
      return { ...pos, xirr };
    });

    // Portfolio-wide XIRR using all cash flows
    const allFlows = enriched.flatMap((pos) =>
      pos.cashFlows.map((cf) => ({ date: new Date(cf.date), amount: cf.amount }))
    );
    allFlows.push({ date: new Date(), amount: totalValue });
    const portfolioXirr = calculateXIRR(allFlows);

    // Allocation analysis
    const allocation = analyzeAllocation(
      enriched.map((p) => ({
        name:         p.name,
        type:         p.type,
        currentValue: p.currentValue,
        currency:     p.currency,
      }))
    );

    // Health score
    const totalCost = enriched.reduce(
      (s, p) => s + p.avgBuyPrice * p.sharesOwned,
      0
    );
    const healthScore = calculateHealthScore({
      positions:  enriched.map((p) => ({ name: p.name, type: p.type, currentValue: p.currentValue })),
      xirr:       portfolioXirr,
      totalPnl,
      totalCost,
    });

    // Tax summary
    const taxSummary = calculateTaxSummary(
      enriched.map((p) => ({
        currentValue: p.currentValue,
        costBasis:    p.avgBuyPrice * p.sharesOwned,
        purchaseDate: new Date(p.createdAt),
        type:         p.type,
      }))
    );

    return NextResponse.json({
      positions:     positionsWithXirr,
      totalValue,
      totalPnl,
      totalCost,
      sipReminders,
      portfolioXirr,
      allocation,
      healthScore,
      taxSummary,
      meta: {
        totalCount:      investments.length,
        visibleCount:    visible.length,
        hiddenCount:     isPro ? 0 : Math.max(0, investments.length - BASIC_INVESTMENT_LIMIT),
        tierCapped:      !isPro,
        upgradeRequired: !isPro && investments.length >= BASIC_INVESTMENT_LIMIT,
      },
    });
  } catch (err) {
    console.error("[/api/investments GET]", err);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { tier: true, _count: { select: { investments: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Tier enforcement
    if (user.tier === "BASIC" && user._count.investments >= BASIC_INVESTMENT_LIMIT) {
      return NextResponse.json(
        {
          error:           "Investment limit reached",
          code:            "TIER_LIMIT_EXCEEDED",
          limit:           BASIC_INVESTMENT_LIMIT,
          current:         user._count.investments,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      symbol, name, type,
      sharesOwned, avgBuyPrice,
      sipAmount, sipDay,
      // Extended fields
      isin, folioNumber, broker, currency, exchange,
      sector, maturityDate, interestRate, lockInDate,
      notes, tags, portfolioId, goalId,
    } = body;

    if (!symbol || !name || !type || !sharesOwned || !avgBuyPrice) {
      return NextResponse.json(
        { error: "Required fields: symbol, name, type, sharesOwned, avgBuyPrice" },
        { status: 400 }
      );
    }

    const investment = await prisma.investment.create({
      data: {
        userId:       session.user.id,
        symbol:       String(symbol).toUpperCase().trim(),
        name:         String(name).trim(),
        type,
        sharesOwned:  parseFloat(sharesOwned),
        avgBuyPrice:  parseFloat(avgBuyPrice),
        sipAmount:    sipAmount    ? parseFloat(sipAmount)    : null,
        sipDay:       sipDay       ? parseInt(sipDay, 10)     : null,
        isin:         isin         ? String(isin).trim()      : null,
        folioNumber:  folioNumber  ? String(folioNumber).trim(): null,
        broker:       broker       ? String(broker).trim()    : null,
        currency:     currency     ?? "INR",
        exchange:     exchange     ? String(exchange).trim()  : null,
        sector:       sector       ? String(sector).trim()    : null,
        maturityDate: maturityDate ? new Date(maturityDate)   : null,
        interestRate: interestRate ? parseFloat(interestRate) : null,
        lockInDate:   lockInDate   ? new Date(lockInDate)     : null,
        notes:        notes        ? String(notes).trim()     : null,
        tags:         Array.isArray(tags) ? tags : [],
        portfolioId:  portfolioId  ?? null,
        goalId:       goalId       ?? null,
      },
    });

    // Create opening BUY cash flow for XIRR tracking
    await prisma.investmentCashFlow.create({
      data: {
        investmentId: investment.id,
        type:         "BUY",
        amount:       -(parseFloat(sharesOwned) * parseFloat(avgBuyPrice)), // Negative = outflow
        date:         new Date(),
        units:        parseFloat(sharesOwned),
        price:        parseFloat(avgBuyPrice),
        notes:        "Opening position",
      },
    });

    return NextResponse.json(investment, { status: 201 });
  } catch (err) {
    console.error("[/api/investments POST]", err);
    return NextResponse.json({ error: "Failed to create investment" }, { status: 500 });
  }
}