/**
 * app/api/leads/[id]/proposals/route.js
 * GET  — list proposals for a lead (newest version first)
 * POST — create new proposal with items
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows } = await query(`
    SELECT p.*, u.name AS created_by_name
    FROM proposals p JOIN users u ON u.id = p.created_by
    WHERE p.lead_id = $1 ORDER BY p.version DESC
  `, [id]);
  return NextResponse.json({ success: true, proposals: rows });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { title = "Proposal", items = [], discount_pct = 0, validity_date, notes } = await req.json();

    /* auto-increment version */
    const { rows: vRows } = await query(
      "SELECT COALESCE(MAX(version),0)+1 AS next FROM proposals WHERE lead_id=$1", [id]
    );
    const version = vRows[0].next;

    const subtotal = items.reduce((s, it) => s + (Number(it.qty) * Number(it.unit_price)), 0);
    const total    = subtotal * (1 - Number(discount_pct) / 100);
    const pid      = randomUUID();

    await query(`
      INSERT INTO proposals (id,lead_id,created_by,version,title,validity_date,notes,discount_pct,subtotal,total)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [pid, id, session.id, version, title, validity_date||null, notes||null, discount_pct, subtotal, total]);

    /* insert items */
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const amount = Number(it.qty) * Number(it.unit_price);
      await query(`
        INSERT INTO proposal_items (id,proposal_id,description,qty,unit_price,amount,sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [randomUUID(), pid, it.description, it.qty, it.unit_price, amount, i]);
    }

    /* activity log */
    await query(`INSERT INTO lead_activity (id,lead_id,actor_id,event_type,payload) VALUES ($1,$2,$3,'proposal_created',$4)`,
      [randomUUID(), id, session.id, JSON.stringify({ pid, version, title, total })]);

    return NextResponse.json({ success: true, id: pid, version });
  } catch (err) {
    console.error("[PROPOSALS:POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
