const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../utils/csv');
const { upsertDailyData } = require('../mysql');
const { log } = require('../utils/logger');

async function run(filePath, reportDate) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const rows = await parseCsv(fileBuffer);

    // Fallback: extract report date from filename
    if (!reportDate) {
      const baseName = path.basename(filePath);
      const match = baseName.match(/(\d{4})(\d{2})(\d{2})/);
      reportDate = match ? `${match[1]}-${match[2]}-${match[3]}` : null;
    }

    const collectableRentMap = {};
    const validStatuses = ['current', 'notice-unrented', 'notice-rented', 'evict'];

    for (const row of rows) {
      const propertyId = row['Property ID'];
      const status = (row['Status'] || '').toLowerCase();
      const rent = parseFloat(row['Rent']) || 0;

      if (!propertyId || propertyId.toLowerCase() === 'total') continue;

      if (validStatuses.includes(status)) {
        if (!collectableRentMap[propertyId]) {
          collectableRentMap[propertyId] = 0;
        }
        collectableRentMap[propertyId] += rent;
      }
    }

    const collectableRentRows = Object.entries(collectableRentMap).map(([property_id, collectable_rent]) => {
      const data = {
        property_id,
        collectable_rent: collectable_rent.toFixed(2),
        report_date: reportDate
      };
      log(`? Inserted/Updated for ${property_id}: ${JSON.stringify(data)}`);
      return data;
    });

    await upsertDailyData(collectableRentRows);
  } catch (err) {
    log(`? Error in collectable_rent: ${err.message}`);
  }
}

module.exports = { run };
