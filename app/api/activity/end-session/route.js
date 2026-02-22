/**
 * app/api/activity/end-session/route.js
 * POST /api/activity/end-session
 * Ends the active session, calculates duration and time segments.
 */

import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

/**
 * Parse a TIME string (HH:MM or HH:MM:SS) into total seconds from midnight.
 */
function timeToSeconds(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(":").map(Number);
  return parts[0] * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.id;
    const now    = new Date();

    // Find ongoing session
    const { rows: sessions } = await query(
      `SELECT * FROM session_logs
       WHERE user_id = $1 AND status = 'ongoing'
       ORDER BY session_start_time DESC LIMIT 1`,
      [userId]
    );

    if (sessions.length === 0) {
      return NextResponse.json({ error: "No active session found." }, { status: 404 });
    }

    const sess       = sessions[0];
    const startTime  = new Date(sess.session_start_time);
    const endTime    = now;
    const totalSecs  = Math.floor((endTime - startTime) / 1000);
    const breakSecs  = sess.total_break_duration || 0;
    const workSecs   = Math.max(0, totalSecs - breakSecs);

    // Get user's shift schedule
    const { rows: details } = await query(
      "SELECT check_in_time, check_out_time FROM user_details WHERE user_id = $1",
      [userId]
    );

    let overtimeEarly = 0;
    let shiftHours    = 0;
    let overtimeLate  = 0;
    let undertime     = 0;

    if (details.length > 0 && details[0].check_in_time && details[0].check_out_time) {
      const checkIn  = timeToSeconds(details[0].check_in_time);
      const checkOut = timeToSeconds(details[0].check_out_time);

      // Current time-of-day in seconds
      const startSecs = startTime.getHours() * 3600 + startTime.getMinutes() * 60 + startTime.getSeconds();
      const endSecs   = endTime.getHours() * 3600   + endTime.getMinutes() * 60   + endTime.getSeconds();

      // Handle multi-day shift (check_out < check_in means overnight)
      const isOvernightShift = checkOut < checkIn;
      let shiftDuration;

      if (isOvernightShift) {
        shiftDuration = (86400 - checkIn) + checkOut;
      } else {
        shiftDuration = checkOut - checkIn;
      }

      // Simple segmentation: time before shift = early OT, during = shift, after = late OT
      if (startSecs < checkIn) {
        overtimeEarly = Math.min(workSecs, checkIn - startSecs);
      }

      if (endSecs > checkOut && !isOvernightShift) {
        overtimeLate = Math.min(workSecs, endSecs - checkOut);
      }

      shiftHours = Math.max(0, workSecs - overtimeEarly - overtimeLate);

      // Undertime: required shift - actual shift hours
      if (shiftHours < shiftDuration) {
        undertime = shiftDuration - shiftHours;
      }
    } else {
      // No schedule set — all time counts as shift hours
      shiftHours = workSecs;
    }

    const totalOvertime = overtimeEarly + overtimeLate;
    const logoutDate    = now.toISOString().split("T")[0];

    // Update session_logs
    await query(`
      UPDATE session_logs SET
        session_end_time   = $1,
        logout_date        = $2,
        session_duration   = $3,
        status             = 'completed',
        overtime_early     = $4,
        shift_hours        = $5,
        overtime_late      = $6,
        total_overtime     = $7,
        undertime          = $8,
        updated_at         = NOW()
      WHERE id = $9
    `, [
      now.toISOString(), logoutDate, totalSecs,
      overtimeEarly, shiftHours, overtimeLate, totalOvertime, undertime,
      sess.id,
    ]);

    // Update user_activity
    const today = sess.date;
    await query(`
      UPDATE user_activity SET
        status           = 'logged_out',
        session_duration = session_duration + $1,
        last_logged_out  = $2,
        total_shift_hours = total_shift_hours + $3,
        total_overtime   = total_overtime + $4,
        total_undertime  = total_undertime + $5,
        updated_at       = NOW()
      WHERE user_id = $6 AND date = $7
    `, [totalSecs, now.toISOString(), shiftHours, totalOvertime, undertime, userId, today]);

    return NextResponse.json({
      success:        true,
      message:        "Session ended.",
      session_id:     sess.id,
      duration:       totalSecs,
      break_duration: breakSecs,
      shift_hours:    shiftHours,
      overtime_early: overtimeEarly,
      overtime_late:  overtimeLate,
      undertime:      undertime,
    });

  } catch (err) {
    console.error("[ACTIVITY:END-SESSION]", err);
    return NextResponse.json({ error: "Failed to end session." }, { status: 500 });
  }
}
