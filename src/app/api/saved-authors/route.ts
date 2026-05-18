import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

// GET: List saved authors for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, ["BUYER"]);

    const savedAuthors = await db.savedAuthor.findMany({
      where: { buyerId: user.id },
      include: {
        author: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = savedAuthors.map((sa) => ({
      id: sa.id,
      authorId: sa.author.id,
      authorName: sa.author.name,
      authorAvatar: sa.author.avatarUrl,
      savedAt: sa.createdAt,
      profile: sa.author.profile
        ? {
            bio: sa.author.profile.bio,
            skills: JSON.parse(sa.author.profile.skills || "[]"),
            location: sa.author.profile.location,
            isVerified: sa.author.profile.isVerified,
            totalSales: sa.author.profile.totalSales,
            averageRating: sa.author.profile.averageRating,
          }
        : null,
    }));

    return apiResponse(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get saved authors error:", error);
    return apiError("Failed to fetch saved authors", 500, "INTERNAL_ERROR");
  }
}

const saveAuthorSchema = z.object({
  authorId: z.string().min(1, "Author ID is required"),
});

// POST: Save or unsave an author (toggle)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, ["BUYER"]);
    const body = await request.json();
    const validated = validateBody(saveAuthorSchema, body);

    if (validated instanceof Response) return validated;

    // Verify the author exists
    const author = await db.user.findUnique({
      where: { id: validated.authorId },
    });

    if (!author) {
      return apiError("Author not found", 404, "NOT_FOUND");
    }

    if (author.id === user.id) {
      return apiError("Cannot save yourself", 400, "INVALID_ACTION");
    }

    // Check if already saved
    const existing = await db.savedAuthor.findUnique({
      where: {
        buyerId_authorId: {
          buyerId: user.id,
          authorId: validated.authorId,
        },
      },
    });

    if (existing) {
      // Unsave
      await db.savedAuthor.delete({
        where: { id: existing.id },
      });
      return apiResponse({ saved: false });
    } else {
      // Save
      await db.savedAuthor.create({
        data: {
          buyerId: user.id,
          authorId: validated.authorId,
        },
      });
      return apiResponse({ saved: true }, 201);
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Save author error:", error);
    return apiError("Failed to save author", 500, "INTERNAL_ERROR");
  }
}
