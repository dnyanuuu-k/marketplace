import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiResponse, apiError } from "@/lib/api-auth";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(20).default(10),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const authors = await db.user.findMany({
      where: {
        role: "AUTHOR",
        status: "ACTIVE",
        profile: { isVerified: true },
      },
      include: {
        profile: true,
      },
      orderBy: {
        profile: {
          totalSales: "desc",
        },
      },
      take: query.limit,
    });

    const sanitizedAuthors = authors.map((author) => ({
      id: author.id,
      name: author.name,
      avatarUrl: author.avatarUrl,
      profile: author.profile
        ? {
            bio: author.profile.bio,
            skills: JSON.parse(author.profile.skills || "[]"),
            location: author.profile.location,
            isVerified: author.profile.isVerified,
            totalSales: author.profile.totalSales,
            averageRating: author.profile.averageRating,
          }
        : null,
    }));

    return apiResponse(sanitizedAuthors);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Public authors error:", error);
    return apiError("Failed to fetch authors", 500, "INTERNAL_ERROR");
  }
}
