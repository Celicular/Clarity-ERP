import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getImapConnection } from "@/lib/imapManager";

export async function POST(request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action, uid, currentFolder } = body; // action: 'move', targetFolder: 'INBOX.Trash' or 'INBOX.Archive'

    if (!action || !uid || !currentFolder) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let targetBox = "";
    if (action === "trash") targetBox = "INBOX.Trash";
    if (action === "archive") targetBox = "INBOX.Archive";

    if (!targetBox) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 1. Get Cached/New IMAP Connection
    const connection = await getImapConnection(user);
    await connection.openBox(currentFolder);

    // 2. Move message
    await connection.moveMessage(uid, targetBox);

    // Do not connection.end()

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Webmail Action Error:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
