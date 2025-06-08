// updateBlaze.js
require('dotenv').config();
const mysql  = require('mysql2/promise');
const { google } = require('googleapis');

async function authorize() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

async function getBlazeData() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });
  const [rows] = await conn.execute(`
    SELECT * FROM daily_data
      WHERE property_id IN (187,236,244,423,561,579,580,581,657,685)
  `);
  await conn.end();
  return rows;
}

async function runUpdateBlaze() {
  const sheets = await authorize();
  const data   = await getBlazeData();

  // 1) timestamp
  const now = new Date()
    .toLocaleString('en-US',{ timeZone:'America/Chicago', hour:'numeric', minute:'2-digit', hour12:true, year:'numeric', month:'2-digit', day:'2-digit' })
    .replace(',', ' -')
    .toLowerCase();

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.BLAZE_SHEET_ID,
    range:           'Raw Data!C20:D20',
    valueInputOption:'USER_ENTERED',
    requestBody:     { values:[[ 'Last Update:', now ]] },
  });

  // 2) overwrite all rows (no more append-dup)
  const headers = [
    'property_id','property_name','total_units','occupied_units','occupancy_rate',
    'projected_occupied_units','projected_occupancy_rate','total_receivable','total_delinquent_rent',
    'delinquent_subsidy','delinquent_fees','total_rent','delinquency_percent','total_guest_cards',
    'active_guest_cards','applications','showings','monthly_received','daily_received',
    'delinquency_percent_receivable','delinquency_percent_rent_only','delinquency_percent_no_subsidies',
    'vacant_rented_count','vacant_unrented_count','notice_rented_count','notice_unrented_count',
    'vacant_unrented_json','vacant_rented_json','notice_eviction_count','notice_eviction',
    'lease_30','lease_60','lease_90','lease_m2m','notice_unrented_json','notice_rented_json'
  ];
  const values = [ headers, ...data.map(row=>headers.map(h=>row[h]||'')) ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.BLAZE_SHEET_ID,
    range:           'Raw Data!A1',      // overwrite from top
    valueInputOption:'USER_ENTERED',
    requestBody:     { values },
  });
}

module.exports = { runUpdateBlaze };
