import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["PENDING", "COMPLETED", "DISPUTED", "REFUNDED"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  userId: z.string().optional(),
});

const createTransactionSchema = z.object({
  sellerId: z.string().min(1, "Seller ID is required"),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1).max(1000).optional(),
});

// Default platform commission rate (10%)
const DEFAULT_COMMISSION_RATE = 0.1;

async function getCommissionRate(sellerId: string): Promise<number> {
  // Check if seller has a custom commission rate
  const seller = await db.user.findUnique({ where: { id: sellerId } });
  if (seller?.commissionRate !== null && seller?.commissionRate !== undefined) {
    return seller.commissionRate;
  }

  // Check platform setting
  const setting = await db.platformSetting.findUnique({
    where: { key: "defaultCommissionRate" },
  });
  if (setting) {
    return parseFloat(setting.value);
  }

  return DEFAULT_COMMISSION_RATE;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const query = listTransactionsQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    // Build where clause based on role
    const where: Record<string, unknown> = {};

    if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MODERATOR") {
      // Admins can see all transactions, optionally filter by userId
      if (query.userId) {
        where.OR = [
          { buyerId: query.userId },
          { sellerId: query.userId },
        ];
      }
    } else if (currentUser.role === "AUTHOR") {
      // Authors see their sales
      where.sellerId = currentUser.id;
    } else {
      // Buyers see their purchases
      where.buyerId = currentUser.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo && { lte: new Date(query.dateTo) }),
      };
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, email: true, avatarUrl: true } },
          seller: { select: { id: true, name: true, email: true, avatarUrl: true } },
          commissionLog: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.transaction.count({ where }),
    ]);

    return apiResponse({
      data: transactions,
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("List transactions error:", error);
    return apiError("Failed to fetch transactions", 500, "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request, ["BUYER", "SUPER_ADMIN"]);
    const body = await request.json();
    const validated = validateBody(createTransactionSchema, body);

    if (validated instanceof Response) return validated;

    // Verify seller exists and is an author
    const seller = await db.user.findUnique({
      where: { id: validated.sellerId },
    });

    if (!seller) {
      return apiError("Seller not found", 404, "NOT_FOUND");
    }

    if (seller.role !== "AUTHOR") {
      return apiError("Invalid seller: user is not an author", 400, "INVALID_SELLER");
    }

    if (seller.status !== "ACTIVE") {
      return apiError("Seller is not active", 400, "SELLER_INACTIVE");
    }

    // Prevent self-transactions
    if (currentUser.id === validated.sellerId) {
      return apiError("You cannot create a transaction with yourself", 400, "INVALID_OPERATION");
    }

    // Calculate commission
    const commissionRate = await getCommissionRate(validated.sellerId);
    const commissionAmount = Math.round(validated.amount * commissionRate * 100) / 100;
    const netAmount = Math.round((validated.amount - commissionAmount) * 100) / 100;

    // Create transaction with commission log
    const transaction = await db.transaction.create({
      data: {
        buyerId: currentUser.id,
        sellerId: validated.sellerId,
        amount: validated.amount,
        commissionAmount,
        netAmount,
        description: validated.description,
        status: "PENDING",
        commissionLog: {
          create: {
            rate: commissionRate,
            commissionAmount,
          },
        },
      },
      include: {
        buyer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        seller: { select: { id: true, name: true, email: true, avatarUrl: true } },
        commissionLog: true,
      },
    });

    // Notify seller
    await db.notification.create({
      data: {
        userId: validated.sellerId,
        type: "NEW_SALE",
        title: "New Transaction",
        message: `You have a new transaction of $${validated.amount} from ${currentUser.name}`,
        link: `/transactions/${transaction.id}`,
      },
    });

    return apiResponse(transaction, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Create transaction error:", error);
    return apiError("Failed to create transaction", 500, "INTERNAL_ERROR");
  }
}
