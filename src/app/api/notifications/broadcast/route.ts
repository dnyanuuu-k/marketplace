import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const broadcastSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  type: z.enum(["system", "announcement", "promotion"]).default("system"),
  recipientRole: z.enum(["ALL", "AUTHOR", "BUYER", "MODERATOR", "SUPER_ADMIN"]).default("ALL"),
});

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request, ["SUPER_ADMIN"]);
    const body = await request.json();
    const validated = validateBody(broadcastSchema, body);

    if (validated instanceof Response) return validated;

    // Determine target users
    const where: Record<string, unknown> = {};
    if (validated.recipientRole !== "ALL") {
      where.role = validated.recipientRole;
    }
    // Only notify active users
    where.status = "ACTIVE";

    const users = await db.user.findMany({
      where,
      select: { id: true },
    });

    // Create individual notifications for each user
    if (users.length > 0) {
      await db.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: validated.type.toUpperCase(),
          title: validated.title,
          message: validated.message,
        })),
      });
    }

    // Create platform announcement record
    const announcement = await db.platformAnnouncement.create({
      data: {
        title: validated.title,
        message: validated.message,
        type: validated.type,
        recipientRole: validated.recipientRole,
        createdById: currentUser.id,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: "NOTIFICATION_BROADCAST",
        targetType: "PlatformAnnouncement",
        targetId: announcement.id,
        metadata: JSON.stringify({
          title: validated.title,
          type: validated.type,
          recipientRole: validated.recipientRole,
          recipientCount: users.length,
        }),
      },
    });

    return apiResponse({
      id: announcement.id,
      title: validated.title,
      recipientCount: users.length,
    }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Broadcast notification error:", error);
    return apiError("Failed to broadcast notification", 500, "INTERNAL_ERROR");
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ["SUPER_ADMIN"]);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const [announcements, total] = await Promise.all([
      db.platformAnnouncement.findMany({
        include: {
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.platformAnnouncement.count(),
    ]);

    return apiResponse({
      data: announcements,
      total,
      page,
      limit,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get announcements error:", error);
    return apiError("Failed to fetch announcements", 500, "INTERNAL_ERROR");
  }
}
