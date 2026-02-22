/**
 * lib/auth.js
 * JWT helpers (sign + verify) using `jose` — works in both Node and Edge runtimes.
 * Tokens are stored as HTTP-only cookies to prevent XSS access.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// ── Constants ──────────────────────────────────────────────────────────────────
const COOKIE_NAME  = "clarity_token";
const TOKEN_EXPIRY = "7d";

/** Get the encoded secret from env. Throws at startup if missing. */
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined in .env");
  return new TextEncoder().encode(secret);
}

// ── JWT helpers ────────────────────────────────────────────────────────────────

/**
 * Sign a JWT for a given user payload.
 * @param {{ id: string, email: string, name: string, role: string }} payload
 * @returns {Promise<string>} Signed JWT string
 */
export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret());
}

/**
 * Verify a JWT string and return its payload.
 * Returns null if the token is invalid or expired.
 * @param {string} token
 * @returns {Promise<object|null>}
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ─────────────────────────────────────────────────────────────

/**
 * Write the auth token into an HTTP-only cookie (server-side).
 * @param {string} token
 */
export async function setTokenCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === "production",
    sameSite:  "lax",
    path:      "/",
    maxAge:    60 * 60 * 24 * 7, // 7 days in seconds
  });
}

/**
 * Clear the auth cookie (logout).
 */
export async function clearTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}

/**
 * Read + verify the auth token from the request cookies.
 * Returns the decoded payload, or null if missing/invalid.
 * @returns {Promise<object|null>}
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
