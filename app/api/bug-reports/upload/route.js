/**
 * app/api/bug-reports/upload/route.js
 * POST — upload a file attachment for a bug report
 * Saves to /public/uploads/bug-reports/ and returns the URL.
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
    const allowed  = [".png",".jpg",".jpeg",".gif",".webp",".pdf",".txt",".zip",".mp4",".mov"];
    if (!allowed.includes(ext))
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const dir      = path.join(process.cwd(), "public", "uploads", "bug-reports");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, safeName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ success: true, url: `/uploads/bug-reports/${safeName}` });
  } catch (err) {
    console.error("[BUG-UPLOAD]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
