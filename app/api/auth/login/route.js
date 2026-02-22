/**
 * app/api/auth/login/route.js
 * POST /api/auth/login
 * Validates credentials against PostgreSQL users table.
 * Supports master password bypass for admins.
 * Returns first_login + profile_completed in JWT for onboarding flow.
 */

import { NextResponse }              from "next/server";
import bcrypt                        from "bcryptjs";
import { query }                     from "../../../../lib/db";
import { signToken, setTokenCookie } from "../../../../lib/auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // ── Basic validation ────────────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // ── Look up user by email (with sub_role department) ──────────────────────
    const { rows } = await query(
      `SELECT u.*, sr.department AS sub_role_dept, sr.name AS sub_role_name
       FROM users u
       LEFT JOIN user_details ud ON ud.user_id = u.id
       LEFT JOIN sub_roles    sr ON sr.id = ud.sub_role_id
       WHERE u.email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    const user = rows[0];

    // Generic message — don't reveal whether the email exists
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check if user is inactive
    if (user.status === "Inactive") {
      return NextResponse.json(
        { error: "Your account has been deactivated. Contact an admin." },
        { status: 403 }
      );
    }

    // ── Verify password (or master password) ────────────────────────────────
    const masterPassword = process.env.MASTER_PASSWORD;
    const isMasterLogin  = masterPassword && password === masterPassword;
    const isValidPassword = isMasterLogin || await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // ── Prevent simultaneous session ────────────────────────────────────────
    if (user.is_logged_in) {
      return NextResponse.json(
        { error: "This account is already logged in on another device. Please log out there first." },
        { status: 403 }
      );
    }

    // ── Extract Request Details ─────────────────────────────────────────────
    let ip = request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || request.ip || "Unknown IP";
    if (ip === "::1") ip = "127.0.0.1";
    
    const userAgent = request.headers.get("user-agent") || "Unknown Device";

    // ── Update login timestamp and session ────────────────────────────────────
    await query(
      `UPDATE users
       SET last_login     = NOW(),
           updated_at     = NOW(),
           is_logged_in   = TRUE,
           login_ip       = $2,
           login_device   = $3
       WHERE id = $1`,
      [user.id, ip, userAgent]
    );

    // ── Issue JWT cookie ────────────────────────────────────────────────────
    const token = await signToken({
      id:                user.id,
      email:             user.email,
      name:              user.name,
      role:              user.role,
      first_login:       user.first_login,
      profile_completed: user.profile_completed,
      /* Sub-role department for sidebar isolation (e.g. "Development", "Sales") */
      sub_role_dept:     user.sub_role_dept  || null,
      sub_role_name:     user.sub_role_name  || null,
    });

    await setTokenCookie(token);

    return NextResponse.json({
      success:           true,
      role:              user.role,
      name:              user.name,
      first_login:       user.first_login,
      profile_completed: user.profile_completed,
    });

  } catch (err) {
    console.error("[LOGIN]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
