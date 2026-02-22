/**
 * app/api/proposals/[pid]/status/route.js
 * PUT — change proposal status: draft → sent → accepted | rejected
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pid } = await params;
  try {
    const { status } = await req.json();
    const VALID = ["draft", "sent", "accepted", "rejected"];
    if (!VALID.includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

    const { rows: [p] } = await query(
      "UPDATE proposals SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING lead_id", [status, pid]
    );
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await query(`INSERT INTO lead_activity (id,lead_id,actor_id,event_type,payload) VALUES ($1,$2,$3,'proposal_status',$4)`,
      [randomUUID(), p.lead_id, session.id, JSON.stringify({ pid, status })]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
