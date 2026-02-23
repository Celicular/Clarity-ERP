/**
 * app/api/leaves/[id]/reject/route.js
 * POST /api/leaves/:id/reject — Admin rejects a leave request
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../lib/auth";
import { query, queryNotify } from "../../../../../lib/db";
import { logAudit }     from "../../../../../lib/auditlogger";

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params; // Next.js 15+: params is a Promise

  try {
    const { rejection_reason } = await request.json();
    if (!rejection_reason) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    const { rows } = await query(
      "SELECT id, user_id, status FROM leave_requests WHERE id = $1", [id]
    );
    if (!rows[0]) return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    if (rows[0].status !== "pending") {
      return NextResponse.json({ error: `Request is already ${rows[0].status}.` }, { status: 409 });
    }

    await query(`
      UPDATE leave_requests SET
        status           = 'rejected',
        rejection_reason = $1,
        reviewed_by      = $2,
        reviewed_at      = NOW(),
        updated_at       = NOW()
      WHERE id = $3
    `, [rejection_reason, session.id, id]);

    let ip = request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || request.ip || "Unknown IP";
    if (ip === "::1") ip = "127.0.0.1";
    await logAudit({ action: `LEAVE_REJECTED: ${id}`, criticality: "Medium", done_by: session.id, done_by_ip: ip });

    await queryNotify("leaves", "update", "Your leave request was rejected.", [rows[0].user_id]);

    return NextResponse.json({ success: true, message: "Leave rejected." });
  } catch (err) {
    console.error("[LEAVES:REJECT]", err);
    return NextResponse.json({ error: "Failed to reject." }, { status: 500 });
  }
}
