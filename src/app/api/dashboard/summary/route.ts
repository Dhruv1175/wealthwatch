import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateAdvancedSummary, Timeframe } from "@/lib/ai/financial-analyzer";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Access Denied. Identity validation expired." }, { status: 401 });
  }

  // Extract query param, default to standard month view if left blank
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") as Timeframe) || "month";

  try {
    const summary = await generateAdvancedSummary(session.user.id, timeframe);
    if (!summary) {
      return NextResponse.json({ message: "No data available within this query perimeter." }, { status: 200 });
    }
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: "Internal processing crash." }, { status: 500 });
  }
}