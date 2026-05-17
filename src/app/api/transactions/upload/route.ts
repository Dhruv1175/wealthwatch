import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { processStatementPipeline } from "@/lib/ai/pdf-processor";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Access Denied. Identity validation expired." }, { status: 401 });
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