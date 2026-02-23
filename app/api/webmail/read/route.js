import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getImapConnection } from "@/lib/imapManager";

export async function POST(request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { uid, folder } = body;

    if (!uid || !folder) {
      return NextResponse.json({ error: "Missing required fields (uid, folder)" }, { status: 400 });
    }

    // 1. Get Cached/New IMAP Connection
    const connection = await getImapConnection(user);
    await connection.openBox(folder);

    // 2. Mark as read
    await connection.addFlags(uid, "\\Seen");

    // Do not connection.end()

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Webmail Read Action Error:", error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
