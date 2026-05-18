import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

// ── Query schema for GET (browse/list projects) ──
const browseProjectsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.enum([
    "DESIGN", "DEVELOPMENT", "WRITING", "MARKETING",
    "VIDEO", "MUSIC", "ANALYTICS", "OTHER",
  ]).optional(),
  authorId: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(["newest", "popular", "price_low", "price_high"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  featured: z.enum(["true", "false"]).optional(),
});

// ── Body schema for POST (create project) ──
const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().min(1, "Description is required").max(10000, "Description is too long"),
  shortDescription: z.string().max(500, "Short description is too long").optional(),
  category: z.enum([
    "DESIGN", "DEVELOPMENT", "WRITING", "MARKETING",
    "VIDEO", "MUSIC", "ANALYTICS", "OTHER",
  ]),
  price: z.number().positive("Price must be positive"),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional().or(z.literal("")),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  demoUrl: z.string().url("Invalid demo URL").optional().or(z.literal("")),
  sourceUrl: z.string().url("Invalid source URL").optional().or(z.literal("")),
});

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

// ── GET: Browse published projects ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = browseProjectsQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    // Build where clause – only PUBLISHED projects
    const where: Record<string, unknown> = {
      status: "PUBLISHED",
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    if (query.featured === "true") {
      where.featured = true;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined && { gte: query.minPrice }),
        ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
        { shortDescription: { contains: query.search } },
      ];
    }

    // Determine sort order
    let orderBy: Record<string, string>;
    switch (query.sort) {
      case "popular":
        orderBy = { totalSales: "desc" };
        break;
      case "price_low":
        orderBy = { price: "asc" };
        break;
      case "price_high":
        orderBy = { price: "desc" };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
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
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.project.count({ where }),
    ]);

    // Get category aggregations for PUBLISHED projects
    const categoryAgg = await db.project.groupBy({
      by: ["category"],
      where: { status: "PUBLISHED" },
      _count: { category: true },
    });

    const categories = categoryAgg.map((c) => ({
      category: c.category,
      count: c._count.category,
    }));

    // Get popular tags (scan all published projects)
    const allPublishedProjects = await db.project.findMany({
      where: { status: "PUBLISHED" },
      select: { tags: true },
    });

    const tagCounts: Record<string, number> = {};
    for (const p of allPublishedProjects) {
      const tags = parseJsonArray(p.tags);
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const popularTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    // Format projects (parse JSON arrays)
    const formattedProjects = projects.map((p) => formatProject(p as unknown as Record<string, unknown>));

    return apiResponse({
      data: formattedProjects,
      total,
      page: query.page,
      limit: query.limit,
      categories,
      popularTags,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Browse projects error:", error);
    return apiError("Failed to fetch projects", 500, "INTERNAL_ERROR");
  }
}

// ── POST: Create a new project (AUTHOR only) ──
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request, ["AUTHOR", "SUPER_ADMIN"]);

    const body = await request.json();
    const validated = validateBody(createProjectSchema, body);

    if (validated instanceof Response) return validated;

    const project = await db.project.create({
      data: {
        authorId: currentUser.id,
        title: validated.title,
        description: validated.description,
        shortDescription: validated.shortDescription || null,
        category: validated.category,
        price: validated.price,
        thumbnailUrl: validated.thumbnailUrl || null,
        images: JSON.stringify(validated.images || []),
        tags: JSON.stringify(validated.tags || []),
        features: JSON.stringify(validated.features || []),
        demoUrl: validated.demoUrl || null,
        sourceUrl: validated.sourceUrl || null,
        status: "DRAFT",
      },
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

    return apiResponse(formatProject(project as unknown as Record<string, unknown>), 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Create project error:", error);
    return apiError("Failed to create project", 500, "INTERNAL_ERROR");
  }
}
