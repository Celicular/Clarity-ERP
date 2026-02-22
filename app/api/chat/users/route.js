/**
 * app/api/chat/users/route.js
 * GET — list all users for the channel member picker.
 * Accessible to any authenticated user (not admin-only unlike /api/users).
 * Returns only id, name, email, role — no sensitive data.
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await query(`
    SELECT u.id, u.name, u.email, u.role,
           sr.department AS dept
    FROM users u
    LEFT JOIN user_details ud ON ud.user_id = u.id
    LEFT JOIN sub_roles sr ON sr.id = ud.sub_role_id
    WHERE u.id != $1
    ORDER BY u.name
  `, [session.id]);

  return NextResponse.json({ success: true, users: rows });
}
