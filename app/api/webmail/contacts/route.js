import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    let sql = `
      SELECT email, name, last_used 
      FROM webmail_contacts 
      WHERE user_id = $1
    `;
    const params = [user.id];

    if (query.trim()) {
      sql += ` AND (email ILIKE $2 OR name ILIKE $2) `;
      params.push(`%${query.trim()}%`);
    }

    sql += ` ORDER BY last_used DESC LIMIT 10`;

    const { rows } = await pool.query(sql, params);

    return NextResponse.json({ contacts: rows });
  } catch (error) {
    console.error("Webmail Contacts Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
