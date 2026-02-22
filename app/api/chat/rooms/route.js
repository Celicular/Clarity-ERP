/**
 * app/api/chat/rooms/route.js
 * GET  — list rooms the current user is a member of (active only)
 * POST — request a new chat room (status=pending)
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  /* Rooms user belongs to — active ones, with unread counts */
  const { rows: rooms } = await query(`
    WITH room_data AS (
      SELECT r.*, crm.role AS my_role,
        (SELECT COUNT(*)::int FROM chat_room_members WHERE room_id = r.id) AS member_count,
        (SELECT COUNT(*)::int FROM chat_messages        WHERE room_id = r.id) AS message_count,
        (SELECT m.created_at FROM chat_messages m WHERE m.room_id = r.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
        (SELECT COUNT(*)::int FROM chat_messages cm
         WHERE cm.room_id = r.id
           AND cm.sender_id != $1
           AND cm.created_at > COALESCE(
             (SELECT last_read_at FROM chat_room_reads WHERE room_id = r.id AND user_id = $1),
             '1970-01-01'
           )
        ) AS unread_count
      FROM chat_rooms r
      JOIN chat_room_members crm ON crm.room_id = r.id AND crm.user_id = $1
      WHERE r.status = 'active'
    )
    SELECT * FROM room_data
    ORDER BY is_default DESC, COALESCE(last_message_at, created_at) DESC
  `, [session.id]);

  /* Pending requests (admin/HR sees all, others see their own) */
  const isAdminOrHR = session.role === "ADMIN" || session.sub_role_dept === "HR";
  let pending = [];
  if (isAdminOrHR) {
    ({ rows: pending } = await query(`
      SELECT r.*, u.name AS created_by_name,
        (SELECT COUNT(*)::int FROM chat_room_members WHERE room_id = r.id) AS member_count
      FROM chat_rooms r
      LEFT JOIN users u ON u.id = r.created_by
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `));
  } else {
    ({ rows: pending } = await query(`
      SELECT r.*, u.name AS created_by_name
      FROM chat_rooms r
      LEFT JOIN users u ON u.id = r.created_by
      WHERE r.status = 'pending' AND r.created_by = $1
      ORDER BY r.created_at DESC
    `, [session.id]));
  }

  return NextResponse.json({ success: true, rooms, pending });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, agenda, member_ids = [] } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Room name required" }, { status: 400 });

    /* Create room */
    const { rows: [room] } = await query(`
      INSERT INTO chat_rooms (name, agenda, status, created_by)
      VALUES ($1, $2, CASE WHEN $3 THEN 'active' ELSE 'pending' END, $4)
      RETURNING *
    `, [name.trim(), agenda || null, session.role === "ADMIN", session.id]);

    /* Auto-add all admins */
    const { rows: admins } = await query("SELECT id FROM users WHERE role='ADMIN'");
    const allMemberIds = [...new Set([session.id, ...admins.map(a => a.id), ...member_ids])];

    for (const uid of allMemberIds) {
      const isAdmin = admins.some(a => a.id === uid) || session.role === "ADMIN" && uid === session.id;
      await query(
        "INSERT INTO chat_room_members (room_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [room.id, uid, isAdmin ? "admin" : "member"]
      );
    }

    return NextResponse.json({ success: true, room });
  } catch (err) {
    console.error("[CHAT:POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
