import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ["SUPER_ADMIN"]);

    const [
      totalUsers,
      totalAuthors,
      totalBuyers,
      totalTransactions,
      platformRevenueResult,
      pendingPayoutsResult,
      openDisputes,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: "AUTHOR" } }),
      db.user.count({ where: { role: "BUYER" } }),
      db.transaction.count(),
      db.transaction.aggregate({
        where: { status: "COMPLETED" },
        _sum: { commissionAmount: true },
      }),
      db.transaction.aggregate({
        where: { status: "COMPLETED" },
        _sum: { netAmount: true },
      }),
      db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    ]);

    // Active sessions - approximate by users with email verified
    const activeSessions = await db.user.count({
      where: { emailVerified: { not: null } },
    });

    return apiResponse({
      totalUsers,
      totalAuthors,
      totalBuyers,
      totalTransactions,
      platformRevenue: platformRevenueResult._sum.commissionAmount || 0,
      pendingPayouts: pendingPayoutsResult._sum.netAmount || 0,
      openDisputes,
      activeSessions,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Analytics overview error:", error);
    return apiError("Failed to fetch analytics overview", 500, "INTERNAL_ERROR");
  }
}
