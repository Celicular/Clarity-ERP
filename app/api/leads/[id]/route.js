/**
 * app/api/leads/[id]/route.js
 * GET    /api/leads/:id  — lead detail + activity log
 * PUT    /api/leads/:id  — edit lead fields
 * DELETE /api/leads/:id  — admin delete
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

/* ── GET ── */
export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const [leadRes, actRes] = await Promise.all([
      query(`
        SELECT l.*, ls.label AS status_label, ls.color AS status_color,
               u.name AS assigned_to_name, cb.name AS created_by_name
        FROM leads l
        LEFT JOIN lead_statuses ls ON ls.slug = l.status_slug
        LEFT JOIN users         u  ON u.id    = l.assigned_to
        LEFT JOIN users         cb ON cb.id   = l.created_by
        WHERE l.id = $1
      `, [id]),
      query(`
        SELECT la.*, u.name AS actor_name
        FROM lead_activity la
        LEFT JOIN users u ON u.id = la.actor_id
        WHERE la.lead_id = $1
        ORDER BY la.created_at ASC
      `, [id]),
    ]);

    if (!leadRes.rows[0]) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    return NextResponse.json({ success: true, lead: leadRes.rows[0], activity: actRes.rows });
  } catch (err) {
    console.error("[LEAD:GET]", err);
    return NextResponse.json({ error: "Failed to fetch lead." }, { status: 500 });
  }
}

/* ── PUT ── */
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { name, email, phone, company, source, criticality, assigned_to, notes } = await request.json();
    const { rows } = await query("SELECT id FROM leads WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    await query(`
      UPDATE leads SET
        name        = COALESCE($1, name),
        email       = COALESCE($2, email),
        phone       = COALESCE($3, phone),
        company     = COALESCE($4, company),
        source      = COALESCE($5, source),
        criticality = COALESCE($6, criticality),
        assigned_to = $7,
        notes       = COALESCE($8, notes),
        updated_at  = NOW()
      WHERE id = $9
    `, [name, email, phone, company, source, criticality, assigned_to || null, notes, id]);

    await query(`
      INSERT INTO lead_activity (id, lead_id, actor_id, event_type, payload)
      VALUES ($1,$2,$3,'edited',$4)
    `, [randomUUID(), id, session.id, JSON.stringify({ by: session.name })]);

    return NextResponse.json({ success: true, message: "Lead updated." });
  } catch (err) {
    console.error("[LEAD:PUT]", err);
    return NextResponse.json({ error: "Failed to update lead." }, { status: 500 });
  }
}

/* ── DELETE ── */
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  try {
    const { rows } = await query("SELECT id FROM leads WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    await query("DELETE FROM leads WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Lead deleted." });
  } catch (err) {
    console.error("[LEAD:DELETE]", err);
    return NextResponse.json({ error: "Failed to delete lead." }, { status: 500 });
  }
}
