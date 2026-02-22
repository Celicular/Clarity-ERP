/**
 * app/api/invoices/[iid]/payments/route.js
 * GET  — list payments for an invoice
 * POST — record a payment
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { iid } = await params;
  const { rows } = await query(
    "SELECT p.*, u.name AS created_by_name FROM payments p JOIN users u ON u.id=p.created_by WHERE p.invoice_id=$1 ORDER BY p.paid_at DESC",
    [iid]
  );
  return NextResponse.json({ success: true, payments: rows });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { iid } = await params;
  try {
    const { amount, method = "bank_transfer", reference, paid_at, notes } = await req.json();
    if (!amount || !paid_at) return NextResponse.json({ error: "Amount and date required." }, { status: 400 });

    const { rows: [inv] } = await query("SELECT project_id, total FROM invoices WHERE id=$1", [iid]);
    if (!inv) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

    const pid = randomUUID();
    await query(`
      INSERT INTO payments (id,invoice_id,project_id,amount,method,reference,paid_at,notes,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [pid, iid, inv.project_id, amount, method, reference||null, paid_at, notes||null, session.id]);

    /* auto-update invoice status */
    const { rows: [totals] } = await query(
      "SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE invoice_id=$1", [iid]
    );
    const status = Number(totals.paid) >= Number(inv.total) ? "paid"
      : Number(totals.paid) > 0 ? "partial" : "sent";
    await query("UPDATE invoices SET status=$1,updated_at=NOW() WHERE id=$2", [status, iid]);

    return NextResponse.json({ success: true, id: pid, new_status: status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
