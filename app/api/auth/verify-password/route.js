import { NextResponse } from "next/server";
import bcrypt           from "bcryptjs";
import { query }        from "../../../../lib/db";
import { getSession }   from "../../../../lib/auth";
import { logAudit }     from "../../../../lib/auditlogger";

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const { rows } = await query(`SELECT password FROM users WHERE id = $1 LIMIT 1`, [session.id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = rows[0];

    // Support master password bypass if configured, or compare using bcrypt
    const masterPassword = process.env.MASTER_PASSWORD;
    const isMasterLogin  = masterPassword && password === masterPassword;
    const isValidPassword = isMasterLogin || await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      let ip = request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || request.ip || "Unknown IP";
      if (ip === "::1") ip = "127.0.0.1";
      await logAudit({ action: "FAILED_REENTRY", criticality: "High", done_by: session.id, done_by_ip: ip });

      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[VERIFY PASSWORD]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
