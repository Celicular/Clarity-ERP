/**
 * app/api/projects/[pid]/subtasks/[sid]/route.js
 * PUT — toggle done, rename subtask
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sid } = await params;
  const { done, title } = await req.json();
  await query("UPDATE project_subtasks SET done=$1, title=COALESCE($2,title) WHERE id=$3",
    [!!done, title || null, sid]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sid } = await params;
  await query("DELETE FROM project_subtasks WHERE id=$1", [sid]);
  return NextResponse.json({ success: true });
}
