/**
 * app/api/profile/route.js
 * GET  /api/profile — fetch current user's profile (users + user_details)
 * PUT  /api/profile — update profile fields (role-based restrictions)
 */

import { NextResponse }              from "next/server";
import { getSession, signToken, setTokenCookie } from "../../../lib/auth";
import { query }                     from "../../../lib/db";

/* ── GET: Fetch profile ── */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows: users } = await query(
      "SELECT id, name, email, role, status, first_login, profile_completed, created_at FROM users WHERE id = $1",
      [session.id]
    );

    const { rows: details } = await query(
      "SELECT * FROM user_details WHERE user_id = $1",
      [session.id]
    );

    return NextResponse.json({
      success: true,
      user:    users[0] || null,
      details: details[0] || null,
    });

  } catch (err) {
    console.error("[PROFILE:GET]", err);
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

/* ── PUT: Update profile ── */
export async function PUT(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const isAdmin = session.role === "ADMIN";

    // ── Update users table (admin can change name/email/phone, employee cannot) ──
    if (isAdmin && body.name) {
      await query("UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2", [body.name, session.id]);
    }

    // ── Update user_details ──
    const {
      full_name, phone_number, date_of_birth, gender,
      address, city, state, postal_code, country,
      employee_type, department, designation,
      check_in_time, check_out_time,
      bank_account_number, bank_name, ifsc_code,
    } = body;

    // Check if user_details exist
    const { rows: existing } = await query(
      "SELECT id FROM user_details WHERE user_id = $1", [session.id]
    );

    if (existing.length > 0) {
      // Build dynamic update — employees can't change full_name, phone_number
      if (isAdmin) {
        await query(`
          UPDATE user_details SET
            full_name = COALESCE($1, full_name),
            phone_number = COALESCE($2, phone_number),
            date_of_birth = COALESCE($3, date_of_birth),
            gender = COALESCE($4, gender),
            address = COALESCE($5, address),
            city = COALESCE($6, city),
            state = COALESCE($7, state),
            postal_code = COALESCE($8, postal_code),
            country = COALESCE($9, country),
            employee_type = COALESCE($10, employee_type),
            department = COALESCE($11, department),
            designation = COALESCE($12, designation),
            check_in_time = COALESCE($13, check_in_time),
            check_out_time = COALESCE($14, check_out_time),
            bank_account_number = COALESCE($15, bank_account_number),
            bank_name = COALESCE($16, bank_name),
            ifsc_code = COALESCE($17, ifsc_code),
            updated_at = NOW()
          WHERE user_id = $18
        `, [
          full_name, phone_number, date_of_birth, gender,
          address, city, state, postal_code, country,
          employee_type, department, designation,
          check_in_time, check_out_time,
          bank_account_number, bank_name, ifsc_code,
          session.id,
        ]);
      } else {
        // Employee: cannot update full_name, phone_number (locked)
        await query(`
          UPDATE user_details SET
            date_of_birth = COALESCE($1, date_of_birth),
            gender = COALESCE($2, gender),
            address = COALESCE($3, address),
            city = COALESCE($4, city),
            state = COALESCE($5, state),
            postal_code = COALESCE($6, postal_code),
            country = COALESCE($7, country),
            employee_type = COALESCE($8, employee_type),
            department = COALESCE($9, department),
            designation = COALESCE($10, designation),
            check_in_time = COALESCE($11, check_in_time),
            check_out_time = COALESCE($12, check_out_time),
            bank_account_number = COALESCE($13, bank_account_number),
            bank_name = COALESCE($14, bank_name),
            ifsc_code = COALESCE($15, ifsc_code),
            updated_at = NOW()
          WHERE user_id = $16
        `, [
          date_of_birth, gender,
          address, city, state, postal_code, country,
          employee_type, department, designation,
          check_in_time, check_out_time,
          bank_account_number, bank_name, ifsc_code,
          session.id,
        ]);
      }
    }

    // Re-issue JWT if name changed (admin)
    if (isAdmin && body.name) {
      const token = await signToken({
        ...session,
        name: body.name,
      });
      await setTokenCookie(token);
    }

    return NextResponse.json({ success: true, message: "Profile updated." });

  } catch (err) {
    console.error("[PROFILE:PUT]", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
