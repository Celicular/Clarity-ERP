/**
 * app/api/leads/webhook/route.js
 * POST /api/leads/webhook?token=<secret>
 * Public endpoint — no session required. Validates token, maps payload to
 * lead schema, runs duplicate detection, and creates the lead.
 */
import { NextResponse }      from "next/server";
import { randomUUID }        from "crypto";
import { query }             from "../../../../lib/db";
import { detectDuplicates }  from "../../../../lib/leadDuplicates";

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || "";

    if (!token) {
      return NextResponse.json({ error: "Missing token." }, { status: 401 });
    }

    // Validate token
    const { rows: tokenRows } = await query(
      "SELECT id, active FROM webhook_tokens WHERE token = $1",
      [token]
    );
    if (!tokenRows[0] || !tokenRows[0].active) {
      return NextResponse.json({ error: "Invalid or revoked token." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    // Map common field aliases
    const name    = body.name    || body.full_name  || body.client_name || "";
    const email   = body.email   || body.email_address || "";
    const phone   = body.phone   || body.phone_number  || body.mobile || "";
    const company = body.company || body.organisation   || body.org || "";
    const notes   = body.notes   || body.message        || body.description || "";

    if (!name && !email) {
      return NextResponse.json({ error: "Payload must include name or email." }, { status: 400 });
    }

    // Duplicate detection — on webhook always warn but still create (no user to approve)
    const dupes = await detectDuplicates({ email, phone, name, company });

    const id = randomUUID();
    await query(`
      INSERT INTO leads
        (id, name, email, phone, company, source, criticality, status_slug,
         webhook_payload, is_duplicate)
      VALUES ($1,$2,$3,$4,$5,'Webhook','Normal','new_lead',$6,$7)
    `, [
      id,
      (name || email).trim(),
      email   || null,
      phone   || null,
      company || null,
      JSON.stringify(body),
      dupes.length > 0,
    ]);

    // Activity log
    await query(`
      INSERT INTO lead_activity (id, lead_id, actor_id, event_type, payload)
      VALUES ($1,$2,NULL,'webhook_received',$3)
    `, [randomUUID(), id, JSON.stringify({ source_token: tokenRows[0].id, duplicate_count: dupes.length })]);

    return NextResponse.json({
      success: true,
      id,
      duplicate_warning: dupes.length > 0,
      probable_duplicates: dupes.map((d) => ({ id: d.id, name: d.name, reason: d.reason })),
    });
  } catch (err) {
    console.error("[WEBHOOK]", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
