/**
 * app/api/users/route.js
 * Admin-only User Management API
 *
 * GET  /api/users              → list all users (with optional ?role=&status=&search=)
 * POST /api/users              → create a new user
 */

import { NextResponse }  from "next/server";
import { randomUUID }    from "crypto";
import bcrypt            from "bcryptjs";
import { getSession }    from "../../../lib/auth";
import { query }         from "../../../lib/db";

/* ── Guard: admin only ── */
async function adminOnly() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized", status: 401 };
  if (session.role !== "ADMIN") return { error: "Forbidden", status: 403 };
  return { session };
}

/* ─────────────────────────────────────────────────────────
   GET /api/users — List users
───────────────────────────────────────────────────────── */
export async function GET(request) {
  const guard = await adminOnly();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { searchParams } = new URL(request.url);
    const role    = searchParams.get("role")   || "";
    const status  = searchParams.get("status") || "";
    const search  = searchParams.get("search") || "";

    let sql = `
      SELECT
        u.id, u.name, u.email, u.role, u.status,
        u.first_login, u.profile_completed, u.last_login, u.created_at,
        ud.department, ud.designation, ud.phone_number, ud.employee_type,
        ud.check_in_time, ud.check_out_time,
        ud.sub_role_id,
        sr.name     AS sub_role_name,
        ud.sub_sub_role_id,
        ssr.name    AS sub_sub_role_name
      FROM users u
      LEFT JOIN user_details    ud  ON ud.user_id     = u.id
      LEFT JOIN sub_roles       sr  ON sr.id          = ud.sub_role_id
      LEFT JOIN sub_sub_roles   ssr ON ssr.id         = ud.sub_sub_role_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (role) {
      sql += ` AND u.role = $${idx++}`;
      params.push(role);
    }
    if (status) {
      sql += ` AND u.status = $${idx++}`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (u.name ILIKE $${idx} OR u.email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += " ORDER BY u.created_at DESC";

    const { rows } = await query(sql, params);
    return NextResponse.json({ success: true, users: rows });

  } catch (err) {
    console.error("[USERS:GET]", err);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}

/* ─────────────────────────────────────────────────────────
   POST /api/users — Create user
───────────────────────────────────────────────────────── */
export async function POST(request) {
  const guard = await adminOnly();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { name, email, password, role = "EMPLOYEE" } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    if (!["ADMIN", "EMPLOYEE"].includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    // Check email uniqueness
    const { rows: existing } = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const id     = randomUUID();

    await query(`
      INSERT INTO users (id, name, email, password, role, status, first_login, profile_completed, created_by)
      VALUES ($1, $2, $3, $4, $5, 'Active', TRUE, FALSE, $6)
    `, [id, name, email.toLowerCase().trim(), hashed, role, guard.session.id]);

    return NextResponse.json({ success: true, message: "User created.", id });

  } catch (err) {
    console.error("[USERS:POST]", err);
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}
