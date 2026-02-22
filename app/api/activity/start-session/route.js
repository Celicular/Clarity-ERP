/**
 * app/api/activity/start-session/route.js
 * POST /api/activity/start-session
 * Creates a new work session and updates user_activity.
 */

import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
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
    const today  = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Check for existing ongoing session
    const { rows: ongoing } = await query(
      `SELECT id FROM session_logs
       WHERE user_id = $1 AND status = 'ongoing' LIMIT 1`,
      [userId]
    );

    if (ongoing.length > 0) {
      return NextResponse.json(
        { error: "You already have an active session.", session_id: ongoing[0].id },
        { status: 409 }
      );
    }

    // Get session number for today
    const { rows: countRows } = await query(
      `SELECT COALESCE(MAX(session_number), 0) + 1 AS next_num
       FROM session_logs WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );
    const sessionNumber = countRows[0].next_num;

    // Create session log
    const sessionId = randomUUID();
    await query(`
      INSERT INTO session_logs (id, user_id, date, login_date, session_number, session_start_time, status)
      VALUES ($1, $2, $3, $3, $4, $5, 'ongoing')
    `, [sessionId, userId, today, sessionNumber, now.toISOString()]);

    // Upsert user_activity
    const activityId = randomUUID();
    await query(`
      INSERT INTO user_activity (id, user_id, date, status, session_start_time, login_count, last_logged_in)
      VALUES ($1, $2, $3, 'logged_in', $4, 1, $4)
      ON CONFLICT (user_id, date) DO UPDATE SET
        status         = 'logged_in',
        login_count    = user_activity.login_count + 1,
        last_logged_in = $4,
        updated_at     = NOW()
    `, [activityId, userId, today, now.toISOString()]);

    return NextResponse.json({
      success:    true,
      message:    "Session started.",
      session_id: sessionId,
    });

  } catch (err) {
    console.error("[ACTIVITY:START-SESSION]", err);
    return NextResponse.json({ error: "Failed to start session." }, { status: 500 });
  }
}
