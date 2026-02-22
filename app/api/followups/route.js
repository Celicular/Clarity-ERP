/**
 * app/api/followups/route.js
 * GET /api/followups — global query (dashboard widget + notification polling)
 * ?status=pending&overdue=true&limit=20
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";

export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status   = searchParams.get("status")  || "pending";
  const overdue  = searchParams.get("overdue") === "true";
  const limit    = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    let sql = `
      SELECT
        lf.*,
        l.name  AS lead_name,
        l.email AS lead_email,
        l.status_slug,
        ls.label AS status_label,
        ls.color AS status_color,
        u.name  AS created_by_name
      FROM lead_followups lf
      JOIN leads        l  ON l.id  = lf.lead_id
      LEFT JOIN lead_statuses ls ON ls.slug = l.status_slug
      JOIN users        u  ON u.id  = lf.created_by
      WHERE l.merged_into IS NULL
    `;
    const vals = [];
    let idx = 1;

    if (status) { sql += ` AND lf.status = $${idx++}`; vals.push(status); }
    if (overdue) { sql += ` AND lf.due_at < NOW()`; }

    // Non-admins only see their own
    if (session.role !== "ADMIN") {
      sql += ` AND lf.created_by = $${idx++}`;
      vals.push(session.id);
    }

    sql += ` ORDER BY lf.due_at ASC LIMIT $${idx}`;
    vals.push(limit);

    const { rows } = await query(sql, vals);
    return NextResponse.json({ success: true, followups: rows });
  } catch (err) {
    console.error("[GLOBAL-FOLLOWUPS:GET]", err);
    return NextResponse.json({ error: "Failed to fetch follow-ups." }, { status: 500 });
  }
}
