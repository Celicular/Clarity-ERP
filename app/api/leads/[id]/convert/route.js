/**
 * app/api/leads/[id]/convert/route.js
 * POST — convert a won lead to a project; run developer suggestion inline
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { name, description, deadline, dev_id, deal_value, priority = "Normal" } = await req.json();

    /* fetch lead for client_id */
    const { rows: [lead] } = await query("SELECT * FROM leads WHERE id=$1", [id]);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const pid = randomUUID();
    await query(`
      INSERT INTO projects (id, lead_id, client_id, created_by, assigned_dev, name, description, deadline, deal_value, priority)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [pid, id, lead.client_id || null, session.id, dev_id || null, name || lead.name, description || null, deadline || null, deal_value || lead.deal_value || 0, priority]);

    /* log activity */
    await query(`INSERT INTO project_activity (id,project_id,actor_id,event_type,payload) VALUES ($1,$2,$3,'project_created',$4)`,
      [randomUUID(), pid, session.id, JSON.stringify({ lead_id: id, dev_id })]);

    /* also log on lead */
    await query(`INSERT INTO lead_activity (id,lead_id,actor_id,event_type,payload) VALUES ($1,$2,$3,'project_created',$4)`,
      [randomUUID(), id, session.id, JSON.stringify({ project_id: pid })]);

    return NextResponse.json({ success: true, id: pid });
  } catch (err) {
    console.error("[CONVERT]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
