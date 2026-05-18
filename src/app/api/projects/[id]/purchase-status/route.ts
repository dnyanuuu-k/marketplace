import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

// ── GET: Check if current user has purchased this project ──
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["BUYER", "AUTHOR", "SUPER_ADMIN"]);
    const { id } = await params;

    // Check for a COMPLETED transaction for this project by this buyer
    const transaction = await db.transaction.findFirst({
      where: {
        projectId: id,
        buyerId: currentUser.id,
        status: "COMPLETED",
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return apiResponse({
      hasPurchased: !!transaction,
      transactionId: transaction?.id ?? null,
      purchasedAt: transaction?.createdAt ?? null,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Purchase status check error:", error);
    return apiError("Failed to check purchase status", 500, "INTERNAL_ERROR");
  }
}
