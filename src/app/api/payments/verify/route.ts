import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = await req.json();
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev && (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature)) {
      return NextResponse.json({ error: "Missing required verification properties." }, { status: 400 });
    }
    
    if (isDev && !razorpayPaymentId) {
      return NextResponse.json({ error: "Missing test payment identifier context." }, { status: 400 });
    }
    if (!isDev) {
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        return NextResponse.json({ error: "Server keys are unconfigured." }, { status: 500 });
      }

      const text = `${razorpayOrderId}|${razorpayPaymentId}`;
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(text)
        .digest("hex");

      if (generatedSignature !== razorpaySignature) {
        return NextResponse.json({ error: "Cryptographic verification failed." }, { status: 400 });
      }
    }

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        tier: "PRO",
        subscriptionEnd: expirationDate
      }
    });

    await prisma.securityAuditLog.create({
      data: {
        userId: session.user.id,
        event: "SUBSCRIPTION_UPGRADE_SUCCESS",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: isDev ? "RAZORPAY_CLIENT_VERIFY_SANDBOX" : "RAZORPAY_CLIENT_VERIFY"
      }
    });

    console.log(`Successfully upgraded user matching ID: ${session.user.id} to PRO tier parameters.`);
    return NextResponse.json({ success: true, message: "Subscription tier modified successfully." }, { status: 200 });

  } catch (err) {
    console.error("Payment validation loop processing error:", err);
    return NextResponse.json({ error: "Internal payment processing error." }, { status: 500 });
  }
}