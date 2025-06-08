const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../utils/csv');
const { upsertDailyData } = require('../mysql');
const { log } = require('../utils/logger');
const { DateTime } = require('luxon');

async function run(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const rows = await parseCsv(fileBuffer);

    // Extract report_date from file name (e.g. rent_roll-20250608.csv)
    const baseName = path.basename(filePath);
    const match = baseName.match(/(\d{4})(\d{2})(\d{2})/);
    const report_date = match ? `${match[1]}-${match[2]}-${match[3]}` : null;

    const summaries = {};
    const today = DateTime.now();

    for (const row of rows) {
      const propertyId = row['Property ID'];
      const leaseStatus = (row['Status'] || '').trim().toLowerCase();
      const unit = row['Unit'] || '';
      const leaseStart = row['Lease Start'] || '';
      const leaseEnd = row['Lease To'] || '';
      const rent = parseFloat(row['Rent']) || 0;

      if (!propertyId || propertyId.toLowerCase() === 'total') continue;

      if (!summaries[propertyId]) {
        summaries[propertyId] = {
          property_id: propertyId,
          total_units: 0,
          occupied_units: 0,
          projected_occupied_units: 0,
          vacant_rented: [],
          vacant_unrented: [],
          notice_rented: [],
          notice_unrented: [],
          notice_eviction: [],
          lease_30: 0,
          lease_60: 0,
          lease_90: 0,
          lease_m2m: 0,
          collectable_rent: 0
        };
      }

      const summary = summaries[propertyId];
      summary.total_units++;

      switch (leaseStatus) {
        case 'current':
        case 'evict':
          summary.occupied_units++;
          summary.projected_occupied_units++;
          summary.collectable_rent += rent;
          if (leaseStatus === 'evict') summary.notice_eviction.push(unit);
          break;
        case 'notice-unrented':
          summary.occupied_units++;
          summary.notice_unrented.push(unit);
          break;
        case 'notice-rented':
          summary.occupied_units++;
          summary.projected_occupied_units++;
          summary.notice_rented.push(unit);
          summary.collectable_rent += rent;
          break;
        case 'vacant-rented':
          summary.vacant_rented.push(unit);
          summary.projected_occupied_units++;
          break;
        case 'vacant-unrented':
          summary.vacant_unrented.push(unit);
          break;
      }

      if (leaseEnd) {
        const parsedEnd = DateTime.fromFormat(leaseEnd, 'MM/dd/yyyy');
        if (!parsedEnd.isValid) {
          log(`?? Invalid lease end date for unit ${unit} in property ${propertyId}: ${leaseEnd}`);
        } else {
          const daysDiff = parsedEnd.diff(today, 'days').days;
          if (daysDiff <= 30 && daysDiff >= 0) summary.lease_30++;
          else if (daysDiff <= 60 && daysDiff > 30) summary.lease_60++;
          else if (daysDiff <= 90 && daysDiff > 60) summary.lease_90++;
          else if (parsedEnd < today) summary.lease_m2m++;
        }
      }
    }

    const finalData = Object.values(summaries).map(summary => {
      const occupancyRate = summary.total_units > 0
        ? ((summary.occupied_units / summary.total_units) * 100).toFixed(2)
        : '0.00';
      const projectedRate = summary.total_units > 0
        ? ((summary.projected_occupied_units / summary.total_units) * 100).toFixed(2)
        : '0.00';

      return {
        property_id: summary.property_id,
        total_units: summary.total_units,
        occupied_units: summary.occupied_units,
        occupancy_rate: occupancyRate,
        projected_occupied_units: summary.projected_occupied_units,
        projected_occupancy_rate: projectedRate,
        vacant_rented_count: summary.vacant_rented.length,
        vacant_unrented_count: summary.vacant_unrented.length,
        notice_rented_count: summary.notice_rented.length,
        notice_unrented_count: summary.notice_unrented.length,
        vacant_unrented_json: summary.vacant_unrented.join(', '),
        vacant_rented_json: summary.vacant_rented.join(', '),
        notice_eviction_count: summary.notice_eviction.length,
        notice_eviction: summary.notice_eviction.join(', '),
        lease_30: summary.lease_30,
        lease_60: summary.lease_60,
        lease_90: summary.lease_90,
        lease_m2m: summary.lease_m2m,
        notice_unrented_json: summary.notice_unrented.join(', '),
        notice_rented_json: summary.notice_rented.join(', '),
        collectable_rent: summary.collectable_rent.toFixed(2),
        report_date
      };
    });

    for (const record of finalData) {
      await upsertDailyData(record);
      log(`? Inserted/Updated for ${record.property_id}: ${JSON.stringify(record)}`);
    }

    log(`? Rent Roll data processed and inserted.`);
  } catch (error) {
    log(`? Error processing Rent Roll: ${error.message}`);
  }
}

module.exports = { run };
