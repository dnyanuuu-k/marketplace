import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

// ---- GET: List wishlist items for the current buyer ----
const listWishlistQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, ["BUYER"]);

    const { searchParams } = new URL(request.url);
    const query = listWishlistQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    const where: Record<string, unknown> = {
      buyerId: user.id,
    };

    // Search filter: name, skills, location
    if (query.search) {
      const q = query.search.toLowerCase();
      where.OR = [
        { author: { name: { contains: q } } },
        { author: { profile: { skills: { contains: q } } } },
        { author: { profile: { location: { contains: q } } } },
      ];
    }

    const [items, total] = await Promise.all([
      db.savedAuthor.findMany({
        where,
        include: {
          author: {
            include: { profile: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.savedAuthor.count({ where }),
    ]);

    const data = items.map((sa) => ({
      id: sa.id,
      authorId: sa.author.id,
      authorName: sa.author.name,
      authorAvatar: sa.author.avatarUrl,
      savedAt: sa.createdAt,
      profile: sa.author.profile
        ? {
            bio: sa.author.profile.bio,
            skills: JSON.parse(sa.author.profile.skills || "[]") as string[],
            location: sa.author.profile.location,
            isVerified: sa.author.profile.isVerified,
            totalSales: sa.author.profile.totalSales,
            averageRating: sa.author.profile.averageRating,
          }
        : null,
    }));

    return apiResponse({
      data,
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Get wishlist error:", error);
    return apiError("Failed to fetch wishlist", 500, "INTERNAL_ERROR");
  }
}

// ---- POST: Add an author to wishlist ----
const addToWishlistSchema = z.object({
  authorId: z.string().min(1, "Author ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, ["BUYER"]);
    const body = await request.json();
    const validated = validateBody(addToWishlistSchema, body);

    if (validated instanceof Response) return validated;

    // Verify the author exists
    const author = await db.user.findUnique({
      where: { id: validated.authorId },
      include: { profile: true },
    });

    if (!author) {
      return apiError("Author not found", 404, "NOT_FOUND");
    }

    if (author.id === user.id) {
      return apiError("Cannot add yourself to wishlist", 400, "INVALID_ACTION");
    }

    // Check if already in wishlist
    const existing = await db.savedAuthor.findUnique({
      where: {
        buyerId_authorId: {
          buyerId: user.id,
          authorId: validated.authorId,
        },
      },
    });

    if (existing) {
      return apiError("Author already in wishlist", 409, "CONFLICT");
    }

    // Add to wishlist
    const savedAuthor = await db.savedAuthor.create({
      data: {
        buyerId: user.id,
        authorId: validated.authorId,
      },
      include: {
        author: {
          include: { profile: true },
        },
      },
    });

    const result = {
      id: savedAuthor.id,
      authorId: savedAuthor.author.id,
      authorName: savedAuthor.author.name,
      authorAvatar: savedAuthor.author.avatarUrl,
      savedAt: savedAuthor.createdAt,
      profile: savedAuthor.author.profile
        ? {
            bio: savedAuthor.author.profile.bio,
            skills: JSON.parse(savedAuthor.author.profile.skills || "[]") as string[],
            location: savedAuthor.author.profile.location,
            isVerified: savedAuthor.author.profile.isVerified,
            totalSales: savedAuthor.author.profile.totalSales,
            averageRating: savedAuthor.author.profile.averageRating,
          }
        : null,
    };

    return apiResponse(result, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Add to wishlist error:", error);
    return apiError("Failed to add to wishlist", 500, "INTERNAL_ERROR");
  }
}

// ---- DELETE: Remove an author from wishlist ----
const removeFromWishlistSchema = z.object({
  authorId: z.string().min(1, "Author ID is required"),
});

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request, ["BUYER"]);

    let authorId: string | undefined;

    // Try body first
    try {
      const body = await request.json();
      const validated = validateBody(removeFromWishlistSchema, body);
      if (validated instanceof Response) return validated;
      authorId = validated.authorId;
    } catch {
      // Fallback to query param
      const { searchParams } = new URL(request.url);
      authorId = searchParams.get("authorId") || undefined;
    }

    if (!authorId) {
      return apiError("Author ID is required", 400, "MISSING_AUTHOR_ID");
    }

    // Find and delete
    const existing = await db.savedAuthor.findUnique({
      where: {
        buyerId_authorId: {
          buyerId: user.id,
          authorId,
        },
      },
    });

    if (!existing) {
      return apiError("Author not found in wishlist", 404, "NOT_FOUND");
    }

    await db.savedAuthor.delete({
      where: { id: existing.id },
    });

    return apiResponse({ success: true, removed: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Remove from wishlist error:", error);
    return apiError("Failed to remove from wishlist", 500, "INTERNAL_ERROR");
  }
}
