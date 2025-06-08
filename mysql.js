require('dotenv').config();
const mysql = require('mysql2/promise');
const { log } = require('./utils/logger');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

async function upsert(table, data, uniqueKeys) {
  const connection = await pool.getConnection();
  try {
    // Ensure all uniqueKeys exist in data
    for (const key of uniqueKeys) {
      if (!(key in data)) {
        throw new Error(`Missing unique key '${key}' in data`);
      }
    }

    const keys = Object.keys(data);
    const columns = keys.map(k => `\`${k}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const updates = keys
      .filter(k => !uniqueKeys.includes(k))
      .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
      .join(', ');

    const sql = `
      INSERT INTO \`${table}\` (${columns})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updates};
    `;

    const values = keys.map(k => data[k]);

    await connection.execute(sql, values);

    const id = data.property_id || data.unit || '[unknown ID]';
    log(`? Upserted ${table} for ${id}`);
  } catch (err) {
    log(`? MySQL Upsert Error: ${err.message}`);
    throw err;
  } finally {
    connection.release();
  }
}

async function upsertDailyData(data) {
  if (!Array.isArray(data)) data = [data];
  for (const row of data) {
    await upsert('daily_data', row, ['property_id', 'report_date']);
  }
}

module.exports = {
  upsert,
  upsertDailyData
};
