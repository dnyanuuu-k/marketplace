import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { id } = await params;

    // Find the notification and verify ownership
    const notification = await db.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return apiError("Notification not found", 404, "NOT_FOUND");
    }

    if (notification.userId !== currentUser.id) {
      return apiError("Unauthorized", 403, "FORBIDDEN");
    }

    // Mark as read
    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    // Get updated unread count
    const unreadCount = await db.notification.count({
      where: { userId: currentUser.id, isRead: false },
    });

    return apiResponse({ data: updated, unreadCount });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Mark notification read error:", error);
    return apiError("Failed to mark notification as read", 500, "INTERNAL_ERROR");
  }
}
