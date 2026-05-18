import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

// ── Query schema for GET (list reviews) ──
const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

// ── Body schema for POST (create review) ──
const createReviewSchema = z.object({
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().min(1, "Comment is required").max(2000, "Comment is too long"),
});

// ── GET: Get reviews for a project ──
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const query = listReviewsQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id },
    });

    if (!project) {
      return apiError("Project not found", 404, "NOT_FOUND");
    }

    const where: Record<string, unknown> = {
      projectId: id,
    };

    if (query.rating) {
      where.rating = query.rating;
    }

    const [reviews, total] = await Promise.all([
      db.projectReview.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.projectReview.count({ where }),
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
    console.error("List project reviews error:", error);
    return apiError("Failed to fetch reviews", 500, "INTERNAL_ERROR");
  }
}

// ── POST: Create a review (only buyers who purchased the project) ──
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["BUYER", "SUPER_ADMIN"]);
    const { id } = await params;

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id },
    });

    if (!project) {
      return apiError("Project not found", 404, "NOT_FOUND");
    }

    // Check that the buyer has purchased this project (COMPLETED transaction)
    const completedTransaction = await db.transaction.findFirst({
      where: {
        projectId: id,
        buyerId: currentUser.id,
        status: "COMPLETED",
      },
    });

    if (!completedTransaction && currentUser.role !== "SUPER_ADMIN") {
      return apiError(
        "You can only review projects you have purchased",
        403,
        "FORBIDDEN"
      );
    }

    // Check if the user already reviewed this project
    const existingReview = await db.projectReview.findFirst({
      where: {
        projectId: id,
        userId: currentUser.id,
      },
    });

    if (existingReview) {
      return apiError(
        "You have already reviewed this project",
        409,
        "REVIEW_EXISTS"
      );
    }

    const body = await request.json();
    const validated = validateBody(createReviewSchema, body);

    if (validated instanceof Response) return validated;

    // Create the review
    const review = await db.projectReview.create({
      data: {
        projectId: id,
        userId: currentUser.id,
        rating: validated.rating,
        comment: validated.comment,
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Update project averageRating and reviewCount
    const ratingStats = await db.projectReview.aggregate({
      where: { projectId: id },
      _avg: { rating: true },
      _count: true,
    });

    await db.project.update({
      where: { id },
      data: {
        averageRating: ratingStats._avg.rating || 0,
        reviewCount: ratingStats._count,
      },
    });

    // Notify the project author
    await db.notification.create({
      data: {
        userId: project.authorId,
        type: "REVIEW_RECEIVED",
        title: "New Project Review",
        message: `${currentUser.name} left a ${validated.rating}-star review on your project "${project.title}"`,
        link: `/projects/${id}`,
      },
    });

    return apiResponse(review, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Create project review error:", error);
    return apiError("Failed to create review", 500, "INTERNAL_ERROR");
  }
}
