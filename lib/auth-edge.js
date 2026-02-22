/**
 * lib/auth-edge.js
 * Edge-runtime-safe auth helpers — JWT only, NO next/headers import.
 * Used by middleware.js which runs on the Edge runtime.
 *
 * Cookie helpers (setTokenCookie, clearTokenCookie, getSession) live in
 * lib/auth.js which is Node.js-only (Server Components / Route Handlers).
 */

import { jwtVerify } from "jose";

const COOKIE_NAME = "clarity_token";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined in .env");
  return new TextEncoder().encode(secret);
}

/**
 * Verify a JWT string. Returns payload or null.
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

export { COOKIE_NAME };
