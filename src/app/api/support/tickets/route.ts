import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

const createTicketSchema = z.object({
  subject: z.enum(["general", "bug", "feature", "payment", "account"]),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  message: z.string().min(1).max(500),
});

const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const body = await request.json();
    const validated = createTicketSchema.safeParse(body);

    if (!validated.success) {
      return apiError("Invalid request data", 400, "VALIDATION_ERROR");
    }

    const { subject, priority, message } = validated.data;

    const subjectLabels: Record<string, string> = {
      general: "General Inquiry",
      bug: "Bug Report",
      feature: "Feature Request",
      payment: "Payment Issue",
      account: "Account Issue",
    };

    const ticket = await db.supportTicket.create({
      data: {
        userId: currentUser.id,
        subject: subjectLabels[subject] || subject,
        priority,
        message,
        status: "open",
      },
    });

    // Create a notification for the user confirming ticket creation
    await db.notification.create({
      data: {
        userId: currentUser.id,
        type: "account_update",
        title: "Support Ticket Created",
        message: `Your ticket "${subjectLabels[subject]}" has been submitted. We'll respond within 24 hours.`,
        link: "help",
      },
    });

    return apiResponse({
      id: ticket.id,
      subject: ticket.subject,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt,
    }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Create support ticket error:", error);
    return apiError("Failed to create support ticket", 500, "INTERNAL_ERROR");
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const query = listTicketsQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    const where: Record<string, unknown> = {
      userId: currentUser.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.supportTicket.count({ where }),
    ]);

    return apiResponse({
      data: tickets,
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("List support tickets error:", error);
    return apiError("Failed to fetch support tickets", 500, "INTERNAL_ERROR");
  }
}
