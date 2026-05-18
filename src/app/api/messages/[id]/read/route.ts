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

    const message = await db.message.findUnique({
      where: { id },
    });

    if (!message) {
      return apiError("Message not found", 404, "NOT_FOUND");
    }

    // Only the recipient can mark a message as read
    if (message.senderId === currentUser.id) {
      return apiError("You cannot mark your own message as read", 400, "INVALID_OPERATION");
    }

    // Verify the user is a participant in the conversation
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: message.conversationId,
          userId: currentUser.id,
        },
      },
    });

    if (!participant) {
      return apiError("Access denied", 403, "FORBIDDEN");
    }

    if (message.readAt) {
      return apiResponse({ message: "Message already read", readAt: message.readAt });
    }

    const updatedMessage = await db.message.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return apiResponse({
      id: updatedMessage.id,
      readAt: updatedMessage.readAt,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Mark message read error:", error);
    return apiError("Failed to mark message as read", 500, "INTERNAL_ERROR");
  }
}
