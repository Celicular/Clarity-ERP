/**
 * app/api/payslips/[id]/route.js
 * GET /api/payslips/:id — Get full payslip detail (employee sees own only)
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
      SELECT p.*, u.name AS employee_name, u.email AS employee_email,
             c.name AS created_by_name,
             ud.department, ud.designation
      FROM payslips p
      JOIN users u ON u.id = p.user_id
      JOIN users c ON c.id = p.created_by
      LEFT JOIN user_details ud ON ud.user_id = p.user_id
      WHERE p.id = $1
    `, [id]);

    if (!rows[0]) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });

    if (session.role !== "ADMIN" && rows[0].user_id !== session.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ success: true, payslip: rows[0] });
  } catch (err) {
    console.error("[PAYSLIPS:GET-ONE]", err);
    return NextResponse.json({ error: "Failed to fetch payslip." }, { status: 500 });
  }
}
