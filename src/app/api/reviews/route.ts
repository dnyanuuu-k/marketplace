import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  authorId: z.string().optional(),
  reviewerId: z.string().optional(),
  flagged: z.enum(["true", "false"]).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  search: z.string().optional(),
});

const createReviewSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().min(1, "Comment is required").max(2000, "Comment is too long"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = listReviewsQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    const where: Record<string, unknown> = {};
    if (query.authorId) where.authorId = query.authorId;
    if (query.reviewerId) where.reviewerId = query.reviewerId;
    if (query.flagged === "true") where.flagged = true;
    if (query.flagged === "false") where.flagged = false;
    if (query.rating) where.rating = query.rating;
    if (query.search) {
      where.OR = [
        { comment: { contains: query.search } },
      ];
    }

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        include: {
          reviewer: { select: { id: true, name: true, avatarUrl: true } },
          author: { select: { id: true, name: true, avatarUrl: true } },
          transaction: { select: { id: true, amount: true, description: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.review.count({ where }),
    ]);

    return apiResponse({
      data: reviews,
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("List reviews error:", error);
    return apiError("Failed to fetch reviews", 500, "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request, ["BUYER", "SUPER_ADMIN"]);
    const body = await request.json();
    const validated = validateBody(createReviewSchema, body);

    if (validated instanceof Response) return validated;

    // Verify transaction exists and belongs to buyer
    const transaction = await db.transaction.findUnique({
      where: { id: validated.transactionId },
    });

    if (!transaction) {
      return apiError("Transaction not found", 404, "NOT_FOUND");
    }

    if (transaction.buyerId !== currentUser.id && currentUser.role !== "SUPER_ADMIN") {
      return apiError("You can only review your own transactions", 403, "FORBIDDEN");
    }

    // Transaction must be completed
    if (transaction.status !== "COMPLETED") {
      return apiError("You can only review completed transactions", 400, "INVALID_TRANSACTION");
    }

    // Check if review already exists for this transaction
    const existingReview = await db.review.findUnique({
      where: { transactionId: validated.transactionId },
    });

    if (existingReview) {
      return apiError("A review already exists for this transaction", 409, "REVIEW_EXISTS");
    }

    // Create review
    const review = await db.review.create({
      data: {
        transactionId: validated.transactionId,
        reviewerId: currentUser.id,
        authorId: transaction.sellerId,
        rating: validated.rating,
        comment: validated.comment,
      },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Update author's averageRating
    const ratingStats = await db.review.aggregate({
      where: { authorId: transaction.sellerId },
      _avg: { rating: true },
      _count: true,
    });

    await db.profile.upsert({
      where: { userId: transaction.sellerId },
      update: {
        averageRating: ratingStats._avg.rating || 0,
      },
      create: {
        userId: transaction.sellerId,
        skills: "[]",
        averageRating: ratingStats._avg.rating || 0,
      },
    });

    // Notify the author
    await db.notification.create({
      data: {
        userId: transaction.sellerId,
        type: "REVIEW_RECEIVED",
        title: "New Review",
        message: `${currentUser.name} left you a ${validated.rating}-star review`,
        link: `/reviews/${review.id}`,
      },
    });

    return apiResponse(review, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Create review error:", error);
    return apiError("Failed to create review", 500, "INTERNAL_ERROR");
  }
}
