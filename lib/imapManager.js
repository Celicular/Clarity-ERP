import Imap from "imap-simple";
import { pool } from "@/lib/db";

// Global map to store IMAP connections by user.id
// Next.js development server clears state, so we use globalThis
const globalForImap = globalThis;

if (!globalForImap.imapClients) {
  globalForImap.imapClients = new Map();
}

/**
 * Gets an active IMAP connection for the given user, reusing one if it exists.
 * @param {Object} user The authenticated user object containing `id`
 * @returns {Promise<Object>} An active imap-simple connection
 */
export async function getImapConnection(user) {
  const existingConnection = globalForImap.imapClients.get(user.id);
  
  if (existingConnection && existingConnection.imap && existingConnection.imap.state !== "disconnected") {
    // Check if the connection is still actually usable
    if (existingConnection.imap.state === "authenticated" || existingConnection.imap.state === "connected") {
      return existingConnection;
    }
  }

  // 1. Fetch Credentials
  const { rows } = await pool.query(`SELECT email, password FROM webmail_credentials WHERE user_id = $1`, [user.id]);
  if (rows.length === 0) {
    throw new Error("No webmail credentials found");
  }
  const creds = rows[0];

  // 2. Connect to IMAP
  const config = {
    imap: {
      user: creds.email,
      password: creds.password,
      host: process.env.MAIL_IMAP_HOST,
      port: parseInt(process.env.MAIL_IMAP_PORT || "993", 10),
      tls: process.env.MAIL_IMAP_SECURE === "true",
      authTimeout: 10000,
    },
  };

  const connection = await Imap.connect(config);

  // Set up event listeners to remove from cache if disconnected or errors
  connection.imap.on("end", () => {
    globalForImap.imapClients.delete(user.id);
  });
  
  connection.imap.on("error", () => {
    globalForImap.imapClients.delete(user.id);
  });
  
  connection.imap.on("close", () => {
    globalForImap.imapClients.delete(user.id);
  });

  // 3. Cache and return
  globalForImap.imapClients.set(user.id, connection);
  return connection;
}
