import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "MODERATOR", "AUTHOR", "BUYER"]).optional(),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED", "BANNED"]).optional(),
  sortBy: z.enum(["name", "email", "role", "status", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, ["SUPER_ADMIN", "MODERATOR"]);

    const { searchParams } = new URL(request.url);
    const query = listUsersQuerySchema.parse(Object.fromEntries(searchParams));

    // Build where clause
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }
    if (query.role) {
      where.role = query.role;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          profile: true,
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.user.count({ where }),
    ]);

    // Parse JSON fields in profiles
    const sanitizedUsers = users.map((u) => ({
      ...u,
      passwordHash: undefined,
      profile: u.profile
        ? {
            ...u.profile,
            skills: JSON.parse(u.profile.skills || "[]"),
            portfolioImages: JSON.parse(u.profile.portfolioImages || "[]"),
            socialLinks: JSON.parse(u.profile.socialLinks || "{}"),
          }
        : null,
    }));

    return apiResponse({
      data: sanitizedUsers,
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    if (error instanceof Response || (error as { status?: number }).status) {
      return error as Response;
    }
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("List users error:", error);
    return apiError("Failed to fetch users", 500, "INTERNAL_ERROR");
  }
}
