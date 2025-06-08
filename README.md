Report Processor (reports_processor) Documentation

This README provides a comprehensive guide to the reports_processor project, covering all modules, subprocesses, and workflows.

Table of Contents

Overview

Repository Structure

Prerequisites

Installation

Configuration

Usage

Core Modules

Gmail Attachment Fetcher (gmail.js)

MySQL Upsert Utility (mysql.js)

Report Processor (index.js)

Subprocess Workflows

Delinquency

Showings

Guest Cards

Applications

MTD Receivables

Daily Receivables

Unit Counts

Cron Scheduling

Logging & Verbose Mode

Error Handling & Debugging

Contributing

License

Overview

The reports_processor automates fetching CSV attachments from Gmail, processing each file through specific workflows, updating databases, and running on a schedule. It enables seamless, hands-off data ingestion for real estate reporting.

Repository Structure

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

Prerequisites

Node.js v14 or higher

npm or yarn

Gmail API OAuth2 credentials

MySQL database with appropriate tables and unique constraints

Installation

Clone the repository:

git clone https://github.com/brandonblaze1/reports_processor.git
cd reports_processor

Install dependencies:

npm install

Copy environment template:

cp .env.example .env

Configuration

Populate .env with:

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

Usage

One-time run:

node index.js

Verbose mode:

node index.js --verbose

Cron-only (skip immediate run):

node index.js --cron

Core Modules

Gmail Attachment Fetcher (gmail.js)

Handles connecting to Gmail, listing unread messages with subject rep-apt-auto, extracting CSV attachments, and saving them locally under the configured folder.

MySQL Upsert Utility (mysql.js)

Provides:

upsert(table, data, uniqueKeys): Generic insert-or-update function using INSERT ... ON DUPLICATE KEY UPDATE.

upsertDailyData(data): Batch upsert for the daily_data table based on property_id and report_date.

Report Processor (index.js)

Coordinates the entire workflow:

Fetch attachments via fetchAttachments().

Process each file with processFile(filePath) (routes to workflows).

Post-Process updates with runUpdateBlaze() and runUpdateLegacy().

Schedule daily runs via node-cron.

Subprocess Workflows

Each workflow module in workflows/ exports a run(filePath) function:

Delinquency

Processes tenant delinquency reports and updates corresponding database tables.

Showings

Generates showing reports and updates showings dashboard.

Guest Cards

Parses guest card logs and inserts records for property visits.

Applications

Imports rental application data into CRM.

MTD Receivables

Calculates month-to-date receivables and updates financial summary.

Daily Receivables

Processes daily receivables CSV to update daily_data.

Unit Counts

Counts unit inventory and vacancy, updating occupancy statistics.

Cron Scheduling

Scheduled via:

cron.schedule('15 11 * * *', () => {
  log('🕖 Scheduled run (6:15 AM Central)');
  runProcessor();
});

Set timezone to Central; uses UTC 11:15.

Logging & Verbose Mode

Logger: utils/logger.js handles timestamped console output.

Verbose: --verbose flag enables debug-level logs.

Error Handling & Debugging

Each module catches and logs errors.

Unmatched filenames warn without halting the process.

Ensure OAuth tokens and DB credentials are valid.

Use verbose mode for stack traces.

Contributing

Fork the repo.

Branch: feature/your-feature.

Commit & PR.

Ensure new workflows follow the pattern in workflows/.

License

MIT © Blaze Real Estate
