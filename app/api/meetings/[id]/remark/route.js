/**
 * app/api/meetings/[id]/remark/route.js
 * POST /api/meetings/:id/remark — Any attendee adds feedback/remarks
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params; // Next.js 15+: params is a Promise

  try {
    const { remark } = await request.json();
    if (!remark) return NextResponse.json({ error: "Remark text is required." }, { status: 400 });

    // Employee must be an attendee
    if (session.role === "EMPLOYEE") {
      const { rows } = await query(
        "SELECT id FROM meeting_attendees WHERE meeting_id = $1 AND user_id = $2",
        [id, session.id]
      );
      if (!rows[0]) return NextResponse.json({ error: "You are not an attendee of this meeting." }, { status: 403 });
    }

    await query(`
      INSERT INTO meeting_remarks (id, meeting_id, user_id, remark)
      VALUES ($1, $2, $3, $4)
    `, [randomUUID(), id, session.id, remark]);

    return NextResponse.json({ success: true, message: "Remark added." });
  } catch (err) {
    console.error("[MEETINGS:REMARK]", err);
    return NextResponse.json({ error: "Failed to add remark." }, { status: 500 });
  }
}
