/**
 * app/api/developer-profiles/[uid]/route.js
 * GET — fetch developer profile
 * PUT — update skills, rating, availability
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { uid } = await params;
  const { rows: [profile] } = await query(
    "SELECT dp.*, u.name, u.email FROM developer_profiles dp JOIN users u ON u.id=dp.user_id WHERE dp.user_id=$1", [uid]
  );
  if (!profile) {
    /* auto-create blank profile */
    await query("INSERT INTO developer_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [uid]);
    return NextResponse.json({ success: true, profile: { user_id: uid, skills: [], rating: 3.0, availability: "available" } });
  }
  return NextResponse.json({ success: true, profile });
}

export async function PUT(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { uid } = await params;
  if (session.id !== uid && session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { skills, rating, availability, notes } = await req.json();
  await query(`
    INSERT INTO developer_profiles (user_id, skills, rating, availability, notes, updated_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET skills=$2, rating=$3, availability=$4, notes=$5, updated_at=NOW()
  `, [uid, skills || [], rating || 3.0, availability || "available", notes || null]);
  return NextResponse.json({ success: true });
}
