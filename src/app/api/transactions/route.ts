// src/app/api/transactions/route.ts
// GET /api/transactions?page=1&limit=20&category=Food
//
// Used by any future client-side data fetching (infinite scroll, etc.)
// The current pages use Prisma directly via SSR — this route exists for
// client components that need to fetch without a full page reload.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

const BASIC_TX_LIMIT = 50;
const MAX_PAGE_SIZE  = 50;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit    = Math.min(MAX_PAGE_SIZE, parseInt(searchParams.get("limit") ?? "20", 10));
  const category = searchParams.get("category") ?? "";

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { tier: true },
  });

  const isPro = user?.tier === "PRO";

  // ── Count total (real, uncapped) ──────────────────────────────────────────
  const totalCount = await prisma.transaction.count({
    where: { userId: session.user.id },
  });

  // ── For BASIC: cap access to 50 most recent ───────────────────────────────
  const effectiveTotal = isPro ? totalCount : Math.min(totalCount, BASIC_TX_LIMIT);
  const offset         = (page - 1) * limit;

  // If BASIC user requests beyond their cap, return 403 with upgrade info
  if (!isPro && offset >= BASIC_TX_LIMIT) {
    return NextResponse.json(
      {
        error:           "Transaction limit exceeded",
        code:            "TIER_LIMIT_EXCEEDED",
        limit:           BASIC_TX_LIMIT,
        total:           totalCount,
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  const where = {
    userId:   session.user.id,
    ...(category ? { category } : {}),
  };

  let transactions;

  if (!isPro) {
    // Get the IDs of the 50 allowed records first, then filter + paginate within them
    const allowedIds = await prisma.transaction.findMany({
      where:   { userId: session.user.id },
      orderBy: { date: "desc" },
      take:    BASIC_TX_LIMIT,
      select:  { id: true },
    });
    const idSet = allowedIds.map((t) => t.id);

    transactions = await prisma.transaction.findMany({
      where:   { ...where, id: { in: idSet } },
      orderBy: { date: "desc" },
      skip:    offset,
      take:    Math.min(limit, BASIC_TX_LIMIT - offset), // Never exceed cap
    });
  } else {
    transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip:    offset,
      take:    limit,
    });
  }

  return NextResponse.json({
    transactions,
    pagination: {
      page,
      limit,
      total:      effectiveTotal,
      totalPages: Math.ceil(effectiveTotal / limit),
      hasNext:    offset + limit < effectiveTotal,
      hasPrev:    page > 1,
    },
    meta: {
      realTotal:       totalCount,
      tierCapped:      !isPro,
      hiddenCount:     isPro ? 0 : Math.max(0, totalCount - BASIC_TX_LIMIT),
      upgradeRequired: !isPro && totalCount > BASIC_TX_LIMIT,
    },
  });
}