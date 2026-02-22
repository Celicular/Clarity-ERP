/**
 * app/api/clients/route.js
 * GET  — list / search clients
 * POST — create client
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search") || "";
  const status   = searchParams.get("status") || "";
  const industry = searchParams.get("industry") || "";

  let sql = `
    SELECT c.*, u.name AS created_by_name,
      (SELECT row_to_json(cc) FROM client_contacts cc WHERE cc.client_id=c.id AND cc.is_primary LIMIT 1) AS primary_contact
    FROM clients c JOIN users u ON u.id = c.created_by WHERE 1=1
  `;
  const vals = []; let idx = 1;
  if (search)   { sql += ` AND (c.name ILIKE $${idx} OR c.email ILIKE $${idx} OR c.phone ILIKE $${idx})`; vals.push(`%${search}%`); idx++; }
  if (status)   { sql += ` AND c.status = $${idx++}`; vals.push(status); }
  if (industry) { sql += ` AND c.industry ILIKE $${idx++}`; vals.push(`%${industry}%`); }
  sql += " ORDER BY c.created_at DESC LIMIT 100";

  const { rows } = await query(sql, vals);
  return NextResponse.json({ success: true, clients: rows });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, industry, website, phone, email, address, notes, tags = [] } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    const id = randomUUID();
    await query(`
      INSERT INTO clients (id,created_by,name,industry,website,phone,email,address,notes,tags)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [id, session.id, name.trim(), industry||null, website||null, phone||null,
        email||null, address||null, notes||null, tags]);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
