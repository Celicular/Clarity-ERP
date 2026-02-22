/**
 * proxy.js  (Next.js 16 — replaces middleware.js)
 * Route protection:
 *   - /dashboard/* requires a valid JWT cookie → redirects to /login
 *   - /login redirects to /dashboard if already authenticated
 *
 * JWT is verified inline here using `jose` directly because @/lib imports
 * are not reliably resolvable in the proxy/edge bundle context.
 */

import { NextResponse } from "next/server";
import { jwtVerify }    from "jose";

const COOKIE_NAME = "clarity_token";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function isAuthenticated(request) {
  try {
    const token  = request.cookies.get(COOKIE_NAME)?.value;
    const secret = getSecret();
    if (!token || !secret) return false;
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const authed = await isAuthenticated(request);

  // Protect /dashboard/* — redirect to /login if not authenticated
  if (pathname.startsWith("/dashboard")) {
    if (!authed) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect /login → /dashboard if already authenticated
  if (pathname === "/login" && authed) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
