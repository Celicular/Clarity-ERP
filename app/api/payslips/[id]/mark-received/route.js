/**
 * app/api/payslips/[id]/mark-received/route.js
 * POST /api/payslips/:id/mark-received — Employee confirms they received the payslip
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params; // Next.js 15+: params is a Promise

  try {
    const { rows } = await query("SELECT * FROM payslips WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });

    if (rows[0].user_id !== session.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (rows[0].received_at) {
      return NextResponse.json({ error: "Already marked as received." }, { status: 409 });
    }

    await query(
      "UPDATE payslips SET received_at = NOW(), updated_at = NOW() WHERE id = $1",
      [id]
    );

    return NextResponse.json({ success: true, message: "Payslip marked as received." });
  } catch (err) {
    console.error("[PAYSLIPS:MARK-RECEIVED]", err);
    return NextResponse.json({ error: "Failed to mark received." }, { status: 500 });
  }
}
