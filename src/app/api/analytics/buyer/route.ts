import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

const querySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "custom"]).default("30d"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, ["BUYER"]);

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    // Determine date range
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date = now;

    if (query.period === "custom" && query.dateFrom) {
      dateFrom = new Date(query.dateFrom);
      if (query.dateTo) dateTo = new Date(query.dateTo);
    } else {
      const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[query.period] || 30;
      dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Previous period for comparison
    const periodDays = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (24 * 60 * 60 * 1000));
    const prevDateFrom = new Date(dateFrom.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Fetch completed transactions for this buyer in the period
    const transactions = await db.transaction.findMany({
      where: {
        buyerId: user.id,
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        amount: true,
        commissionAmount: true,
        description: true,
        status: true,
        createdAt: true,
        seller: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Previous period transactions for comparison
    const prevTransactions = await db.transaction.findMany({
      where: {
        buyerId: user.id,
        createdAt: { gte: prevDateFrom, lt: dateFrom },
      },
      select: { amount: true },
    });

    // Spending Over Time - daily time series
    const dailySpending: Record<string, { spending: number; count: number }> = {};
    for (const tx of transactions) {
      const dateKey = tx.createdAt.toISOString().split("T")[0];
      if (!dailySpending[dateKey]) dailySpending[dateKey] = { spending: 0, count: 0 };
      dailySpending[dateKey].spending += tx.amount;
      dailySpending[dateKey].count += 1;
    }

    const spendingTimeSeries: Array<{ date: string; spending: number; count: number }> = [];
    const current = new Date(dateFrom);
    while (current <= dateTo) {
      const dateKey = current.toISOString().split("T")[0];
      const dayData = dailySpending[dateKey] || { spending: 0, count: 0 };
      spendingTimeSeries.push({
        date: dateKey,
        spending: Math.round(dayData.spending * 100) / 100,
        count: dayData.count,
      });
      current.setDate(current.getDate() + 1);
    }

    // Purchase Categories - group by description prefix
    const categoryMap: Record<string, { spending: number; count: number }> = {};
    for (const tx of transactions) {
      const category = tx.description?.split(" - ")[0]?.trim() || "Other";
      if (!categoryMap[category]) categoryMap[category] = { spending: 0, count: 0 };
      categoryMap[category].spending += tx.amount;
      categoryMap[category].count += 1;
    }
    const purchaseCategories = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      spending: Math.round(data.spending * 100) / 100,
      count: data.count,
    }));

    // Top Vendors
    const vendorMap: Record<string, { spent: number; count: number; vendorId: string }> = {};
    for (const tx of transactions) {
      const vid = tx.seller.id;
      if (!vendorMap[vid]) vendorMap[vid] = { spent: 0, count: 0, vendorId: vid };
      vendorMap[vid].spent += tx.amount;
      vendorMap[vid].count += 1;
    }
    const topVendorIds = Object.values(vendorMap)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 10);

    const topVendors = await Promise.all(
      topVendorIds.map(async (entry) => {
        const seller = await db.user.findUnique({
          where: { id: entry.vendorId },
          select: { id: true, name: true, avatarUrl: true, email: true },
        });
        return {
          ...seller,
          totalSpent: Math.round(entry.spent * 100) / 100,
          transactionCount: entry.count,
        };
      })
    );

    // Savings Tracking - refunded amounts represent savings
    const refundedTransactions = await db.transaction.findMany({
      where: {
        buyerId: user.id,
        status: "REFUNDED",
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: { amount: true },
    });
    const totalSavings = refundedTransactions.reduce((s, t) => s + t.amount, 0);

    // Discount tracking (commission saved if buyer didn't pay commission)
    const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
    const totalCommission = transactions.reduce((s, t) => s + t.commissionAmount, 0);

    // Monthly Comparison
    const thisMonthSpending = transactions.reduce((s, t) => s + t.amount, 0);
    const prevMonthSpending = prevTransactions.reduce((s, t) => s + t.amount, 0);
    const spendingChange = prevMonthSpending > 0
      ? ((thisMonthSpending - prevMonthSpending) / prevMonthSpending) * 100
      : thisMonthSpending > 0 ? 100 : 0;

    const thisMonthCount = transactions.length;
    const prevMonthCount = prevTransactions.length;
    const countChange = prevMonthCount > 0
      ? ((thisMonthCount - prevMonthCount) / prevMonthCount) * 100
      : thisMonthCount > 0 ? 100 : 0;

    return apiResponse({
      spendingTimeSeries,
      purchaseCategories,
      topVendors,
      savings: {
        totalRefunded: Math.round(totalSavings * 100) / 100,
        refundCount: refundedTransactions.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
      },
      monthlyComparison: {
        thisMonth: {
          spending: Math.round(thisMonthSpending * 100) / 100,
          count: thisMonthCount,
        },
        lastMonth: {
          spending: Math.round(prevMonthSpending * 100) / 100,
          count: prevMonthCount,
        },
        spendingChange: Math.round(spendingChange * 10) / 10,
        countChange: Math.round(countChange * 10) / 10,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Buyer analytics error:", error);
    return apiError("Failed to fetch buyer analytics", 500, "INTERNAL_ERROR");
  }
}
