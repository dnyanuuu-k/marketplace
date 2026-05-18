import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

const querySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request, ["AUTHOR"]);

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const now = new Date();
    const periodDays = query.period === "7d" ? 7 : query.period === "30d" ? 30 : 90;
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Summary stats
    const [grossEarnings, commissionDeducted, pendingTransactions] = await Promise.all([
      db.transaction.aggregate({
        where: { sellerId: currentUser.id, status: "COMPLETED" },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { sellerId: currentUser.id, status: "COMPLETED" },
        _sum: { commissionAmount: true },
      }),
      db.transaction.aggregate({
        where: { sellerId: currentUser.id, status: "PENDING" },
        _sum: { netAmount: true },
      }),
    ]);

    const completedPayouts = await db.payout.aggregate({
      where: { userId: currentUser.id, status: { in: ["COMPLETED", "APPROVED"] } },
      _sum: { amount: true },
    });

    const gross = grossEarnings._sum.amount || 0;
    const commission = commissionDeducted._sum.commissionAmount || 0;
    const net = gross - commission;
    const totalPaidOut = completedPayouts._sum.amount || 0;
    const availableForPayout = Math.max(0, net - totalPaidOut);

    // Time-series data for chart
    const transactions = await db.transaction.findMany({
      where: {
        sellerId: currentUser.id,
        status: "COMPLETED",
        createdAt: { gte: startDate },
      },
      select: { netAmount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const chartData: { date: string; earnings: number }[] = [];
    const dateMap = new Map<string, number>();

    for (let i = 0; i < periodDays; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dateMap.set(key, 0);
    }

    transactions.forEach((tx) => {
      const key = tx.createdAt.toISOString().split("T")[0];
      if (dateMap.has(key)) {
        dateMap.set(key, (dateMap.get(key) || 0) + tx.netAmount);
      }
    });

    dateMap.forEach((earnings, date) => {
      chartData.push({ date, earnings: Math.round(earnings * 100) / 100 });
    });

    // Recent transactions
    const recentTransactions = await db.transaction.findMany({
      where: { sellerId: currentUser.id },
      include: {
        buyer: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return apiResponse({
      grossEarnings: gross,
      commissionDeducted: commission,
      netEarnings: net,
      availableForPayout,
      pendingAmount: pendingTransactions._sum.netAmount || 0,
      chartData,
      recentTransactions,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Earnings stats error:", error);
    return apiError("Failed to fetch earnings", 500, "INTERNAL_ERROR");
  }
}
