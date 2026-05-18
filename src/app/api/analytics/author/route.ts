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
    const user = await requireAuth(request, ["AUTHOR"]);

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

    // Fetch completed transactions for this author in the period
    const transactions = await db.transaction.findMany({
      where: {
        sellerId: user.id,
        status: "COMPLETED",
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        amount: true,
        netAmount: true,
        commissionAmount: true,
        description: true,
        createdAt: true,
        buyer: {
          select: { id: true, name: true, location: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Previous period transactions for comparison
    const prevTransactions = await db.transaction.findMany({
      where: {
        sellerId: user.id,
        status: "COMPLETED",
        createdAt: { gte: prevDateFrom, lt: dateFrom },
      },
      select: { amount: true, netAmount: true },
    });

    // Earnings Over Time - daily time series
    const dailyEarnings: Record<string, { earnings: number; count: number }> = {};
    for (const tx of transactions) {
      const dateKey = tx.createdAt.toISOString().split("T")[0];
      if (!dailyEarnings[dateKey]) dailyEarnings[dateKey] = { earnings: 0, count: 0 };
      dailyEarnings[dateKey].earnings += tx.netAmount;
      dailyEarnings[dateKey].count += 1;
    }

    const earningsTimeSeries: Array<{ date: string; earnings: number; count: number }> = [];
    const current = new Date(dateFrom);
    while (current <= dateTo) {
      const dateKey = current.toISOString().split("T")[0];
      const dayData = dailyEarnings[dateKey] || { earnings: 0, count: 0 };
      earningsTimeSeries.push({
        date: dateKey,
        earnings: Math.round(dayData.earnings * 100) / 100,
        count: dayData.count,
      });
      current.setDate(current.getDate() + 1);
    }

    // Sales by Category - group by description prefix
    const categoryMap: Record<string, { earnings: number; count: number }> = {};
    for (const tx of transactions) {
      const category = tx.description?.split(" - ")[0]?.trim() || "Other";
      if (!categoryMap[category]) categoryMap[category] = { earnings: 0, count: 0 };
      categoryMap[category].earnings += tx.netAmount;
      categoryMap[category].count += 1;
    }
    const salesByCategory = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      earnings: Math.round(data.earnings * 100) / 100,
      count: data.count,
    }));

    // Top Performing Products - group by description
    const productMap: Record<string, { revenue: number; sales: number }> = {};
    for (const tx of transactions) {
      const product = tx.description || "Unnamed Product";
      if (!productMap[product]) productMap[product] = { revenue: 0, sales: 0 };
      productMap[product].revenue += tx.netAmount;
      productMap[product].sales += 1;
    }
    const topProducts = Object.entries(productMap)
      .map(([name, data]) => ({ name, revenue: Math.round(data.revenue * 100) / 100, sales: data.sales }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Client Demographics
    const clientLocations: Record<string, number> = {};
    const buyerIds = new Set<string>();
    let repeatBuyers = 0;
    let newBuyers = 0;

    // Get all-time buyer transaction counts
    const allBuyerTxCounts = await db.transaction.groupBy({
      by: ["buyerId"],
      where: { sellerId: user.id, status: "COMPLETED" },
      _count: true,
    });
    const buyerCountMap = Object.fromEntries(allBuyerTxCounts.map((b) => [b.buyerId, b._count]));

    for (const tx of transactions) {
      buyerIds.add(tx.buyer.id);
      const loc = tx.buyer.location || "Unknown";
      clientLocations[loc] = (clientLocations[loc] || 0) + 1;
    }

    for (const buyerId of buyerIds) {
      if ((buyerCountMap[buyerId] || 0) > 1) {
        repeatBuyers++;
      } else {
        newBuyers++;
      }
    }

    const clientDemographics = {
      locations: Object.entries(clientLocations)
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      repeatVsNew: { repeat: repeatBuyers, new: newBuyers },
    };

    // Monthly Comparison
    const thisMonthEarnings = transactions.reduce((s, t) => s + t.netAmount, 0);
    const prevMonthEarnings = prevTransactions.reduce((s, t) => s + t.netAmount, 0);
    const earningsChange = prevMonthEarnings > 0
      ? ((thisMonthEarnings - prevMonthEarnings) / prevMonthEarnings) * 100
      : thisMonthEarnings > 0 ? 100 : 0;

    const thisMonthCount = transactions.length;
    const prevMonthCount = prevTransactions.length;
    const countChange = prevMonthCount > 0
      ? ((thisMonthCount - prevMonthCount) / prevMonthCount) * 100
      : thisMonthCount > 0 ? 100 : 0;

    // Top Vendors (for author context, these are top buyers)
    const topBuyers = await db.transaction.groupBy({
      by: ["buyerId"],
      where: { sellerId: user.id, status: "COMPLETED" },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });

    const enrichedTopBuyers = await Promise.all(
      topBuyers.map(async (entry) => {
        const buyer = await db.user.findUnique({
          where: { id: entry.buyerId },
          select: { id: true, name: true, avatarUrl: true, email: true },
        });
        return {
          ...buyer,
          totalSpent: entry._sum.amount || 0,
          transactionCount: entry._count,
        };
      })
    );

    return apiResponse({
      earningsTimeSeries,
      salesByCategory,
      topProducts,
      clientDemographics,
      monthlyComparison: {
        thisMonth: {
          earnings: Math.round(thisMonthEarnings * 100) / 100,
          count: thisMonthCount,
        },
        lastMonth: {
          earnings: Math.round(prevMonthEarnings * 100) / 100,
          count: prevMonthCount,
        },
        earningsChange: Math.round(earningsChange * 10) / 10,
        countChange: Math.round(countChange * 10) / 10,
      },
      topBuyers: enrichedTopBuyers,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Author analytics error:", error);
    return apiError("Failed to fetch author analytics", 500, "INTERNAL_ERROR");
  }
}
