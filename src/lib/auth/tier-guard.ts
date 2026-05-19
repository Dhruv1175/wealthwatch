import prisma from "@/lib/db";

interface GuardRequest {
    userId:string;
    ipAddress:string;
    userAgent:string;
}

export async function checkFeatureAccess({userId,ipAddress,userAgent}:GuardRequest,requiredFeature:"EXTENDED_TIMEFRAME"|"PDF_UPLOAD"):Promise<{allowed:boolean,reason?:string}> {
    const user = await prisma.user.findUnique({where:{id:userId},
    select:{tier:true,subscriptionEnd: true}});
    if (!user) return { allowed: false, reason: "User profile target not found." };

  const isPro = user.tier === "PRO" && (user.subscriptionEnd ? user.subscriptionEnd > new Date() : false);

  // 2. Evaluate Feature Request Boundaries
  if (requiredFeature === "EXTENDED_TIMEFRAME") {
    if (!isPro) {
      // Log unauthorized access attempt for security auditing records
      await prisma.securityAuditLog.create({
        data: { userId, event: "BLOCKED_PREMIUM_TIMEFRAME_ATTEMPT", ipAddress, userAgent }
      });
      return { allowed: false, reason: "The 'Yearly' lookback matrix is exclusively available to Pro Tier subscribers." };
    }
  }

  if (requiredFeature === "PDF_UPLOAD") {
    if (!isPro) {
      // Enforce monthly rolling threshold limits for basic users
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      // Count operations performed during the current billing cycle window
      const monthlyUploadCount = await prisma.securityAuditLog.count({
        where: {
          userId,
          event: "SUCCESSFUL_PDF_UPLOAD",
          createdAt: { gte: currentMonthStart }
        }
      });

      if (monthlyUploadCount >= 3) {
        await prisma.securityAuditLog.create({
          data: { userId, event: "UPLOAD_LIMIT_EXCEEDED_ALERT", ipAddress, userAgent }
        });
        return { allowed: false, reason: "Monthly rolling Free Tier limit exceeded (Max: 3 uploads). Please upgrade to PRO." };
      }
    }
  }

  return { allowed: true };
}