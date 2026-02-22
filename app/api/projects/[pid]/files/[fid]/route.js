/**
 * app/api/projects/[pid]/files/[fid]/route.js
 * DELETE — remove file from disk and DB
 */
import { NextResponse } from "next/server";
import { unlink }       from "fs/promises";
import path             from "path";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid, fid } = await params;
  const { rows: [f] } = await query("SELECT * FROM project_files WHERE id=$1 AND project_id=$2", [fid, pid]);
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (f.uploaded_by !== session.id && session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { await unlink(path.join(process.cwd(), "public", "uploads", "projects", pid, f.stored_name)); } catch {}
  await query("DELETE FROM project_files WHERE id=$1", [fid]);
  return NextResponse.json({ success: true });
}
