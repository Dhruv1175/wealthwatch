import {NextResponse,NextRequest} from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) { 
    const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized cron execution attempt." }, { status: 401 });
  }
    try{
    const result = await prisma.$transaction(async (tx) => {
      const expiredUsersCount = await tx.user.updateMany({
        where: {
          subscriptionEnd: { lte: new Date() },
          tier: "PRO",
        },
        data: {
          tier: "BASIC",
          subscriptionEnd: null,
        },
      });
      return expiredUsersCount;
    }, {
      maxWait: 2000, 
      timeout: 5000 
    });

    console.log(`Cron execution successful. Downgraded ${result.count} expired users.`);
    return NextResponse.json({ success: true, downgradedCount: result.count });

  } catch (err) {
    console.error("Cron subscription sweep failed:", err);
    return NextResponse.json({ error: "Internal server error during cron loop." }, { status: 500 });
  }
}