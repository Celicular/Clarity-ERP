/**
 * app/api/admin/stats/route.js
 * GET /api/admin/stats
 *
 * Returns a snapshot of the most important ERP metrics for the Super Admin
 * dashboard. All figures come from the live database in a single round-trip.
 *
 * Access: ADMIN only.
 */

import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET() {
  /* ── Auth guard ─────────────────────────────────────────────────────────── */
  const session = await getSession();
  if (!session)               return NextResponse.json({ error: "Unauthorized" },  { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" },    { status: 403 });

  try {
    const { rows } = await query(`
      SELECT

        /* ── Users ──────────────────────────────────────────────── */
        (SELECT COUNT(*)::int  FROM users)                                          AS total_users,
        (SELECT COUNT(*)::int  FROM users WHERE status = 'Active')                 AS active_users,

        /* ── Projects ───────────────────────────────────────────── */
        (SELECT COUNT(*)::int  FROM projects WHERE status = 'active')              AS active_projects,
        (SELECT COUNT(*)::int  FROM projects)                                      AS total_projects,

        /* ── Revenue ─────────────────────────────────────────────
           MTD  = current calendar month (paid_at in current month/year)
           All-time = sum of every payment recorded                       */
        (
          SELECT COALESCE(SUM(amount), 0)::numeric
          FROM payments
          WHERE DATE_TRUNC('month', paid_at::timestamptz) = DATE_TRUNC('month', NOW())
        )                                                                           AS revenue_mtd,

        (
          SELECT COALESCE(SUM(amount), 0)::numeric
          FROM payments
          WHERE DATE_TRUNC('month', paid_at::timestamptz) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        )                                                                           AS revenue_last_month,

        (SELECT COALESCE(SUM(amount), 0)::numeric FROM payments)                   AS revenue_all_time,

        /* ── Tasks ───────────────────────────────────────────────── */
        (
          SELECT COUNT(*)::int
          FROM project_tasks
          WHERE status NOT IN ('done','cancelled')
        )                                                                           AS open_tasks,

        (
          SELECT COUNT(*)::int
          FROM project_tasks
          WHERE status = 'done'
        )                                                                           AS completed_tasks,

        /* ── Follow-Ups ──────────────────────────────────────────── */
        (
          SELECT COUNT(*)::int
          FROM lead_followups
          WHERE status = 'pending'
        )                                                                           AS pending_followups,

        (
          SELECT COUNT(*)::int
          FROM lead_followups
          WHERE status = 'pending' AND due_at < NOW()
        )                                                                           AS overdue_followups,

        /* ── Leads ───────────────────────────────────────────────── */
        (
          SELECT COUNT(*)::int
          FROM leads
          WHERE status_slug NOT IN ('won','lost') AND merged_into IS NULL
        )                                                                           AS open_leads,

        (SELECT COUNT(*)::int FROM leads WHERE status_slug = 'won')                AS won_leads,

        /* ── HR ──────────────────────────────────────────────────── */
        (
          SELECT COUNT(*)::int
          FROM leave_requests
          WHERE status = 'pending'
        )                                                                           AS pending_leaves,

        /* ── Clients & Invoices ───────────────────────────────────── */
        (SELECT COUNT(*)::int FROM clients WHERE status = 'active')                AS active_clients,

        (
          SELECT COUNT(*)::int
          FROM invoices
          WHERE status NOT IN ('paid','cancelled')
        )                                                                           AS open_invoices
    `, []);

    const s = rows[0];

    return NextResponse.json({ success: true, stats: s });

  } catch (err) {
    console.error("[ADMIN/STATS:GET]", err);
    return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
  }
}
