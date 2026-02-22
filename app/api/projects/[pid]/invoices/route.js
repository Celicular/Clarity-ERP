/**
 * app/api/projects/[pid]/invoices/route.js
 * GET  — list invoices for a project
 * POST — create invoice with items
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { rows } = await query(`
    SELECT i.*, u.name AS created_by_name,
      COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id=i.id),0) AS paid_amount
    FROM invoices i JOIN users u ON u.id=i.created_by
    WHERE i.project_id=$1 ORDER BY i.created_at DESC
  `, [pid]);
  return NextResponse.json({ success: true, invoices: rows });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  try {
    const { items = [], tax_pct = 0, discount_pct = 0, due_date, notes } = await req.json();

    /* auto invoice number */
    const { rows: [cnt] } = await query("SELECT COUNT(*)::int AS n FROM invoices WHERE project_id=$1", [pid]);
    const invoice_number = `INV-${Date.now().toString().slice(-6)}-${(cnt.n + 1).toString().padStart(3,"0")}`;

    const subtotal = items.reduce((s, it) => s + Number(it.qty||1)*Number(it.unit_price||0), 0);
    const total    = subtotal * (1 + Number(tax_pct)/100) * (1 - Number(discount_pct)/100);
    const iid      = randomUUID();

    await query(`
      INSERT INTO invoices (id,project_id,created_by,invoice_number,subtotal,tax_pct,discount_pct,total,due_date,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [iid, pid, session.id, invoice_number, subtotal, tax_pct, discount_pct, total, due_date||null, notes||null]);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await query(`INSERT INTO invoice_items (id,invoice_id,description,qty,unit_price,amount,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [randomUUID(), iid, it.description, it.qty||1, it.unit_price||0, Number(it.qty||1)*Number(it.unit_price||0), i]);
    }

    return NextResponse.json({ success: true, id: iid, invoice_number });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
