/**
 * app/api/users/[id]/assign-sub-role/route.js
 * POST /api/users/:id/assign-sub-role
 * Admin assigns (or clears) a sub_role and/or sub_sub_role for an employee.
 * Clearing sub_role_id automatically clears sub_sub_role_id too.
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  try {
    const { sub_role_id, sub_sub_role_id } = await request.json();

    // When clearing sub_role, also clear sub_sub_role
    const resolvedSubSubRole = sub_role_id ? (sub_sub_role_id || null) : null;

    // Upsert into user_details — create row if it doesn't exist yet
    await query(`
      INSERT INTO user_details (id, user_id, full_name, phone_number, sub_role_id, sub_sub_role_id)
      VALUES (gen_random_uuid()::text, $1, '', '', $2, $3)
      ON CONFLICT (user_id) DO UPDATE
        SET sub_role_id     = $2,
            sub_sub_role_id = $3,
            updated_at      = NOW()
    `, [id, sub_role_id || null, resolvedSubSubRole]);

    return NextResponse.json({ success: true, message: "Sub-role assigned." });
  } catch (err) {
    console.error("[ASSIGN-SUB-ROLE]", err);
    return NextResponse.json({ error: "Failed to assign sub-role." }, { status: 500 });
  }
}
