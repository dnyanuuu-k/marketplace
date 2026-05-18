import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

const revenueQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "custom"]).default("30d"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ["SUPER_ADMIN"]);

    const { searchParams } = new URL(request.url);
    const query = revenueQuerySchema.parse(Object.fromEntries(searchParams));

    // Determine date range
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date = now;

    if (query.period === "custom" && query.dateFrom) {
      dateFrom = new Date(query.dateFrom);
      if (query.dateTo) {
        dateTo = new Date(query.dateTo);
      }
    } else {
      const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[query.period] || 30;
      dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Fetch completed transactions in the date range
    const transactions = await db.transaction.findMany({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        amount: true,
        commissionAmount: true,
        netAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by date for time-series data
    const dailyData: Record<string, { revenue: number; amount: number; count: number }> = {};

    for (const tx of transactions) {
      const dateKey = tx.createdAt.toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { revenue: 0, amount: 0, count: 0 };
      }
      dailyData[dateKey].revenue += tx.commissionAmount;
      dailyData[dateKey].amount += tx.amount;
      dailyData[dateKey].count += 1;
    }

    // Fill in missing dates
    const timeSeries: Array<{
      date: string;
      revenue: number;
      amount: number;
      count: number;
    }> = [];

    const current = new Date(dateFrom);
    while (current <= dateTo) {
      const dateKey = current.toISOString().split("T")[0];
      const dayData = dailyData[dateKey] || { revenue: 0, amount: 0, count: 0 };
      timeSeries.push({
        date: dateKey,
        revenue: Math.round(dayData.revenue * 100) / 100,
        amount: Math.round(dayData.amount * 100) / 100,
        count: dayData.count,
      });
      current.setDate(current.getDate() + 1);
    }

    // Calculate totals
    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.commissionAmount, 0);
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    return apiResponse({
      timeSeries,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalTransactions: transactions.length,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Analytics revenue error:", error);
    return apiError("Failed to fetch revenue analytics", 500, "INTERNAL_ERROR");
  }
}
