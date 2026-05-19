import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkFeatureAccess } from "@/lib/auth/tier-guard";
import prisma from "@/lib/db";
import { processStatementPipeline } from "@/lib/ai/pdf-processor";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Access Denied. Identity validation expired." }, { status: 401 });
  }
  const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "UNKNOWN_BROWSER";

  const gateCheck = await checkFeatureAccess(
    { userId: session.user.id, ipAddress, userAgent },
    "PDF_UPLOAD"
  );
  if (!gateCheck.allowed) {
    return NextResponse.json({ error: gateCheck.reason }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Missing required payload source target file entity." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await processStatementPipeline(buffer, session.user.id);
    await prisma.securityAuditLog.create({
      data: {
        userId: session.user.id,
        event: "SUCCESSFUL_PDF_UPLOAD",
        ipAddress,
        userAgent
      }
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed and auto-committed ${result.count} statement ledger records.` 
    });

  } catch (err) {
    return NextResponse.json({ error: "File streaming transmission interrupted." }, { status: 500 });
  }
}