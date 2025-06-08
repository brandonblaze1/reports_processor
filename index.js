require('dotenv').config();
const { runUpdateBlaze }  = require('./updateBlaze');
const { runUpdateLegacy } = require('./updateLegacy');
const fs                  = require('fs');
const path                = require('path');
const cron                = require('node-cron');
const minimist            = require('minimist');
const { fetchAttachments } = require('./gmail');
const { log, initLogger }   = require('./utils/logger');

// Initialize CLI args & logger
const args      = minimist(process.argv.slice(2));
const isVerbose = args.verbose || false;
initLogger(isVerbose);

// Ensure attachments folder exists
const ATTACHMENTS_DIR = path.join(__dirname, process.env.ATTACHMENTS_FOLDER || 'attachments');
if (!fs.existsSync(ATTACHMENTS_DIR)) fs.mkdirSync(ATTACHMENTS_DIR);

/**
 * Dispatch a single CSV file to the appropriate workflow
 */
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
    } else if (name.includes('rent_roll')) {
      // Consolidated rent_roll workflow now handles all unit counts & statuses
      await require('./workflows/rent_roll').run(filePath);
    } else {
      log(`⚠️ No matching workflow for file: ${name}`);
    }
  } catch (err) {
    log(`❌ Error processing ${name}: ${err.message}`);
  }
}

/**
 * Main entrypoint: fetch attachments, dispatch, then update sheets
 */
async function runProcessor() {
  try {
    log('🚀 Starting Report Processor...');
    const attachments = await fetchAttachments();

    if (!attachments.length) {
      log('✅ No attachments to process. Exiting.');
      return;
    }

    // Process each CSV via its workflow
    for (const filePath of attachments) {
      await processFile(filePath);
    }

    // Finalize by pushing to Google Sheets
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

// Run now or schedule via cron
if (!args.cron) {
  runProcessor();
} else {
  cron.schedule('15 11 * * *', () => {
    log('🕖 Scheduled run triggered (6:15 AM Central)');
    runProcessor();
  });
}
