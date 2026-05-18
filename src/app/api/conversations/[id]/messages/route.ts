import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(5000, "Message is too long"),
  fileUrl: z.string().url().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const query = listMessagesQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    // Verify conversation exists and user is participant
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: currentUser.id,
        },
      },
    });

    if (!participant) {
      return apiError("Conversation not found or access denied", 404, "NOT_FOUND");
    }

    const [messages, total] = await Promise.all([
      db.message.findMany({
        where: { conversationId: id },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.message.count({ where: { conversationId: id } }),
    ]);

    return apiResponse({
      data: messages,
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("List messages error:", error);
    return apiError("Failed to fetch messages", 500, "INTERNAL_ERROR");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const validated = validateBody(sendMessageSchema, body);

    if (validated instanceof Response) return validated;

    // Verify conversation exists and user is participant
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: currentUser.id,
        },
      },
      include: {
        conversation: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!participant) {
      return apiError("Conversation not found or access denied", 404, "NOT_FOUND");
    }

    // Create message
    const message = await db.message.create({
      data: {
        conversationId: id,
        senderId: currentUser.id,
        content: validated.content,
        fileUrl: validated.fileUrl,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Update conversation's updatedAt
    await db.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Notify other participants
    const otherParticipants = participant.conversation.participants.filter(
      (p) => p.userId !== currentUser.id
    );

    if (otherParticipants.length > 0) {
      await db.notification.createMany({
        data: otherParticipants.map((p) => ({
          userId: p.userId,
          type: "NEW_MESSAGE",
          title: "New Message",
          message: `${currentUser.name} sent you a message`,
          link: `/conversations/${id}`,
        })),
      });
    }

    return apiResponse(message, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Send message error:", error);
    return apiError("Failed to send message", 500, "INTERNAL_ERROR");
  }
}
