/**
 * app/api/tickets/upload/route.js
 * POST — upload a file attachment for a ticket or reply
 * Saves to /public/uploads/tickets/ and returns the URL.
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file     = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    /* Sanitise filename */
    const ext      = path.extname(file.name).toLowerCase();
    const allowed  = [".png",".jpg",".jpeg",".gif",".webp",".pdf",".txt",".zip",".mp4",".mov",".csv",".xls",".xlsx",".doc",".docx"];
    if (!allowed.includes(ext))
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });

    const safeName = `tck_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const dir      = path.join(process.cwd(), "public", "uploads", "tickets");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, safeName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ success: true, url: `/uploads/tickets/${safeName}` });
  } catch (err) {
    console.error("[TICKETS-UPLOAD]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
