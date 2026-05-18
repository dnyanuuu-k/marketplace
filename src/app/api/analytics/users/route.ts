import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

const usersQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "custom"]).default("30d"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ["SUPER_ADMIN"]);

    const { searchParams } = new URL(request.url);
    const query = usersQuerySchema.parse(Object.fromEntries(searchParams));

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

    // Fetch users registered in the date range
    const users = await db.user.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        createdAt: true,
        role: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by date for time-series data
    const dailyData: Record<string, { total: number; authors: number; buyers: number; admins: number }> = {};

    for (const user of users) {
      const dateKey = user.createdAt.toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { total: 0, authors: 0, buyers: 0, admins: 0 };
      }
      dailyData[dateKey].total += 1;
      if (user.role === "AUTHOR") dailyData[dateKey].authors += 1;
      if (user.role === "BUYER") dailyData[dateKey].buyers += 1;
      if (user.role === "SUPER_ADMIN" || user.role === "MODERATOR") dailyData[dateKey].admins += 1;
    }

    // Fill in missing dates
    const timeSeries: Array<{
      date: string;
      total: number;
      authors: number;
      buyers: number;
      admins: number;
    }> = [];

    const current = new Date(dateFrom);
    while (current <= dateTo) {
      const dateKey = current.toISOString().split("T")[0];
      const dayData = dailyData[dateKey] || { total: 0, authors: 0, buyers: 0, admins: 0 };
      timeSeries.push({
        date: dateKey,
        ...dayData,
      });
      current.setDate(current.getDate() + 1);
    }

    // Summary counts
    const totalUsers = await db.user.count();
    const totalAuthors = await db.user.count({ where: { role: "AUTHOR" } });
    const totalBuyers = await db.user.count({ where: { role: "BUYER" } });
    const newUsersInPeriod = users.length;

    return apiResponse({
      timeSeries,
      summary: {
        totalUsers,
        totalAuthors,
        totalBuyers,
        newUsersInPeriod,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Analytics users error:", error);
    return apiError("Failed to fetch user analytics", 500, "INTERNAL_ERROR");
  }
}
