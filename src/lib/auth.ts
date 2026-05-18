import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { User } from "@prisma/client";

const SALT_ROUNDS = 12;
const SESSION_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret-change-me";
const SESSION_COOKIE_NAME = "marketplace_session";

/**
 * Hash a password using bcrypt with 12 salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a random hex token for email verification, password reset, etc.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a session-safe user object for the client
 * Strips sensitive fields like passwordHash
 */
export function createSessionUser(
  user: User & { profile?: unknown }
): AuthUserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a signed session token (JWT-like) for a user
 * Uses HMAC-SHA256 for signing
 */
export function createSessionToken(userId: string, role: string): string {
  const payload = JSON.stringify({
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  });
  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadBase64)
    .digest("base64url");
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a session token
 * Returns the payload if valid, null if invalid or expired
 */
export function verifySessionToken(
  token: string
): { userId: string; role: string } | null {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return null;

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payloadBase64)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf-8")
    );

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

/**
 * Get the session cookie name
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}
