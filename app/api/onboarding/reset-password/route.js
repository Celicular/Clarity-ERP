/**
 * app/api/onboarding/reset-password/route.js
 * POST /api/onboarding/reset-password
 * Changes the user's password during onboarding.
 */

import { NextResponse }              from "next/server";
import bcrypt                        from "bcryptjs";
import { getSession, signToken, setTokenCookie } from "../../../../lib/auth";
import { query }                     from "../../../../lib/db";

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both current and new passwords are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // Verify current password
    const { rows } = await query("SELECT password FROM users WHERE id = $1", [session.id]);
    if (!rows[0]) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    // Hash and update
    const hashed = await bcrypt.hash(newPassword, 10);
    await query(
      "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
      [hashed, session.id]
    );

    return NextResponse.json({ success: true, message: "Password updated." });

  } catch (err) {
    console.error("[ONBOARDING:RESET-PASSWORD]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
