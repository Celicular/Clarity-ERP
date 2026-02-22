/**
 * app/api/projects/route.js
 * GET  — list projects (filtered by role/sub-role)
 * POST — create project manually
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";

function isSalesRole(s)   { const n=(s.sub_role_name||"").toLowerCase(); return n.includes("sales")||n.includes("bdm"); }
function isDevRole(s)     { const n=(s.sub_role_name||"").toLowerCase(); return n.includes("dev"); }
function isFinanceRole(s) { const n=(s.sub_role_name||"").toLowerCase(); return n.includes("finance")||n.includes("account"); }

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let sql = `
    SELECT p.*,
      u.name AS created_by_name,
      d.name AS dev_name,
      l.name AS lead_name
    FROM projects p
    LEFT JOIN users u ON u.id = p.created_by
    LEFT JOIN users d ON d.id = p.assigned_dev
    LEFT JOIN leads l ON l.id = p.lead_id
    WHERE 1=1
  `;
  const vals = [];

  /* Dev only sees their assigned projects */
  if (isDevRole(session)) {
    vals.push(session.id); sql += ` AND p.assigned_dev = $${vals.length}`;
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  if (status) { vals.push(status); sql += ` AND p.status = $${vals.length}`; }

  sql += " ORDER BY p.created_at DESC LIMIT 100";
  const { rows } = await query(sql, vals);
  return NextResponse.json({ success: true, projects: rows });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, description, lead_id, client_id, dev_id, deadline, deal_value, priority } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required." }, { status: 400 });
  const pid = randomUUID();
  await query(`
    INSERT INTO projects (id,lead_id,client_id,created_by,assigned_dev,name,description,deadline,deal_value,priority)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [pid, lead_id||null, client_id||null, session.id, dev_id||null, name.trim(), description||null, deadline||null, deal_value||0, priority||"Normal"]);
  await query(`INSERT INTO project_activity (id,project_id,actor_id,event_type) VALUES ($1,$2,$3,'project_created')`,
    [randomUUID(), pid, session.id]);
  return NextResponse.json({ success: true, id: pid });
}
