import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const listDisputesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED_REFUNDED", "RESOLVED_DENIED"]).optional(),
});

const createDisputeSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
  reason: z.string().min(1, "Reason is required").max(2000, "Reason is too long"),
  evidenceUrls: z.array(z.string().url()).optional().default([]),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const query = listDisputesQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    const where: Record<string, unknown> = {};

    if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MODERATOR") {
      // Admins/moderators see all disputes
    } else {
      // Buyers see their own disputes
      where.openedById = currentUser.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [disputes, total] = await Promise.all([
      db.dispute.findMany({
        where,
        include: {
          transaction: {
            include: {
              buyer: { select: { id: true, name: true, email: true, avatarUrl: true } },
              seller: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
          openedBy: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.dispute.count({ where }),
    ]);

    // Parse evidence URLs
    const sanitizedDisputes = disputes.map((d) => ({
      ...d,
      evidenceUrls: JSON.parse(d.evidenceUrls || "[]"),
    }));

    return apiResponse({
      data: sanitizedDisputes,
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("List disputes error:", error);
    return apiError("Failed to fetch disputes", 500, "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request, ["BUYER", "SUPER_ADMIN"]);
    const body = await request.json();
    const validated = validateBody(createDisputeSchema, body);

    if (validated instanceof Response) return validated;

    // Verify transaction exists
    const transaction = await db.transaction.findUnique({
      where: { id: validated.transactionId },
    });

    if (!transaction) {
      return apiError("Transaction not found", 404, "NOT_FOUND");
    }

    // Only the buyer can open a dispute (or admin)
    if (transaction.buyerId !== currentUser.id && currentUser.role !== "SUPER_ADMIN") {
      return apiError("You can only dispute your own transactions", 403, "FORBIDDEN");
    }

    // Check if dispute already exists for this transaction
    const existingDispute = await db.dispute.findUnique({
      where: { transactionId: validated.transactionId },
    });

    if (existingDispute) {
      return apiError("A dispute already exists for this transaction", 409, "DISPUTE_EXISTS");
    }

    // Transaction must not be refunded already
    if (transaction.status === "REFUNDED") {
      return apiError("Cannot dispute a refunded transaction", 400, "INVALID_TRANSACTION");
    }

    // Create dispute
    const dispute = await db.dispute.create({
      data: {
        transactionId: validated.transactionId,
        openedById: currentUser.id,
        reason: validated.reason,
        evidenceUrls: JSON.stringify(validated.evidenceUrls),
        status: "OPEN",
      },
      include: {
        transaction: {
          include: {
            buyer: { select: { id: true, name: true, email: true, avatarUrl: true } },
            seller: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        openedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Update transaction status to DISPUTED
    await db.transaction.update({
      where: { id: validated.transactionId },
      data: { status: "DISPUTED" },
    });

    // Notify both parties
    await db.notification.createMany({
      data: [
        {
          userId: transaction.sellerId,
          type: "DISPUTE_UPDATE",
          title: "Dispute Opened",
          message: `A dispute has been opened for transaction #${transaction.id.slice(-8)}`,
          link: `/disputes/${dispute.id}`,
        },
        {
          userId: transaction.buyerId,
          type: "DISPUTE_UPDATE",
          title: "Dispute Created",
          message: `Your dispute for transaction #${transaction.id.slice(-8)} has been created`,
          link: `/disputes/${dispute.id}`,
        },
      ],
    });

    const sanitized = {
      ...dispute,
      evidenceUrls: JSON.parse(dispute.evidenceUrls || "[]"),
    };

    return apiResponse(sanitized, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Create dispute error:", error);
    return apiError("Failed to create dispute", 500, "INTERNAL_ERROR");
  }
}
