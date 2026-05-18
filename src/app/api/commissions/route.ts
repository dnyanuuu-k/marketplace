import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

const commissionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ["SUPER_ADMIN"]);

    const { searchParams } = new URL(request.url);
    const query = commissionQuerySchema.parse(Object.fromEntries(searchParams));

    const [commissions, total] = await Promise.all([
      db.commissionLog.findMany({
        include: {
          transaction: {
            include: {
              seller: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.commissionLog.count(),
    ]);

    // Summary stats
    const [totalCommission, thisMonthCommission] = await Promise.all([
      db.commissionLog.aggregate({
        _sum: { commissionAmount: true },
        _avg: { rate: true },
      }),
      db.commissionLog.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { commissionAmount: true },
      }),
    ]);

    return apiResponse({
      data: commissions,
      total,
      page: query.page,
      limit: query.limit,
      summary: {
        totalCommission: totalCommission._sum.commissionAmount || 0,
        averageRate: totalCommission._avg.rate || 0,
        thisMonthCommission: thisMonthCommission._sum.commissionAmount || 0,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("List commissions error:", error);
    return apiError("Failed to fetch commissions", 500, "INTERNAL_ERROR");
  }
}
