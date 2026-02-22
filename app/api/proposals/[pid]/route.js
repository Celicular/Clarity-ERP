/**
 * app/api/proposals/[pid]/route.js
 * GET — full proposal + items
 * PUT — update (creates new version snapshot)
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  const { rows: [p] } = await query(
    "SELECT p.*, u.name AS created_by_name FROM proposals p JOIN users u ON u.id=p.created_by WHERE p.id=$1",
    [pid]
  );
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { rows: items } = await query(
    "SELECT * FROM proposal_items WHERE proposal_id=$1 ORDER BY sort_order", [pid]
  );
  return NextResponse.json({ success: true, proposal: { ...p, items } });
}

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  try {
    const { title, items = [], discount_pct = 0, validity_date, notes } = await req.json();
    const { rows: [orig] } = await query("SELECT * FROM proposals WHERE id=$1", [pid]);
    if (!orig) return NextResponse.json({ error: "Not found" }, { status: 404 });

    /* new version snapshot */
    const newPid    = randomUUID();
    const version   = orig.version + 1;
    const subtotal  = items.reduce((s, it) => s + (Number(it.qty) * Number(it.unit_price)), 0);
    const total     = subtotal * (1 - Number(discount_pct) / 100);

    await query(`
      INSERT INTO proposals (id,lead_id,created_by,version,title,validity_date,notes,discount_pct,subtotal,total)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [newPid, orig.lead_id, session.id, version, title||orig.title, validity_date||orig.validity_date,
        notes||null, discount_pct, subtotal, total]);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await query(`INSERT INTO proposal_items (id,proposal_id,description,qty,unit_price,amount,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [randomUUID(), newPid, it.description, it.qty, it.unit_price, Number(it.qty)*Number(it.unit_price), i]);
    }

    await query(`INSERT INTO lead_activity (id,lead_id,actor_id,event_type,payload) VALUES ($1,$2,$3,'proposal_updated',$4)`,
      [randomUUID(), orig.lead_id, session.id, JSON.stringify({ pid: newPid, version, total })]);

    return NextResponse.json({ success: true, id: newPid, version });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
