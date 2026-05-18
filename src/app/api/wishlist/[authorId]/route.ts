import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

// ---- DELETE: Remove a specific author from wishlist by authorId ----
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ authorId: string }> }
) {
  try {
    const user = await requireAuth(request, ["BUYER"]);
    const { authorId } = await params;

    // Find the wishlist entry
    const existing = await db.savedAuthor.findUnique({
      where: {
        buyerId_authorId: {
          buyerId: user.id,
          authorId,
        },
      },
    });

    if (!existing) {
      return apiError("Author not found in wishlist", 404, "NOT_FOUND");
    }

    await db.savedAuthor.delete({
      where: { id: existing.id },
    });

    return apiResponse({ success: true, removed: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Remove from wishlist by authorId error:", error);
    return apiError("Failed to remove from wishlist", 500, "INTERNAL_ERROR");
  }
}
