import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

// ── Helpers ──
function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatProject(project: Record<string, unknown>) {
  return {
    ...project,
    images: parseJsonArray(project.images as string | null),
    tags: parseJsonArray(project.tags as string | null),
    features: parseJsonArray(project.features as string | null),
  };
}

// ── Body schema for PATCH (update project) ──
const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(10000).optional(),
  shortDescription: z.string().max(500).optional().nullable(),
  category: z.enum([
    "DESIGN", "DEVELOPMENT", "WRITING", "MARKETING",
    "VIDEO", "MUSIC", "ANALYTICS", "OTHER",
  ]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"]).optional(),
  price: z.number().positive().optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  demoUrl: z.string().url().optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  featured: z.boolean().optional(),
});

// ── GET: Get single project by ID ──
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profile: { select: { isVerified: true, bio: true, location: true } },
          },
        },
        projectReviews: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return apiError("Project not found", 404, "NOT_FOUND");
    }

    // Increment totalViews (fire-and-forget, don't block the response)
    await db.project.update({
      where: { id },
      data: { totalViews: { increment: 1 } },
    });

    return apiResponse(formatProject(project as unknown as Record<string, unknown>));
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get project error:", error);
    return apiError("Failed to fetch project", 500, "INTERNAL_ERROR");
  }
}

// ── PATCH: Update project (only the author who owns it) ──
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["AUTHOR", "SUPER_ADMIN"]);
    const { id } = await params;

    // Check project exists
    const existingProject = await db.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return apiError("Project not found", 404, "NOT_FOUND");
    }

    // Only the project author (or super admin) can update
    if (existingProject.authorId !== currentUser.id && currentUser.role !== "SUPER_ADMIN") {
      return apiError("You do not have permission to update this project", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const validated = validateBody(updateProjectSchema, body);

    if (validated instanceof Response) return validated;

    // Build update data – convert arrays to JSON strings
    const updateData: Record<string, unknown> = {};

    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.shortDescription !== undefined) updateData.shortDescription = validated.shortDescription;
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.price !== undefined) updateData.price = validated.price;
    if (validated.thumbnailUrl !== undefined) updateData.thumbnailUrl = validated.thumbnailUrl;
    if (validated.images !== undefined) updateData.images = JSON.stringify(validated.images);
    if (validated.tags !== undefined) updateData.tags = JSON.stringify(validated.tags);
    if (validated.features !== undefined) updateData.features = JSON.stringify(validated.features);
    if (validated.demoUrl !== undefined) updateData.demoUrl = validated.demoUrl;
    if (validated.sourceUrl !== undefined) updateData.sourceUrl = validated.sourceUrl;
    if (validated.featured !== undefined && currentUser.role === "SUPER_ADMIN") {
      updateData.featured = validated.featured;
    }

    const updatedProject = await db.project.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profile: { select: { isVerified: true } },
          },
        },
      },
    });

    return apiResponse(formatProject(updatedProject as unknown as Record<string, unknown>));
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update project error:", error);
    return apiError("Failed to update project", 500, "INTERNAL_ERROR");
  }
}
