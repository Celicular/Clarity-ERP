import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, company, email, phone, requirement, people, budget } = body;

    // Basic validation
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required fields." },
        { status: 400 }
      );
    }

    // Insert into DB
    const queryText = `
      INSERT INTO website_leads (name, company, email, phone, requirement, people, budget)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const values = [name, company, email, phone, requirement, people || null, budget];

    const result = await pool.query(queryText, values);

    return NextResponse.json(
      { success: true, leadId: result.rows[0].id },
      { status: 201 }
    );
  } catch (err) {
    console.error("[website_leads POST] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
