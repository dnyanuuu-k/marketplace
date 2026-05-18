import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

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

// ── POST: Purchase a project (BUYER only) ──
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["BUYER", "SUPER_ADMIN"]);
    const { id } = await params;

    // 1. Validate project exists and is PUBLISHED
    const project = await db.project.findUnique({
      where: { id },
    });

    if (!project) {
      return apiError("Project not found", 404, "NOT_FOUND");
    }

    if (project.status !== "PUBLISHED") {
      return apiError("Project is not available for purchase", 400, "NOT_AVAILABLE");
    }

    // 2. Prevent author from buying their own project
    if (project.authorId === currentUser.id) {
      return apiError("You cannot purchase your own project", 400, "INVALID_OPERATION");
    }

    // 3. Check buyer doesn't already own the project (COMPLETED transaction)
    const existingTransaction = await db.transaction.findFirst({
      where: {
        projectId: id,
        buyerId: currentUser.id,
        status: "COMPLETED",
      },
    });

    if (existingTransaction) {
      return apiError("You have already purchased this project", 409, "ALREADY_PURCHASED");
    }

    // 4. Calculate commission
    const commissionRate = await getCommissionRate(project.authorId);
    const commissionAmount = Math.round(project.price * commissionRate * 100) / 100;
    const netAmount = Math.round((project.price - commissionAmount) * 100) / 100;

    // 5. Create Transaction with status COMPLETED (simplified – no real payment gateway)
    const transaction = await db.transaction.create({
      data: {
        buyerId: currentUser.id,
        sellerId: project.authorId,
        amount: project.price,
        commissionAmount,
        netAmount,
        description: `Purchase of project: ${project.title}`,
        projectId: id,
        status: "COMPLETED",
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

    // 6. Create notification for the author
    await db.notification.create({
      data: {
        userId: project.authorId,
        type: "NEW_SALE",
        title: "Project Purchased",
        message: `${currentUser.name} purchased your project "${project.title}" for $${project.price}`,
        link: `/projects/${id}`,
      },
    });

    // 7. Increment project totalSales
    await db.project.update({
      where: { id },
      data: { totalSales: { increment: 1 } },
    });

    // 8. Update author's profile totalSales
    await db.profile.updateMany({
      where: { userId: project.authorId },
      data: { totalSales: { increment: 1 } },
    });

    return apiResponse(transaction, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Purchase project error:", error);
    return apiError("Failed to purchase project", 500, "INTERNAL_ERROR");
  }
}
