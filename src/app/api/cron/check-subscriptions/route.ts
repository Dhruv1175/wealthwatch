import {NextResponse,NextRequest} from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) { 
    const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized cron execution attempt." }, { status: 401 });
  }
    try{
const expiredUsers = await prisma.user.updateMany({
      where: {
        subscriptionEnd: {
          lte: new Date(), // Less than or equal to right now
        },
        tier: "PRO", // Only look at users who are currently PRO
      },
      data: {
        tier: "BASIC",
        subscriptionEnd: null, // Clear the expiration date
      },
    });

    console.log(`Cron execution successful. Downgraded ${expiredUsers.count} expired users.`);
    return NextResponse.json({ success: true, downgradedCount: expiredUsers.count });

  } catch (err) {
    console.error("Cron subscription sweep failed:", err);
    return NextResponse.json({ error: "Internal server error during cron loop." }, { status: 500 });
  }
}