/**
 * app/api/notes/route.js
 * GET  /api/notes  — All visible notes (own + elevated to you)
 * POST /api/notes  — Create a note
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";
import { logAudit }     from "../../../lib/auditlogger";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows } = await query(`
      SELECT
        n.*,
        u.name  AS created_by_name,
        u.email AS created_by_email,
        e.name  AS elevated_to_name
      FROM notes n
      JOIN  users u ON u.id = n.created_by
      LEFT JOIN users e ON e.id = n.elevated_to
      ORDER BY n.created_at DESC
    `);
    return NextResponse.json({ success: true, notes: rows });
  } catch (err) {
    console.error("[NOTES:GET]", err);
    return NextResponse.json({ error: "Failed to fetch notes." }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { topic, description, status, elevated_to } = await request.json();

    if (!topic || !description) {
      return NextResponse.json({ error: "Topic and description are required." }, { status: 400 });
    }

    const validStatuses = ["pending", "in_progress", "complete"];
    const noteStatus = validStatuses.includes(status) ? status : "pending";

    const id = randomUUID();
    await query(`
      INSERT INTO notes (id, created_by, topic, description, status, elevated_to)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, session.id, topic, description, noteStatus, elevated_to || null]);

    let ip = request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || request.ip || "Unknown IP";
    if (ip === "::1") ip = "127.0.0.1";
    await logAudit({ action: `NOTE_CREATED: ${topic.substring(0,20)}`, criticality: "Low", done_by: session.id, done_by_ip: ip });

    return NextResponse.json({ success: true, message: "Note created.", id });
  } catch (err) {
    console.error("[NOTES:POST]", err);
    return NextResponse.json({ error: "Failed to create note." }, { status: 500 });
  }
}
