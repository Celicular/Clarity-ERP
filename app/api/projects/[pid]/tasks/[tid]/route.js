/**
 * app/api/projects/[pid]/tasks/[tid]/route.js
 * PUT — update task (status, title, etc)
 * DELETE — remove task
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";
import { randomUUID }   from "crypto";

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid, tid } = await params;
  const { title, description, status, priority, due_date, assigned_to } = await req.json();
  await query(`
    UPDATE project_tasks SET title=$1,description=$2,status=$3,priority=$4,due_date=$5,assigned_to=$6,updated_at=NOW()
    WHERE id=$7 AND project_id=$8
  `, [title, description||null, status||"todo", priority||"Normal", due_date||null, assigned_to||null, tid, pid]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tid, pid } = await params;
  await query("DELETE FROM project_tasks WHERE id=$1 AND project_id=$2", [tid, pid]);
  return NextResponse.json({ success: true });
}
