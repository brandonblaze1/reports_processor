// mysql.js  – minimalist & bullet-proof
require('dotenv').config();
const mysql = require('mysql2/promise');
const { log } = require('./utils/logger');

// --------------------------------------------------
// 1. Connection pool
// --------------------------------------------------
const pool = mysql.createPool({
  host:               process.env.MYSQL_HOST,
  port:               process.env.MYSQL_PORT,
  user:               process.env.MYSQL_USER,
  password:           process.env.MYSQL_PASSWORD,
  database:           process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit:    8,
  queueLimit:         0
});

// --------------------------------------------------
// 2. Generic UPSERT helper
// --------------------------------------------------
async function upsert(table, data) {
  if (!data || typeof data !== 'object' || !Object.keys(data).length) {
    throw new Error('upsert() requires a non-empty data object');
  }

  const cols         = Object.keys(data);
  const colList      = cols.map(c => `\`${c}\``).join(', ');
  const placeholders = cols.map(() => '?').join(', ');
  const updates      = cols
    .filter(c => !/(_id$|^id$)/i.test(c))           // don’t touch primary keys
    .map(c => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');

  const sql = `
    INSERT INTO \`${table}\` (${colList})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates};
  `;

  const values = cols.map(c => data[c]);

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.execute(sql, values);
    log(`? ${table}  affectedRows=${result.affectedRows}`);   // 1 = insert, 2 = update
    return result;
  } catch (err) {
    log('? MySQL error:', err.sqlMessage || err.message);
    throw err;
  } finally {
    conn.release();
  }
}

// --------------------------------------------------
// 3. Table-specific convenience wrappers
// --------------------------------------------------
async function upsertDailyData(rows) {
  if (!Array.isArray(rows)) rows = [rows];
  for (const row of rows) await upsert('daily_data', row);
}

async function upsertMtdData(rows) {
  if (!Array.isArray(rows)) rows = [rows];
  for (const row of rows) await upsert('mtd_receivables', row);
}

module.exports = {
  pool,
  upsert,
  upsertDailyData,
  upsertMtdData
};
