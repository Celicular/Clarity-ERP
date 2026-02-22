/**
 * app/api/bug-reports/[bid]/route.js
 * PUT  — update status (Admin / Developer)
 * DELETE — delete a report (Admin only)
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isAdmin = session.role === "ADMIN";
  const isDev   = session.sub_role_dept === "Development";
  if (!isAdmin && !isDev) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { bid } = await params;
  const { status, assigned_to_project } = await req.json();

  try {
    /* Optionally assign to a project */
    if (assigned_to_project) {
      await query(
        `UPDATE project_bugs SET project_id=$1, status=COALESCE($2,status), resolved_at=CASE WHEN $2='resolved' THEN NOW() ELSE resolved_at END WHERE id=$3`,
        [assigned_to_project, status || null, bid]
      );
    } else {
      await query(
        `UPDATE project_bugs SET status=$1, resolved_at=CASE WHEN $1='resolved' THEN NOW() ELSE resolved_at END WHERE id=$2`,
        [status, bid]
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[BUG-REPORTS:PUT]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bid } = await params;
  /* Allow reporter or admin to delete */
  const { rows: [bug] } = await query("SELECT reported_by FROM project_bugs WHERE id=$1", [bid]);
  if (!bug) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role !== "ADMIN" && session.id !== bug.reported_by)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await query("DELETE FROM project_bugs WHERE id=$1", [bid]);
  return NextResponse.json({ success: true });
}
