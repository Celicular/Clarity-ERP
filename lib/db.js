/**
 * lib/db.js
 * PostgreSQL connection pool using the `pg` package.
 * Reuses the same Pool instance across Next.js hot-reloads.
 * DATABASE_URL is loaded automatically from .env by Next.js.
 */

import pg from "pg";

const { Pool } = pg;

const globalForDb = globalThis;

/* ── Singleton pool ──────────────────────────────────────────────────────────
   In development, Next.js module hot-reload would create a new Pool on every
   change. Attaching to globalThis prevents connection pool exhaustion.
──────────────────────────────────────────────────────────────────────────── */
export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,              // Maximum simultaneous connections
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

/**
 * Convenience query helper — grabs a client, runs the query, releases it.
 * @param {string} text  SQL string with $1, $2 ... placeholders
 * @param {any[]}  params Parameter values
 */
export async function query(text, params) {
  const start  = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV === "development") {
    console.log(`[db] ${text.slice(0, 60)} — ${Date.now() - start}ms`);
  }
  return result;
}

/**
 * Triggers a Postgres NOTIFY event to be picked up by the ws-server
 * @param {string} module - The module name: 'leaves', 'meetings', 'tickets', 'notes', etc.
 * @param {string} action - Action occurred: 'create', 'update', 'status_change', 'reply'
 * @param {string} message - The push notification message
 * @param {Array<string>} target_users - Specific user IDs to ping. If null/empty and target_roles is also null, defaults to Global Broadcast.
 * @param {Array<string>} target_roles - Roles to ping (e.g. ['ADMIN', 'HR']).
 */
export async function queryNotify(module, action, message, target_users = null, target_roles = null) {
  const payload = { module, action, message, target_users, target_roles };
  try {
    await pool.query("SELECT pg_notify('erp_sync', $1)", [JSON.stringify(payload)]);
  } catch (err) {
    console.error(`[db:notify] failed: ${err.message}`);
  }
}
