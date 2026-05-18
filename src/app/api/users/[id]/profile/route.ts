import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiResponse, apiError, getSessionUser } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user) {
      return apiError("User not found", 404, "NOT_FOUND");
    }

    if (user.role !== "AUTHOR" && user.role !== "SUPER_ADMIN") {
      return apiError("User is not a creator", 400, "INVALID_ROLE");
    }

    // Parse profile JSON fields
    const profile = user.profile
      ? {
          ...user.profile,
          skills: JSON.parse(user.profile.skills || "[]"),
          portfolioImages: JSON.parse(user.profile.portfolioImages || "[]"),
          socialLinks: JSON.parse(user.profile.socialLinks || "{}"),
        }
      : null;

    // Get review count
    const reviewStats = await db.review.aggregate({
      where: { authorId: id },
      _count: true,
      _avg: { rating: true },
    });

    // Get rating distribution
    const ratingDistribution = await db.review.groupBy({
      by: ["rating"],
      where: { authorId: id },
      _count: true,
    });

    const distribution = [1, 2, 3, 4, 5].map((rating) => {
      const found = ratingDistribution.find((r) => r.rating === rating);
      return { rating, count: found?._count || 0 };
    });

    // Check if current user has saved this author
    let isSaved = false;
    const currentUser = await getSessionUser(request);
    if (currentUser && currentUser.id !== id) {
      const savedRecord = await db.savedAuthor.findUnique({
        where: {
          buyerId_authorId: {
            buyerId: currentUser.id,
            authorId: id,
          },
        },
      });
      isSaved = !!savedRecord;
    }

    // Get completion rate from completed transactions
    const totalTransactions = await db.transaction.count({
      where: { sellerId: id },
    });
    const completedTransactions = await db.transaction.count({
      where: { sellerId: id, status: "COMPLETED" },
    });
    const completionRate = totalTransactions > 0
      ? Math.round((completedTransactions / totalTransactions) * 100)
      : 100;

    const result = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      profile,
      stats: {
        totalSales: profile?.totalSales || 0,
        averageRating: reviewStats._avg.rating || profile?.averageRating || 0,
        totalReviews: reviewStats._count,
        completionRate,
        averageResponseTime: "~2 hours", // Mock data
      },
      ratingDistribution: distribution,
      isSaved,
      isOwnProfile: currentUser?.id === id,
    };

    return apiResponse(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get profile error:", error);
    return apiError("Failed to fetch profile", 500, "INTERNAL_ERROR");
  }
}
