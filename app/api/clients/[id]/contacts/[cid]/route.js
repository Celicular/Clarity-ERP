/**
 * app/api/clients/[id]/contacts/[cid]/route.js
 * PUT / DELETE a single client contact
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../../../lib/auth";
import { query }        from "../../../../../../lib/db";

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;
  const { name, role, email, phone, is_primary } = await req.json();
  if (is_primary) await query("UPDATE client_contacts SET is_primary=FALSE WHERE client_id=$1", [id]);
  await query(
    "UPDATE client_contacts SET name=$1,role=$2,email=$3,phone=$4,is_primary=$5 WHERE id=$6 AND client_id=$7",
    [name, role||null, email||null, phone||null, !!is_primary, cid, id]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { cid, id } = await params;
  await query("DELETE FROM client_contacts WHERE id=$1 AND client_id=$2", [cid, id]);
  return NextResponse.json({ success: true });
}
