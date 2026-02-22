/**
 * app/api/chat/rooms/[rid]/route.js
 * GET    — room details + member list
 * DELETE — Admin only: delete room + all messages + members
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rid } = await params;

  /* User must be a member */
  const { rows: [room] } = await query(
    `SELECT r.* FROM chat_rooms r
     JOIN chat_room_members m ON m.room_id = r.id AND m.user_id = $2
     WHERE r.id = $1`, [rid, session.id]
  );
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rows: members } = await query(`
    SELECT u.id, u.name, u.email, crm.role AS room_role
    FROM chat_room_members crm
    JOIN users u ON u.id = crm.user_id
    WHERE crm.room_id = $1
    ORDER BY crm.role DESC, u.name
  `, [rid]);

  return NextResponse.json({ success: true, room, members });
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rid } = await params;
  const { rows: [room] } = await query("SELECT * FROM chat_rooms WHERE id=$1", [rid]);
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (room.is_default) return NextResponse.json({ error: "Cannot delete the General room" }, { status: 400 });

  await query("DELETE FROM chat_rooms WHERE id=$1", [rid]);
  return NextResponse.json({ success: true });
}
