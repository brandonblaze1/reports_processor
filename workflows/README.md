# Workflows Directory

This directory contains individual workflow scripts that process specific report types. Each script exports a `run(filePath)` function which takes the path to a CSV file, parses the data, and performs the necessary database updates or external API calls.

## Files

- **delinquency.js**  
  Processes tenant delinquency reports. Parses CSV rows for past-due tenants and updates the `delinquency` tables in MySQL.

- **showings.js**  
  Handles property showing logs. Reads CSV entries for scheduled showings, formatting visitor data and inserting records into the `showings` table.

- **guest_cards.js**  
  Parses guest card data for self-guided or agent-led visits. Extracts card swipe details and populates logs for property access events.

- **applications.js**  
  Imports rental application submissions. Maps applicant fields to CRM entries, including applicant contact info, credit scores, and application status.

- **mtd_receivables.js**  
  Calculates month-to-date receivables from the CSV report. Aggregates amounts per property and updates the `mtd_receivables` summary table.

- **receivables_daily.js**  
  Processes daily receivables CSV files. Uses the MySQL upsert utility to insert or update `daily_data` records for each property.

- **unit_counts.js**  
  Counts total, occupied, and vacant units by property. Updates occupancy statistics in the database.

## Usage

Within `index.js`, files are routed to these workflows based on filename patterns:

```js
if (name.includes('delinquency')) {
  await require('./workflows/delinquency').run(filePath);
} else if (name.includes('showings')) {
  await require('./workflows/showings').run(filePath);
}
// ... and so on for other workflows
```

To test a workflow manually:

```bash
node -e "require('./workflows/delinquency').run('attachments/delinquency_report.csv')"
```

## Adding New Workflows

1. Create a new `.js` file in this directory.
2. Export an async `run(filePath)` function.
3. Update the routing logic in `index.js` to include your filename pattern.
4. Add documentation here describing the new workflow.

