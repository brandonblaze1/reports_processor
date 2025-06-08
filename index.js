// ==========================
// index.js   (2025-06-08 clean build)
// ==========================
require('dotenv').config();
const fs        = require('fs');
const path      = require('path');
const cron      = require('node-cron');
const minimist  = require('minimist');
const { fetchAttachments } = require('./gmail');
const { log, initLogger }   = require('./utils/logger');

// Optional post-processing helpers.
// If they aren’t exported anymore we’ll just skip them.
let runUpdateBlaze  = () => {};
let runUpdateLegacy = () => {};
try   { runUpdateBlaze  = require('./updateBlaze').runUpdateBlaze  || require('./updateBlaze'); } catch { /* noop */ }
try   { runUpdateLegacy = require('./updateLegacy').runUpdateLegacy || require('./updateLegacy'); } catch { /* noop */ }

// -------------------------------------------------------------------
// CLI flags & logger
// -------------------------------------------------------------------
const args      = minimist(process.argv.slice(2));
const isVerbose = args.verbose || false;
initLogger(isVerbose);

// -------------------------------------------------------------------
// Ensure attachments folder exists
// -------------------------------------------------------------------
const ATTACHMENTS_DIR = path.join(
  __dirname,
  process.env.ATTACHMENTS_FOLDER || 'attachments'
);
if (!fs.existsSync(ATTACHMENTS_DIR)) fs.mkdirSync(ATTACHMENTS_DIR);

// -------------------------------------------------------------------
// Dispatch one CSV to its workflow
// -------------------------------------------------------------------
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
      await require('./workflows/rent_roll').run(filePath);

    } else {
      log(`⚠️  No matching workflow for file: ${name}`);
    }

  } catch (err) {
    log(`❌ Error processing ${name}: ${err.message}`);
  }
}

// -------------------------------------------------------------------
// Main entrypoint
// -------------------------------------------------------------------
async function runProcessor() {
  try {
    log('🚀 Starting Report Processor...');
    const attachments = await fetchAttachments();

    if (!attachments.length) {
      log('ℹ️  No attachments to process. Exiting.');
      return;
    }

    for (const file of attachments) {
      await processFile(file);
    }

    // Push to Google Sheets (if helpers are present)
    log('🔄 Running final update scripts...');
    try {
      if (typeof runUpdateBlaze === 'function')  await runUpdateBlaze();
      if (typeof runUpdateLegacy === 'function') await runUpdateLegacy();
      log('✅ Post-processing complete.');
    } catch (err) {
      log(`❌ Error in post-processing updates: ${err.message}`);
    }

    log('🏁 All files processed.');
    process.exit(0);

  } catch (err) {
    log(`💥 Fatal Error: ${err.message}`);
    process.exit(1);
  }
}

// -------------------------------------------------------------------
// Immediate run or scheduled via cron
// -------------------------------------------------------------------
if (!args.cron) {
  runProcessor();
} else {
  cron.schedule('15 11 * * *', () => {
    log('⏰ Scheduled run triggered (6:15 AM Central)');
    runProcessor();
  });
}
