/**
 * app/api/clients/[id]/contacts/route.js
 * GET  — list contacts for a client
 * POST — add a contact
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows } = await query(
    "SELECT * FROM client_contacts WHERE client_id=$1 ORDER BY is_primary DESC, created_at ASC", [id]
  );
  return NextResponse.json({ success: true, contacts: rows });
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { name, role, email, phone, is_primary = false } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required." }, { status: 400 });
    if (is_primary) {
      /* demote existing primary */
      await query("UPDATE client_contacts SET is_primary=FALSE WHERE client_id=$1", [id]);
    }
    const cid = randomUUID();
    await query(
      "INSERT INTO client_contacts (id,client_id,name,role,email,phone,is_primary) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [cid, id, name.trim(), role||null, email||null, phone||null, is_primary]
    );
    return NextResponse.json({ success: true, id: cid });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
