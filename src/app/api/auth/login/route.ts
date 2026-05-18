import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, createSessionUser, createSessionToken, getSessionCookieName } from "@/lib/auth";
import { apiError, validateBody } from "@/lib/api-auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateBody(loginSchema, body);

    if (validated instanceof NextResponse) {
      return validated;
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: validated.email },
      include: { profile: true },
    });

    if (!user) {
      return apiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Check if user has a password (might be OAuth-only user)
    if (!user.passwordHash) {
      return apiError(
        "This account does not have a password set. Please use the appropriate login method.",
        401,
        "NO_PASSWORD"
      );
    }

    // Verify password
    const isValid = await verifyPassword(validated.password, user.passwordHash);

    if (!isValid) {
      return apiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Check user status
    if (user.status === "BANNED") {
      return apiError(
        "Your account has been banned. Please contact support.",
        403,
        "ACCOUNT_BANNED"
      );
    }

    if (user.status === "SUSPENDED") {
      return apiError(
        "Your account has been suspended. Please contact support.",
        403,
        "ACCOUNT_SUSPENDED"
      );
    }

    const sessionUser = createSessionUser(user);

    // Create session token and set cookie
    const sessionToken = createSessionToken(user.id, user.role);
    const cookieName = getSessionCookieName();

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            ...sessionUser,
            profile: user.profile || null,
          },
          message: "Login successful",
        },
      },
      { status: 200 }
    );

    // Set session cookie (httpOnly for security, secure in production)
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("Login error:", error);
    return apiError("Login failed. Please try again.", 500, "LOGIN_ERROR");
  }
}
