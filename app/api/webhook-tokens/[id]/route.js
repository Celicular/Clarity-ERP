/**
 * app/api/webhook-tokens/[id]/route.js
 * PUT    /api/webhook-tokens/:id — toggle active (admin only)
 * DELETE /api/webhook-tokens/:id — revoke/delete token (admin only)
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  try {
    const { active } = await request.json();
    await query("UPDATE webhook_tokens SET active = $1 WHERE id = $2", [!!active, id]);
    return NextResponse.json({ success: true, message: `Token ${active ? "activated" : "revoked"}.` });
  } catch (err) {
    console.error("[WEBHOOK-TOKEN:PUT]", err);
    return NextResponse.json({ error: "Failed to update token." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  try {
    await query("DELETE FROM webhook_tokens WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Token deleted." });
  } catch (err) {
    console.error("[WEBHOOK-TOKEN:DELETE]", err);
    return NextResponse.json({ error: "Failed to delete token." }, { status: 500 });
  }
}
