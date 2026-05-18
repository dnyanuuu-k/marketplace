import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

// Payout management API

const listPayoutsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["PENDING", "APPROVED", "DENIED", "COMPLETED"]).optional(),
  userId: z.string().optional(),
});

const createPayoutSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["bank_transfer", "paypal"]).default("bank_transfer"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ["SUPER_ADMIN"]);

    const { searchParams } = new URL(request.url);
    const query = listPayoutsQuerySchema.parse(Object.fromEntries(searchParams));

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;

    const [payouts, total] = await Promise.all([
      db.payout.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.payout.count({ where }),
    ]);

    // Summary stats
    const [totalPending, totalPaidThisMonth] = await Promise.all([
      db.payout.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
        _count: true,
      }),
      db.payout.aggregate({
        where: {
          status: { in: ["APPROVED", "COMPLETED"] },
          processedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    return apiResponse({
      data: payouts,
      total,
      page: query.page,
      limit: query.limit,
      summary: {
        totalPending: totalPending._sum.amount || 0,
        pendingCount: totalPending._count,
        totalPaidThisMonth: totalPaidThisMonth._sum.amount || 0,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("List payouts error:", error);
    return apiError("Failed to fetch payouts", 500, "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request, ["SUPER_ADMIN"]);
    const body = await request.json();
    const validated = validateBody(createPayoutSchema, body);

    if (validated instanceof Response) return validated;

    const user = await db.user.findUnique({ where: { id: validated.userId } });
    if (!user) {
      return apiError("User not found", 404, "NOT_FOUND");
    }

    const payout = await db.payout.create({
      data: {
        userId: validated.userId,
        amount: validated.amount,
        method: validated.method,
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    await db.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: "PAYOUT_CREATED",
        targetId: payout.id,
        targetType: "Payout",
        metadata: JSON.stringify({ amount: validated.amount, userId: validated.userId }),
      },
    });

    return apiResponse(payout, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Create payout error:", error);
    return apiError("Failed to create payout", 500, "INTERNAL_ERROR");
  }
}
