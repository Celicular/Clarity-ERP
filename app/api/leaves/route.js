/**
 * app/api/leaves/route.js
 * GET  /api/leaves  — Employee: my requests | Admin: all requests (?status=&search=)
 * POST /api/leaves  — Employee: submit new request
 */

import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query, queryNotify } from "../../../lib/db";

export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "";
    const search       = searchParams.get("search") || "";

    if (session.role === "ADMIN") {
      // Admin: see all requests
      let sql = `
        SELECT lr.*,
               u.name  AS employee_name,
               u.email AS employee_email,
               r.name  AS reviewer_name
        FROM leave_requests lr
        JOIN users u ON u.id = lr.user_id
        LEFT JOIN users r ON r.id = lr.reviewed_by
        WHERE 1=1
      `;
      const params = [];
      let idx = 1;
      if (statusFilter) { sql += ` AND lr.status = $${idx++}`; params.push(statusFilter); }
      if (search) {
        sql += ` AND (u.name ILIKE $${idx} OR u.email ILIKE $${idx})`;
        params.push(`%${search}%`); idx++;
      }
      sql += " ORDER BY lr.created_at DESC";
      const { rows } = await query(sql, params);
      return NextResponse.json({ success: true, leaves: rows });

    } else {
      // Employee: own requests only
      const { rows } = await query(`
        SELECT lr.*, r.name AS reviewer_name
        FROM leave_requests lr
        LEFT JOIN users r ON r.id = lr.reviewed_by
        WHERE lr.user_id = $1
        ORDER BY lr.created_at DESC
      `, [session.id]);
      return NextResponse.json({ success: true, leaves: rows });
    }

  } catch (err) {
    console.error("[LEAVES:GET]", err);
    return NextResponse.json({ error: "Failed to fetch leaves." }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { leave_type, start_date, end_date, reason, criticality } = await request.json();

    if (!start_date || !end_date || !reason) {
      return NextResponse.json({ error: "Start date, end date, and reason are required." }, { status: 400 });
    }

    const start = new Date(start_date);
    const end   = new Date(end_date);
    if (end < start) {
      return NextResponse.json({ error: "End date cannot be before start date." }, { status: 400 });
    }

    // Calculate working days (Mon–Sat)
    let days = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() !== 0) days++; // skip Sunday
      cur.setDate(cur.getDate() + 1);
    }

    const id = randomUUID();
    await query(`
      INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, total_days, reason, criticality)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, session.id, leave_type || "Casual", start_date, end_date, days, reason, criticality || "Normal"]);

    await queryNotify("leaves", "create", "New leave request submitted.", null, ["ADMIN", "HR"]);

    return NextResponse.json({ success: true, message: "Leave request submitted.", id });

  } catch (err) {
    console.error("[LEAVES:POST]", err);
    return NextResponse.json({ error: "Failed to submit request." }, { status: 500 });
  }
}
