import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { db } from "@/lib/db";
import { verifySessionToken, getSessionCookieName } from "@/lib/auth";

type Role = "SUPER_ADMIN" | "MODERATOR" | "AUTHOR" | "BUYER";

type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

/**
 * Get the current authenticated user from the custom session cookie.
 * Returns null if not authenticated.
 */
export async function getSessionUser(request: NextRequest) {
  try {
    const cookieName = getSessionCookieName();
    const sessionToken = request.cookies.get(cookieName)?.value;

    if (sessionToken) {
      const sessionData = verifySessionToken(sessionToken);
      if (sessionData) {
        const user = await db.user.findUnique({
          where: { id: sessionData.userId },
          include: { profile: true },
        });

        if (user && user.status !== "BANNED") {
          return user;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Require authentication. Returns user or throws a 401/403 response.
 * Optionally restrict to specific roles.
 */
export async function requireAuth(
  request: NextRequest,
  roles?: Role[]
): Promise<SessionUser> {
  const user = await getSessionUser(request);

  if (!user) {
    throw apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (user.status === "BANNED") {
    throw apiError("Account has been banned", 403, "BANNED");
  }

  if (user.status === "SUSPENDED") {
    throw apiError("Account has been suspended", 403, "SUSPENDED");
  }

  if (roles && !roles.includes(user.role as Role)) {
    throw apiError(
      "You do not have permission to access this resource",
      403,
      "FORBIDDEN"
    );
  }

  return user;
}

/**
 * Standardized success response
 */
export function apiResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Standardized error response
 */
export function apiError(
  message: string,
  status: number,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || getDefaultErrorCode(status),
        message,
      },
    },
    { status }
  );
}

/**
 * Validate request body against a Zod schema.
 * Returns parsed data or throws a validation error response.
 */
export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const body = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          fields: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
      };
      return NextResponse.json(body, { status: 400 }) as never;
    }
    throw apiError("Invalid request data", 400, "INVALID_DATA");
  }
}

function getDefaultErrorCode(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "UNPROCESSABLE_ENTITY";
    case 429:
      return "RATE_LIMITED";
    case 500:
      return "INTERNAL_ERROR";
    default:
      return "ERROR";
  }
}
