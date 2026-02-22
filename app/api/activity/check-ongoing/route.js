/**
 * app/api/activity/check-ongoing/route.js
 * GET /api/activity/check-ongoing
 * Returns current session + break status for the logged-in user.
 */

import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.id;

    // Active session
    const { rows: sessions } = await query(
      `SELECT id, session_start_time, break_count, total_break_duration
       FROM session_logs
       WHERE user_id = $1 AND status = 'ongoing'
       ORDER BY session_start_time DESC LIMIT 1`,
      [userId]
    );

    const hasSession = sessions.length > 0;

    // Active break
    const { rows: breaks } = await query(
      `SELECT id, start_time, reason
       FROM breaks
       WHERE user_id = $1 AND status = 'active'
       LIMIT 1`,
      [userId]
    );

    const hasBreak = breaks.length > 0;

    // Today's completed sessions
    const today = new Date().toISOString().split("T")[0];
    const { rows: todaySessions } = await query(
      `SELECT id, session_start_time, session_end_time, session_duration,
              break_count, total_break_duration, shift_hours, total_overtime
       FROM session_logs
       WHERE user_id = $1 AND date = $2 AND status = 'completed'
       ORDER BY session_number ASC`,
      [userId, today]
    );

    return NextResponse.json({
      success: true,
      has_ongoing_session: hasSession,
      session: hasSession ? sessions[0] : null,
      has_active_break: hasBreak,
      active_break: hasBreak ? breaks[0] : null,
      today_sessions: todaySessions,
    });

  } catch (err) {
    console.error("[ACTIVITY:CHECK-ONGOING]", err);
    return NextResponse.json({ error: "Failed to check status." }, { status: 500 });
  }
}
