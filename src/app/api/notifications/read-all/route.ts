import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);

    const result = await db.notification.updateMany({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return apiResponse({
      message: "All notifications marked as read",
      updatedCount: result.count,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Mark all read error:", error);
    return apiError("Failed to mark notifications as read", 500, "INTERNAL_ERROR");
  }
}
