/**
 * app/api/sub-sub-roles/route.js
 * GET  /api/sub-sub-roles               → All sub-sub-roles (optionally ?sub_role_id=)
 * POST /api/sub-sub-roles               → Create a sub-sub-role (admin only)
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";

/* ── GET — list all sub-sub-roles, optionally filtered by parent ── */
export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const subRoleId = searchParams.get("sub_role_id") || "";

    let sql    = `SELECT * FROM sub_sub_roles`;
    const vals = [];

    if (subRoleId) {
      sql += ` WHERE sub_role_id = $1`;
      vals.push(subRoleId);
    }

    sql += ` ORDER BY name`;

    const { rows } = await query(sql, vals);
    return NextResponse.json({ success: true, subSubRoles: rows });

  } catch (err) {
    console.error("[SUB-SUB-ROLES:GET]", err);
    return NextResponse.json({ error: "Failed to fetch sub-sub-roles." }, { status: 500 });
  }
}

/* ── POST — create a sub-sub-role (admin only) ── */
export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  try {
    const { sub_role_id, name } = await request.json();

    if (!sub_role_id) {
      return NextResponse.json({ error: "sub_role_id is required." }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Sub-sub-role name is required." }, { status: 400 });
    }

    // Verify parent sub_role exists
    const { rows: parent } = await query("SELECT id FROM sub_roles WHERE id = $1", [sub_role_id]);
    if (!parent[0]) {
      return NextResponse.json({ error: "Parent sub-role not found." }, { status: 404 });
    }

    const id = randomUUID();
    await query(`
      INSERT INTO sub_sub_roles (id, sub_role_id, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (sub_role_id, name) DO NOTHING
    `, [id, sub_role_id, name.trim()]);

    return NextResponse.json({ success: true, message: "Sub-sub-role created.", id });

  } catch (err) {
    console.error("[SUB-SUB-ROLES:POST]", err);
    return NextResponse.json({ error: "Failed to create sub-sub-role." }, { status: 500 });
  }
}
