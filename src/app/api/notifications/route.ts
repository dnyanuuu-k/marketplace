import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const query = listNotificationsQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    const where: Record<string, unknown> = {
      userId: currentUser.id,
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead === "true";
    }

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.notification.count({ where }),
    ]);

    // Also get unread count
    const unreadCount = await db.notification.count({
      where: { userId: currentUser.id, isRead: false },
    });

    return apiResponse({
      data: notifications,
      total,
      page: query.page,
      limit: query.limit,
      unreadCount,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("List notifications error:", error);
    return apiError("Failed to fetch notifications", 500, "INTERNAL_ERROR");
  }
}
