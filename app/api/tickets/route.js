/**
 * app/api/tickets/route.js
 * GET: List tickets (Admins/HR see all, others see their own or ones referring them)
 * POST: Create a new ticket
 */
import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { query, queryNotify } from "../../../lib/db";
import { logAudit } from "../../../lib/auditlogger";
import crypto from "crypto";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.role === "ADMIN";
  const isHR = session.department === "HR" || session.sub_role_dept === "HR";
  const seeAll = isAdmin || isHR;

  try {
    let rows;
    if (seeAll) {
      ({ rows } = await query(`
        SELECT t.*, u.name AS creator_name
        FROM tickets t
        JOIN users u ON u.id = t.created_by
        ORDER BY t.created_at DESC
      `));
    } else {
      ({ rows } = await query(`
        SELECT t.*, u.name AS creator_name
        FROM tickets t
        JOIN users u ON u.id = t.created_by
        WHERE t.created_by = $1 OR $1 = ANY(t.referred_users)
        ORDER BY t.created_at DESC
      `, [session.id]));
    }
    
    // Add reply counts
    const ticketIds = rows.map(r => r.id);
    if (ticketIds.length > 0) {
        const { rows: replies } = await query(`
            SELECT ticket_id, count(id) as reply_count 
            FROM ticket_replies 
            WHERE ticket_id = ANY($1) 
            GROUP BY ticket_id
        `, [ticketIds]);
        
        const replyMap = {};
        for (const r of replies) {
            replyMap[r.ticket_id] = parseInt(r.reply_count, 10);
        }
        for (const row of rows) {
            row.reply_count = replyMap[row.id] || 0;
        }
    }

    return NextResponse.json({ success: true, tickets: rows });
  } catch (err) {
    console.error("[TICKETS:GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const {
      subject,
      description,
      criticality = "Normal",
      referred_users = [],
      attachment_urls = []
    } = await req.json();

    if (!subject?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Subject and description are required" }, { status: 400 });
    }

    const id = "tck-" + crypto.randomUUID();

    const { rows: [ticket] } = await query(`
      INSERT INTO tickets
        (id, subject, description, status, criticality, created_by, referred_users, attachment_urls)
      VALUES ($1, $2, $3, 'Open', $4, $5, $6, $7)
      RETURNING *
    `, [id, subject.trim(), description.trim(), criticality, session.id, referred_users, attachment_urls]);

    let ip = req.headers.get("x-forwarded-for") || req.headers.get("remote-addr") || req.ip || "Unknown IP";
    if (ip === "::1") ip = "127.0.0.1";
    await logAudit({ action: `TICKET_CREATED: ${subject.substring(0,30)}`, criticality: "Medium", done_by: session.id, done_by_ip: ip });

    await queryNotify("tickets", "create", `New ticket: ${subject.substring(0,30)}`, referred_users, ["ADMIN", "HR"]);

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    console.error("[TICKETS:POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
