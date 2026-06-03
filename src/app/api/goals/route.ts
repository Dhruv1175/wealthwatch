// src/app/api/goals/route.ts
// GET  /api/goals  — list all goals with linked investment progress
// POST /api/goals  — create a new goal

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await prisma.financialGoal.findMany({
    where:   { userId: session.user.id },
    orderBy: { targetDate: "asc" },
    include: {
      investments: {
        select: {
          id: true, name: true, type: true,
          sharesOwned: true, avgBuyPrice: true,
          currentMarketValue: true,
          sipAmount: true, interestRate: true,
          maturityDate: true, createdAt: true,
        },
      },
    },
  });

  // Enrich each goal with computed progress
  const enriched = goals.map((goal) => {
    // Sum invested across linked investments
    const totalInvested = goal.investments.reduce(
      (s, inv) => s + inv.avgBuyPrice * inv.sharesOwned,
      0
    );

    // Sum current value (use currentMarketValue if set, else cost basis)
    const currentValue = goal.investments.reduce((s, inv) => {
      const val = inv.currentMarketValue ?? inv.avgBuyPrice * inv.sharesOwned;
      return s + val;
    }, 0);

    const progressPct = goal.targetAmount > 0
      ? Math.min(100, (currentValue / goal.targetAmount) * 100)
      : 0;

    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86_400_000)
    );

    return {
      ...goal,
      totalInvested,
      currentValue,
      progressPct:  parseFloat(progressPct.toFixed(1)),
      daysLeft,
      isAchieved:   currentValue >= goal.targetAmount,
    };
  });

  return NextResponse.json(enriched);
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, targetAmount, targetDate, category, notes } = body;

    if (!name?.trim())    return NextResponse.json({ error: "Goal name is required." }, { status: 400 });
    if (!targetAmount)    return NextResponse.json({ error: "Target amount is required." }, { status: 400 });
    if (!targetDate)      return NextResponse.json({ error: "Target date is required." }, { status: 400 });
    if (!category)        return NextResponse.json({ error: "Category is required." }, { status: 400 });

    const goal = await prisma.financialGoal.create({
      data: {
        userId:       session.user.id,
        name:         name.trim(),
        targetAmount: parseFloat(targetAmount),
        targetDate:   new Date(targetDate),
        category,
        notes:        notes?.trim() || null,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    console.error("[/api/goals POST]", err);
    return NextResponse.json({ error: "Failed to create goal." }, { status: 500 });
  }
}