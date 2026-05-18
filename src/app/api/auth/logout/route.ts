import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    { success: true, data: { message: "Logged out successfully" } },
    { status: 200 }
  );

  // Clear custom session cookie
  const cookieName = getSessionCookieName();
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
