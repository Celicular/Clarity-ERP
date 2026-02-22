/**
 * app/api/clients/[id]/route.js
 * GET/PUT/DELETE a single client
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows: [c] } = await query(
    "SELECT c.*, u.name AS created_by_name FROM clients c JOIN users u ON u.id=c.created_by WHERE c.id=$1", [id]
  );
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { rows: contacts } = await query(
    "SELECT * FROM client_contacts WHERE client_id=$1 ORDER BY is_primary DESC, created_at ASC", [id]
  );
  return NextResponse.json({ success: true, client: { ...c, contacts } });
}

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { name, industry, website, phone, email, address, notes, tags, status } = await req.json();
    await query(`
      UPDATE clients SET
        name=$1, industry=$2, website=$3, phone=$4, email=$5,
        address=$6, notes=$7, tags=$8, status=$9, updated_at=NOW()
      WHERE id=$10
    `, [name, industry||null, website||null, phone||null, email||null,
        address||null, notes||null, tags||[], status||"active", id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await query("DELETE FROM clients WHERE id=$1", [id]);
  return NextResponse.json({ success: true });
}
