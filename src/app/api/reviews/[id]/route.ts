import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const deleteReviewSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});

const patchReviewSchema = z.object({
  flagged: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["SUPER_ADMIN", "MODERATOR"]);
    const { id } = await params;

    const review = await db.review.findUnique({
      where: { id },
    });

    if (!review) {
      return apiError("Review not found", 404, "NOT_FOUND");
    }

    const body = await request.json();
    const validated = validateBody(patchReviewSchema, body);

    if (validated instanceof Response) return validated;

    const updateData: Record<string, unknown> = {};
    if (validated.flagged !== undefined) {
      updateData.flagged = validated.flagged;
    }

    const updatedReview = await db.review.update({
      where: { id },
      data: updateData,
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
        author: { select: { id: true, name: true, avatarUrl: true } },
        transaction: { select: { id: true, amount: true, description: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: validated.flagged === false ? "REVIEW_FLAG_CLEARED" : "REVIEW_UPDATED",
        targetId: id,
        targetType: "Review",
        metadata: JSON.stringify({
          previousFlagged: review.flagged,
          newFlagged: validated.flagged,
        }),
      },
    });

    return apiResponse(updatedReview);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Patch review error:", error);
    return apiError("Failed to update review", 500, "INTERNAL_ERROR");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["SUPER_ADMIN", "MODERATOR"]);
    const { id } = await params;

    const review = await db.review.findUnique({
      where: { id },
    });

    if (!review) {
      return apiError("Review not found", 404, "NOT_FOUND");
    }

    const body = await request.json();
    const validated = validateBody(deleteReviewSchema, body);

    if (validated instanceof Response) return validated;

    const authorId = review.authorId;

    // Delete the review
    await db.review.delete({ where: { id } });

    // Recalculate author's average rating
    const ratingStats = await db.review.aggregate({
      where: { authorId },
      _avg: { rating: true },
      _count: true,
    });

    await db.profile.upsert({
      where: { userId: authorId },
      update: {
        averageRating: ratingStats._avg.rating || 0,
      },
      create: {
        userId: authorId,
        skills: "[]",
        averageRating: 0,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: "REVIEW_DELETED",
        targetId: id,
        targetType: "Review",
        metadata: JSON.stringify({
          reason: validated.reason,
          reviewRating: review.rating,
          reviewerId: review.reviewerId,
          authorId: review.authorId,
        }),
      },
    });

    // Notify both parties
    await db.notification.createMany({
      data: [
        {
          userId: review.reviewerId,
          type: "ACCOUNT_UPDATE",
          title: "Review Deleted",
          message: `Your review has been removed by a moderator. Reason: ${validated.reason}`,
        },
        {
          userId: authorId,
          type: "REVIEW_RECEIVED",
          title: "Review Removed",
          message: `A review on your profile has been removed by a moderator. Reason: ${validated.reason}`,
        },
      ],
    });

    return apiResponse({ message: "Review deleted successfully" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Delete review error:", error);
    return apiError("Failed to delete review", 500, "INTERNAL_ERROR");
  }
}
