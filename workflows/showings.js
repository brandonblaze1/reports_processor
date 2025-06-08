// reports_processor/workflows/showings.js

const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../utils/csv');
const { upsertDailyData } = require('../mysql');
const { log } = require('../utils/logger');

async function processShowings(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const rows = await parseCsv(fileBuffer);

    // Extract report_date from filename (e.g. showings-20250608.csv)
    const baseName = path.basename(filePath);
    const match = baseName.match(/(\d{4})(\d{2})(\d{2})/);
    const report_date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;

    const showingsCount = {};

    for (const row of rows) {
      const propertyId = row['Property ID'];
      if (!propertyId || propertyId.toLowerCase() === 'total') continue;

      if (!showingsCount[propertyId]) {
        showingsCount[propertyId] = 0;
      }
      showingsCount[propertyId]++;
    }

    const formatted = Object.entries(showingsCount).map(([property_id, showings]) => ({
      property_id,
      showings,
      report_date
    }));

    await upsertDailyData(formatted);
    log(`? Showings data processed and inserted.`);
  } catch (error) {
    log(`? Error processing showings: ${error.message}`);
    throw error;
  }
}

module.exports.run = processShowings;
