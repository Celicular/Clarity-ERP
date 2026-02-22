/**
 * app/api/leaves/[id]/route.js
 * GET /api/leaves/:id — get single leave request
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params; // Next.js 15+: params is a Promise

  try {
    const { rows } = await query(`
      SELECT lr.*, u.name AS employee_name, u.email AS employee_email, r.name AS reviewer_name
      FROM leave_requests lr
      JOIN users u ON u.id = lr.user_id
      LEFT JOIN users r ON r.id = lr.reviewed_by
      WHERE lr.id = $1
    `, [id]);

    if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });

    // Employee can only see their own
    if (session.role !== "ADMIN" && rows[0].user_id !== session.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ success: true, leave: rows[0] });
  } catch (err) {
    console.error("[LEAVES:GET-ONE]", err);
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }
}
