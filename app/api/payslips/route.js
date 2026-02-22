/**
 * app/api/payslips/route.js
 * GET  /api/payslips — Admin: all | Employee: own payslips
 * POST /api/payslips — Admin: create payslip
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (session.role === "ADMIN") {
      const { rows } = await query(`
        SELECT p.*, u.name AS employee_name, u.email AS employee_email
        FROM payslips p JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
      `);
      return NextResponse.json({ success: true, payslips: rows });
    } else {
      const { rows } = await query(`
        SELECT p.*, u.name AS created_by_name
        FROM payslips p JOIN users u ON u.id = p.created_by
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
      `, [session.id]);
      return NextResponse.json({ success: true, payslips: rows });
    }
  } catch (err) {
    console.error("[PAYSLIPS:GET]", err);
    return NextResponse.json({ error: "Failed to fetch payslips." }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  try {
    const {
      user_id, pay_period_start, pay_period_end,
      basic_pay = 0, hra = 0, travel_allowance = 0, other_additions = 0,
      pf_deduction = 0, tax_deduction = 0, other_deductions = 0,
      payment_mode, payment_date, notes,
    } = await request.json();

    if (!user_id || !pay_period_start || !pay_period_end) {
      return NextResponse.json({ error: "User, pay period start, and end are required." }, { status: 400 });
    }

    const bp  = parseFloat(basic_pay)       || 0;
    const h   = parseFloat(hra)             || 0;
    const ta  = parseFloat(travel_allowance)|| 0;
    const oa  = parseFloat(other_additions) || 0;
    const pf  = parseFloat(pf_deduction)    || 0;
    const tx  = parseFloat(tax_deduction)   || 0;
    const od  = parseFloat(other_deductions)|| 0;

    const gross_pay        = bp + h + ta + oa;
    const total_deductions = pf + tx + od;
    const net_pay          = gross_pay - total_deductions;
    // Status determined in JS — avoids PostgreSQL type-conflict on $17
    const status           = payment_date ? "paid" : "pending";

    const id = randomUUID();
    await query(`
      INSERT INTO payslips (
        id, user_id, created_by, pay_period_start, pay_period_end,
        basic_pay, hra, travel_allowance, other_additions, gross_pay,
        pf_deduction, tax_deduction, other_deductions, total_deductions, net_pay,
        payment_mode, payment_date, notes, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    `, [
      id, user_id, session.id, pay_period_start, pay_period_end,
      bp, h, ta, oa, gross_pay,
      pf, tx, od, total_deductions, net_pay,
      payment_mode || "Bank Transfer", payment_date || null, notes || null, status,
    ]);

    return NextResponse.json({ success: true, message: "Payslip created.", id });
  } catch (err) {
    console.error("[PAYSLIPS:POST]", err);
    return NextResponse.json({ error: "Failed to create payslip." }, { status: 500 });
  }
}
