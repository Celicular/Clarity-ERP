/**
 * app/api/leads/route.js
 * GET  /api/leads  — list leads (search, status, source, criticality filters)
 * POST /api/leads  — create a lead (with duplicate detection)
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";
import { detectDuplicates } from "../../../lib/leadDuplicates";

/* ── GET — list all leads ── */
export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const status      = searchParams.get("status")      || "";
    const source      = searchParams.get("source")      || "";
    const criticality = searchParams.get("criticality") || "";
    const assigned    = searchParams.get("assigned_to") || "";
    const search      = searchParams.get("search")      || "";

    let sql = `
      SELECT
        l.*,
        ls.label      AS status_label,
        ls.color      AS status_color,
        ls.position   AS status_position,
        u.name        AS assigned_to_name,
        cb.name       AS created_by_name,
        -- Unattended: still in new_lead with no subsequent activity in 24h
        (
          l.status_slug = 'new_lead'
          AND NOT EXISTS (
            SELECT 1 FROM lead_activity la
            WHERE la.lead_id = l.id
              AND la.event_type <> 'created'
          )
        ) AS unattended,
        -- Follow-up flag
        EXISTS (
          SELECT 1 FROM lead_followups lf
          WHERE lf.lead_id = l.id AND lf.status = 'pending'
        ) AS has_followup,
        (
          SELECT MIN(lf.due_at) FROM lead_followups lf
          WHERE lf.lead_id = l.id AND lf.status = 'pending'
        ) AS next_followup_at

      FROM leads l
      LEFT JOIN lead_statuses ls ON ls.slug  = l.status_slug
      LEFT JOIN users         u  ON u.id     = l.assigned_to
      LEFT JOIN users         cb ON cb.id    = l.created_by
      WHERE l.merged_into IS NULL
    `;
    const params = [];
    let idx = 1;

    if (status)      { sql += ` AND l.status_slug = $${idx++}`;  params.push(status); }
    if (source)      { sql += ` AND l.source = $${idx++}`;       params.push(source); }
    if (criticality) { sql += ` AND l.criticality = $${idx++}`;  params.push(criticality); }
    if (assigned)    { sql += ` AND l.assigned_to = $${idx++}`;  params.push(assigned); }
    if (search) {
      sql += ` AND (l.name ILIKE $${idx} OR l.email ILIKE $${idx} OR l.phone ILIKE $${idx} OR l.company ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += " ORDER BY ls.position ASC, l.created_at DESC";

    const { rows } = await query(sql, params);
    return NextResponse.json({ success: true, leads: rows });
  } catch (err) {
    console.error("[LEADS:GET]", err);
    return NextResponse.json({ error: "Failed to fetch leads." }, { status: 500 });
  }
}

/* ── POST — create lead ── */
export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, email, phone, company, source = "Manual", criticality = "Normal", notes, assigned_to, force } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Lead name is required." }, { status: 400 });
    }

    // Duplicate detection
    if (!force) {
      const dupes = await detectDuplicates({ email, phone, name, company });
      if (dupes.length > 0) {
        return NextResponse.json({ duplicate: true, duplicates: dupes }, { status: 409 });
      }
    }

    const id = randomUUID();
    await query(`
      INSERT INTO leads (id, name, email, phone, company, source, criticality, status_slug, assigned_to, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'new_lead',$8,$9,$10)
    `, [id, name.trim(), email || null, phone || null, company || null, source, criticality, assigned_to || null, notes || null, session.id]);

    // Log creation activity
    await query(`
      INSERT INTO lead_activity (id, lead_id, actor_id, event_type, payload)
      VALUES ($1,$2,$3,'created',$4)
    `, [randomUUID(), id, session.id, JSON.stringify({ name, email, phone, source })]);

    return NextResponse.json({ success: true, message: "Lead created.", id });
  } catch (err) {
    console.error("[LEADS:POST]", err);
    return NextResponse.json({ error: "Failed to create lead." }, { status: 500 });
  }
}
