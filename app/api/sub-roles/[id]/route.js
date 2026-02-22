/**
 * app/api/sub-roles/[id]/route.js
 * PUT    /api/sub-roles/:id — Admin edits a sub-role
 * DELETE /api/sub-roles/:id — Admin deletes a sub-role
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

/* ── PUT — Edit sub-role (name / department) ── */
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  try {
    const { rows } = await query("SELECT id FROM sub_roles WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Sub-role not found." }, { status: 404 });

    const { department, name } = await request.json();
    const validDepts = ["Development", "Sales", "HR", "Finance"];

    if (department && !validDepts.includes(department)) {
      return NextResponse.json({ error: `Department must be one of: ${validDepts.join(", ")}.` }, { status: 400 });
    }
    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: "Sub-role name cannot be empty." }, { status: 400 });
    }

    // Build dynamic UPDATE
    const sets = [];
    const vals = [];
    let idx = 1;
    if (department) { sets.push(`department = $${idx++}`); vals.push(department); }
    if (name)       { sets.push(`name = $${idx++}`);       vals.push(name.trim()); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    vals.push(id);
    await query(`UPDATE sub_roles SET ${sets.join(", ")} WHERE id = $${idx}`, vals);

    return NextResponse.json({ success: true, message: "Sub-role updated." });
  } catch (err) {
    console.error("[SUB-ROLES:PUT]", err);
    return NextResponse.json({ error: "Failed to update sub-role." }, { status: 500 });
  }
}

/* ── DELETE — Remove sub-role ── */
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  try {
    const { rows } = await query("SELECT id FROM sub_roles WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Sub-role not found." }, { status: 404 });

    await query("DELETE FROM sub_roles WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Sub-role deleted." });
  } catch (err) {
    console.error("[SUB-ROLES:DELETE]", err);
    return NextResponse.json({ error: "Failed to delete sub-role." }, { status: 500 });
  }
}
