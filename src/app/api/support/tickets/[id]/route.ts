import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

// ---- PATCH: Update ticket status ----
const updateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  message: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const validated = updateTicketSchema.safeParse(body);

    if (!validated.success) {
      return apiError("Invalid request data", 400, "VALIDATION_ERROR");
    }

    const { status, message } = validated.data;

    // Find the ticket
    const ticket = await db.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return apiError("Ticket not found", 404, "NOT_FOUND");
    }

    // Only the ticket owner or admin can update the status
    if (ticket.userId !== user.id && user.role !== "SUPER_ADMIN") {
      return apiError("You don't have permission to update this ticket", 403, "FORBIDDEN");
    }

    // Update the ticket
    const updated = await db.supportTicket.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // Create notification for the user if admin updated
    if (user.role === "SUPER_ADMIN" && ticket.userId !== user.id) {
      await db.notification.create({
        data: {
          userId: ticket.userId,
          type: "account_update",
          title: "Support Ticket Updated",
          message: message || `Your ticket "${ticket.subject}" has been updated to ${status.replace("_", " ")}`,
          link: "help",
        },
      });
    }

    return apiResponse({
      id: updated.id,
      subject: updated.subject,
      priority: updated.priority,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update support ticket error:", error);
    return apiError("Failed to update support ticket", 500, "INTERNAL_ERROR");
  }
}
