import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getImapConnection } from "@/lib/imapManager";

export async function GET(request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "INBOX";

    // 1. Get Cached/New IMAP Connection
    const connection = await getImapConnection(user);
    
    // Safely open the requested box
    await connection.openBox(folder);

    // Fetch the latest 50 messages
    const fetchOptions = {
      bodies: ["HEADER"], // Fetch HEADERS only! (Lazy loading body)
      envelope: true,
      markSeen: false,
      struct: true,
    };

    // Grab the total count to paginate if needed
    const box = await connection.openBox(folder);
    const totalMessages = box.messages.total;
    
    if (totalMessages === 0) {
      connection.end();
      return NextResponse.json({ messages: [], total: 0 });
    }

    // Instead of ALL, let's just get the last 50
    let seq = "1:*";
    if (totalMessages > 50) {
      seq = `${totalMessages - 49}:*`;
    }

    const messages = await connection.search([seq], fetchOptions);

    const parsedMessages = [];

    // Reverse so newest is first
    for (const item of messages.reverse()) {
      const envelope = item.attributes.envelope || {};

      // imap-simple envelope parser formats Addresses as [{name: "Foo", mailbox: "foo", host: "bar.com"}]
      const extractAddress = (addrArray) => {
        if (!addrArray || !addrArray.length) return "Unknown Sender";
        const a = addrArray[0];
        return a.name || `${a.mailbox}@${a.host}`;
      };

      parsedMessages.push({
        id: item.attributes.uid,
        subject: envelope.subject || "No Subject",
        from: extractAddress(envelope.from),
        to: extractAddress(envelope.to),
        date: envelope.date || item.attributes.date,
        snippet: "Loading content...", // Content is lazy-loaded now
        isUnread: !item.attributes.flags.includes("\\Seen"),
      });
    }

    // Do NOT connection.end() - we are maintaining persistent connections

    return NextResponse.json({ messages: parsedMessages, total: totalMessages });

  } catch (error) {
    console.error("Webmail Messages Error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
