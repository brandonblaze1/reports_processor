# Report Processor (reports_processor) Documentation

This README provides a comprehensive guide to the **reports_processor** project, covering all modules, subprocesses, and workflows.

---

## Table of Contents

1. [Overview](#overview)
2. [Repository Structure](#repository-structure)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [Core Modules](#core-modules)
   - [Gmail Attachment Fetcher (`gmail.js`)](#gmail-attachment-fetcher-gmailjs)
   - [MySQL Upsert Utility (`mysql.js`)](#mysql-upsert-utility-mysqljs)
   - [Report Processor (`index.js`)](#report-processor-indexjs)
8. [Subprocess Workflows](#subprocess-workflows)
   - [Delinquency](#delinquency)
   - [Showings](#showings)
   - [Guest Cards](#guest-cards)
   - [Applications](#applications)
   - [MTD Receivables](#mtd-receivables)
   - [Daily Receivables](#daily-receivables)
   - [Unit Counts](#unit-counts)
9. [Cron Scheduling](#cron-scheduling)
10. [Logging & Verbose Mode](#logging--verbose-mode)
11. [Error Handling & Debugging](#error-handling--debugging)
12. [Contributing](#contributing)
13. [License](#license)

---

## Overview

The **reports_processor** automates fetching CSV attachments from Gmail, processing each file through specific workflows, updating databases, and running on a schedule. It enables seamless, hands-off data ingestion for real estate reporting.

---

## Repository Structure

```
reports_processor/
├── workflows/
│   ├── delinquency.js
│   ├── showings.js
│   ├── guest_cards.js
│   ├── applications.js
│   ├── mtd_receivables.js
│   ├── receivables_daily.js
│   └── unit_counts.js
├── utils/
│   └── logger.js
├── gmail.js
├── mysql.js
├── index.js
├── package.json
└── .env.example
```

---

## Prerequisites

- **Node.js** v14 or higher
- **npm** or **yarn**
- **Gmail API** OAuth2 credentials
- **MySQL** database with appropriate tables and unique constraints

---

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/brandonblaze1/reports_processor.git
   cd reports_processor
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment template:

   ```bash
   cp .env.example .env
   ```

---

## Configuration

Populate `.env` with:

```env
# Gmail API
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Attachments Folder
ATTACHMENTS_FOLDER=attachments

# MySQL
MYSQL_HOST=your_host
MYSQL_PORT=3306
MYSQL_USER=your_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_db
```

---

## Usage

- **One-time run**:

  ```bash
  node index.js
  ```

- **Verbose mode**:

  ```bash
  node index.js --verbose
  ```

- **Cron-only (skip immediate run)**:

  ```bash
  node index.js --cron
  ```

---

## Core Modules

### Gmail Attachment Fetcher (`gmail.js`)

Handles connecting to Gmail, listing unread messages with subject `rep-apt-auto`, extracting CSV attachments, and saving them locally under the configured folder.

### MySQL Upsert Utility (`mysql.js`)

Provides:

- `upsert(table, data, uniqueKeys)`: Generic insert-or-update function using `INSERT ... ON DUPLICATE KEY UPDATE`.
- `upsertDailyData(data)`: Batch upsert for the `daily_data` table based on `property_id` and `report_date`.

### Report Processor (`index.js`)

Coordinates the entire workflow:

1. **Fetch** attachments via `fetchAttachments()`.
2. **Process** each file with `processFile(filePath)` (routes to workflows).
3. **Post-Process** updates with `runUpdateBlaze()` and `runUpdateLegacy()`.
4. **Schedule** daily runs via `node-cron`.

---

## Subprocess Workflows

Each workflow module in `workflows/` exports a `run(filePath)` function:

### Delinquency
Processes tenant delinquency reports and updates corresponding database tables.

### Showings
Generates showing reports and updates showings dashboard.

### Guest Cards
Parses guest card logs and inserts records for property visits.

### Applications
Imports rental application data into CRM.

### MTD Receivables
Calculates month-to-date receivables and updates financial summary.

### Daily Receivables
Processes daily receivables CSV to update `daily_data`.

### Unit Counts
Counts unit inventory and vacancy, updating occupancy statistics.

---

## Cron Scheduling

Scheduled via:

```js
cron.schedule('15 11 * * *', () => {
  log('🕖 Scheduled run (6:15 AM Central)');
  runProcessor();
});
```

Set timezone to Central; uses UTC `11:15`.

---

## Logging & Verbose Mode

- **Logger**: `utils/logger.js` handles timestamped console output.
- **Verbose**: `--verbose` flag enables debug-level logs.

---

## Error Handling & Debugging

- Each module catches and logs errors.
- Unmatched filenames warn without halting the process.
- Ensure OAuth tokens and DB credentials are valid.
- Use verbose mode for stack traces.

---

## Contributing

1. Fork the repo.
2. Branch: `feature/your-feature`.
3. Commit & PR.
4. Ensure new workflows follow the pattern in `workflows/`.

---

## License

MIT © Blaze Real Estate
