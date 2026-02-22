/**
 * app/api/onboarding/check/route.js
 * GET /api/onboarding/check
 * Returns the onboarding status from the JWT session.
 */

import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    first_login:       session.first_login,
    profile_completed: session.profile_completed,
  });
}
