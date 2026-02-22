/**
 * app/api/webhook-tokens/route.js
 * GET  /api/webhook-tokens — list all tokens (admin only, token value hidden)
 * POST /api/webhook-tokens — create a new token (admin only, value shown ONCE)
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";

function adminOnly(session) {
  if (!session)                   return { error: "Unauthorized", status: 401 };
  if (session.role !== "ADMIN")   return { error: "Forbidden.",   status: 403 };
  return null;
}

export async function GET() {
  const session = await getSession();
  const guard = adminOnly(session);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { rows } = await query(`
      SELECT wt.id, wt.label, wt.active, wt.created_at,
             LEFT(wt.token, 8) || '...' AS token_preview,
             u.name AS created_by_name
      FROM webhook_tokens wt
      JOIN users u ON u.id = wt.created_by
      ORDER BY wt.created_at DESC
    `);
    return NextResponse.json({ success: true, tokens: rows });
  } catch (err) {
    console.error("[WEBHOOK-TOKENS:GET]", err);
    return NextResponse.json({ error: "Failed to fetch tokens." }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  const guard = adminOnly(session);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { label } = await request.json();
    if (!label?.trim()) return NextResponse.json({ error: "Token label is required." }, { status: 400 });

    // Generate a cryptographically random token
    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("hex");
    const id    = randomUUID();

    await query(
      "INSERT INTO webhook_tokens (id, token, label, created_by) VALUES ($1,$2,$3,$4)",
      [id, token, label.trim(), session.id]
    );

    // Return full token ONCE — not stored in clear again
    return NextResponse.json({ success: true, id, token, label: label.trim() });
  } catch (err) {
    console.error("[WEBHOOK-TOKENS:POST]", err);
    return NextResponse.json({ error: "Failed to create token." }, { status: 500 });
  }
}
