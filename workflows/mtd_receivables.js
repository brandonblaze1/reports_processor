const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../utils/csv');
const { upsertMTDData } = require('../mysql');
const { log } = require('../utils/logger');
const { stringifyIfNeeded } = require('../utils/logger');

async function processMTDReceivables(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const rows = await parseCsv(fileBuffer);

    // Extract report_date from filename
    const baseName = path.basename(filePath);
    const match = baseName.match(/(\d{4})(\d{2})(\d{2})/);
    const report_date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;

    const summary = {};

    for (const row of rows) {
      const propertyId = row['Property ID'];
      const amountStr = row['Receipt Amount'];

      if (!propertyId || !amountStr) continue;

      const amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ''));
      if (isNaN(amount)) continue;

      if (!summary[propertyId]) {
        summary[propertyId] = 0;
      }

      summary[propertyId] += amount;
    }

    const formatted = Object.entries(summary).map(([property_id, total_amount]) => ({
      property_id,
      total_amount: total_amount.toFixed(2),
      report_date,
    }));

    await upsertMTDData(formatted);
    log(`? MTD receivables data processed and inserted.`);
  } catch (err) {
    log(`? Error processing MTD receivables: ${err.message}`);
  }
}

module.exports.run = processMTDReceivables;
