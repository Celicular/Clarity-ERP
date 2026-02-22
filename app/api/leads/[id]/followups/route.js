/**
 * app/api/leads/[id]/followups/route.js
 * GET  /api/leads/:id/followups  — list all follow-ups for a lead
 * POST /api/leads/:id/followups  — create a new follow-up reminder
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
      SELECT lf.*, u.name AS created_by_name, cb.name AS completed_by_name
      FROM lead_followups lf
      JOIN  users u  ON u.id  = lf.created_by
      LEFT JOIN users cb ON cb.id = lf.completed_by
      WHERE lf.lead_id = $1
      ORDER BY lf.due_at ASC
    `, [id]);
    return NextResponse.json({ success: true, followups: rows });
  } catch (err) {
    console.error("[FOLLOWUPS:GET]", err);
    return NextResponse.json({ error: "Failed to fetch follow-ups." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { due_at, note, priority = "Normal" } = await request.json();
    if (!due_at) return NextResponse.json({ error: "Due date is required." }, { status: 400 });

    const validPriorities = ["Low", "Normal", "Urgent"];
    const p = validPriorities.includes(priority) ? priority : "Normal";

    const fid = randomUUID();
    await query(`
      INSERT INTO lead_followups (id, lead_id, created_by, due_at, note, priority)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [fid, id, session.id, due_at, note || null, p]);

    // Log in activity
    await query(`
      INSERT INTO lead_activity (id, lead_id, actor_id, event_type, payload)
      VALUES ($1,$2,$3,'followup_set',$4)
    `, [randomUUID(), id, session.id, JSON.stringify({ due_at, priority: p, note })]);

    return NextResponse.json({ success: true, id: fid, message: "Follow-up scheduled." });
  } catch (err) {
    console.error("[FOLLOWUPS:POST]", err);
    return NextResponse.json({ error: "Failed to create follow-up." }, { status: 500 });
  }
}
