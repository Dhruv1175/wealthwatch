import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { getTrackedInvestments } from "@/lib/market/stock-engine";

// GET Path: Delivers real-time prices and automated calculated calculations to the UI
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Identity verification expired." }, { status: 401 });

  try {
    const trackingData = await getTrackedInvestments(session.user.id);
    return NextResponse.json(trackingData);
  } catch (err) {
    return NextResponse.json({ error: "Failed to resolve live portfolio matrix telemetry." }, { status: 500 });
  }
}

// POST Path: Saves a new equity symbol or a mutual fund SIP into the tracking ledger
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Access Denied." }, { status: 401 });

  try {
    const body = await req.json();
    const { symbol, name, type, sharesOwned, avgBuyPrice, sipAmount, sipDay } = body;

    const newAsset = await prisma.investment.create({
      data: {
        userId: session.user.id,
        symbol: symbol.toUpperCase(),
        name,
        type,
        sharesOwned: parseFloat(sharesOwned),
        avgBuyPrice: parseFloat(avgBuyPrice),
        sipAmount: sipAmount ? parseFloat(sipAmount) : null,
        sipDay: sipDay ? parseInt(sipDay) : null,
      },
    });

    return NextResponse.json({ success: true, data: newAsset });
  } catch (err) {
    return NextResponse.json({ error: "Failed to persist investment position." }, { status: 500 });
  }
}