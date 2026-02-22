/**
 * app/api/users/[id]/route.js
 * Admin-only per-user CRUD
 *
 * GET    /api/users/:id  → fetch one user + details
 * PUT    /api/users/:id  → update name, email, role, status
 * DELETE /api/users/:id  → delete user (cascades)
 */

import { NextResponse }  from "next/server";
import { getSession }    from "../../../../lib/auth";
import { query }         from "../../../../lib/db";

async function adminOnly() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized", status: 401 };
  if (session.role !== "ADMIN") return { error: "Forbidden", status: 403 };
  return { session };
}

/* ── GET one user ── */
export async function GET(request, { params }) {
  const guard = await adminOnly();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params; // Next.js 15+: params is a Promise

  try {
    const { rows: users } = await query(
      `SELECT u.*, ud.*
       FROM users u
       LEFT JOIN user_details ud ON ud.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );

    if (!users[0]) return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Remove password from response
    const { password: _pw, ...user } = users[0];
    return NextResponse.json({ success: true, user });

  } catch (err) {
    console.error("[USERS:GET-ONE]", err);
    return NextResponse.json({ error: "Failed to fetch user." }, { status: 500 });
  }
}

/* ── PUT: update user ── */
export async function PUT(request, { params }) {
  const guard = await adminOnly();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params; // Next.js 15+: params is a Promise

  try {
    const body = await request.json();
    const { name, email, role, status } = body;

    // Prevent admin from demoting themselves
    if (id === guard.session.id && role && role !== "ADMIN") {
      return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
    }

    if (role && !["ADMIN", "EMPLOYEE"].includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (status && !["Active", "Inactive"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    // Build dynamic SET clause
    const sets = [];
    const vals = [];
    let idx = 1;

    if (name)   { sets.push(`name = $${idx++}`);   vals.push(name); }
    if (email)  { sets.push(`email = $${idx++}`);  vals.push(email.toLowerCase().trim()); }
    if (role)   { sets.push(`role = $${idx++}`);   vals.push(role); }
    if (status) { sets.push(`status = $${idx++}`); vals.push(status); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    await query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${idx}`,
      vals
    );

    return NextResponse.json({ success: true, message: "User updated." });

  } catch (err) {
    console.error("[USERS:PUT]", err);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

/* ── DELETE: remove user ── */
export async function DELETE(request, { params }) {
  const guard = await adminOnly();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params; // Next.js 15+: params is a Promise

  if (id === guard.session.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  try {
    const { rows } = await query("SELECT id FROM users WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Cascade is handled by FK constraints in the DB
    await query("DELETE FROM users WHERE id = $1", [id]);

    return NextResponse.json({ success: true, message: "User deleted." });

  } catch (err) {
    console.error("[USERS:DELETE]", err);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
