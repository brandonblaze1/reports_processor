const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../utils/csv');
const { upsertDailyData } = require('../mysql');
const { log } = require('../utils/logger');
const { DateTime } = require('luxon');

async function run(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const rows = await parseCsv(fileBuffer);
  const baseName = path.basename(filePath);
  const match = baseName.match(/(\d{4})(\d{2})(\d{2})/);
  const report_date = match && `${match[1]}-${match[2]}-${match[3]}`;
  const today = DateTime.now();

  // summaries[propertyId] holds *all* counts
  const summaries = {};

  for (const row of rows) {
    const pid = row['Property ID'];
    if (!pid || pid.toLowerCase()==='total') continue;
    const leaseStatus = (row['Status']||'').trim().toLowerCase();
    const unit = row['Unit']||'';
    const leaseEnd = row['Lease To']||'';
    const rent = parseFloat(row['Rent']) || 0;

    // initialize once
    if (!summaries[pid]) {
      summaries[pid] = {
        property_id: pid,
        total_units: 0,
        occupied_units: 0,
        projected_occupied_units: 0,
        vacant_rented: [],       // for JSON later
        vacant_unrented: [],
        notice_rented: [],
        notice_unrented: [],
        notice_eviction: [],
        lease_30: 0,
        lease_60: 0,
        lease_90: 0,
        lease_m2m: 0,
        collectable_rent: 0,
        // if you still need the extra breakdowns from unit_counts.js,
        // you can add more arrays/counters here.
      };
    }
    const s = summaries[pid];

    // **TOTAL UNITS** (unit_counts replacement)
    s.total_units++;

    // **OCCUPIED & PROJECTED** (rent_roll logic)
    switch (leaseStatus) {
      case 'current':
      case 'evict':
        s.occupied_units++;
        s.projected_occupied_units++;
        s.collectable_rent += rent;
        if (leaseStatus === 'evict') s.notice_eviction.push(unit);
        break;
      case 'notice-unrented':
        s.occupied_units++;
        s.notice_unrented.push(unit);
        break;
      case 'notice-rented':
        s.occupied_units++;
        s.projected_occupied_units++;
        s.notice_rented.push(unit);
        s.collectable_rent += rent;
        break;
      case 'vacant-rented':
        s.vacant_rented.push(unit);
        s.projected_occupied_units++;
        break;
      case 'vacant-unrented':
        s.vacant_unrented.push(unit);
        break;
    }

    // **LEASE EXPIRY BUCKETS**
    if (leaseEnd) {
      const pd = DateTime.fromFormat(leaseEnd, 'MM/dd/yyyy');
      if (pd.isValid) {
        const days = pd.diff(today, 'days').days;
        if (days <= 30 && days >= 0) s.lease_30++;
        else if (days <= 60) s.lease_60++;
        else if (days <= 90) s.lease_90++;
        else if (pd < today) s.lease_m2m++;
      }
    }

    // …and any other unit_counts.js metrics can drop in here…
  }

  // build final array for upsert
  const finalData = Object.values(summaries).map(s => ({
    property_id:             s.property_id,
    total_units:             s.total_units,
    occupied_units:          s.occupied_units,
    occupancy_rate:          ((s.occupied_units/s.total_units)*100).toFixed(2),
    projected_occupied_units:s.projected_occupied_units,
    projected_occupancy_rate:((s.projected_occupied_units/s.total_units)*100).toFixed(2),
    vacant_rented_count:     s.vacant_rented.length,
    vacant_unrented_count:   s.vacant_unrented.length,
    notice_rented_count:     s.notice_rented.length,
    notice_unrented_count:   s.notice_unrented.length,
    notice_eviction_count:   s.notice_eviction.length,
    notice_eviction:         s.notice_eviction.join(', '),
    lease_30:                s.lease_30,
    lease_60:                s.lease_60,
    lease_90:                s.lease_90,
    lease_m2m:               s.lease_m2m,
    collectable_rent:        s.collectable_rent.toFixed(2),
    vacant_unrented_json:    s.vacant_unrented.join(', '),
    vacant_rented_json:      s.vacant_rented.join(', '),
    notice_unrented_json:    s.notice_unrented.join(', '),
    notice_rented_json:      s.notice_rented.join(', '),
    report_date
  }));

  for (const rec of finalData) {
    await upsertDailyData(rec);
    log(`✓ Upserted for ${rec.property_id}`);
  }
  log('✅ Rent Roll (and unit counts) complete.');
}

module.exports = { run };
