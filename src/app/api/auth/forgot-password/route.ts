import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { apiResponse, apiError, validateBody } from "@/lib/api-auth";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateBody(forgotPasswordSchema, body);

    if (validated instanceof NextResponse) {
      return validated;
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: validated.email },
    });

    // Always return success to prevent email enumeration
    // In production, only send email if user exists
    if (!user) {
      return apiResponse({
        message:
          "If an account with that email exists, we have sent a password reset link.",
      });
    }

    // Invalidate any existing reset tokens for this user
    await db.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    // Create new password reset token (expires in 1 hour)
    const resetToken = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    // In production, send email via Resend or similar service
    // For now, we return the token in the response for development
    return apiResponse({
      message:
        "If an account with that email exists, we have sent a password reset link.",
      resetToken, // Only for development - remove in production
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("Forgot password error:", error);
    return apiError(
      "Failed to process request. Please try again.",
      500,
      "FORGOT_PASSWORD_ERROR"
    );
  }
}
