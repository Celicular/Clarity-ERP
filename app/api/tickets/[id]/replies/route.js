/**
 * app/api/tickets/[id]/replies/route.js
 * GET: Get replies for a ticket
 * POST: Create a new reply (only if ticket is Open/Pending)
 */
import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/auth";
import { query, queryNotify } from "../../../../../lib/db";
import { logAudit } from "../../../../../lib/auditlogger";
import crypto from "crypto";

export async function GET(req, context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const { rows: testRows } = await query(`SELECT * FROM tickets WHERE id = $1`, [id]);
    if (testRows.length === 0) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      
    // Permission check similar to GET ticket
    const ticket = testRows[0];
    const isAdmin = session.role === "ADMIN";
    const isHR = session.department === "HR" || session.sub_role_dept === "HR";
    const canView = isAdmin || isHR || ticket.created_by === session.id || (ticket.referred_users || []).includes(session.id);
    if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { rows } = await query(`
      SELECT r.*, u.name as sender_name, u.role as sender_role
      FROM ticket_replies r
      JOIN users u ON u.id = r.sender_id
      WHERE r.ticket_id = $1
      ORDER BY r.created_at ASC
    `, [id]);

    return NextResponse.json({ success: true, replies: rows });
  } catch (err) {
    console.error("[TICKETS:REPLIES:GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req, context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const { rows: testRows } = await query(`SELECT * FROM tickets WHERE id = $1`, [id]);
    if (testRows.length === 0) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    const ticket = testRows[0];

    // Check if the ticket is closed/resolved
    if (ticket.status === "Closed" || ticket.status === "Resolved") {
        return NextResponse.json({ error: "Cannot reply to a Closed or Resolved ticket" }, { status: 400 });
    }

    const { message, attachment_urls = [] } = await req.json();

    if (!message?.trim() && (!attachment_urls || attachment_urls.length === 0)) {
        return NextResponse.json({ error: "Message or attachment is required" }, { status: 400 });
    }

    const replyId = "trpl-" + crypto.randomUUID();

    const { rows } = await query(`
      INSERT INTO ticket_replies (id, ticket_id, sender_id, message, attachment_urls)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [replyId, id, session.id, message.trim(), attachment_urls]);

    // Send an audit log
    let ip = req.headers.get("x-forwarded-for") || req.headers.get("remote-addr") || req.ip || "Unknown IP";
    if (ip === "::1") ip = "127.0.0.1";
    await logAudit({ action: `TICKET_REPLIED: ${id}`, criticality: "Low", done_by: session.id, done_by_ip: ip });

    if (ticket.created_by !== session.id) {
        await queryNotify("tickets", "reply", `New reply on ticket ${id}`, [ticket.created_by]);
    } else {
        await queryNotify("tickets", "reply", `New reply from ticket owner on ${id}`, null, ["ADMIN", "HR"]);
    }

    return NextResponse.json({ success: true, reply: rows[0] });
  } catch (err) {
    console.error("[TICKETS:REPLIES:POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
