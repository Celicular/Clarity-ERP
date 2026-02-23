/**
 * app/api/tickets/[id]/route.js
 * GET: Fetch a single ticket
 * PATCH: Update a ticket's status. Only Admin/HR can change status, or the creator if it's still open (maybe just Admin/HR).
 * DELETE: (Optional) Delete a ticket
 */
import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { query, queryNotify } from "../../../../lib/db";
import { logAudit } from "../../../../lib/auditlogger";

export async function GET(req, context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const { rows } = await query(`
      SELECT t.*, u.name as creator_name 
      FROM tickets t
      JOIN users u ON u.id = t.created_by
      WHERE t.id = $1
    `, [id]);

    if (rows.length === 0) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const ticket = rows[0];

    const isAdmin = session.role === "ADMIN";
    const isHR = session.department === "HR" || session.sub_role_dept === "HR";
    const canView = isAdmin || isHR || ticket.created_by === session.id || (ticket.referred_users || []).includes(session.id);

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    console.error("[TICKETS:GET:ID]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req, context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const isAdmin = session.role === "ADMIN";
  const isHR = session.department === "HR" || session.sub_role_dept === "HR";

  if (!isAdmin && !isHR) {
      return NextResponse.json({ error: "Forbidden. Only Admin or HR can update ticket status." }, { status: 403 });
  }

  try {
    const { status } = await req.json();

    if (!["Pending", "Open", "Closed", "Resolved"].includes(status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const { rows } = await query(`
      UPDATE tickets
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (rows.length === 0) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    let ip = req.headers.get("x-forwarded-for") || req.headers.get("remote-addr") || req.ip || "Unknown IP";
    if (ip === "::1") ip = "127.0.0.1";
    await logAudit({ action: `TICKET_STATUS_UPDATED: ${id} to ${status}`, criticality: "Medium", done_by: session.id, done_by_ip: ip });

    await queryNotify("tickets", "update", `Ticket ${id} status updated to ${status}`, [rows[0].created_by]);

    return NextResponse.json({ success: true, ticket: rows[0] });
  } catch (err) {
    console.error("[TICKETS:PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
