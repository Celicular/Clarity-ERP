/**
 * app/api/projects/[pid]/route.js
 * GET — full project with activity
 * PUT — update project fields
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { rows: [p] } = await query(`
    SELECT p.*, u.name AS created_by_name, d.name AS dev_name, d.id AS dev_id,
      l.name AS lead_name, c.name AS client_name
    FROM projects p
    LEFT JOIN users u ON u.id = p.created_by
    LEFT JOIN users d ON d.id = p.assigned_dev
    LEFT JOIN leads l ON l.id = p.lead_id
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.id = $1
  `, [pid]);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rows: activity } = await query(`
    SELECT pa.*, u.name AS actor_name FROM project_activity pa
    JOIN users u ON u.id = pa.actor_id
    WHERE pa.project_id = $1 ORDER BY pa.created_at DESC LIMIT 30
  `, [pid]);

  return NextResponse.json({ success: true, project: { ...p, activity } });
}

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { name, description, status, priority, deadline, assigned_dev, deal_value } = await req.json();
  await query(`
    UPDATE projects SET name=$1,description=$2,status=$3,priority=$4,deadline=$5,
      assigned_dev=$6,deal_value=$7,updated_at=NOW() WHERE id=$8
  `, [name, description||null, status||"active", priority||"Normal", deadline||null, assigned_dev||null, deal_value||0, pid]);
  await query(`INSERT INTO project_activity (id,project_id,actor_id,event_type,payload) VALUES ($1,$2,$3,'project_updated',$4)`,
    [randomUUID(), pid, session.id, JSON.stringify({ status, assigned_dev })]);
  return NextResponse.json({ success: true });
}
