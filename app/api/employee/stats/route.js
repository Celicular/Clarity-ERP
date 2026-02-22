/**
 * app/api/employee/stats/route.js
 * GET /api/employee/stats
 *
 * Returns a personalised dashboard snapshot for the logged-in EMPLOYEE,
 * filtered by their user ID and, where relevant, their department.
 *
 * Query params (all optional):
 *   dept=Sales|Development|Finance|HR   (defaults to session.sub_role_dept)
 *
 * Access: EMPLOYEE (and ADMIN, who can preview any dept).
 */

import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET(request) {
  /* ── Auth ─────────────────────────────────────────────────────────────── */
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid  = session.id;
  const dept = session.sub_role_dept || "";   // e.g. "Sales", "Development", "HR", "Finance"

  try {
    /* ── 1. Common personal metrics — every employee ────────────────────── */
    const { rows: common } = await query(`
      SELECT
        /* Tasks assigned to this user */
        (
          SELECT COUNT(*)::int FROM project_tasks
          WHERE assigned_to = $1 AND status NOT IN ('done','cancelled')
        )  AS my_open_tasks,

        (
          SELECT COUNT(*)::int FROM project_tasks
          WHERE assigned_to = $1 AND status = 'done'
        )  AS my_completed_tasks,

        /* Follow-ups this user created that are still pending */
        (
          SELECT COUNT(*)::int FROM lead_followups
          WHERE created_by = $1 AND status = 'pending'
        )  AS my_pending_followups,

        (
          SELECT COUNT(*)::int FROM lead_followups
          WHERE created_by = $1 AND status = 'pending' AND due_at < NOW()
        )  AS my_overdue_followups,

        /* Leave requests */
        (
          SELECT COUNT(*)::int FROM leave_requests
          WHERE user_id = $1 AND status = 'pending'
        )  AS my_pending_leaves,

        (
          SELECT COUNT(*)::int FROM leave_requests
          WHERE user_id = $1 AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
        )  AS my_leaves_this_year,

        /* Upcoming meetings (user is an attendee, meeting not yet concluded) */
        (
          SELECT COUNT(*)::int
          FROM meeting_attendees ma
          JOIN meetings m ON m.id = ma.meeting_id
          WHERE ma.user_id = $1
            AND m.status = 'pending'
            AND m.scheduled_at >= NOW()
        )  AS my_upcoming_meetings,

        /* Unread notes elevated to this user */
        (
          SELECT COUNT(*)::int FROM notes
          WHERE elevated_to = $1 AND status = 'pending'
        )  AS my_elevated_notes
    `, [uid]);

    /* ── 2. Department-specific metrics ─────────────────────────────────── */
    let deptStats = {};

    /* ── SALES ── */
    if (dept === "Sales") {
      const { rows } = await query(`
        SELECT
          (
            SELECT COUNT(*)::int FROM leads
            WHERE assigned_to = $1 AND merged_into IS NULL
              AND status_slug NOT IN ('won','lost')
          )  AS my_open_leads,

          (
            SELECT COUNT(*)::int FROM leads
            WHERE assigned_to = $1 AND status_slug = 'won'
              AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())
          )  AS my_won_leads_mtd,

          (
            SELECT COUNT(*)::int FROM leads
            WHERE assigned_to = $1 AND merged_into IS NULL
          )  AS my_total_leads,

          (
            SELECT COUNT(*)::int FROM proposals p
            JOIN leads l ON l.id = p.lead_id
            WHERE l.assigned_to = $1 AND p.status = 'sent'
          )  AS my_open_proposals
      `, [uid]);
      deptStats = rows[0] || {};
    }

    /* ── DEVELOPMENT ── */
    else if (dept === "Development") {
      const { rows } = await query(`
        SELECT
          (
            SELECT COUNT(*)::int FROM projects
            WHERE assigned_dev = $1 AND status = 'active'
          )  AS my_active_projects,

          (
            SELECT COUNT(*)::int FROM project_bugs
            WHERE assigned_to = $1 AND status = 'open'
          )  AS my_open_bugs,

          (
            SELECT COUNT(*)::int FROM project_bugs
            WHERE assigned_to = $1 AND status = 'resolved'
              AND DATE_TRUNC('month', resolved_at) = DATE_TRUNC('month', NOW())
          )  AS my_bugs_fixed_mtd,

          (
            SELECT COALESCE(SUM(hours),0)::numeric FROM project_time_logs
            WHERE user_id = $1
              AND DATE_TRUNC('month', date::timestamptz) = DATE_TRUNC('month', NOW())
          )  AS my_hours_logged_mtd
      `, [uid]);
      deptStats = rows[0] || {};
    }

    /* ── FINANCE ── */
    else if (dept === "Finance") {
      const { rows } = await query(`
        SELECT
          (
            SELECT COUNT(*)::int FROM invoices
            WHERE status NOT IN ('paid','cancelled')
          )  AS open_invoices,

          (
            SELECT COALESCE(SUM(amount),0)::numeric FROM payments
            WHERE DATE_TRUNC('month', paid_at::timestamptz) = DATE_TRUNC('month', NOW())
          )  AS revenue_mtd,

          (
            SELECT COUNT(*)::int FROM payslips
            WHERE status = 'pending'
          )  AS pending_payslips
      `, []);
      deptStats = rows[0] || {};
    }

    /* ── HR ── */
    else if (dept === "HR") {
      const { rows } = await query(`
        SELECT
          (SELECT COUNT(*)::int FROM leave_requests WHERE status = 'pending')  AS pending_leaves,
          (SELECT COUNT(*)::int FROM users WHERE status = 'Active')            AS active_employees,
          (SELECT COUNT(*)::int FROM meetings WHERE status = 'pending' AND scheduled_at >= NOW()) AS upcoming_meetings
      `, []);
      deptStats = rows[0] || {};
    }

    return NextResponse.json({
      success: true,
      dept,
      stats: { ...common[0], ...deptStats },
    });

  } catch (err) {
    console.error("[EMPLOYEE/STATS:GET]", err);
    return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
  }
}
