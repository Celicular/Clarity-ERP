require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query(`
  INSERT INTO chat_room_members (room_id, user_id, role)
  SELECT 'general', id, CASE WHEN role='ADMIN' THEN 'admin' ELSE 'member' END
  FROM users
  ON CONFLICT DO NOTHING
`).then(r => { console.log("seeded", r.rowCount, "users into General"); p.end(); })
  .catch(e => { console.error(e.message); p.end(); });
