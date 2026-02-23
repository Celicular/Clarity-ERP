import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth"; // Ensures we have logged in ERP user
import Imap from "imap-simple";
import crypto from "crypto";

// Basic IMAP connection test to validate credentials
async function verifyCredentials(email, password) {
  const config = {
    imap: {
      user: email,
      password: password,
      host: process.env.MAIL_IMAP_HOST,
      port: parseInt(process.env.MAIL_IMAP_PORT || "993", 10),
      tls: process.env.MAIL_IMAP_SECURE === "true",
      authTimeout: 10000,
    },
  };

  try {
    const connection = await Imap.connect(config);
    connection.end();
    return true;
  } catch (error) {
    console.error("IMAP Auth Error:", error);
    return false;
  }
}

export async function POST(request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { email, password, storeCredentials } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // 1. Verify credentials against the actual IMAP server
    const isValid = await verifyCredentials(email, password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webmail credentials or connection failed" }, { status: 401 });
    }

    // 2. If 'storeCredentials' is true, save them to Postgres
    // (For this implementation, storing as plain text based on 'password TEXT' schema, 
    // ideally should use AES encryption depending on project security standards).
    if (storeCredentials) {
      const id = "wmc-" + crypto.randomUUID();
      await pool.query(`
        INSERT INTO webmail_credentials (id, user_id, email, password, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          email = EXCLUDED.email, 
          password = EXCLUDED.password,
          updated_at = NOW();
      `, [id, user.id, email, password]);
    } else {
      // If user unchecks, we might want to clear existing credentials just in case
      await pool.query(`DELETE FROM webmail_credentials WHERE user_id = $1`, [user.id]);
    }

    return NextResponse.json({ success: true, message: "Logged in successfully" });

  } catch (error) {
    console.error("Webmail Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request) {
  // Check if user already has credentials stored
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { rows } = await pool.query(`SELECT email FROM webmail_credentials WHERE user_id = $1`, [user.id]);
    if (rows.length > 0) {
      return NextResponse.json({ hasCredentials: true, email: rows[0].email });
    } else {
      return NextResponse.json({ hasCredentials: false });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
