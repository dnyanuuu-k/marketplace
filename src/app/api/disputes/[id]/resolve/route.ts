import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const resolveDisputeSchema = z.object({
  status: z.enum(["RESOLVED_REFUNDED", "RESOLVED_DENIED"], {
    errorMap: () => ({ message: "Status must be RESOLVED_REFUNDED or RESOLVED_DENIED" }),
  }),
  adminNote: z.string().min(1, "Admin note is required").max(2000),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["SUPER_ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const validated = validateBody(resolveDisputeSchema, body);

    if (validated instanceof Response) return validated;

    const dispute = await db.dispute.findUnique({
      where: { id },
      include: {
        transaction: true,
      },
    });

    if (!dispute) {
      return apiError("Dispute not found", 404, "NOT_FOUND");
    }

    if (dispute.status === "RESOLVED_REFUNDED" || dispute.status === "RESOLVED_DENIED") {
      return apiError("Dispute is already resolved", 400, "ALREADY_RESOLVED");
    }

    // Update dispute
    const updatedDispute = await db.dispute.update({
      where: { id },
      data: {
        status: validated.status,
        adminNote: validated.adminNote,
        resolvedAt: new Date(),
      },
    });

    // Update transaction status based on resolution
    const newTransactionStatus = validated.status === "RESOLVED_REFUNDED" ? "REFUNDED" : "COMPLETED";
    await db.transaction.update({
      where: { id: dispute.transactionId },
      data: { status: newTransactionStatus },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: "DISPUTE_RESOLVED",
        targetId: id,
        targetType: "Dispute",
        metadata: JSON.stringify({
          resolution: validated.status,
          adminNote: validated.adminNote,
          transactionId: dispute.transactionId,
          transactionStatus: newTransactionStatus,
        }),
      },
    });

    // Notify both parties
    const resolutionMessage =
      validated.status === "RESOLVED_REFUNDED"
        ? "The dispute has been resolved with a refund."
        : "The dispute has been resolved and denied.";

    await db.notification.createMany({
      data: [
        {
          userId: dispute.openedById,
          type: "DISPUTE_UPDATE",
          title: "Dispute Resolved",
          message: `${resolutionMessage} Admin note: ${validated.adminNote}`,
          link: `/disputes/${id}`,
        },
        {
          userId: dispute.transaction.sellerId,
          type: "DISPUTE_UPDATE",
          title: "Dispute Resolved",
          message: `${resolutionMessage} Admin note: ${validated.adminNote}`,
          link: `/disputes/${id}`,
        },
      ],
    });

    return apiResponse({
      id: updatedDispute.id,
      status: updatedDispute.status,
      adminNote: updatedDispute.adminNote,
      resolvedAt: updatedDispute.resolvedAt,
      transactionStatus: newTransactionStatus,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Resolve dispute error:", error);
    return apiError("Failed to resolve dispute", 500, "INTERNAL_ERROR");
  }
}
