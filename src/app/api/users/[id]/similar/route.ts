import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiResponse, apiError } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the target author's profile for matching
    const targetUser = await db.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!targetUser || (targetUser.role !== "AUTHOR" && targetUser.role !== "SUPER_ADMIN")) {
      return apiError("Author not found", 404, "NOT_FOUND");
    }

    const targetSkills: string[] = targetUser.profile
      ? JSON.parse(targetUser.profile.skills || "[]")
      : [];
    const targetLocation = targetUser.profile?.location || "";
    const targetRating = targetUser.profile?.averageRating || 0;

    // Find similar authors based on shared skills, same location, or similar ratings
    // Get all active authors (exclude the target user)
    const allAuthors = await db.user.findMany({
      where: {
        role: "AUTHOR",
        status: "ACTIVE",
        id: { not: id },
      },
      include: { profile: true },
      take: 50, // Limit pool for scoring
    });

    // Score each author based on similarity
    const scored = allAuthors.map((author) => {
      let score = 0;
      const authorSkills: string[] = author.profile
        ? JSON.parse(author.profile.skills || "[]")
        : [];

      // Shared skills scoring (highest weight)
      const sharedSkills = targetSkills.filter((s) =>
        authorSkills.some((as2) => as2.toLowerCase() === s.toLowerCase())
      );
      score += sharedSkills.length * 3;

      // Same location bonus
      if (
        targetLocation &&
        author.profile?.location &&
        author.profile.location.toLowerCase() === targetLocation.toLowerCase()
      ) {
        score += 2;
      }

      // Similar rating bonus (within 1 star)
      const authorRating = author.profile?.averageRating || 0;
      if (Math.abs(authorRating - targetRating) <= 1 && authorRating > 0) {
        score += 1;
      }

      // Verified bonus
      if (author.profile?.isVerified) {
        score += 1;
      }

      return { author, score, sharedSkills };
    });

    // Sort by score descending, take top 3
    const similar = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter((s) => s.score > 0);

    // If not enough similar authors with score > 0, fill with top-rated authors
    if (similar.length < 3) {
      const existingIds = new Set(similar.map((s) => s.author.id));
      const remaining = allAuthors
        .filter((a) => !existingIds.has(a.id))
        .sort((a, b) => (b.profile?.totalSales || 0) - (a.profile?.totalSales || 0))
        .slice(0, 3 - similar.length);

      for (const author of remaining) {
        const authorSkills: string[] = author.profile
          ? JSON.parse(author.profile.skills || "[]")
          : [];
        const sharedSkills = targetSkills.filter((s) =>
          authorSkills.some((as2) => as2.toLowerCase() === s.toLowerCase())
        );
        similar.push({ author, score: 0, sharedSkills });
      }
    }

    // Format response
    const result = similar.map(({ author }) => {
      const profile = author.profile
        ? {
            bio: author.profile.bio,
            skills: JSON.parse(author.profile.skills || "[]"),
            location: author.profile.location,
            isVerified: author.profile.isVerified,
            totalSales: author.profile.totalSales,
            averageRating: author.profile.averageRating,
          }
        : null;

      return {
        id: author.id,
        name: author.name,
        avatarUrl: author.avatarUrl,
        profile,
      };
    });

    return apiResponse(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get similar creators error:", error);
    return apiError("Failed to fetch similar creators", 500, "INTERNAL_ERROR");
  }
}
