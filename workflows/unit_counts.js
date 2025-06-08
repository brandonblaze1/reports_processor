const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../utils/csv');
const { upsertDailyData } = require('../mysql');
const { log, stringifyIfNeeded } = require('../utils/logger');

function daysUntil(dateStr) {
  const today = new Date();
  const leaseDate = new Date(dateStr);
  const diff = (leaseDate - today) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

async function processUnitCounts(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const rows = await parseCsv(fileBuffer);

    // Extract report_date from file name (e.g., unit_counts-20250608.csv)
    const baseName = path.basename(filePath);
    const match = baseName.match(/(\d{4})(\d{2})(\d{2})/);
    const report_date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;

    const summary = {};

    for (const row of rows) {
      const propertyId = row['Property ID'];
      const status = (row['Status'] || '').toLowerCase();
      const leaseTo = row['Lease To'];
      const unit = row['Unit'];

      if (!propertyId || !unit) continue;

      if (!summary[propertyId]) {
        summary[propertyId] = {
          total_units: 0,
          occupied_units: 0,
          projected_occupied_units: 0,
          vacant_unrented_count: 0,
          notice_rented_count: 0,
          notice_unrented_count: 0,
          notice_eviction_count: 0,
          lease_30: 0,
          lease_60: 0,
          lease_90: 0,
          lease_m2m: 0,
          vacant_unrented_json: [],
          vacant_rented_json: [],
          notice_unrented_json: [],
          notice_rented_json: []
        };
      }

      const prop = summary[propertyId];
      prop.total_units++;

      if (['current', 'notice', 'eviction'].includes(status)) {
        prop.occupied_units++;
      }

      if (['current', 'notice'].includes(status)) {
        prop.projected_occupied_units++;
      }

      if (status === 'vacant-unrented') {
        prop.vacant_unrented_count++;
        prop.vacant_unrented_json.push(unit);
      }

      if (status === 'vacant-rented') {
        prop.vacant_rented_json.push(unit);
      }

      if (status === 'notice-unrented') {
        prop.notice_unrented_count++;
        prop.notice_unrented_json.push(unit);
      }

      if (status === 'notice-rented') {
        prop.notice_rented_count++;
        prop.notice_rented_json.push(unit);
      }

      if (status === 'eviction') {
        prop.notice_eviction_count++;
      }

      const lease = leaseTo?.toLowerCase() || '';
      if (lease.includes('month')) {
        prop.lease_m2m++;
      } else if (leaseTo) {
        const days = daysUntil(leaseTo);
        if (days <= 30) prop.lease_30++;
        else if (days <= 60) prop.lease_60++;
        else if (days <= 90) prop.lease_90++;
      }
    }

    const formatted = Object.entries(summary).map(([property_id, data]) => {
      const occupancyRate = data.total_units ? (data.occupied_units / data.total_units) * 100 : 0;
      const projectedOccupancyRate = data.total_units ? (data.projected_occupied_units / data.total_units) * 100 : 0;

      return {
        property_id,
        ...data,
        occupancy_rate: occupancyRate.toFixed(2),
        projected_occupancy_rate: projectedOccupancyRate.toFixed(2),
        vacant_unrented_json: stringifyIfNeeded(data.vacant_unrented_json),
        vacant_rented_json: stringifyIfNeeded(data.vacant_rented_json),
        notice_unrented_json: stringifyIfNeeded(data.notice_unrented_json),
        notice_rented_json: stringifyIfNeeded(data.notice_rented_json),
        report_date
      };
    });

    await upsertDailyData(formatted);
    log(`? Unit counts data processed and inserted.`);
  } catch (err) {
    log(`? Error processing unit counts: ${err.message}`);
  }
}

module.exports.run = processUnitCounts;
