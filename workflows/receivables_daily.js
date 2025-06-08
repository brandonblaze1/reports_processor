const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../utils/csv');
const { upsertDailyData } = require('../mysql');
const { log } = require('../utils/logger');

async function processOccupancy(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const rows = await parseCsv(fileBuffer);

    // Extract report_date from file name (YYYYMMDD format)
    const baseName = path.basename(filePath);
    const match = baseName.match(/(\d{4})(\d{2})(\d{2})/);
    const report_date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;

    const propertyData = {};

    for (const row of rows) {
      const propertyId = row['Property ID'];
      const unitStatus = (row['Unit Status'] || '').toLowerCase();

      if (!propertyId || propertyId.toLowerCase() === 'total') continue;

      if (!propertyData[propertyId]) {
        propertyData[propertyId] = {
          total_units: 0,
          occupied_units: 0,
          projected_occupied_units: 0,
        };
      }

      propertyData[propertyId].total_units++;

      if (['occupied', 'notice', 'eviction'].includes(unitStatus)) {
        propertyData[propertyId].occupied_units++;
      }

      if (['occupied', 'notice'].includes(unitStatus)) {
        propertyData[propertyId].projected_occupied_units++;
      }
    }

    const formatted = Object.entries(propertyData).map(([property_id, counts]) => {
      const occupancyRate = counts.total_units ? (counts.occupied_units / counts.total_units) * 100 : 0;
      const projectedOccupancyRate = counts.total_units ? (counts.projected_occupied_units / counts.total_units) * 100 : 0;

      return {
        property_id,
        total_units: counts.total_units,
        occupied_units: counts.occupied_units,
        occupancy_rate: occupancyRate.toFixed(2),
        projected_occupied_units: counts.projected_occupied_units,
        projected_occupancy_rate: projectedOccupancyRate.toFixed(2),
        report_date,
      };
    });

    await upsertDailyData(formatted);
    log(`? Occupancy data processed and inserted.`);
  } catch (error) {
    log(`? Error processing occupancy: ${error.message}`);
    throw error;
  }
}

module.exports.run = processOccupancy;
