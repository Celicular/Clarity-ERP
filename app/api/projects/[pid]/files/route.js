/**
 * app/api/projects/[pid]/files/route.js
 * GET  — list project files
 * POST — upload file (multipart)
 */
import { NextResponse }      from "next/server";
import { randomUUID }        from "crypto";
import { writeFile, mkdir }  from "fs/promises";
import path                  from "path";
import { getSession }        from "../../../../../lib/auth";
import { query }             from "../../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { rows } = await query(`
    SELECT f.*, u.name AS uploaded_by_name FROM project_files f
    JOIN users u ON u.id = f.uploaded_by
    WHERE f.project_id = $1 ORDER BY f.created_at DESC
  `, [pid]);
  return NextResponse.json({ success: true, files: rows });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  try {
    const formData   = await req.formData();
    const file       = formData.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "No file." }, { status: 400 });
    const ext        = path.extname(file.name) || "";
    const storedName = `${randomUUID()}${ext}`;
    const dir        = path.join(process.cwd(), "public", "uploads", "projects", pid);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, storedName), Buffer.from(await file.arrayBuffer()));
    const fid = randomUUID();
    await query(`
      INSERT INTO project_files (id,project_id,uploaded_by,filename,stored_name,mime_type,file_size)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [fid, pid, session.id, file.name, storedName, file.type||"application/octet-stream", file.size]);
    return NextResponse.json({ success: true, id: fid });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
