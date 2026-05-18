import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request, ["SUPER_ADMIN"]);
    const { id } = await params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return apiError("User not found", 404, "NOT_FOUND");
    }

    // Get transaction counts
    const [buyerTransactions, sellerTransactions] = await Promise.all([
      db.transaction.count({ where: { buyerId: id } }),
      db.transaction.count({ where: { sellerId: id } }),
    ]);

    // Get total earnings (as seller with completed transactions)
    const earningsResult = await db.transaction.aggregate({
      where: { sellerId: id, status: "COMPLETED" },
      _sum: { netAmount: true },
    });

    // Get average rating
    const ratingResult = await db.review.aggregate({
      where: { authorId: id },
      _avg: { rating: true },
    });

    // Get total reviews received
    const totalReviews = await db.review.count({ where: { authorId: id } });

    // Get dispute count
    const openDisputes = await db.dispute.count({
      where: { openedById: id, status: "OPEN" },
    });

    return apiResponse({
      userId: id,
      transactionCount: {
        asBuyer: buyerTransactions,
        asSeller: sellerTransactions,
        total: buyerTransactions + sellerTransactions,
      },
      totalEarnings: earningsResult._sum.netAmount || 0,
      averageRating: ratingResult._avg.rating || 0,
      totalReviews,
      openDisputes,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get user stats error:", error);
    return apiError("Failed to fetch user stats", 500, "INTERNAL_ERROR");
  }
}
