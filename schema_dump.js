require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getDatabaseSchema() {
  const { rows } = await pool.query(`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.character_maximum_length,
      c.is_nullable,
      c.column_default
    FROM
      information_schema.columns c
    JOIN
      information_schema.tables t ON c.table_name = t.table_name
    WHERE
      c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY
      c.table_name,
      c.ordinal_position;
  `);

  const schema = {};
  for (const row of rows) {
    if (!schema[row.table_name]) {
      schema[row.table_name] = [];
    }
    let typeStr = row.data_type;
    if (typeStr === 'character varying' && row.character_maximum_length) {
        typeStr += `(${row.character_maximum_length})`;
    }
    schema[row.table_name].push({
      column: row.column_name,
      type: typeStr,
      nullable: row.is_nullable === 'YES',
      default: row.column_default
    });
  }
  return schema;
}

async function run() {
  try {
    const schema = await getDatabaseSchema();
    let output = "=== DATABASE SCHEMA ===\n\n";
    for (const [table, columns] of Object.entries(schema)) {
      output += `Table: ${table}\n`;
      output += "-".repeat(table.length + 7) + "\n";
      for (const col of columns) {
        const nullStr = col.nullable ? "NULL" : "NOT NULL";
        const defStr = col.default ? ` DEFAULT ${col.default}` : "";
        output += `  - ${col.column.padEnd(25)} ${col.type.padEnd(25)} ${nullStr}${defStr}\n`;
      }
      output += "\n";
    }
    console.log(output);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
