const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../utils/csv');
const { upsertDailyData } = require('../mysql');
const { log } = require('../utils/logger');

async function processGuestCards(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const rows = await parseCsv(fileBuffer);

    const baseName = path.basename(filePath);
    const match = baseName.match(/(\d{4})(\d{2})(\d{2})/);
    const report_date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;

    const summary = {};

    for (const row of rows) {
      const propertyId = row['Property ID'];
      const status = (row['Status'] || '').toLowerCase();

      if (!propertyId || propertyId.toLowerCase() === 'total') continue;

      if (!summary[propertyId]) {
        summary[propertyId] = {
          total_guest_cards: 0,
          active_guest_cards: 0,
          applications: 0,
          showings: 0,
        };
      }

      summary[propertyId].total_guest_cards++;

      if (status === 'active') {
        summary[propertyId].active_guest_cards++;
      } else if (status === 'application completed') {
        summary[propertyId].applications++;
      } else if (status === 'showing scheduled' || status === 'scheduled') {
        summary[propertyId].showings++;
      }
    }

    const formatted = Object.entries(summary).map(([property_id, data]) => ({
      property_id,
      report_date,
      ...data,
    }));

    await upsertDailyData(formatted);
    log(`✅ Guest card data processed and inserted.`);
  } catch (err) {
    log(`❌ Error processing guest cards: ${err.message}`);
  }
}

module.exports.run = processGuestCards;
