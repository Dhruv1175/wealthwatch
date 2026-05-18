import { NextRequest,NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
    try{
        const body = await req.json();
        const { userId, title, message, type } = body;
        if (!userId || !title || !message) {
            return NextResponse.json({ error: "Incomplete event metadata fields." }, { status: 400 });
        }
        const eventRecord = await prisma.systemEvent.create({
            data: { userId, title, message, type: type || "INFO" }
        });

        return NextResponse.json({ success: true, eventId: eventRecord.id });
    }catch (err) {
    return NextResponse.json({ error: "Internal webhook capture failed." }, { status: 500 });
    }
}