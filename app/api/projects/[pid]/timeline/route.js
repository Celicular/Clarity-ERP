/**
 * app/api/projects/[pid]/timeline/route.js
 * GET  — fetch project timeline entries
 * POST — post a new update/blocker/revision note
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { rows } = await query(`
    SELECT pt.*, u.name AS author_name FROM project_timeline pt
    JOIN users u ON u.id = pt.author_id
    WHERE pt.project_id = $1 ORDER BY pt.created_at DESC
  `, [pid]);
  return NextResponse.json({ success: true, entries: rows });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { content, entry_type = "update" } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required." }, { status: 400 });
  const id = randomUUID();
  await query(
    "INSERT INTO project_timeline (id,project_id,author_id,content,entry_type) VALUES ($1,$2,$3,$4,$5)",
    [id, pid, session.id, content.trim(), entry_type]
  );
  return NextResponse.json({ success: true, id });
}
