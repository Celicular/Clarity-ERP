/**
 * lib/seed.js
 * Seeds the database with the two default users.
 * Run: npm run db:seed
 */

require("dotenv").config();

const { Pool }  = require("pg");
const bcrypt    = require("bcryptjs");
const { randomUUID } = require("crypto");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SALT_ROUNDS = 10;

const USERS = [
  {
    name:      "Super Admin",
    email:     "admin@clarity.com",
    password:  "Admin@123",
    role:      "ADMIN",
    createdBy: "system",
  },
  {
    name:      "John Employee",
    email:     "employee@clarity.com",
    password:  "Employee@123",
    role:      "EMPLOYEE",
    createdBy: "admin@clarity.com",
  },
];

async function seed() {
  const client = await pool.connect();
  console.log("🌱  Seeding users...\n");

  try {
    for (const user of USERS) {
      const hashed = await bcrypt.hash(user.password, SALT_ROUNDS);

      // Upsert — skip if email already exists
      const { rows } = await client.query(
        `INSERT INTO users (id, name, email, password, role, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING
         RETURNING email, role`,
        [randomUUID(), user.name, user.email, hashed, user.role, user.createdBy]
      );

      if (rows.length > 0) {
        console.log(`✅  ${rows[0].role.padEnd(8)} | ${rows[0].email}`);
        console.log(`    Plain password: ${user.password}\n`);
      } else {
        console.log(`⚠️   Skipped (already exists): ${user.email}\n`);
      }
    }

    console.log("✔️   Seeding complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((e) => {
  console.error("❌  Seed failed:", e.message);
  process.exit(1);
});
