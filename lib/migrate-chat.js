require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  /* Add reply_to_id to chat_messages */
  await p.query(`
    ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS reply_to_id TEXT REFERENCES chat_messages(id) ON DELETE SET NULL;
  `);
  /* Create read-tracking table */
  await p.query(`
    CREATE TABLE IF NOT EXISTS chat_room_reads (
      room_id     TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
      last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_id, user_id)
    );
  `);

  /* ── Group Calling ── */
  /* Call sessions table */
  await p.query(`
    CREATE TABLE IF NOT EXISTS call_sessions (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id      TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      initiator_id TEXT NOT NULL REFERENCES users(id),
      status       TEXT NOT NULL DEFAULT 'ringing',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at     TIMESTAMPTZ
    );
  `);
  /* Participant log for analytics */
  await p.query(`
    CREATE TABLE IF NOT EXISTS call_participants (
      call_id   UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
      user_id   TEXT NOT NULL REFERENCES users(id),
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      left_at   TIMESTAMPTZ,
      PRIMARY KEY (call_id, user_id)
    );
  `);

  console.log("done");
}

run().then(() => p.end()).catch(e => { console.error(e.message); p.end(); });
