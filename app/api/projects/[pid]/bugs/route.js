/**
 * app/api/projects/[pid]/bugs/route.js
 * GET  — list bugs
 * POST — report a bug
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { rows } = await query(`
    SELECT b.*, r.name AS reported_by_name, a.name AS assigned_to_name
    FROM project_bugs b
    LEFT JOIN users r ON r.id = b.reported_by
    LEFT JOIN users a ON a.id = b.assigned_to
    WHERE b.project_id = $1 ORDER BY
      CASE b.priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END,
      b.created_at DESC
  `, [pid]);
  return NextResponse.json({ success: true, bugs: rows });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { title, description, priority = "Normal", assigned_to } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required." }, { status: 400 });
  const id = randomUUID();
  await query(
    "INSERT INTO project_bugs (id,project_id,reported_by,assigned_to,title,description,priority) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id, pid, session.id, assigned_to||null, title.trim(), description||null, priority]
  );
  return NextResponse.json({ success: true, id });
}
