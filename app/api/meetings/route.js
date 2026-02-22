/**
 * app/api/meetings/route.js
 * GET  /api/meetings — Admin: all meetings | Employee: meetings they're invited to
 * POST /api/meetings — Admin: create meeting with attendees
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (session.role === "ADMIN") {
      const { rows } = await query(`
        SELECT m.*, u.name AS creator_name,
               COALESCE(
                 (SELECT json_agg(json_build_object('user_id', ma.user_id, 'name', att.name, 'attended', ma.attended))
                  FROM meeting_attendees ma JOIN users att ON att.id = ma.user_id
                  WHERE ma.meeting_id = m.id), '[]'
               ) AS attendees,
               COALESCE(
                 (SELECT json_agg(json_build_object('remark', mr.remark, 'by', ru.name, 'at', mr.created_at))
                  FROM meeting_remarks mr JOIN users ru ON ru.id = mr.user_id
                  WHERE mr.meeting_id = m.id), '[]'
               ) AS remarks
        FROM meetings m
        JOIN users u ON u.id = m.created_by
        ORDER BY m.scheduled_at DESC
      `);
      return NextResponse.json({ success: true, meetings: rows });
    } else {
      // Employee: meetings they're invited to, joining from meeting_attendees
      const { rows } = await query(`
        SELECT m.*, u.name AS creator_name,
               ma.attended AS my_attendance,
               COALESCE(
                 (SELECT json_agg(json_build_object('remark', mr.remark, 'by', ru.name, 'at', mr.created_at))
                  FROM meeting_remarks mr JOIN users ru ON ru.id = mr.user_id
                  WHERE mr.meeting_id = m.id AND mr.user_id = $1), '[]'
               ) AS my_remarks
        FROM meetings m
        JOIN users u ON u.id = m.created_by
        JOIN meeting_attendees ma ON ma.meeting_id = m.id AND ma.user_id = $1
        ORDER BY m.scheduled_at DESC
      `, [session.id]);
      return NextResponse.json({ success: true, meetings: rows });
    }
  } catch (err) {
    console.error("[MEETINGS:GET]", err);
    return NextResponse.json({ error: "Failed to fetch meetings." }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  try {
    const { title, description, scheduled_at, duration_min, platform, meeting_link, attendee_ids } = await request.json();

    if (!title || !scheduled_at) {
      return NextResponse.json({ error: "Title and scheduled time are required." }, { status: 400 });
    }

    const id = randomUUID();
    await query(`
      INSERT INTO meetings (id, title, description, scheduled_at, duration_min, platform, meeting_link, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, title, description || null, scheduled_at,
        duration_min || 60, platform || "GMeet", meeting_link || null, session.id]);

    // Add attendees
    const ids = Array.isArray(attendee_ids) ? attendee_ids : [];
    for (const uid of ids) {
      await query(`
        INSERT INTO meeting_attendees (id, meeting_id, user_id)
        VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
      `, [randomUUID(), id, uid]);
    }

    return NextResponse.json({ success: true, message: "Meeting created.", id });
  } catch (err) {
    console.error("[MEETINGS:POST]", err);
    return NextResponse.json({ error: "Failed to create meeting." }, { status: 500 });
  }
}
