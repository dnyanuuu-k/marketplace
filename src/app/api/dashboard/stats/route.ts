import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);

    if (currentUser.role === "AUTHOR") {
      // Author stats
      const [
        totalEarnings,
        pendingPayout,
        recentSales,
        recentReviews,
        unreadMessages,
        profile,
      ] = await Promise.all([
        db.transaction.aggregate({
          where: { sellerId: currentUser.id, status: "COMPLETED" },
          _sum: { netAmount: true },
          _count: true,
        }),
        db.transaction.aggregate({
          where: { sellerId: currentUser.id, status: "PENDING" },
          _sum: { amount: true },
        }),
        db.transaction.findMany({
          where: { sellerId: currentUser.id },
          include: {
            buyer: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        db.review.findMany({
          where: { authorId: currentUser.id },
          include: {
            reviewer: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        db.notification.count({
          where: { userId: currentUser.id, isRead: false, type: "NEW_MESSAGE" },
        }),
        db.profile.findUnique({ where: { userId: currentUser.id } }),
      ]);

      const completedPayouts = await db.payout.aggregate({
        where: { userId: currentUser.id, status: { in: ["COMPLETED", "APPROVED"] } },
        _sum: { amount: true },
      });

      const totalPaidOut = completedPayouts._sum.amount || 0;
      const grossEarnings = totalEarnings._sum.netAmount || 0;
      const availableForPayout = Math.max(0, grossEarnings - totalPaidOut);

      return apiResponse({
        role: "AUTHOR",
        totalEarnings: grossEarnings,
        pendingPayout: pendingPayout._sum.amount || 0,
        availableForPayout,
        averageRating: profile?.averageRating || 0,
        totalSales: totalEarnings._count,
        recentSales,
        recentReviews,
        unreadMessages,
      });
    } else {
      // Buyer stats
      const [totalSpent, purchaseCount, openDisputes, recentPurchases, savedAuthors] =
        await Promise.all([
          db.transaction.aggregate({
            where: { buyerId: currentUser.id, status: "COMPLETED" },
            _sum: { amount: true },
          }),
          db.transaction.count({ where: { buyerId: currentUser.id } }),
          db.dispute.count({
            where: { openedById: currentUser.id, status: "OPEN" },
          }),
          db.transaction.findMany({
            where: { buyerId: currentUser.id },
            include: {
              seller: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          db.savedAuthor.findMany({
            where: { buyerId: currentUser.id },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  profile: { select: { averageRating: true, totalSales: true, skills: true } },
                },
              },
            },
            take: 6,
          }),
        ]);

      return apiResponse({
        role: "BUYER",
        totalSpent: totalSpent._sum.amount || 0,
        purchaseCount,
        savedAuthorsCount: savedAuthors.length,
        openDisputes,
        recentPurchases,
        savedAuthors: savedAuthors.map((sa) => ({
          id: sa.author.id,
          name: sa.author.name,
          avatarUrl: sa.author.avatarUrl,
          averageRating: sa.author.profile?.averageRating || 0,
          totalSales: sa.author.profile?.totalSales || 0,
          skills: sa.author.profile?.skills ? JSON.parse(sa.author.profile.skills) : [],
        })),
      });
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Dashboard stats error:", error);
    return apiError("Failed to fetch dashboard stats", 500, "INTERNAL_ERROR");
  }
}
