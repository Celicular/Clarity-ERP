/**
 * app/api/activity/start-break/route.js
 * POST /api/activity/start-break
 * Starts a break within the active session.
 */

import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.id;
    const { reason = "Personal", notes = "" } = await request.json().catch(() => ({}));

    // Find ongoing session
    const { rows: sessions } = await query(
      `SELECT id FROM session_logs
       WHERE user_id = $1 AND status = 'ongoing' LIMIT 1`,
      [userId]
    );

    if (sessions.length === 0) {
      return NextResponse.json({ error: "No active session." }, { status: 404 });
    }

    // Check for existing active break
    const { rows: activeBreaks } = await query(
      `SELECT id FROM breaks
       WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    );

    if (activeBreaks.length > 0) {
      return NextResponse.json(
        { error: "You already have an active break.", break_id: activeBreaks[0].id },
        { status: 409 }
      );
    }

    const breakId   = randomUUID();
    const sessionId = sessions[0].id;
    const now       = new Date().toISOString();

    await query(`
      INSERT INTO breaks (id, session_id, user_id, start_time, reason, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
    `, [breakId, sessionId, userId, now, reason, notes || null]);

    // Update user_activity
    const today = new Date().toISOString().split("T")[0];
    await query(`
      UPDATE user_activity SET
        status           = 'on_break',
        last_break_start = $1,
        updated_at       = NOW()
      WHERE user_id = $2 AND date = $3
    `, [now, userId, today]);

    return NextResponse.json({
      success:  true,
      message:  "Break started.",
      break_id: breakId,
    });

  } catch (err) {
    console.error("[ACTIVITY:START-BREAK]", err);
    return NextResponse.json({ error: "Failed to start break." }, { status: 500 });
  }
}
