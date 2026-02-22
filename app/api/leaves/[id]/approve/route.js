/**
 * app/api/leaves/[id]/approve/route.js
 * POST /api/leaves/:id/approve — Admin approves a leave request
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";
import { logAudit }     from "../../../../../lib/auditlogger";

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params; // Next.js 15+: params is a Promise

  try {
    const { rows } = await query(
      "SELECT id, status FROM leave_requests WHERE id = $1", [id]
    );
    if (!rows[0]) return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    if (rows[0].status !== "pending") {
      return NextResponse.json({ error: `Request is already ${rows[0].status}.` }, { status: 409 });
    }

    await query(`
      UPDATE leave_requests SET
        status      = 'approved',
        reviewed_by = $1,
        reviewed_at = NOW(),
        updated_at  = NOW()
      WHERE id = $2
    `, [session.id, id]);

    let ip = request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || request.ip || "Unknown IP";
    if (ip === "::1") ip = "127.0.0.1";
    await logAudit({ action: `LEAVE_APPROVED: ${id}`, criticality: "Medium", done_by: session.id, done_by_ip: ip });

    return NextResponse.json({ success: true, message: "Leave approved." });
  } catch (err) {
    console.error("[LEAVES:APPROVE]", err);
    return NextResponse.json({ error: "Failed to approve." }, { status: 500 });
  }
}
