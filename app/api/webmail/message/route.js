import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getImapConnection } from "@/lib/imapManager";
import { simpleParser } from "mailparser";

export async function GET(request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "INBOX";
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    // 1. Get Cached/New IMAP Connection
    const connection = await getImapConnection(user);
    
    // Safely open the requested box
    await connection.openBox(folder);

    // Fetch only the specific message by UID
    const fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      struct: true,
    };

    const messages = await connection.search([["UID", uid]], fetchOptions);
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const item = messages[0];
    const headerPart = item.parts.find((p) => p.which === "HEADER");
    const textPart   = item.parts.find((p) => p.which === "TEXT");
    
    let textContent   = "";
    let htmlContent   = "";
    
    if (headerPart && textPart && headerPart.body && textPart.body) {
       try {
         const rawEmail = headerPart.body + "\r\n" + textPart.body;
         const parsedBody = await simpleParser(rawEmail);
         
         // 1. Extract HTML or fallback to text
         if (parsedBody.html) {
           htmlContent = parsedBody.html;
         } else if (parsedBody.textAsHtml) {
           htmlContent = parsedBody.textAsHtml;
         } else if (parsedBody.text) {
           // Basic formatting for plain text to look decent
           htmlContent = `<pre style="font-family: inherit; white-space: pre-wrap; word-wrap: break-word;">${parsedBody.text}</pre>`;
         } else {
           htmlContent = "<p>No content</p>";
         }

         // 2. Extract Plain Text for snippets/replies
         if (parsedBody.text) {
           textContent = parsedBody.text;
         } else if (parsedBody.html || parsedBody.textAsHtml) {
           // Strip HTML tags for the text-only version
           textContent = (parsedBody.html || parsedBody.textAsHtml).replace(/<[^>]*>?/gm, " ").trim();
         } else {
           textContent = "No text content";
         }

         // 3. Aggressive Sanitization (Strip MIME boundaries & headers leaking into body)
         const sanitizeMimeGarbage = (str) => {
           if (!str) return str;
           return str
             .replace(/--[a-f0-9]{20,}.*?(?=\n\n|\r\n\r\n|$)/gs, "") // Strip standard MIME boundaries
             .replace(/Content-Type:.*?(?=\n\n|\r\n\r\n)/gs, "") // Strip leaked headers
             .replace(/Content-Transfer-Encoding:.*?(?=\n\n|\r\n\r\n)/gs, "")
             .trim();
         };

         htmlContent = sanitizeMimeGarbage(htmlContent);
         textContent = sanitizeMimeGarbage(textContent);

       } catch (e) {
         console.error("Mailparser error:", e);
         htmlContent = "<p>Error parsing email body.</p>";
         textContent = "Error parsing email body.";
       }
    } else if (textPart && textPart.body) {
       textContent = typeof textPart.body === 'string' ? textPart.body.replace(/<[^>]*>?/gm, " ") : "No text content";
       htmlContent = typeof textPart.body === 'string' ? `<pre>${textPart.body}</pre>` : "<p>No text content</p>";
    } else {
       htmlContent = "<p>No text content available.</p>";
       textContent = "No text content available.";
    }

    // Do NOT connection.end()

    return NextResponse.json({ 
      body: textContent,
      html: htmlContent
    });

  } catch (error) {
    console.error("Webmail Message Error:", error);
    return NextResponse.json({ error: "Failed to fetch message body" }, { status: 500 });
  }
}
