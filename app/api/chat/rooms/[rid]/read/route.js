/**
 * app/api/chat/rooms/[rid]/read/route.js
 * POST — mark a room as read for the current user (upsert last_read_at = NOW())
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rid } = await params;

  await query(`
    INSERT INTO chat_room_reads (room_id, user_id, last_read_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (room_id, user_id) DO UPDATE SET last_read_at = NOW()
  `, [rid, session.id]);

  return NextResponse.json({ success: true });
}
