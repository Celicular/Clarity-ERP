/**
 * app/api/leads/[id]/status/route.js
 * PUT /api/leads/:id/status — change pipeline stage (used by Kanban drag-drop)
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { status_slug } = await request.json();
    if (!status_slug) return NextResponse.json({ error: "status_slug is required." }, { status: 400 });

    // Confirm status exists
    const { rows: statusRows } = await query("SELECT slug FROM lead_statuses WHERE slug = $1", [status_slug]);
    if (!statusRows[0]) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

    // Get current status for the activity log
    const { rows: leadRows } = await query("SELECT status_slug FROM leads WHERE id = $1", [id]);
    if (!leadRows[0]) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    const prevSlug = leadRows[0].status_slug;
    if (prevSlug === status_slug) return NextResponse.json({ success: true, message: "No change." });

    await query("UPDATE leads SET status_slug = $1, updated_at = NOW() WHERE id = $2", [status_slug, id]);

    await query(`
      INSERT INTO lead_activity (id, lead_id, actor_id, event_type, payload)
      VALUES ($1,$2,$3,'status_changed',$4)
    `, [randomUUID(), id, session.id, JSON.stringify({ from: prevSlug, to: status_slug })]);

    return NextResponse.json({ success: true, message: "Status updated." });
  } catch (err) {
    console.error("[LEAD:STATUS]", err);
    return NextResponse.json({ error: "Failed to update status." }, { status: 500 });
  }
}
