/**
 * app/api/leaves/pending-count/route.js
 * GET /api/leaves/pending-count — Admin: count of pending leave requests
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { rows } = await query(
    "SELECT COUNT(*) AS count FROM leave_requests WHERE status = 'pending'"
  );
  return NextResponse.json({ success: true, count: parseInt(rows[0].count) });
}
