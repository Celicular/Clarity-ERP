/**
 * app/api/projects/[pid]/time-logs/route.js
 * GET  — list time logs
 * POST — log hours to a project
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
    SELECT tl.*, u.name AS user_name FROM project_time_logs tl
    JOIN users u ON u.id = tl.user_id
    WHERE tl.project_id = $1 ORDER BY tl.date DESC, tl.created_at DESC
  `, [pid]);
  const { rows: [totals] } = await query(
    "SELECT COALESCE(SUM(hours),0)::float AS total_hours FROM project_time_logs WHERE project_id=$1", [pid]
  );
  return NextResponse.json({ success: true, logs: rows, total_hours: totals.total_hours });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { date, hours, description } = await req.json();
  if (!date || !hours) return NextResponse.json({ error: "Date and hours required." }, { status: 400 });
  const id = randomUUID();
  await query(
    "INSERT INTO project_time_logs (id,project_id,user_id,date,hours,description) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, pid, session.id, date, hours, description || null]
  );
  return NextResponse.json({ success: true, id });
}
