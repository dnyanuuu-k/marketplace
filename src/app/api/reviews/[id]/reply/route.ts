import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const replySchema = z.object({
  reply: z.string().min(1, "Reply is required").max(2000, "Reply is too long"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["AUTHOR"]);
    const { id } = await params;
    const body = await request.json();
    const validated = validateBody(replySchema, body);

    if (validated instanceof Response) return validated;

    const review = await db.review.findUnique({
      where: { id },
    });

    if (!review) {
      return apiError("Review not found", 404, "NOT_FOUND");
    }

    // Only the author who received the review can reply
    if (review.authorId !== currentUser.id) {
      return apiError("Only the reviewed author can reply", 403, "FORBIDDEN");
    }

    const updatedReview = await db.review.update({
      where: { id },
      data: {
        reply: validated.reply,
        repliedAt: new Date(),
      },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Notify the reviewer
    await db.notification.create({
      data: {
        userId: review.reviewerId,
        type: "REVIEW_RECEIVED",
        title: "Review Reply",
        message: `${currentUser.name} replied to your review`,
        link: `/reviews/${id}`,
      },
    });

    return apiResponse(updatedReview);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Reply to review error:", error);
    return apiError("Failed to reply to review", 500, "INTERNAL_ERROR");
  }
}
