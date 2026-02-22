/**
 * app/api/meetings/[id]/conclude/route.js
 * POST /api/meetings/:id/conclude — Admin ends a meeting, marks attendance
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params; // Next.js 15+: params is a Promise

  try {
    const { attended_ids } = await request.json();

    const { rows } = await query("SELECT id, status FROM meetings WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });

    await query(
      "UPDATE meetings SET status = 'completed', concluded_at = NOW(), updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Mark attendance for each attendee who was present
    if (Array.isArray(attended_ids) && attended_ids.length > 0) {
      for (const uid of attended_ids) {
        await query(
          "UPDATE meeting_attendees SET attended = TRUE WHERE meeting_id = $1 AND user_id = $2",
          [id, uid]
        );
      }
    }

    return NextResponse.json({ success: true, message: "Meeting concluded." });
  } catch (err) {
    console.error("[MEETINGS:CONCLUDE]", err);
    return NextResponse.json({ error: "Failed to conclude meeting." }, { status: 500 });
  }
}
