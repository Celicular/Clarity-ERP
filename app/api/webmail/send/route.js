import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import nodemailer from "nodemailer";
import { logAudit } from "@/lib/auditlogger";

export async function POST(request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { to, subject, text, html, attachments } = body;

    // `to` can be a comma-separated string
    if (!to || (!text && !html)) {
      return NextResponse.json({ error: "Missing required fields (to, text/html)" }, { status: 400 });
    }

    const recipients = to.split(",").map(e => e.trim()).filter(Boolean);

    // Save recipients to contacts for auto-suggest
    for (const email of recipients) {
      const id = "con-" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      await pool.query(`
        INSERT INTO webmail_contacts (id, user_id, email, last_used)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, email) 
        DO UPDATE SET last_used = NOW()
      `, [id, user.id, email]);
    }

    // 1. Fetch Credentials
    const { rows } = await pool.query(`SELECT email, password FROM webmail_credentials WHERE user_id = $1`, [user.id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No webmail credentials found" }, { status: 404 });
    }
    const creds = rows[0];

    // 2. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_SMTP_HOST,
      port: parseInt(process.env.MAIL_SMTP_PORT || "465", 10),
      secure: process.env.MAIL_SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: creds.email,
        pass: creds.password,
      },
    });

    // 3. Format Attachments
    // Expecting attachments to be an array of { filename, content: "base64...", contentType }
    let mailAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      mailAttachments = attachments.map(att => {
        // if content is a data URL (e.g. data:image/png;base64,iVBORw0K...), strip the prefix
        let base64Data = att.content;
        if (base64Data.includes("base64,")) {
          base64Data = base64Data.split("base64,")[1];
        }
        return {
          filename: att.filename,
          content: Buffer.from(base64Data, "base64"),
          contentType: att.contentType
        };
      });
    }

    // 4. Send Email
    const info = await transporter.sendMail({
      from: `"${user.name}" <${creds.email}>`,
      to: recipients.join(", "),
      subject: subject || "No Subject",
      text,
      html,
      attachments: mailAttachments
    });

    // 5. Audit Logging
    await logAudit({
      action: `Sent email to ${to} (Subject: ${subject})`,
      criticality: "Medium",
      done_by: user.id,
      done_by_ip: request.headers.get("x-forwarded-for") || request.ip || null,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error("Webmail Send Error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
