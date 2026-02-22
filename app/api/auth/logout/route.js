/**
 * app/api/auth/logout/route.js
 * POST /api/auth/logout
 * Clears the JWT cookie and signals the client to redirect to /login.
 */

import { NextResponse }     from "next/server";
import { clearTokenCookie, getSession } from "../../../../lib/auth";
import { query } from "../../../../lib/db";
import { logAudit } from "../../../../lib/auditlogger";

export async function POST(request) {
  try {
    const session = await getSession();
    if (session && session.id) {
      await query(`UPDATE users SET is_logged_in = FALSE, login_ip = NULL, login_device = NULL WHERE id = $1`, [session.id]);
      
      let ip = request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || request.ip || "Unknown IP";
      if (ip === "::1") ip = "127.0.0.1";
      await logAudit({ action: "USER_LOGOUT", criticality: "Low", done_by: session.id, done_by_ip: ip });
    }
  } catch (err) {
    console.error("[LOGOUT] DB session clear error:", err);
  }
  
  await clearTokenCookie();
  return NextResponse.json({ success: true });
}
