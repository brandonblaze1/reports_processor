const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../utils/csv');
const { upsertDailyData } = require('../mysql');
const { log } = require('../utils/logger');
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

async function getCollectableRentMap() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT property_id, collectable_rent FROM daily_data');
    const map = {};
    for (const row of rows) {
      map[row.property_id] = parseFloat(row.collectable_rent) || 0;
    }
    return map;
  } finally {
    connection.release();
  }
}

async function run(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const rows = await parseCsv(fileBuffer);

    const baseName = path.basename(filePath);
    const match = baseName.match(/(\d{4})(\d{2})(\d{2})/);
    const report_date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;

    const summaryMap = {};
    for (const row of rows) {
      const propertyId = row['Property ID'];
      if (!propertyId || propertyId.toLowerCase() === 'total') continue;

      const clean = str => parseFloat((str || '0').replace(/,/g, '')) || 0;

      const totalReceivable = clean(row['Amount Receivable']);
      const totalDelinquentRent = clean(row['Delinquent Rent']);

      if (!summaryMap[propertyId]) {
        summaryMap[propertyId] = {
          property_id: propertyId,
          total_receivable: 0,
          total_delinquent_rent: 0
        };
      }

      summaryMap[propertyId].total_receivable += totalReceivable;
      summaryMap[propertyId].total_delinquent_rent += totalDelinquentRent;
    }

    const collectableMap = await getCollectableRentMap();

    const finalData = Object.values(summaryMap).map(summary => {
      const collectable_rent = collectableMap[summary.property_id] || 0;
      const delinquent_fees = summary.total_receivable - summary.total_delinquent_rent;

      const delinquency_percent_receivable = collectable_rent > 0
        ? ((summary.total_receivable / collectable_rent) * 100).toFixed(2)
        : '0.00';

      const delinquency_percent_rent_only = collectable_rent > 0
        ? ((summary.total_delinquent_rent / collectable_rent) * 100).toFixed(2)
        : '0.00';

      return {
        report_date,
        property_id: summary.property_id,
        total_receivable: summary.total_receivable.toFixed(2),
        total_delinquent_rent: summary.total_delinquent_rent.toFixed(2),
        delinquent_fees: delinquent_fees.toFixed(2),
        delinquent_subsidy: '0.00',
        total_rent: '0.00',
        delinquency_percent_receivable,
        delinquency_percent_rent_only
      };
    });

    await upsertDailyData(finalData);
    log('✅ Delinquency data processed and inserted.');
  } catch (err) {
    log(`❌ Error processing Delinquency: ${err.message}`);
  }
}

module.exports = { run };
