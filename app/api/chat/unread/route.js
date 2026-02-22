/**
 * app/api/chat/unread/route.js
 * GET — returns total unread message count across all rooms for the sidebar badge.
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ total: 0 });

  /* Count messages in all my rooms posted after my last_read_at for each room */
  const { rows: [{ total }] } = await query(`
    SELECT COALESCE(SUM(unread), 0)::int AS total
    FROM (
      SELECT
        (SELECT COUNT(*) FROM chat_messages cm
         WHERE cm.room_id = crm.room_id
           AND cm.sender_id != $1
           AND cm.created_at > COALESCE(
             (SELECT last_read_at FROM chat_room_reads
              WHERE room_id = crm.room_id AND user_id = $1),
             '1970-01-01'
           )
        ) AS unread
      FROM chat_room_members crm
      JOIN chat_rooms cr ON cr.id = crm.room_id AND cr.status = 'active'
      WHERE crm.user_id = $1
    ) sub
  `, [session.id]);

  return NextResponse.json({ total });
}
