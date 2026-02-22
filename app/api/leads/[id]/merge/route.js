/**
 * app/api/leads/[id]/merge/route.js
 * POST /api/leads/:id/merge
 * Merges lead `id` into `target_id`. The source is flagged is_duplicate=true
 * and merged_into is set. The target lead absorbs any missing fields.
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../../../lib/auth";
import { query }        from "../../../../../lib/db";

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;  // source lead
  try {
    const { target_id } = await request.json();
    if (!target_id || target_id === id) {
      return NextResponse.json({ error: "Invalid target lead." }, { status: 400 });
    }

    const [srcRes, tgtRes] = await Promise.all([
      query("SELECT * FROM leads WHERE id = $1", [id]),
      query("SELECT * FROM leads WHERE id = $1", [target_id]),
    ]);
    if (!srcRes.rows[0]) return NextResponse.json({ error: "Source lead not found." }, { status: 404 });
    if (!tgtRes.rows[0]) return NextResponse.json({ error: "Target lead not found." }, { status: 404 });

    const src = srcRes.rows[0];
    const tgt = tgtRes.rows[0];

    // Fill in missing fields on target from source
    await query(`
      UPDATE leads SET
        email       = COALESCE(NULLIF(email,''),       $1),
        phone       = COALESCE(NULLIF(phone,''),       $2),
        company     = COALESCE(NULLIF(company,''),     $3),
        notes       = CASE WHEN notes IS NULL THEN $4 ELSE notes END,
        updated_at  = NOW()
      WHERE id = $5
    `, [src.email, src.phone, src.company, src.notes, target_id]);

    // Mark source as merged
    await query("UPDATE leads SET is_duplicate=TRUE, merged_into=$1, updated_at=NOW() WHERE id=$2", [target_id, id]);

    // Activity entries on both
    const now = randomUUID;
    await Promise.all([
      query(`INSERT INTO lead_activity (id, lead_id, actor_id, event_type, payload) VALUES ($1,$2,$3,'merged',$4)`,
        [randomUUID(), id,        session.id, JSON.stringify({ into: target_id, target_name: tgt.name })]),
      query(`INSERT INTO lead_activity (id, lead_id, actor_id, event_type, payload) VALUES ($1,$2,$3,'merged',$4)`,
        [randomUUID(), target_id, session.id, JSON.stringify({ absorbed: id,    source_name: src.name })]),
    ]);

    return NextResponse.json({ success: true, message: "Leads merged.", target_id });
  } catch (err) {
    console.error("[LEAD:MERGE]", err);
    return NextResponse.json({ error: "Failed to merge leads." }, { status: 500 });
  }
}
