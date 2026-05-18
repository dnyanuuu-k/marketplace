import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);

    const prefs = await db.notificationPref.findUnique({
      where: { userId: currentUser.id },
    });

    if (!prefs) {
      // Return defaults
      return apiResponse({
        newSale: true,
        newMessage: true,
        reviewReceived: true,
        transactionUpdate: true,
        accountUpdate: true,
        payoutProcessed: true,
        disputeUpdate: true,
      });
    }

    return apiResponse({
      newSale: prefs.newSale,
      newMessage: prefs.newMessage,
      reviewReceived: prefs.reviewReceived,
      transactionUpdate: prefs.transactionUpdate,
      accountUpdate: prefs.accountUpdate,
      payoutProcessed: prefs.payoutProcessed,
      disputeUpdate: prefs.disputeUpdate,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get notification prefs error:", error);
    return apiError("Failed to fetch notification preferences", 500, "INTERNAL_ERROR");
  }
}

const prefsSchema = z.object({
  newSale: z.boolean().optional(),
  newMessage: z.boolean().optional(),
  reviewReceived: z.boolean().optional(),
  transactionUpdate: z.boolean().optional(),
  accountUpdate: z.boolean().optional(),
  payoutProcessed: z.boolean().optional(),
  disputeUpdate: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const body = await request.json();
    const validated = prefsSchema.safeParse(body);

    if (!validated.success) {
      return apiError("Invalid request data", 400, "VALIDATION_ERROR");
    }

    const prefs = await db.notificationPref.upsert({
      where: { userId: currentUser.id },
      update: validated.data,
      create: {
        userId: currentUser.id,
        ...validated.data,
      },
    });

    return apiResponse({
      newSale: prefs.newSale,
      newMessage: prefs.newMessage,
      reviewReceived: prefs.reviewReceived,
      transactionUpdate: prefs.transactionUpdate,
      accountUpdate: prefs.accountUpdate,
      payoutProcessed: prefs.payoutProcessed,
      disputeUpdate: prefs.disputeUpdate,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update notification prefs error:", error);
    return apiError("Failed to update notification preferences", 500, "INTERNAL_ERROR");
  }
}
