// updateLegacy.js
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

async function getLegacyData() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });
  const [rows] = await conn.execute(`
    SELECT * FROM daily_data
      WHERE property_id IN (329,330,689,690,691,692,693,694,695)
  `);
  await conn.end();
  return rows;
}

async function runUpdateLegacy() {
  const sheets = await authorize();
  const data   = await getLegacyData();

  // timestamp
  const now = new Date()
    .toLocaleString('en-US',{ timeZone:'America/Chicago', hour:'numeric', minute:'2-digit', hour12:true, year:'numeric', month:'2-digit', day:'2-digit' })
    .replace(',', ' -')
    .toLowerCase();

  // Update the “Last Update” cell
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range:           'Raw Data!C20:D20',
    valueInputOption:'USER_ENTERED',
    requestBody:     { values:[[ 'Last Update:', now ]] },
  });

  // Overwrite all rows
  const headers = [
    'property_id','property_name','total_units','occupied_units','vacant_rented_json',
    'vacant_unrented_json','notice_unrented_count','notice_rented_count',
    'vacant_unrented_count','vacant_rented_count','delinquency_percent_no_subsidies',
    'delinquency_percent_rent_only','delinquency_percent_receivable','daily_received',
    'monthly_received','showings','applications','active_guest_cards','total_guest_cards',
    'delinquency_percent','total_rent','delinquent_fees','delinquent_subsidy',
    'total_delinquent_rent','total_receivable','projected_occupancy_rate',
    'projected_occupied_units','occupancy_rate','notice_eviction','notice_eviction_count',
    'lease_30','lease_60','lease_90','lease_m2m','notice_unrented_json','notice_rented_json'
  ];
  const values = [ headers, ...data.map(row=>headers.map(h=>row[h]||'')) ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range:           'Raw Data!A1',
    valueInputOption:'USER_ENTERED',
    requestBody:     { values },
  });
}

module.exports = { runUpdateLegacy };
