import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, generateToken, createSessionUser } from "@/lib/auth";
import { apiResponse, apiError, validateBody } from "@/lib/api-auth";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  role: z.enum(["BUYER", "AUTHOR"], {
    errorMap: () => ({ message: "Role must be BUYER or AUTHOR" }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateBody(registerSchema, body);

    // Check if response is an error (validateBody returns NextResponse on validation failure)
    if (validated instanceof NextResponse) {
      return validated;
    }

    // Check email uniqueness
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return apiError("An account with this email already exists", 409, "EMAIL_EXISTS");
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Create user with PENDING status
    const user = await db.user.create({
      data: {
        email: validated.email,
        name: validated.name,
        passwordHash,
        role: validated.role,
        status: "PENDING",
      },
    });

    // Create Profile if AUTHOR role
    if (validated.role === "AUTHOR") {
      await db.profile.create({
        data: {
          userId: user.id,
          skills: "[]",
        },
      });
    }

    // Create email verification token
    const verificationToken = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt,
      },
    });

    const sessionUser = createSessionUser(user);

    return apiResponse(
      {
        user: sessionUser,
        message: "Registration successful. Please verify your email address.",
        verificationToken, // In production, this would be sent via email
      },
      201
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("Registration error:", error);
    return apiError("Registration failed. Please try again.", 500, "REGISTRATION_ERROR");
  }
}
