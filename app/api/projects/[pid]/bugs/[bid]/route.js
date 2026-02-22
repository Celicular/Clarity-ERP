/**
 * app/api/projects/[pid]/bugs/[bid]/route.js
 * PUT — update bug (status, priority, assign)
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { bid } = await params;
  const { title, description, status, priority, assigned_to } = await req.json();
  const resolved_at = status === "resolved" ? "NOW()" : null;
  await query(`
    UPDATE project_bugs SET
      title=$1, description=$2, status=$3, priority=$4, assigned_to=$5,
      resolved_at=${resolved_at ? "NOW()" : "NULL"}
    WHERE id=$6
  `, [title, description||null, status||"open", priority||"Normal", assigned_to||null, bid]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { bid } = await params;
  await query("DELETE FROM project_bugs WHERE id=$1", [bid]);
  return NextResponse.json({ success: true });
}
