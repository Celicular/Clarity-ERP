require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const p = new Pool({ connectionString: process.env.DATABASE_URL });

Promise.all([
  p.query("SELECT id, name, status, is_default FROM chat_rooms"),
  p.query("SELECT room_id, user_id, role FROM chat_room_members LIMIT 20"),
]).then(([rooms, members]) => {
  console.log("ROOMS:", JSON.stringify(rooms.rows, null, 2));
  console.log("MEMBERS (first 20):", JSON.stringify(members.rows, null, 2));
  p.end();
}).catch(e => { console.error(e.message); p.end(); });
