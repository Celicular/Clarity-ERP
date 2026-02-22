/**
 * app/api/leads/[id]/attachments/route.js
 * GET  — list attachments for a lead
 * POST — multipart upload; saves to /public/uploads/leads/[id]/
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getSession } from "../../../../../lib/auth";
import { query }      from "../../../../../lib/db";



export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows } = await query(`
    SELECT a.*, u.name AS uploaded_by_name
    FROM lead_attachments a JOIN users u ON u.id = a.uploaded_by
    WHERE a.lead_id = $1 ORDER BY a.created_at DESC
  `, [id]);
  return NextResponse.json({ success: true, attachments: rows });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const formData   = await req.formData();
    const file       = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const originalName = file.name;
    const mimeType     = file.type || "application/octet-stream";
    const ext          = path.extname(originalName) || "";
    const storedName   = `${randomUUID()}${ext}`;
    const fileSize     = file.size;

    /* save to public/uploads/leads/[id]/ */
    const dir = path.join(process.cwd(), "public", "uploads", "leads", id);
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, storedName), buffer);

    /* db record */
    const aid = randomUUID();
    await query(`
      INSERT INTO lead_attachments (id,lead_id,uploaded_by,filename,stored_name,mime_type,file_size)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [aid, id, session.id, originalName, storedName, mimeType, fileSize]);

    /* activity */
    await query(`INSERT INTO lead_activity (id,lead_id,actor_id,event_type,payload) VALUES ($1,$2,$3,'attachment_added',$4)`,
      [randomUUID(), id, session.id, JSON.stringify({ filename: originalName, file_size: fileSize })]);

    return NextResponse.json({ success: true, id: aid, filename: originalName, stored_name: storedName });
  } catch (err) {
    console.error("[ATTACHMENTS:POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
