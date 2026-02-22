/**
 * app/api/projects/[pid]/expenses/route.js
 * GET  — list expenses
 * POST — log an expense
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
    SELECT e.*, u.name AS created_by_name FROM project_expenses e
    JOIN users u ON u.id=e.created_by
    WHERE e.project_id=$1 ORDER BY e.expense_date DESC
  `, [pid]);
  const { rows: [totals] } = await query(
    "SELECT COALESCE(SUM(amount),0)::float AS total FROM project_expenses WHERE project_id=$1", [pid]
  );
  return NextResponse.json({ success: true, expenses: rows, total_expenses: totals.total });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { category = "other", description, amount, expense_date, receipt_url } = await req.json();
  if (!description || !amount || !expense_date)
    return NextResponse.json({ error: "description, amount, expense_date required." }, { status: 400 });
  const id = randomUUID();
  await query(`
    INSERT INTO project_expenses (id,project_id,created_by,category,description,amount,expense_date,receipt_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [id, pid, session.id, category, description, amount, expense_date, receipt_url||null]);
  return NextResponse.json({ success: true, id });
}
