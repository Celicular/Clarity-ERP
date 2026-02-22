import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate_website_leads() {
  console.log("Starting website_leads migration...");

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        requirement TEXT,
        people INTEGER,
        budget VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Successfully created website_leads table.");
  } catch (err) {
    console.error("❌ Error creating website_leads table:", err);
  } finally {
    await pool.end();
  }
}

migrate_website_leads();
