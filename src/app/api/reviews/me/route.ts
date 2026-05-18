import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);

    if (currentUser.role === "AUTHOR") {
      const reviews = await db.review.findMany({
        where: { authorId: currentUser.id },
        include: {
          reviewer: { select: { id: true, name: true, avatarUrl: true } },
          transaction: { select: { id: true, amount: true, description: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const stats = await db.review.aggregate({
        where: { authorId: currentUser.id },
        _avg: { rating: true },
        _count: true,
      });

      const repliedCount = await db.review.count({
        where: { authorId: currentUser.id, reply: { not: null } },
      });

      return apiResponse({
        type: "received",
        data: reviews,
        total: stats._count,
        averageRating: stats._avg.rating || 0,
        responseRate: stats._count > 0 ? Math.round((repliedCount / stats._count) * 100) : 0,
      });
    } else {
      const reviews = await db.review.findMany({
        where: { reviewerId: currentUser.id },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          transaction: { select: { id: true, amount: true, description: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const stats = await db.review.aggregate({
        where: { reviewerId: currentUser.id },
        _avg: { rating: true },
        _count: true,
      });

      return apiResponse({
        type: "given",
        data: reviews,
        total: stats._count,
        averageRating: stats._avg.rating || 0,
      });
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("My reviews error:", error);
    return apiError("Failed to fetch reviews", 500, "INTERNAL_ERROR");
  }
}
