// src/app/api/investments/route.ts

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

// ── Asset types that have no ticker symbol ─────────────────────────────────────
// For these, we auto-generate a stable symbol from name + type so the DB
// constraint (symbol is required String) is always satisfied.
const NO_TICKER_TYPES = new Set([
  "FIXED_DEPOSIT",
  "RECURRING_DEPOSIT",
  "PPF",
  "EPF",
  "NPS",
  "REAL_ESTATE",
  "OTHER",
  "GOLD", // physical gold has no ticker; Gold ETF does but shape handles it
]);

function deriveSymbol(body: Record<string, any>): string {
  // If a symbol was explicitly provided, use it
  if (body.symbol && String(body.symbol).trim()) {
    return String(body.symbol).toUpperCase().trim();
  }
  // Auto-generate from type + name initials so it's always unique enough
  const typePrefix = String(body.type ?? "OTHER").slice(0, 4).toUpperCase();
  const nameSlug   = String(body.name ?? "ASSET")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
  return `${typePrefix}_${nameSlug}`;
}

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

    // Live prices via Yahoo Finance (only for ticker-bearing assets)
    const { positions, totalValue, totalPnl, sipReminders } =
      await getTrackedInvestments(session.user.id);

    // Enrich with live prices where available, fall back gracefully
    const enriched = visible.map((inv) => {
      const live = positions.find((p) => p.id === inv.id);
      return {
        ...inv,
        currentPrice:   live?.currentPrice   ?? inv.avgBuyPrice,
        currentValue:   live?.currentValue   ?? inv.sharesOwned * inv.avgBuyPrice,
        profitOrLoss:   live?.profitOrLoss   ?? 0,
        pnlPercentage:  live?.pnlPercentage  ?? 0,
        sipReminderDue: live?.sipReminderDue ?? false,
      };
    });

    // XIRR per position
    const positionsWithXirr = enriched.map((pos) => {
      const flows = pos.cashFlows.map((cf) => ({
        date:   new Date(cf.date),
        amount: cf.amount,
      }));
      flows.push({ date: new Date(), amount: pos.currentValue });
      const xirr = flows.length >= 2 ? calculateXIRR(flows) : null;
      return { ...pos, xirr };
    });

    // Portfolio-wide XIRR
    const allFlows = enriched.flatMap((pos) =>
      pos.cashFlows.map((cf) => ({ date: new Date(cf.date), amount: cf.amount }))
    );
    allFlows.push({ date: new Date(), amount: totalValue });
    const portfolioXirr = allFlows.length >= 2 ? calculateXIRR(allFlows) : null;

    const allocation = analyzeAllocation(
      enriched.map((p) => ({
        name:         p.name,
        type:         p.type,
        currentValue: p.currentValue,
        currency:     p.currency,
      }))
    );

    const totalCost = enriched.reduce(
      (s, p) => s + p.avgBuyPrice * p.sharesOwned,
      0
    );

    const healthScore = calculateHealthScore({
      positions: enriched.map((p) => ({
        name: p.name, type: p.type, currentValue: p.currentValue,
      })),
      xirr:      portfolioXirr,
      totalPnl,
      totalCost,
    });

    const taxSummary = calculateTaxSummary(
      enriched.map((p) => ({
        currentValue: p.currentValue,
        costBasis:    p.avgBuyPrice * p.sharesOwned,
        purchaseDate: new Date(p.createdAt),
        type:         p.type,
      }))
    );

    return NextResponse.json({
      positions:    positionsWithXirr,
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
        isPro,           // ← exposed so UI can branch display logic
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

    // ── Validation ─────────────────────────────────────────────────────────────
    // `name` is always required — everything has a name
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "Asset name is required." }, { status: 400 });
    }
    if (!body.type) {
      return NextResponse.json({ error: "Asset type is required." }, { status: 400 });
    }

    // avgBuyPrice is the principal / value / price — always required
    if (!body.avgBuyPrice || isNaN(parseFloat(body.avgBuyPrice))) {
      return NextResponse.json(
        { error: "Purchase price / principal amount is required." },
        { status: 400 }
      );
    }

    // sharesOwned: default to 1 for fixed-value assets (FD, PPF, RE, etc.)
    const sharesOwned = body.sharesOwned
      ? parseFloat(body.sharesOwned)
      : 1;

    if (isNaN(sharesOwned) || sharesOwned <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number." }, { status: 400 });
    }

    // Derive symbol — handles both ticker assets and no-ticker assets
    const symbol = deriveSymbol(body);

    const {
      type, name, sipAmount, sipDay,
      isin, folioNumber, broker, currency, exchange,
      sector, maturityDate, interestRate, lockInDate,
      notes, tags, portfolioId, goalId,
      avgBuyPrice,
    } = body;

    const investment = await prisma.investment.create({
      data: {
        userId:       session.user.id,
        symbol,
        name:         String(name).trim(),
        type,
        sharesOwned,
        avgBuyPrice:  parseFloat(avgBuyPrice),
        sipAmount:    sipAmount    ? parseFloat(sipAmount)     : null,
        sipDay:       sipDay       ? parseInt(sipDay, 10)      : null,
        isin:         isin         ? String(isin).trim()       : null,
        folioNumber:  folioNumber  ? String(folioNumber).trim(): null,
        broker:       broker       ? String(broker).trim()     : null,
        currency:     currency ? String(currency).trim() : "INR",
        exchange:     exchange     ? String(exchange).trim()   : null,
        sector:       sector       ? String(sector).trim()     : null,
        maturityDate: maturityDate ? new Date(maturityDate)    : null,
        interestRate: interestRate ? parseFloat(interestRate)  : null,
        lockInDate:   lockInDate   ? new Date(lockInDate)      : null,
        notes:        notes        ? String(notes).trim()      : null,
        tags:         Array.isArray(tags) ? tags : [],
        portfolioId:  portfolioId  ?? null,
        goalId:       goalId       ?? null,
      },
    });

    // Opening BUY cash flow for XIRR tracking
    await prisma.investmentCashFlow.create({
      data: {
        investmentId: investment.id,
        type:         "BUY",
        amount:       -(sharesOwned * parseFloat(avgBuyPrice)),
        date:         new Date(),
        units:        sharesOwned,
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