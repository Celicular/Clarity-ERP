/**
 * app/api/users/[id]/reset-password/route.js
 * POST /api/users/:id/reset-password
 * Admin resets a user's password (no old-password check needed).
 */

import { NextResponse }  from "next/server";
import bcrypt            from "bcryptjs";
import { getSession }    from "../../../../../lib/auth";
import { query }         from "../../../../../lib/db";

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params; // Next.js 15+: params is a Promise

  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await query(`
      UPDATE users SET
        password    = $1,
        first_login = TRUE,
        updated_at  = NOW()
      WHERE id = $2
    `, [hashed, id]);

    return NextResponse.json({ success: true, message: "Password reset. User will be prompted to change it on next login." });

  } catch (err) {
    console.error("[USERS:RESET-PASSWORD]", err);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
