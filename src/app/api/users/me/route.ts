import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);

    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      include: { profile: true },
    });

    if (!user) {
      return apiError("User not found", 404, "NOT_FOUND");
    }

    const { passwordHash: _, ...safeUser } = user;

    return apiResponse({
      ...safeUser,
      profile: safeUser.profile
        ? {
            ...safeUser.profile,
            skills: safeUser.profile.skills ? JSON.parse(safeUser.profile.skills) : [],
            portfolioImages: safeUser.profile.portfolioImages
              ? JSON.parse(safeUser.profile.portfolioImages)
              : [],
            socialLinks: safeUser.profile.socialLinks
              ? JSON.parse(safeUser.profile.socialLinks)
              : {},
          }
        : null,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get me error:", error);
    return apiError("Failed to fetch user", 500, "INTERNAL_ERROR");
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  skills: z.array(z.string()).optional(),
  socialLinks: z
    .object({
      github: z.string().url().optional().nullable(),
      linkedin: z.string().url().optional().nullable(),
      twitter: z.string().url().optional().nullable(),
      portfolio: z.string().url().optional().nullable(),
    })
    .optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  portfolioImages: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const body = await request.json();
    const validated = updateProfileSchema.safeParse(body);

    if (!validated.success) {
      return apiError("Invalid request data", 400, "VALIDATION_ERROR");
    }

    const userData: Record<string, unknown> = {};
    const profileData: Record<string, unknown> = {};

    if (validated.data.name !== undefined) userData.name = validated.data.name;
    if (validated.data.avatarUrl !== undefined) userData.avatarUrl = validated.data.avatarUrl;

    if (validated.data.bio !== undefined) profileData.bio = validated.data.bio;
    if (validated.data.location !== undefined) profileData.location = validated.data.location;
    if (validated.data.skills !== undefined)
      profileData.skills = JSON.stringify(validated.data.skills);
    if (validated.data.socialLinks !== undefined)
      profileData.socialLinks = JSON.stringify(validated.data.socialLinks);
    if (validated.data.coverImageUrl !== undefined)
      profileData.coverImageUrl = validated.data.coverImageUrl;
    if (validated.data.portfolioImages !== undefined)
      profileData.portfolioImages = JSON.stringify(validated.data.portfolioImages);

    // Update user fields if any
    if (Object.keys(userData).length > 0) {
      await db.user.update({
        where: { id: currentUser.id },
        data: userData,
      });
    }

    // Update profile fields if any
    if (Object.keys(profileData).length > 0) {
      await db.profile.upsert({
        where: { userId: currentUser.id },
        update: profileData,
        create: {
          userId: currentUser.id,
          ...profileData,
          skills: (profileData.skills as string) || "[]",
          portfolioImages: (profileData.portfolioImages as string) || "[]",
          socialLinks: (profileData.socialLinks as string) || "{}",
        },
      });
    }

    // Fetch updated user
    const updatedUser = await db.user.findUnique({
      where: { id: currentUser.id },
      include: { profile: true },
    });

    const { passwordHash: _, ...safeUser } = updatedUser!;

    return apiResponse({
      ...safeUser,
      profile: safeUser.profile
        ? {
            ...safeUser.profile,
            skills: safeUser.profile.skills ? JSON.parse(safeUser.profile.skills) : [],
            portfolioImages: safeUser.profile.portfolioImages
              ? JSON.parse(safeUser.profile.portfolioImages)
              : [],
            socialLinks: safeUser.profile.socialLinks
              ? JSON.parse(safeUser.profile.socialLinks)
              : {},
          }
        : null,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update me error:", error);
    return apiError("Failed to update profile", 500, "INTERNAL_ERROR");
  }
}
