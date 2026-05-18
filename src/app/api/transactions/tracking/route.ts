import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

const trackingQuerySchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "DISPUTED", "REFUNDED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sort: z.enum(["newest", "oldest", "highest", "lowest"]).default("newest"),
});

type TimelineStep = {
  step: string;
  label: string;
  completed: boolean;
  current: boolean;
  date: string | null;
  description: string;
};

type TransactionStatus = "PENDING" | "COMPLETED" | "DISPUTED" | "REFUNDED";

function buildTimeline(
  status: TransactionStatus,
  createdAt: Date,
  updatedAt: Date
): TimelineStep[] {
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const createdDate = formatDate(createdAt);
  const updatedDate = formatDate(updatedAt);

  switch (status) {
    case "PENDING":
      return [
        {
          step: "created",
          label: "Order Created",
          completed: true,
          current: false,
          date: createdDate,
          description: "Transaction initiated",
        },
        {
          step: "pending",
          label: "Payment Pending",
          completed: false,
          current: true,
          date: null,
          description: "Awaiting payment confirmation",
        },
        {
          step: "completed",
          label: "Completed",
          completed: false,
          current: false,
          date: null,
          description: "Transaction completed",
        },
      ];
    case "COMPLETED":
      return [
        {
          step: "created",
          label: "Order Created",
          completed: true,
          current: false,
          date: createdDate,
          description: "Transaction initiated",
        },
        {
          step: "pending",
          label: "Payment Confirmed",
          completed: true,
          current: false,
          date: createdDate,
          description: "Payment confirmed successfully",
        },
        {
          step: "completed",
          label: "Completed",
          completed: true,
          current: false,
          date: updatedDate,
          description: "Transaction completed",
        },
      ];
    case "DISPUTED":
      return [
        {
          step: "created",
          label: "Order Created",
          completed: true,
          current: false,
          date: createdDate,
          description: "Transaction initiated",
        },
        {
          step: "pending",
          label: "Payment Confirmed",
          completed: true,
          current: false,
          date: createdDate,
          description: "Payment confirmed successfully",
        },
        {
          step: "completed",
          label: "Completed",
          completed: true,
          current: false,
          date: updatedDate,
          description: "Transaction was completed",
        },
        {
          step: "disputed",
          label: "Disputed",
          completed: true,
          current: true,
          date: updatedDate,
          description: "Dispute opened",
        },
      ];
    case "REFUNDED":
      return [
        {
          step: "created",
          label: "Order Created",
          completed: true,
          current: false,
          date: createdDate,
          description: "Transaction initiated",
        },
        {
          step: "pending",
          label: "Payment Confirmed",
          completed: true,
          current: false,
          date: createdDate,
          description: "Payment confirmed successfully",
        },
        {
          step: "disputed",
          label: "Disputed",
          completed: true,
          current: false,
          date: updatedDate,
          description: "Dispute opened",
        },
        {
          step: "refunded",
          label: "Refunded",
          completed: true,
          current: true,
          date: updatedDate,
          description: "Refund processed",
        },
      ];
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const query = trackingQuerySchema.parse(
      Object.fromEntries(searchParams)
    );

    // Build where clause based on role
    const where: Record<string, unknown> = {};

    if (currentUser.role === "AUTHOR") {
      where.sellerId = currentUser.id;
    } else if (currentUser.role === "BUYER") {
      where.buyerId = currentUser.id;
    } else {
      // Admin/Mod can see all
    }

    if (query.status) {
      where.status = query.status;
    }

    // Search filter
    if (query.search) {
      const searchTerm = query.search;
      where.OR = [
        { description: { contains: searchTerm } },
        { buyer: { name: { contains: searchTerm } } },
        { seller: { name: { contains: searchTerm } } },
      ];
    }

    // Sort order
    let orderBy: Record<string, string>;
    switch (query.sort) {
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "highest":
        orderBy = { amount: "desc" };
        break;
      case "lowest":
        orderBy = { amount: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, avatarUrl: true } },
          seller: { select: { id: true, name: true, avatarUrl: true } },
          commissionLog: true,
          dispute: { select: { id: true, reason: true, status: true, createdAt: true } },
        },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.transaction.count({ where }),
    ]);

    // Build tracking data with timelines
    const trackingData = transactions.map((tx) => {
      const timeline = buildTimeline(
        tx.status as TransactionStatus,
        tx.createdAt,
        tx.updatedAt
      );

      return {
        id: tx.id,
        amount: tx.amount,
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
        buyer: tx.buyer,
        seller: tx.seller,
        timeline,
        commissionAmount: tx.commissionAmount,
        netAmount: tx.netAmount,
        dispute: tx.dispute,
      };
    });

    // Calculate stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeCount, completedThisMonthCount, pendingCount] =
      await Promise.all([
        db.transaction.count({
          where: {
            ...(currentUser.role === "AUTHOR"
              ? { sellerId: currentUser.id }
              : currentUser.role === "BUYER"
              ? { buyerId: currentUser.id }
              : {}),
            status: { in: ["PENDING", "COMPLETED"] },
          },
        }),
        db.transaction.count({
          where: {
            ...(currentUser.role === "AUTHOR"
              ? { sellerId: currentUser.id }
              : currentUser.role === "BUYER"
              ? { buyerId: currentUser.id }
              : {}),
            status: "COMPLETED",
            updatedAt: { gte: startOfMonth },
          },
        }),
        db.transaction.count({
          where: {
            ...(currentUser.role === "AUTHOR"
              ? { sellerId: currentUser.id }
              : currentUser.role === "BUYER"
              ? { buyerId: currentUser.id }
              : {}),
            status: "PENDING",
          },
        }),
      ]);

    return apiResponse({
      data: trackingData,
      total,
      page: query.page,
      limit: query.limit,
      stats: {
        activeOrders: activeCount,
        completedThisMonth: completedThisMonthCount,
        pendingPayment: pendingCount,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return apiError("Invalid query parameters", 400, "VALIDATION_ERROR");
    }
    console.error("Transaction tracking error:", error);
    return apiError("Failed to fetch tracking data", 500, "INTERNAL_ERROR");
  }
}
