/**
 * app/api/projects/[pid]/ledger/route.js
 * GET — chronological financial ledger for a project
 *   Returns: invoices issued, payments received, expenses logged,
 *            running balance, and a financial summary
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;

  /* Invoices */
  const { rows: invoices } = await query(`
    SELECT 'invoice' AS type, i.invoice_number AS ref,
      i.total AS amount, i.status, i.created_at AS date, u.name AS actor
    FROM invoices i JOIN users u ON u.id=i.created_by WHERE i.project_id=$1
  `, [pid]);

  /* Payments */
  const { rows: payments } = await query(`
    SELECT 'payment' AS type, COALESCE(p.reference,'—') AS ref,
      p.amount, 'received' AS status, p.paid_at::timestamptz AS date, u.name AS actor
    FROM payments p JOIN users u ON u.id=p.created_by WHERE p.project_id=$1
  `, [pid]);

  /* Expenses */
  const { rows: expenses } = await query(`
    SELECT 'expense' AS type, e.category AS ref,
      e.amount, 'logged' AS status, e.expense_date::timestamptz AS date, u.name AS actor
    FROM project_expenses e JOIN users u ON u.id=e.created_by WHERE e.project_id=$1
  `, [pid]);

  /* Summary */
  const { rows: [summary] } = await query(`
    SELECT
      COALESCE((SELECT SUM(total) FROM invoices WHERE project_id=$1),0)  AS invoiced,
      COALESCE((SELECT SUM(amount) FROM payments WHERE project_id=$1),0) AS received,
      COALESCE((SELECT SUM(amount) FROM project_expenses WHERE project_id=$1),0) AS expenses
  `, [pid]);

  const ledger = [...invoices, ...payments, ...expenses]
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return NextResponse.json({
    success: true,
    ledger,
    summary: {
      ...summary,
      outstanding: Number(summary.invoiced) - Number(summary.received),
      net:         Number(summary.received) - Number(summary.expenses),
    },
  });
}
