/**
 * app/api/invoices/[iid]/route.js
 * GET — full invoice with items and payments
 * PUT — update status
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { iid } = await params;
  const { rows: [inv] } = await query(
    "SELECT i.*, u.name AS created_by_name FROM invoices i JOIN users u ON u.id=i.created_by WHERE i.id=$1", [iid]
  );
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { rows: items }    = await query("SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY sort_order", [iid]);
  const { rows: payments } = await query(
    "SELECT p.*, u.name AS created_by_name FROM payments p JOIN users u ON u.id=p.created_by WHERE p.invoice_id=$1 ORDER BY p.paid_at DESC", [iid]
  );
  return NextResponse.json({ success: true, invoice: { ...inv, items, payments } });
}

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { iid } = await params;
  const { status, due_date, notes } = await req.json();
  await query("UPDATE invoices SET status=$1,due_date=$2,notes=$3,updated_at=NOW() WHERE id=$4",
    [status||"draft", due_date||null, notes||null, iid]);
  return NextResponse.json({ success: true });
}
