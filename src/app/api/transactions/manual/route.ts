// src/app/api/transactions/manual/route.ts
// POST /api/transactions/manual
// Adds a single manually-entered transaction with tier enforcement.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

const BASIC_TX_LIMIT = 50;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { description, amount, category, date } = body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }
    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: "Valid amount is required." }, { status: 400 });
    }
    if (!date || isNaN(Date.parse(date))) {
      return NextResponse.json({ error: "Valid date is required." }, { status: 400 });
    }

    const finalAmount = parseFloat(amount);

    // ── Tier enforcement ────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: {
        tier:   true,
        _count: { select: { transactions: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.tier === "BASIC" && user._count.transactions >= BASIC_TX_LIMIT) {
      return NextResponse.json(
        {
          error:           "Transaction limit reached",
          code:            "TIER_LIMIT_EXCEEDED",
          limit:           BASIC_TX_LIMIT,
          current:         user._count.transactions,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    // ── Create transaction ──────────────────────────────────────────────────
    const transaction = await prisma.transaction.create({
      data: {
        userId:      session.user.id,
        amount:      finalAmount,
        description: description.trim(),
        category:    category?.trim() || "OTHER",
        date:        new Date(date),
      },
    });

    return NextResponse.json(
      { success: true, transaction },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/transactions/manual POST]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}