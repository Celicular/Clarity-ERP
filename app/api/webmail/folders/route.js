import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getImapConnection } from "@/lib/imapManager";

export async function GET(request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Get Cached/New IMAP Connection
    const connection = await getImapConnection(user);
    const boxes = await connection.getBoxes();
    // Do not connection.end()

    return NextResponse.json({ folders: Object.keys(boxes) });

  } catch (error) {
    console.error("Webmail Folders Error:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}
