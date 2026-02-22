/**
 * app/api/chat/rooms/[rid]/approve/route.js
 * POST — HR or Admin: approve a pending room request
 * DELETE-like — reject (set status=rejected) — also POST with { action:"reject" }
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isHROrAdmin = session.role === "ADMIN" || session.sub_role_dept === "HR";
  if (!isHROrAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rid } = await params;
  const { action = "approve" } = await req.json().catch(() => ({}));

  const { rows: [room] } = await query("SELECT * FROM chat_rooms WHERE id=$1 AND status='pending'", [rid]);
  if (!room) return NextResponse.json({ error: "Room not found or not pending" }, { status: 404 });

  if (action === "reject") {
    await query("DELETE FROM chat_rooms WHERE id=$1", [rid]);
    return NextResponse.json({ success: true, action: "rejected" });
  }

  /* Approve */
  await query("UPDATE chat_rooms SET status='active' WHERE id=$1", [rid]);
  return NextResponse.json({ success: true, action: "approved" });
}
