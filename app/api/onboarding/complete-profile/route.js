/**
 * app/api/onboarding/complete-profile/route.js
 * POST /api/onboarding/complete-profile
 * Saves user_details and marks onboarding as complete.
 * Re-issues JWT with updated flags.
 */

import { NextResponse }              from "next/server";
import { randomUUID }                from "crypto";
import { getSession, signToken, setTokenCookie } from "../../../../lib/auth";
import { query }                     from "../../../../lib/db";

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      full_name, phone_number, date_of_birth, gender,
      address, city, state, postal_code, country,
      employee_type, department, designation,
      check_in_time, check_out_time,
      bank_account_number, bank_name, ifsc_code,
    } = body;

    // Basic validation
    if (!full_name || !phone_number || !department || !designation) {
      return NextResponse.json(
        { error: "Name, phone, department, and designation are required." },
        { status: 400 }
      );
    }

    if (!check_in_time || !check_out_time) {
      return NextResponse.json(
        { error: "Check-in and check-out times are required." },
        { status: 400 }
      );
    }

    // Upsert user_details
    await query(`
      INSERT INTO user_details (
        id, user_id, full_name, phone_number, date_of_birth, gender,
        address, city, state, postal_code, country,
        employee_type, department, designation,
        check_in_time, check_out_time,
        bank_account_number, bank_name, ifsc_code
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16,
        $17, $18, $19
      )
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        employee_type = EXCLUDED.employee_type,
        department = EXCLUDED.department,
        designation = EXCLUDED.designation,
        check_in_time = EXCLUDED.check_in_time,
        check_out_time = EXCLUDED.check_out_time,
        bank_account_number = EXCLUDED.bank_account_number,
        bank_name = EXCLUDED.bank_name,
        ifsc_code = EXCLUDED.ifsc_code,
        updated_at = NOW()
    `, [
      randomUUID(), session.id,
      full_name, phone_number, date_of_birth || null, gender || null,
      address || null, city || null, state || null, postal_code || null, country || null,
      employee_type || "Full-Time", department, designation,
      check_in_time, check_out_time,
      bank_account_number || null, bank_name || null, ifsc_code || null,
    ]);

    // Mark user as onboarded
    await query(`
      UPDATE users
      SET first_login = FALSE,
          profile_completed = TRUE,
          updated_at = NOW()
      WHERE id = $1
    `, [session.id]);

    // Re-issue JWT with updated flags
    const newToken = await signToken({
      id:                session.id,
      email:             session.email,
      name:              full_name,
      role:              session.role,
      first_login:       false,
      profile_completed: true,
    });
    await setTokenCookie(newToken);

    return NextResponse.json({
      success: true,
      message: "Profile completed. Welcome aboard!",
    });

  } catch (err) {
    console.error("[ONBOARDING:COMPLETE-PROFILE]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
