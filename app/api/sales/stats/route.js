/**
 * app/api/sales/stats/route.js
 * GET — aggregated sales metrics for the Sales Dashboard.
 * Uses safe parameterised queries throughout; no string-interpolated user IDs.
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const isAdmin = session.role === "ADMIN";
    /* Sales department users (dept = "Sales") see all leads — same as admin */
    const isSalesDept = session.sub_role_dept === "Sales";
    const seeAll = isAdmin || isSalesDept;
    const uid    = session.id;

    /* ── Lead counts by pipeline stage ── */
    let stageRows;
    if (seeAll) {
      ({ rows: stageRows } = await query(`
        SELECT ls.label, ls.color, ls.slug, COUNT(l.id)::int AS count
        FROM lead_statuses ls
        LEFT JOIN leads l ON l.status_slug = ls.slug
        GROUP BY ls.label, ls.color, ls.slug, ls.position
        ORDER BY ls.position
      `));
    } else {
      ({ rows: stageRows } = await query(`
        SELECT ls.label, ls.color, ls.slug, COUNT(l.id)::int AS count
        FROM lead_statuses ls
        LEFT JOIN leads l ON l.status_slug = ls.slug AND l.assigned_to = $1
        GROUP BY ls.label, ls.color, ls.slug, ls.position
        ORDER BY ls.position
      `, [uid]));
    }

    /* ── Lead totals ── */
    let totalsRows;
    if (seeAll) {
      ({ rows: totalsRows } = await query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status_slug = 'new_lead')::int AS new_leads,
          COUNT(*) FILTER (WHERE status_slug = 'won')::int      AS won,
          COUNT(*) FILTER (WHERE status_slug = 'lost')::int     AS lost,
          COUNT(*) FILTER (
            WHERE status_slug = 'new_lead'
            AND NOT EXISTS (
              SELECT 1 FROM lead_activity la
              WHERE la.lead_id = leads.id AND la.event_type <> 'created'
            )
          )::int AS unattended
        FROM leads
      `));
    } else {
      ({ rows: totalsRows } = await query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status_slug = 'new_lead')::int AS new_leads,
          COUNT(*) FILTER (WHERE status_slug = 'won')::int      AS won,
          COUNT(*) FILTER (WHERE status_slug = 'lost')::int     AS lost,
          COUNT(*) FILTER (
            WHERE status_slug = 'new_lead'
            AND NOT EXISTS (
              SELECT 1 FROM lead_activity la
              WHERE la.lead_id = leads.id AND la.event_type <> 'created'
            )
          )::int AS unattended
        FROM leads
        WHERE assigned_to = $1
      `, [uid]));
    }
    const totals = totalsRows[0] || {};

    /* ── Leads by source ── */
    let sourceRows;
    if (seeAll) {
      ({ rows: sourceRows } = await query(`
        SELECT COALESCE(source, 'Unknown') AS source, COUNT(*)::int AS count
        FROM leads
        GROUP BY source ORDER BY count DESC LIMIT 8
      `));
    } else {
      ({ rows: sourceRows } = await query(`
        SELECT COALESCE(source, 'Unknown') AS source, COUNT(*)::int AS count
        FROM leads WHERE assigned_to = $1
        GROUP BY source ORDER BY count DESC LIMIT 8
      `, [uid]));
    }

    /* ── Follow-up counts ── */
    let fuRows;
    if (seeAll) {
      ({ rows: fuRows } = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status='pending' AND due_at < NOW())::int AS overdue,
          COUNT(*) FILTER (WHERE status='pending' AND due_at >= NOW())::int AS upcoming,
          COUNT(*) FILTER (WHERE status='done')::int AS completed
        FROM lead_followups
      `));
    } else {
      ({ rows: fuRows } = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status='pending' AND due_at < NOW())::int AS overdue,
          COUNT(*) FILTER (WHERE status='pending' AND due_at >= NOW())::int AS upcoming,
          COUNT(*) FILTER (WHERE status='done')::int AS completed
        FROM lead_followups WHERE created_by = $1
      `, [uid]));
    }
    const fuCounts = fuRows[0] || {};

    /* ── Proposal counts ── */
    let propRows;
    if (seeAll) {
      ({ rows: propRows } = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status='draft')::int      AS draft,
          COUNT(*) FILTER (WHERE status='sent')::int       AS sent,
          COUNT(*) FILTER (WHERE status='accepted')::int   AS accepted,
          COUNT(*) FILTER (WHERE status='rejected')::int   AS rejected,
          COALESCE(SUM(CASE WHEN status='accepted' THEN total ELSE 0 END),0) AS won_value
        FROM proposals
      `));
    } else {
      ({ rows: propRows } = await query(`
        SELECT
          COUNT(*) FILTER (WHERE p.status='draft')::int      AS draft,
          COUNT(*) FILTER (WHERE p.status='sent')::int       AS sent,
          COUNT(*) FILTER (WHERE p.status='accepted')::int   AS accepted,
          COUNT(*) FILTER (WHERE p.status='rejected')::int   AS rejected,
          COALESCE(SUM(CASE WHEN p.status='accepted' THEN p.total ELSE 0 END),0) AS won_value
        FROM proposals p
        JOIN leads l ON l.id = p.lead_id
        WHERE l.assigned_to = $1
      `, [uid]));
    }
    const propCounts = propRows[0] || {};

    /* ── Recent activity (last 12) ── */
    let activityRows;
    if (seeAll) {
      ({ rows: activityRows } = await query(`
        SELECT la.*, l.name AS lead_name, u.name AS actor_name
        FROM lead_activity la
        JOIN leads l ON l.id = la.lead_id
        JOIN users u ON u.id = la.actor_id
        ORDER BY la.created_at DESC LIMIT 12
      `));
    } else {
      ({ rows: activityRows } = await query(`
        SELECT la.*, l.name AS lead_name, u.name AS actor_name
        FROM lead_activity la
        JOIN leads l ON l.id = la.lead_id
        JOIN users u ON u.id = la.actor_id
        WHERE l.assigned_to = $1
        ORDER BY la.created_at DESC LIMIT 12
      `, [uid]));
    }

    return NextResponse.json({
      success: true,
      statusCounts: stageRows,
      totals,
      bySource:      sourceRows,
      followups:     fuCounts,
      proposals:     propCounts,
      recentActivity: activityRows,
    });
  } catch (err) {
    console.error("[SALES-STATS]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
