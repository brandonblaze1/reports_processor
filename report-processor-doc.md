# Report Processor (index.js) Documentation

This document provides an overview and guidance for the Report Processor script (`index.js`), which automates fetching and processing report attachments, running update workflows, and scheduling periodic runs.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [File Processing Logic](#file-processing-logic)
7. [Post-Processing Updates](#post-processing-updates)
8. [Scheduling with Cron](#scheduling-with-cron)
9. [Logging & Verbose Mode](#logging--verbose-mode)

---

## Overview

The Report Processor script is responsible for:

- Fetching new report attachments via Gmail.
- Routing each file to the appropriate workflow based on its name.
- Running final update routines (`runUpdateBlaze` and `runUpdateLegacy`).
- Optionally scheduling itself to run daily at 6:15 AM Central Time.

---

## Prerequisites

- Node.js (v14+ recommended)
- npm or yarn
- A Gmail account with API credentials set up (OAuth2)
- Required environment variables configured (see [Configuration](#configuration))

---

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-org/report-processor.git
   cd report-processor
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create an `.env` file in the project root (see next section).

---

## Configuration

The script uses a `.env` file to load configuration values via `dotenv`.

| Variable             | Description                                                 | Default      |
| -------------------- | ----------------------------------------------------------- | ------------ |
| `ATTACHMENTS_FOLDER` | Directory name for storing downloaded attachments          | `attachments`|
| Gmail OAuth variables | Credentials for Gmail API (client ID, client secret, token) | **Required** |

Example `.env`:

```env
ATTACHMENTS_FOLDER=attachments
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
``` 

---

## Usage

Run immediately (once):

```bash
node index.js
```

Run in verbose mode:

```bash
node index.js --verbose
```

Run in cron mode (skip immediate run, only schedule):

```bash
node index.js --cron
```

---

## File Processing Logic

The `processFile(filePath)` function:

1. Extracts the lowercased filename.
2. Matches filename patterns to workflows:
   - `delinquency` → `workflows/delinquency`
   - `showings` → `workflows/showings`
   - `guest` → `workflows/guest_cards`
   - `application` → `workflows/applications`
   - `mtd` → `workflows/mtd_receivables`
   - `receivables` → `workflows/receivables_daily`
   - `unit` or `rent_roll` → `workflows/unit_counts`
3. Logs a warning if no matching workflow is found.
4. Catches and logs any errors during processing.

```js
async function processFile(filePath) {
  const name = path.basename(filePath).toLowerCase();
  log(`📄 Processing file: ${name}`);
  try {
    if (name.includes('delinquency')) {
      await require('./workflows/delinquency').run(filePath);
    } else if (name.includes('showings')) {
      // ... other conditions
    } else {
      log(`⚠️ No matching workflow for file: ${name}`);
    }
  } catch (err) {
    log(`❌ Error processing ${name}: ${err.message}`);
  }
}
```

---

## Post-Processing Updates

After all files are processed, the script runs two update routines:

- `runUpdateBlaze()`: Updates Blaze-specific databases or services.
- `runUpdateLegacy()`: Runs legacy update scripts.

Errors in this phase are caught and logged.

```js
log('📊 Running final update scripts...');
try {
  await runUpdateBlaze();
  log('✅ Blaze update completed.');
  await runUpdateLegacy();
  log('✅ Legacy update completed.');
} catch (err) {
  log(`❌ Error in post-processing updates: ${err.message}`);
}
```

---

## Scheduling with Cron

Using `node-cron`, the script schedules itself to run every day at **6:15 AM Central Time** (UTC `11:15`):

```js
cron.schedule('15 11 * * *', () => {
  log('🕖 Scheduled run triggered (6:15 AM Central)');
  runProcessor();
});
```

Use the `--cron` flag to skip the immediate run and only activate the schedule.

---

## Logging & Verbose Mode

- Uses a custom logger (`utils/logger`) initialized by `initLogger(isVerbose)`.
- Pass `--verbose` to enable detailed logging:

  ```bash
  node index.js --verbose
  ```

---

*End of Documentation*
