// ==========================
// index.js
// ==========================
require('dotenv').config();
const { runUpdateBlaze }  = require('./updateBlaze');
const { runUpdateLegacy } = require('./updateLegacy');
const fs                  = require('fs');
const path                = require('path');
const cron                = require('node-cron');
const minimist            = require('minimist');
const { fetchAttachments } = require('./gmail');
const { log, initLogger }   = require('./utils/logger');

const args      = minimist(process.argv.slice(2));
const isVerbose = args.verbose || false;
initLogger(isVerbose);

const ATTACHMENTS_DIR = path.join(__dirname, process.env.ATTACHMENTS_FOLDER || 'attachments');
if (!fs.existsSync(ATTACHMENTS_DIR)) fs.mkdirSync(ATTACHMENTS_DIR);

async function processFile(filePath) {
  const name = path.basename(filePath).toLowerCase();
  log(`📄 Processing file: ${name}`);

  try {
    if (name.includes('delinquency')) {
      await require('./workflows/delinquency').run(filePath);
    } else if (name.includes('showings')) {
      await require('./workflows/showings').run(filePath);
    } else if (name.includes('guest')) {
      await require('./workflows/guest_cards').run(filePath);
    } else if (name.includes('application')) {
      await require('./workflows/applications').run(filePath);
    } else if (name.includes('mtd')) {
      await require('./workflows/mtd_receivables').run(filePath);
    } else if (name.includes('receivables')) {
      await require('./workflows/receivables_daily').run(filePath);
    } else if (name.includes('rent_roll') || name.includes('unit')) {
      // point both rent_roll-*.csv and any "unit" files at your consolidated workflow
      await require('./workflows/rent_roll').run(filePath);
    } else {
      log(`⚠️ No matching workflow for file: ${name}`);
    }
  } catch (err) {
    log(`❌ Error processing ${name}: ${err.message}`);
  }
}

async function runProcessor() {
  try {
    log('🚀 Starting Report Processor...');
    const attachments = await fetchAttachments();

    if (!attachments.length) {
      log('✅ No attachments to process. Exiting.');
      return;
    }

    // attachments is now an array of string filePaths
    for (const filePath of attachments) {
      await processFile(filePath);
    }

    log('📊 Running final update scripts...');
    try {
      await runUpdateBlaze();
      log('✅ Blaze update completed.');
      await runUpdateLegacy();
      log('✅ Legacy update completed.');
    } catch (err) {
      log(`❌ Error in post-processing updates: ${err.message}`);
    }

    log('🎉 All files and post-processing completed.');
    process.exit(0);

  } catch (err) {
    log(`❌ Fatal Error: ${err.message}`);
    process.exit(1);
  }
}

// Run immediately if not in cron mode
if (!args.cron) {
  runProcessor();
}

// Schedule for 6:15 AM Central (11:15 UTC)
cron.schedule('15 11 * * *', () => {
  log('🕖 Scheduled run triggered (6:15 AM Central)');
  runProcessor();
});
