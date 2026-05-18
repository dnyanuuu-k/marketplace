import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiResponse, apiError } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return apiError("Verification token is required", 400, "MISSING_TOKEN");
    }

    // Find the email verification record
    const verification = await db.emailVerification.findUnique({
      where: { token },
    });

    if (!verification) {
      return apiError(
        "Invalid or expired verification token",
        400,
        "INVALID_TOKEN"
      );
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      // Clean up expired token
      await db.emailVerification.delete({
        where: { id: verification.id },
      });
      return apiError(
        "Verification token has expired. Please request a new one.",
        400,
        "TOKEN_EXPIRED"
      );
    }

    // Update user emailVerified
    await db.user.update({
      where: { id: verification.userId },
      data: {
        emailVerified: new Date(),
        status: "ACTIVE",
      },
    });

    // Delete the verification token
    await db.emailVerification.delete({
      where: { id: verification.id },
    });

    return apiResponse({
      message: "Email verified successfully. Your account is now active.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return apiError(
      "Email verification failed. Please try again.",
      500,
      "VERIFICATION_ERROR"
    );
  }
}
