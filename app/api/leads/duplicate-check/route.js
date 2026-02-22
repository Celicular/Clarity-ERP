/**
 * app/api/leads/duplicate-check/route.js
 * POST /api/leads/duplicate-check
 * Called from the frontend before submitting a new lead.
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { detectDuplicates } from "../../../../lib/leadDuplicates";

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { email, phone, name, company } = await request.json();
    const duplicates = await detectDuplicates({ email, phone, name, company });
    return NextResponse.json({ success: true, duplicates });
  } catch (err) {
    console.error("[DUP-CHECK]", err);
    return NextResponse.json({ error: "Duplicate check failed." }, { status: 500 });
  }
}
