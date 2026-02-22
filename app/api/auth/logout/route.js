/**
 * app/api/auth/logout/route.js
 * POST /api/auth/logout
 * Clears the JWT cookie and signals the client to redirect to /login.
 */

import { NextResponse }     from "next/server";
import { clearTokenCookie } from "../../../../lib/auth";

export async function POST() {
  await clearTokenCookie();
  return NextResponse.json({ success: true });
}
