/**
 * app/api/leads/[id]/interactions/[iid]/route.js
 * PUT — edit interaction notes (own + admin only, any time)
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, iid } = await params;
  try {
    const { notes, type, interacted_at } = await request.json();
    const { rows } = await query("SELECT * FROM lead_interactions WHERE id=$1 AND lead_id=$2", [iid, id]);
    if (!rows[0]) return NextResponse.json({ error: "Interaction not found." }, { status: 404 });

    // Only the author or an admin can edit
    if (rows[0].actor_id !== session.id && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const sets = ["updated_at = NOW()"]; const vals = []; let idx = 1;
    if (notes?.trim()) { sets.push(`notes = $${idx++}`);          vals.push(notes.trim()); }
    if (type)          { sets.push(`type = $${idx++}`);           vals.push(type); }
    if (interacted_at) { sets.push(`interacted_at = $${idx++}`);  vals.push(interacted_at); }
    vals.push(iid, id);

    await query(`UPDATE lead_interactions SET ${sets.join(",")} WHERE id=$${idx++} AND lead_id=$${idx}`, vals);
    return NextResponse.json({ success: true, message: "Interaction updated." });
  } catch (err) {
    console.error("[INTERACTION:PUT]", err);
    return NextResponse.json({ error: "Failed to update interaction." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, iid } = await params;
  try {
    const { rows } = await query("SELECT actor_id FROM lead_interactions WHERE id=$1 AND lead_id=$2", [iid, id]);
    if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (rows[0].actor_id !== session.id && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    await query("DELETE FROM lead_interactions WHERE id=$1", [iid]);
    return NextResponse.json({ success: true, message: "Interaction deleted." });
  } catch (err) {
    console.error("[INTERACTION:DELETE]", err);
    return NextResponse.json({ error: "Failed to delete interaction." }, { status: 500 });
  }
}
