/**
 * app/api/leads/[id]/followups/[fid]/route.js
 * PUT    — edit or mark done
 * DELETE — remove follow-up
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, fid } = await params;
  try {
    const { action, due_at, note, priority } = await request.json();

    if (action === "done") {
      await query(`
        UPDATE lead_followups
        SET status='done', completed_at=NOW(), completed_by=$1, updated_at=NOW()
        WHERE id=$2 AND lead_id=$3
      `, [session.id, fid, id]);

      await query(`
        INSERT INTO lead_activity (id, lead_id, actor_id, event_type, payload)
        VALUES ($1,$2,$3,'followup_done',$4)
      `, [randomUUID(), id, session.id, JSON.stringify({ followup_id: fid })]);

      return NextResponse.json({ success: true, message: "Follow-up marked done." });
    }

    // Edit
    const sets = []; const vals = []; let idx = 1;
    if (due_at)   { sets.push(`due_at = $${idx++}`);   vals.push(due_at); }
    if (note !== undefined) { sets.push(`note = $${idx++}`); vals.push(note); }
    if (priority) { sets.push(`priority = $${idx++}`); vals.push(priority); }
    sets.push(`updated_at = NOW()`);
    vals.push(fid, id);
    await query(`UPDATE lead_followups SET ${sets.join(",")} WHERE id=$${idx++} AND lead_id=$${idx}`, vals);
    return NextResponse.json({ success: true, message: "Follow-up updated." });
  } catch (err) {
    console.error("[FOLLOWUP:PUT]", err);
    return NextResponse.json({ error: "Failed to update follow-up." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, fid } = await params;
  try {
    await query("DELETE FROM lead_followups WHERE id=$1 AND lead_id=$2", [fid, id]);
    return NextResponse.json({ success: true, message: "Follow-up deleted." });
  } catch (err) {
    console.error("[FOLLOWUP:DELETE]", err);
    return NextResponse.json({ error: "Failed to delete follow-up." }, { status: 500 });
  }
}
