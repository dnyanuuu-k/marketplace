import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

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

// ── Query schema for GET (my projects) ──
const myProjectsQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ── GET: Get current author's projects (all statuses) ──
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request, ["AUTHOR", "SUPER_ADMIN"]);

    const { searchParams } = new URL(request.url);
    const query = myProjectsQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    // Build where clause – all statuses for the author
    const where: Record<string, unknown> = {
      authorId: currentUser.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        include: {
          _count: {
            select: { transactions: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.project.count({ where }),
    ]);

    // Add sales stats and format
    const formattedProjects = projects.map((p) => {
      const { _count, ...rest } = p;
      return {
        ...formatProject(rest as unknown as Record<string, unknown>),
        salesCount: _count.transactions,
      };
    });

    return apiResponse({
      data: formattedProjects,
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Get my projects error:", error);
    return apiError("Failed to fetch projects", 500, "INTERNAL_ERROR");
  }
}
