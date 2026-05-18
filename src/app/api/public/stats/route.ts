import { db } from "@/lib/db";
import { apiResponse, apiError } from "@/lib/api-auth";

export async function GET() {
  try {
    const [
      totalAuthors,
      totalTransactions,
      platformRevenueResult,
      avgRatingResult,
    ] = await Promise.all([
      db.user.count({ where: { role: "AUTHOR", status: "ACTIVE" } }),
      db.transaction.count({ where: { status: "COMPLETED" } }),
      db.transaction.aggregate({
        where: { status: "COMPLETED" },
        _sum: { commissionAmount: true },
      }),
      db.profile.aggregate({
        _avg: { averageRating: true },
      }),
    ]);

    return apiResponse({
      totalAuthors,
      totalTransactions,
      platformRevenue: platformRevenueResult._sum.commissionAmount || 0,
      averageRating: Math.round((avgRatingResult._avg.averageRating || 0) * 10) / 10,
    });
  } catch (error) {
    console.error("Public stats error:", error);
    return apiError("Failed to fetch stats", 500, "INTERNAL_ERROR");
  }
}
