/**
 * app/api/lead-statuses/[id]/route.js
 * PUT    /api/lead-statuses/:id — edit label/color/position (admin only)
 * DELETE /api/lead-statuses/:id — delete custom stage (admin only)
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  try {
    const { label, color, position } = await request.json();
    const sets = []; const vals = []; let idx = 1;
    if (label)    { sets.push(`label = $${idx++}`);    vals.push(label.trim()); }
    if (color)    { sets.push(`color = $${idx++}`);    vals.push(color); }
    if (position !== undefined) { sets.push(`position = $${idx++}`); vals.push(Number(position)); }

    if (!sets.length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    vals.push(id);
    await query(`UPDATE lead_statuses SET ${sets.join(", ")} WHERE id = $${idx}`, vals);
    return NextResponse.json({ success: true, message: "Stage updated." });
  } catch (err) {
    console.error("[LEAD-STATUSES:PUT]", err);
    return NextResponse.json({ error: "Failed to update stage." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  try {
    const { rows } = await query("SELECT slug, is_default FROM lead_statuses WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Stage not found." }, { status: 404 });
    if (rows[0].is_default) return NextResponse.json({ error: "Cannot delete the default stage." }, { status: 400 });

    // Move any leads using this stage to the default stage
    const { rows: defRows } = await query("SELECT slug FROM lead_statuses WHERE is_default = TRUE LIMIT 1");
    const fallback = defRows[0]?.slug || "new_lead";
    await query("UPDATE leads SET status_slug=$1 WHERE status_slug=$2", [fallback, rows[0].slug]);
    await query("DELETE FROM lead_statuses WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Stage deleted." });
  } catch (err) {
    console.error("[LEAD-STATUSES:DELETE]", err);
    return NextResponse.json({ error: "Failed to delete stage." }, { status: 500 });
  }
}
