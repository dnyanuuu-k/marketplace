import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiResponse, apiError } from "@/lib/api-auth";

const browseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
  search: z.string().optional(),
  skill: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  location: z.string().optional(),
  sortBy: z.enum(["newest", "highest_rated", "most_sales"]).default("newest"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = browseQuerySchema.parse(Object.fromEntries(searchParams));

    // Build where clause for authors
    const where: Record<string, unknown> = {
      role: "AUTHOR",
      status: "ACTIVE",
    };

    // Profile-level filters
    const profileWhere: Record<string, unknown> = {};

    if (query.minRating) {
      profileWhere.averageRating = { gte: query.minRating };
    }

    if (query.location) {
      profileWhere.location = { contains: query.location };
    }

    if (query.skill) {
      profileWhere.skills = { contains: query.skill };
    }

    if (Object.keys(profileWhere).length > 0) {
      where.profile = profileWhere;
    } else {
      where.profile = { isNot: null };
    }

    // Search filter: name, bio, skills
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { profile: { bio: { contains: query.search } } },
        { profile: { skills: { contains: query.search } } },
      ];
    }

    // Determine sort order
    let orderBy: Record<string, unknown>;
    switch (query.sortBy) {
      case "highest_rated":
        orderBy = { profile: { averageRating: "desc" } };
        break;
      case "most_sales":
        orderBy = { profile: { totalSales: "desc" } };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [authors, total] = await Promise.all([
      db.user.findMany({
        where,
        include: { profile: true },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.user.count({ where }),
    ]);

    const authorIds = authors.map((a) => a.id);

    // Get review counts for each author
    const reviewCounts = await db.review.groupBy({
      by: ["authorId"],
      where: { authorId: { in: authorIds } },
      _count: true,
    });

    const reviewCountMap = new Map(
      reviewCounts.map((r) => [r.authorId, r._count])
    );

    const sanitizedAuthors = authors.map((author) => ({
      id: author.id,
      name: author.name,
      avatarUrl: author.avatarUrl,
      createdAt: author.createdAt,
      profile: author.profile
        ? {
            bio: author.profile.bio,
            skills: JSON.parse(author.profile.skills || "[]"),
            portfolioImages: JSON.parse(author.profile.portfolioImages || "[]"),
            socialLinks: JSON.parse(author.profile.socialLinks || "{}"),
            location: author.profile.location,
            coverImageUrl: author.profile.coverImageUrl,
            isVerified: author.profile.isVerified,
            totalSales: author.profile.totalSales,
            averageRating: author.profile.averageRating,
          }
        : null,
      reviewCount: reviewCountMap.get(author.id) || 0,
    }));

    // Get popular skills for sidebar
    const allAuthors = await db.user.findMany({
      where: { role: "AUTHOR", status: "ACTIVE", profile: { isNot: null } },
      include: { profile: true },
      take: 200,
    });

    const skillCounts = new Map<string, number>();
    allAuthors.forEach((a) => {
      if (a.profile) {
        try {
          const skills: string[] = JSON.parse(a.profile.skills || "[]");
          skills.forEach((skill) => {
            skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
          });
        } catch {
          // Skip invalid JSON
        }
      }
    });

    const popularSkills = Array.from(skillCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }));

    // Get popular locations
    const locationCounts = new Map<string, number>();
    allAuthors.forEach((a) => {
      if (a.profile?.location) {
        locationCounts.set(
          a.profile.location,
          (locationCounts.get(a.profile.location) || 0) + 1
        );
      }
    });

    const popularLocations = Array.from(locationCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([location, count]) => ({ location, count }));

    return apiResponse({
      data: sanitizedAuthors,
      total,
      page: query.page,
      limit: query.limit,
      popularSkills,
      popularLocations,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Browse authors error:", error);
    return apiError("Failed to fetch authors", 500, "INTERNAL_ERROR");
  }
}
