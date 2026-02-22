/**
 * app/api/chat/rooms/[rid]/upload/route.js
 * POST — upload a file in a chat room
 * Saves to /public/uploads/chat/ and returns a URL.
 * The client sends the URL via WebSocket as a message.
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rid } = await params;

  /* Verify membership */
  const { rows: [member] } = await query(
    "SELECT 1 FROM chat_room_members WHERE room_id=$1 AND user_id=$2",
    [rid, session.id]
  );
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  try {
    const formData  = await req.formData();
    const file      = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const ext      = path.extname(file.name).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const dir      = path.join(process.cwd(), "public", "uploads", "chat");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, safeName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      success:   true,
      url:       `/uploads/chat/${safeName}`,
      file_name: file.name,
    });
  } catch (err) {
    console.error("[CHAT-UPLOAD]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
