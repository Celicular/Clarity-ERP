import { NextResponse } from "next/server";
import { getSession }   from "../../../lib/auth";
import { logAudit }     from "../../../lib/auditlogger";
import { query }        from "../../../lib/db";

export async function POST(request) {
  try {
    const session = await getSession();
    // Allow unauthenticated logs for things like failed logins, 
    // but try to grab the user ID if one exists.
    const done_by = session?.id || null;

    const body = await request.json();
    const { action, criticality } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // ── Extract Request IP Details ─────────────────────────────────────────────
    let ip = request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || request.ip || "Unknown IP";
    if (ip === "::1") ip = "127.0.0.1";

    const success = await logAudit({
      action: action,
      criticality: criticality || "Low",
      done_by: done_by,
      done_by_ip: ip
    });

    if (!success) {
      return NextResponse.json({ error: "Failed to record audit log" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AUDIT LOG POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine limit
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Fetch the latest logs, join with users table to get the name of the user who performed the action
    const { rows } = await query(`
      SELECT 
        a.id, 
        a.action, 
        a.criticality as status, 
        COALESCE(u.name, 'System') as target, 
        a.done_by_ip as ip, 
        a.time as timestamp
      FROM auditlogs a
      LEFT JOIN users u ON a.done_by = u.id
      ORDER BY a.time DESC
      LIMIT $1
    `, [limit]);

    // Fetch stats
    const { rows: activeSessionsRows } = await query(`SELECT COUNT(*) AS count FROM users WHERE is_logged_in = true`);
    const { rows: failedLoginsRows } = await query(`
      SELECT COUNT(*) AS count FROM auditlogs 
      WHERE action LIKE 'INVALID_LOGIN_ATTEMPT%' OR action = 'INVALID_PASSWORD'
    `);
    const { rows: criticalEventsRows } = await query(`
      SELECT COUNT(*) AS count FROM auditlogs 
      WHERE criticality IN ('High', 'Critical')
    `);

    const stats = {
      activeSessions: parseInt(activeSessionsRows[0].count, 10) || 0,
      failedLogins: parseInt(failedLoginsRows[0].count, 10) || 0,
      criticalEvents: parseInt(criticalEventsRows[0].count, 10) || 0,
    };

    return NextResponse.json({ success: true, logs: rows, stats });
  } catch (err) {
    console.error("[AUDIT LOG GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
