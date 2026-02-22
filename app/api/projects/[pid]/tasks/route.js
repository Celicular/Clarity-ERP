/**
 * app/api/projects/[pid]/tasks/route.js
 * GET  — list tasks with subtasks
 * POST — create task
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { rows: tasks } = await query(`
    SELECT t.*, u.name AS assigned_to_name,
      COALESCE(json_agg(st ORDER BY st.created_at) FILTER (WHERE st.id IS NOT NULL), '[]') AS subtasks
    FROM project_tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN project_subtasks st ON st.task_id = t.id
    WHERE t.project_id = $1
    GROUP BY t.id, u.name
    ORDER BY t.sort_order, t.created_at
  `, [pid]);
  return NextResponse.json({ success: true, tasks });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { title, description, assigned_to, priority, due_date, subtasks = [] } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required." }, { status: 400 });
  const tid = randomUUID();
  await query(`
    INSERT INTO project_tasks (id,project_id,created_by,assigned_to,title,description,priority,due_date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [tid, pid, session.id, assigned_to||null, title.trim(), description||null, priority||"Normal", due_date||null]);
  for (const st of subtasks) {
    await query("INSERT INTO project_subtasks (id,task_id,title) VALUES ($1,$2,$3)",
      [randomUUID(), tid, st.title]);
  }
  return NextResponse.json({ success: true, id: tid });
}
