const { parseCsv } = require('../utils/csv');
const { upsertDailyData } = require('../mysql');
const { log } = require('../utils/logger');
const path = require('path');

async function processApplications(filePath) {
  try {
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(filePath);
    const rows = await parseCsv(fileBuffer);

    const applicationCounts = {};

    for (const row of rows) {
      const propertyId = row['Property ID'];
      if (!propertyId || propertyId.toLowerCase() === 'total') continue;

      if (!applicationCounts[propertyId]) {
        applicationCounts[propertyId] = 0;
      }

      applicationCounts[propertyId]++;
    }

    // ? Extract date from filename (e.g., rental_applications-20250608.csv)
    const baseName = path.basename(filePath);
    const match = baseName.match(/(\d{4})(\d{2})(\d{2})/);
    const report_date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;

    const formatted = Object.entries(applicationCounts).map(([property_id, applications]) => ({
      property_id,
      applications,
      report_date,
    }));

    await upsertDailyData(formatted);
    log(`? Rental Applications data processed and inserted.`);
  } catch (err) {
    log(`? Error processing Rental Applications: ${err.message}`);
  }
}

module.exports.run = processApplications;
