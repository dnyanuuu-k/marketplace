import { NextRequest } from "next/server";
import { getSessionUser, apiResponse, apiError } from "@/lib/api-auth";
import { createSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return apiError("Authentication required", 401, "UNAUTHORIZED");
    }

    const sessionUser = createSessionUser(user);

    return apiResponse({
      user: {
        ...sessionUser,
        profile: user.profile || null,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return apiError(
      "Failed to get user data. Please try again.",
      500,
      "GET_USER_ERROR"
    );
  }
}
