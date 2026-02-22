/**
 * app/api/leads/[id]/interactions/route.js
 * GET  — list interactions for a lead (newest first)
 * POST — log a new interaction (call, demo, meeting, chat, email)
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { rows } = await query(`
      SELECT li.*, u.name AS actor_name
      FROM lead_interactions li
      JOIN users u ON u.id = li.actor_id
      WHERE li.lead_id = $1
      ORDER BY li.interacted_at DESC
    `, [id]);
    return NextResponse.json({ success: true, interactions: rows });
  } catch (err) {
    console.error("[INTERACTIONS:GET]", err);
    return NextResponse.json({ error: "Failed to fetch interactions." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { type = "call", notes, interacted_at } = await request.json();
    if (!notes?.trim()) return NextResponse.json({ error: "Notes are required." }, { status: 400 });

    const VALID_TYPES = ["call","demo","meeting","chat","email","other"];
    const t = VALID_TYPES.includes(type) ? type : "call";

    const iid = randomUUID();
    const ts  = interacted_at || new Date().toISOString();
    await query(`
      INSERT INTO lead_interactions (id, lead_id, actor_id, type, notes, interacted_at)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [iid, id, session.id, t, notes.trim(), ts]);

    // Mirror into lead_activity for the combined timeline
    await query(`
      INSERT INTO lead_activity (id, lead_id, actor_id, event_type, payload)
      VALUES ($1,$2,$3,'interaction',$4)
    `, [randomUUID(), id, session.id, JSON.stringify({ interaction_id: iid, type: t, notes: notes.trim(), interacted_at: ts })]);

    return NextResponse.json({ success: true, id: iid, message: "Interaction logged." });
  } catch (err) {
    console.error("[INTERACTIONS:POST]", err);
    return NextResponse.json({ error: "Failed to log interaction." }, { status: 500 });
  }
}
