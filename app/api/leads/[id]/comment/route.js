/**
 * app/api/leads/[id]/comment/route.js
 * POST /api/leads/:id/comment — append a comment to the activity timeline
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { text } = await request.json();
    if (!text?.trim()) return NextResponse.json({ error: "Comment text is required." }, { status: 400 });

    const { rows } = await query("SELECT id FROM leads WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    const actId = randomUUID();
    await query(`
      INSERT INTO lead_activity (id, lead_id, actor_id, event_type, payload)
      VALUES ($1,$2,$3,'commented',$4)
    `, [actId, id, session.id, JSON.stringify({ text: text.trim() })]);

    return NextResponse.json({ success: true, message: "Comment added.", id: actId });
  } catch (err) {
    console.error("[LEAD:COMMENT]", err);
    return NextResponse.json({ error: "Failed to add comment." }, { status: 500 });
  }
}
