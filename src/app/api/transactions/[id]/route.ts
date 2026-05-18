import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const updateTransactionSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "DISPUTED", "REFUNDED"], {
    errorMap: () => ({ message: "Invalid status value" }),
  }),
  reason: z.string().max(500).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { id } = await params;

    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        seller: { select: { id: true, name: true, email: true, avatarUrl: true } },
        commissionLog: true,
        review: true,
        dispute: true,
      },
    });

    if (!transaction) {
      return apiError("Transaction not found", 404, "NOT_FOUND");
    }

    // Only admin or parties can view
    const isAdmin = currentUser.role === "SUPER_ADMIN" || currentUser.role === "MODERATOR";
    const isParty = transaction.buyerId === currentUser.id || transaction.sellerId === currentUser.id;

    if (!isAdmin && !isParty) {
      return apiError("Access denied", 403, "FORBIDDEN");
    }

    return apiResponse(transaction);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get transaction error:", error);
    return apiError("Failed to fetch transaction", 500, "INTERNAL_ERROR");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["SUPER_ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const validated = validateBody(updateTransactionSchema, body);

    if (validated instanceof Response) return validated;

    const transaction = await db.transaction.findUnique({ where: { id } });
    if (!transaction) {
      return apiError("Transaction not found", 404, "NOT_FOUND");
    }

    const updatedTransaction = await db.transaction.update({
      where: { id },
      data: { status: validated.status },
      include: {
        buyer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        seller: { select: { id: true, name: true, email: true, avatarUrl: true } },
        commissionLog: true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: "TRANSACTION_STATUS_UPDATE",
        targetId: id,
        targetType: "Transaction",
        metadata: JSON.stringify({
          previousStatus: transaction.status,
          newStatus: validated.status,
          reason: validated.reason,
        }),
      },
    });

    // Notify both parties
    const statusMessage = `Transaction #${id.slice(-8)} status updated to ${validated.status}`;
    await db.notification.createMany({
      data: [
        {
          userId: transaction.buyerId,
          type: "TRANSACTION_UPDATE",
          title: "Transaction Update",
          message: statusMessage,
          link: `/transactions/${id}`,
        },
        {
          userId: transaction.sellerId,
          type: "TRANSACTION_UPDATE",
          title: "Transaction Update",
          message: statusMessage,
          link: `/transactions/${id}`,
        },
      ],
    });

    // If completed, update seller's totalSales
    if (validated.status === "COMPLETED" && transaction.status !== "COMPLETED") {
      const profile = await db.profile.findUnique({
        where: { userId: transaction.sellerId },
      });
      if (profile) {
        await db.profile.update({
          where: { userId: transaction.sellerId },
          data: { totalSales: profile.totalSales + 1 },
        });
      }
    }

    return apiResponse(updatedTransaction);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update transaction error:", error);
    return apiError("Failed to update transaction", 500, "INTERNAL_ERROR");
  }
}
