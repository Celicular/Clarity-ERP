/**
 * app/api/sub-roles/route.js
 * GET  /api/sub-roles — All sub-roles (any authenticated user)
 * POST /api/sub-roles — Create a sub-role (admin only)
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows } = await query(`
      SELECT * FROM sub_roles ORDER BY department, name
    `);
    return NextResponse.json({ success: true, subRoles: rows });
  } catch (err) {
    console.error("[SUB-ROLES:GET]", err);
    return NextResponse.json({ error: "Failed to fetch sub-roles." }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  try {
    const { department, name } = await request.json();

    const validDepts = ["Development", "Sales", "HR", "Finance"];
    if (!department || !validDepts.includes(department)) {
      return NextResponse.json({ error: `Department must be one of: ${validDepts.join(", ")}.` }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Sub-role name is required." }, { status: 400 });
    }

    const id = randomUUID();
    await query(`
      INSERT INTO sub_roles (id, department, name) VALUES ($1, $2, $3)
      ON CONFLICT (department, name) DO NOTHING
    `, [id, department, name.trim()]);

    return NextResponse.json({ success: true, message: "Sub-role created.", id });
  } catch (err) {
    console.error("[SUB-ROLES:POST]", err);
    return NextResponse.json({ error: "Failed to create sub-role." }, { status: 500 });
  }
}
