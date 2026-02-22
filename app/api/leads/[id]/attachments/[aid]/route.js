/**
 * app/api/leads/[id]/attachments/[aid]/route.js
 * DELETE — remove attachment file + DB record
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { unlink }       from "fs/promises";
import path             from "path";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, aid } = await params;
  try {
    const { rows: [att] } = await query("SELECT * FROM lead_attachments WHERE id=$1 AND lead_id=$2", [aid, id]);
    if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (att.uploaded_by !== session.id && session.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    /* delete from disk */
    const filePath = path.join(process.cwd(), "public", "uploads", "leads", id, att.stored_name);
    try { await unlink(filePath); } catch { /* file may already be gone */ }

    await query("DELETE FROM lead_attachments WHERE id=$1", [aid]);

    await query(`INSERT INTO lead_activity (id,lead_id,actor_id,event_type,payload) VALUES ($1,$2,$3,'attachment_removed',$4)`,
      [randomUUID(), id, session.id, JSON.stringify({ filename: att.filename })]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
