/**
 * app/api/auth/logout/route.js
 * POST /api/auth/logout
 * Clears the JWT cookie and signals the client to redirect to /login.
 */

import { NextResponse }     from "next/server";
import { clearTokenCookie, getSession } from "../../../../lib/auth";
import { query } from "../../../../lib/db";

export async function POST() {
  try {
    const session = await getSession();
    if (session && session.id) {
      await query(`UPDATE users SET is_logged_in = FALSE, login_ip = NULL, login_device = NULL WHERE id = $1`, [session.id]);
    }
  } catch (err) {
    console.error("[LOGOUT] DB session clear error:", err);
  }
  
  await clearTokenCookie();
  return NextResponse.json({ success: true });
}
