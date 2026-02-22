/**
 * app/api/activity/end-break/route.js
 * POST /api/activity/end-break
 * Ends the active break and updates session + user_activity.
 */

import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.id;
    const now    = new Date();

    // Find active break
    const { rows: breaks } = await query(
      `SELECT * FROM breaks
       WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    );

    if (breaks.length === 0) {
      return NextResponse.json({ error: "No active break found." }, { status: 404 });
    }

    const brk      = breaks[0];
    const startMs  = new Date(brk.start_time).getTime();
    const duration = Math.floor((now.getTime() - startMs) / 1000);

    // Complete the break
    await query(`
      UPDATE breaks SET
        end_time   = $1,
        duration   = $2,
        status     = 'completed',
        updated_at = NOW()
      WHERE id = $3
    `, [now.toISOString(), duration, brk.id]);

    // Update session_logs: increment break count and duration
    await query(`
      UPDATE session_logs SET
        break_count          = break_count + 1,
        total_break_duration = total_break_duration + $1,
        updated_at           = NOW()
      WHERE id = $2
    `, [duration, brk.session_id]);

    // Update user_activity
    const today = new Date().toISOString().split("T")[0];
    await query(`
      UPDATE user_activity SET
        status           = 'logged_in',
        total_break_time = total_break_time + $1,
        last_break_end   = $2,
        updated_at       = NOW()
      WHERE user_id = $3 AND date = $4
    `, [duration, now.toISOString(), userId, today]);

    return NextResponse.json({
      success:        true,
      message:        "Break ended.",
      break_duration: duration,
    });

  } catch (err) {
    console.error("[ACTIVITY:END-BREAK]", err);
    return NextResponse.json({ error: "Failed to end break." }, { status: 500 });
  }
}
