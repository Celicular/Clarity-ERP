/**
 * app/api/sub-sub-roles/[id]/route.js
 * PUT    /api/sub-sub-roles/:id — Admin edits a sub-sub-role (rename / reparent)
 * DELETE /api/sub-sub-roles/:id — Admin deletes a sub-sub-role
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

/* ── PUT — Edit sub-sub-role ── */
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  try {
    // Confirm it exists
    const { rows } = await query("SELECT id FROM sub_sub_roles WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Sub-sub-role not found." }, { status: 404 });

    const { sub_role_id, name } = await request.json();

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ error: "Sub-sub-role name cannot be empty." }, { status: 400 });
    }

    // Validate new parent if provided
    if (sub_role_id) {
      const { rows: parent } = await query("SELECT id FROM sub_roles WHERE id = $1", [sub_role_id]);
      if (!parent[0]) return NextResponse.json({ error: "Parent sub-role not found." }, { status: 404 });
    }

    // Build dynamic UPDATE
    const sets = [];
    const vals = [];
    let idx = 1;
    if (sub_role_id) { sets.push(`sub_role_id = $${idx++}`); vals.push(sub_role_id); }
    if (name)        { sets.push(`name = $${idx++}`);        vals.push(String(name).trim()); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    vals.push(id);
    await query(`UPDATE sub_sub_roles SET ${sets.join(", ")} WHERE id = $${idx}`, vals);

    return NextResponse.json({ success: true, message: "Sub-sub-role updated." });

  } catch (err) {
    console.error("[SUB-SUB-ROLES:PUT]", err);
    return NextResponse.json({ error: "Failed to update sub-sub-role." }, { status: 500 });
  }
}

/* ── DELETE — Remove sub-sub-role ── */
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  try {
    const { rows } = await query("SELECT id FROM sub_sub_roles WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Sub-sub-role not found." }, { status: 404 });

    await query("DELETE FROM sub_sub_roles WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Sub-sub-role deleted." });

  } catch (err) {
    console.error("[SUB-SUB-ROLES:DELETE]", err);
    return NextResponse.json({ error: "Failed to delete sub-sub-role." }, { status: 500 });
  }
}
