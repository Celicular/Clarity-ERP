/**
 * app/api/lead-statuses/route.js
 * GET  /api/lead-statuses — all statuses (authenticated)
 * POST /api/lead-statuses — create custom stage (admin only)
 */
import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { getSession }   from "../../../lib/auth";
import { query }        from "../../../lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows } = await query("SELECT * FROM lead_statuses ORDER BY position ASC, label ASC");
    return NextResponse.json({ success: true, statuses: rows });
  } catch (err) {
    console.error("[LEAD-STATUSES:GET]", err);
    return NextResponse.json({ error: "Failed to fetch statuses." }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  try {
    const { label, color = "#64748b" } = await request.json();
    if (!label?.trim()) return NextResponse.json({ error: "Label is required." }, { status: 400 });

    const slug = label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    // Position = max + 1
    const { rows: posRows } = await query("SELECT COALESCE(MAX(position),0)+1 AS next FROM lead_statuses");
    const position = posRows[0].next;

    const id = randomUUID();
    await query(
      "INSERT INTO lead_statuses (id, label, slug, position, color) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING",
      [id, label.trim(), slug, position, color]
    );
    return NextResponse.json({ success: true, message: "Stage created.", id, slug });
  } catch (err) {
    console.error("[LEAD-STATUSES:POST]", err);
    return NextResponse.json({ error: "Failed to create stage." }, { status: 500 });
  }
}
