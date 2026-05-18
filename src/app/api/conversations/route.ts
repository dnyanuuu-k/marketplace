import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const createConversationSchema = z.object({
  participantId: z.string().min(1, "Participant ID is required"),
  message: z.string().min(1, "Message is required").max(5000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const query = listConversationsQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    // Get conversations where the current user is a participant
    const participantEntries = await db.conversationParticipant.findMany({
      where: { userId: currentUser.id },
      select: { conversationId: true },
    });

    const conversationIds = participantEntries.map((p) => p.conversationId);

    if (conversationIds.length === 0) {
      return apiResponse({
        data: [],
        total: 0,
        page: query.page,
        limit: query.limit,
      });
    }

    const [conversations, total] = await Promise.all([
      db.conversation.findMany({
        where: { id: { in: conversationIds } },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true, role: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.conversation.count({
        where: { id: { in: conversationIds } },
      }),
    ]);

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await db.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: currentUser.id },
            readAt: null,
          },
        });

        return {
          id: conv.id,
          participants: conv.participants.map((p) => p.user),
          lastMessage: conv.messages[0] || null,
          unreadCount,
          updatedAt: conv.updatedAt,
          createdAt: conv.createdAt,
        };
      })
    );

    return apiResponse({
      data: conversationsWithUnread,
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("List conversations error:", error);
    return apiError("Failed to fetch conversations", 500, "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const body = await request.json();
    const validated = validateBody(createConversationSchema, body);

    if (validated instanceof Response) return validated;

    // Verify participant exists
    const participant = await db.user.findUnique({
      where: { id: validated.participantId },
    });

    if (!participant) {
      return apiError("Participant not found", 404, "NOT_FOUND");
    }

    if (participant.status !== "ACTIVE") {
      return apiError("Participant is not active", 400, "PARTICIPANT_INACTIVE");
    }

    // Prevent conversation with self
    if (currentUser.id === validated.participantId) {
      return apiError("You cannot start a conversation with yourself", 400, "INVALID_OPERATION");
    }

    // Check if conversation already exists between these two users
    const existingConversation = await db.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: [currentUser.id, validated.participantId] },
          },
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Check that it's exactly 2 participants (not a group conversation that happens to include both)
    if (existingConversation && existingConversation.participants.length === 2) {
      return apiResponse(existingConversation);
    }

    // Create new conversation
    const conversation = await db.conversation.create({
      data: {
        participants: {
          create: [
            { userId: currentUser.id },
            { userId: validated.participantId },
          ],
        },
        messages: validated.message
          ? {
              create: {
                senderId: currentUser.id,
                content: validated.message,
              },
            }
          : undefined,
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Notify the other participant if message sent
    if (validated.message) {
      await db.notification.create({
        data: {
          userId: validated.participantId,
          type: "NEW_MESSAGE",
          title: "New Message",
          message: `${currentUser.name} sent you a message`,
          link: `/conversations/${conversation.id}`,
        },
      });
    }

    return apiResponse(conversation, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Create conversation error:", error);
    return apiError("Failed to create conversation", 500, "INTERNAL_ERROR");
  }
}
