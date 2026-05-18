import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["PENDING", "APPROVED", "DENIED", "COMPLETED"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const where: Record<string, unknown> = { userId: currentUser.id };
    if (query.status) where.status = query.status;

    const [payouts, total] = await Promise.all([
      db.payout.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.payout.count({ where }),
    ]);

    // Balance info
    const [netEarnings, paidOut] = await Promise.all([
      db.transaction.aggregate({
        where: { sellerId: currentUser.id, status: "COMPLETED" },
        _sum: { netAmount: true },
      }),
      db.payout.aggregate({
        where: { userId: currentUser.id, status: { in: ["COMPLETED", "APPROVED"] } },
        _sum: { amount: true },
      }),
    ]);

    const available = Math.max(0, (netEarnings._sum.netAmount || 0) - (paidOut._sum.amount || 0));

    const pendingPayouts = await db.payout.aggregate({
      where: { userId: currentUser.id, status: "PENDING" },
      _sum: { amount: true },
    });

    return apiResponse({
      data: payouts,
      total,
      page: query.page,
      limit: query.limit,
      balance: {
        available,
        pending: pendingPayouts._sum.amount || 0,
        minimumPayout: 50,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("My payouts error:", error);
    return apiError("Failed to fetch payouts", 500, "INTERNAL_ERROR");
  }
}

const createPayoutSchema = z.object({
  amount: z.number().positive("Amount must be positive").min(50, "Minimum payout is $50"),
  method: z.enum(["bank_transfer", "paypal"]).default("bank_transfer"),
});

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request, ["AUTHOR"]);
    const body = await request.json();
    const validated = createPayoutSchema.safeParse(body);

    if (!validated.success) {
      return apiError("Invalid request data", 400, "VALIDATION_ERROR");
    }

    // Check available balance
    const [netEarnings, paidOut, pendingPayouts] = await Promise.all([
      db.transaction.aggregate({
        where: { sellerId: currentUser.id, status: "COMPLETED" },
        _sum: { netAmount: true },
      }),
      db.payout.aggregate({
        where: { userId: currentUser.id, status: { in: ["COMPLETED", "APPROVED"] } },
        _sum: { amount: true },
      }),
      db.payout.aggregate({
        where: { userId: currentUser.id, status: "PENDING" },
        _sum: { amount: true },
      }),
    ]);

    const available = Math.max(0, (netEarnings._sum.netAmount || 0) - (paidOut._sum.amount || 0) - (pendingPayouts._sum.amount || 0));

    if (validated.data.amount > available) {
      return apiError("Insufficient balance for this payout", 400, "INSUFFICIENT_BALANCE");
    }

    const payout = await db.payout.create({
      data: {
        userId: currentUser.id,
        amount: validated.data.amount,
        method: validated.data.method,
        status: "PENDING",
      },
    });

    await db.notification.create({
      data: {
        userId: currentUser.id,
        type: "PAYOUT_REQUESTED",
        title: "Payout Requested",
        message: `Your payout request of $${validated.data.amount} has been submitted and is pending approval.`,
      },
    });

    return apiResponse(payout, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Create payout error:", error);
    return apiError("Failed to create payout", 500, "INTERNAL_ERROR");
  }
}
