import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { apiResponse, apiError, validateBody } from "@/lib/api-auth";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateBody(resetPasswordSchema, body);

    if (validated instanceof NextResponse) {
      return validated;
    }

    // Find the password reset record
    const passwordReset = await db.passwordReset.findUnique({
      where: { token: validated.token },
    });

    if (!passwordReset) {
      return apiError(
        "Invalid or expired reset token",
        400,
        "INVALID_TOKEN"
      );
    }

    // Check if token has been used
    if (passwordReset.used) {
      return apiError(
        "This reset token has already been used. Please request a new one.",
        400,
        "TOKEN_USED"
      );
    }

    // Check if token is expired
    if (passwordReset.expiresAt < new Date()) {
      return apiError(
        "Reset token has expired. Please request a new one.",
        400,
        "TOKEN_EXPIRED"
      );
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(validated.newPassword);

    // Update user password
    await db.user.update({
      where: { id: passwordReset.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Mark token as used
    await db.passwordReset.update({
      where: { id: passwordReset.id },
      data: { used: true },
    });

    return apiResponse({
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("Reset password error:", error);
    return apiError(
      "Failed to reset password. Please try again.",
      500,
      "RESET_PASSWORD_ERROR"
    );
  }
}
