import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ["SUPER_ADMIN"]);

    // Transaction counts by status
    const [pending, completed, disputed, refunded] = await Promise.all([
      db.transaction.count({ where: { status: "PENDING" } }),
      db.transaction.count({ where: { status: "COMPLETED" } }),
      db.transaction.count({ where: { status: "DISPUTED" } }),
      db.transaction.count({ where: { status: "REFUNDED" } }),
    ]);

    // Top authors by earnings
    const topAuthors = await db.transaction.groupBy({
      by: ["sellerId"],
      where: { status: "COMPLETED" },
      _sum: { netAmount: true },
      _count: true,
      orderBy: { _sum: { netAmount: "desc" } },
      take: 10,
    });

    // Enrich with user data
    const enrichedTopAuthors = await Promise.all(
      topAuthors.map(async (entry) => {
        const user = await db.user.findUnique({
          where: { id: entry.sellerId },
          select: { id: true, name: true, email: true, avatarUrl: true },
        });
        return {
          ...user,
          totalEarnings: entry._sum.netAmount || 0,
          transactionCount: entry._count,
        };
      })
    );

    // Average transaction value
    const avgResult = await db.transaction.aggregate({
      where: { status: "COMPLETED" },
      _avg: { amount: true },
    });

    // Total volume
    const volumeResult = await db.transaction.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true, commissionAmount: true },
    });

    return apiResponse({
      statusCounts: {
        pending,
        completed,
        disputed,
        refunded,
        total: pending + completed + disputed + refunded,
      },
      topAuthors: enrichedTopAuthors,
      summary: {
        averageTransactionValue: avgResult._avg.amount || 0,
        totalVolume: volumeResult._sum.amount || 0,
        totalCommission: volumeResult._sum.commissionAmount || 0,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Analytics transactions error:", error);
    return apiError("Failed to fetch transaction analytics", 500, "INTERNAL_ERROR");
  }
}
