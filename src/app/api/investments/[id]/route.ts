import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// DELETE Path: Hard deletion (Remove completely from tracking logs)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Explicitly typed as Promise for Next.js 15+
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Access Denied. Identity validation expired." }, { status: 401 });
  }

  try {
    // Unwrapping the asynchronous promise parameter
    const { id: assetId } = await params;

    const targetAsset = await prisma.investment.findUnique({
      where: { id: assetId }
    });

    if (!targetAsset || targetAsset.userId !== session.user.id) {
      return NextResponse.json({ error: "Target asset allocation structure not found." }, { status: 404 });
    }

    await prisma.investment.delete({
      where: { id: assetId }
    });

    return NextResponse.json({ success: true, message: "Asset position removed cleanly from tracker." });
  } catch (err) {
    console.error("Asset Liquidation Engine Failure:", err);
    return NextResponse.json({ error: "Internal mutation crash." }, { status: 500 });
  }
}

// PATCH Path: Partial/Full Selling (Reduces holdings and writes back transaction cash entries)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  
  // 1. Structural Identity Guard Perimeters
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Access Denied. Identity validation expired." }, { status: 401 });
  }

  // 2. Extract the id into a non-nullable string constant to clear the TypeScript error
  const confirmedUserId: string = session.user.id;

  try {
    const { id: assetId } = await params;
    const body = await req.json();
    const { sharesToSell, salePrice } = body;

    const parsedShares = parseFloat(sharesToSell);
    const parsedPrice = parseFloat(salePrice);

    if (isNaN(parsedShares) || isNaN(parsedPrice) || parsedShares <= 0 || parsedPrice <= 0) {
      return NextResponse.json({ error: "Invalid numeric parameters." }, { status: 400 });
    }

    const targetAsset = await prisma.investment.findUnique({ where: { id: assetId } });
    if (!targetAsset || targetAsset.userId !== confirmedUserId) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    if (parsedShares > targetAsset.sharesOwned) {
      return NextResponse.json({ error: "Cannot sell more shares than currently owned." }, { status: 400 });
    }

    const cashInflowAmount = parsedShares * parsedPrice;
    const remainingShares = targetAsset.sharesOwned - parsedShares;

    // 3. Execute atomic relational updates securely
    await prisma.$transaction(async (tx) => {
      if (remainingShares === 0) {
        await tx.investment.delete({ where: { id: assetId } });
      } else {
        await tx.investment.update({
          where: { id: assetId },
          data: { sharesOwned: remainingShares }
        });
      }

      // Pass the confirmed non-nullable constant string here:
      await tx.transaction.create({
        data: {
          userId: confirmedUserId, 
          amount: cashInflowAmount,
          description: `PORTFOLIO LIQUIDATION: Sold ${parsedShares} units of ${targetAsset.symbol}`,
          category: "INVESTMENT_RETURNS",
          date: new Date()
        }
      });
    });

    return NextResponse.json({ success: true, remainingShares });
  } catch (err) {
    console.error("Selling mutation fault:", err);
    return NextResponse.json({ error: "Failed to process sale ledger transformation." }, { status: 500 });
  }
}