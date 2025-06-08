# MySQL Upsert Module (mysql.js) Documentation

This document describes the MySQL upsert module (`mysql.js`), which provides utility functions for inserting or updating data into MySQL tables using an efficient upsert pattern.

---

## Table of Contents

1. [Overview](#overview)  
2. [Prerequisites](#prerequisites)  
3. [Configuration](#configuration)  
4. [Functions](#functions)  
   - [upsert(table, data, uniqueKeys)](#upserttable-data-uniquekeys)  
   - [upsertDailyData(data)](#upsertdailydatadata)  
5. [Error Handling](#error-handling)  
6. [Usage Example](#usage-example)  
7. [Exported API](#exported-api)  

---

## Overview

The MySQL upsert module provides a generic `upsert` function that inserts a row into a specified table or updates existing rows based on unique key constraints. It uses the `mysql2/promise` library for async/await support and connection pooling.

---

## Prerequisites

- Node.js (v12+ recommended)  
- `mysql2` package installed  
- A MySQL database with tables configured for unique key constraints  

Install dependencies:

```bash
npm install mysql2 dotenv
```

---

## Configuration

The module reads database connection settings from environment variables. Ensure you have a `.env` file at the project root with the following:

```env
MYSQL_HOST=your_mysql_host
MYSQL_PORT=3306
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database_name
```

---

## Functions

### upsert(table, data, uniqueKeys)

Inserts or updates a single row in the specified table.

- **Parameters**  
  - `table` (string): The name of the MySQL table.  
  - `data` (object): Key-value pairs representing column names and values to insert.  
  - `uniqueKeys` (string[]): Array of column names that define the unique constraint for the upsert.

- **Behavior**  
  1. Validates that each `uniqueKey` exists in `data`.  
  2. Constructs an `INSERT ... ON DUPLICATE KEY UPDATE` SQL statement.  
  3. Executes the statement with bound values.  
  4. Logs success or error via the shared logger.

```js
async function upsert(table, data, uniqueKeys) {
  // ...
}
```

### upsertDailyData(data)

Processes one or more rows for the `daily_data` table.

- **Parameters**  
  - `data` (object|object[]): A single object or array of objects.  
- **Behavior**  
  Iterates over each row and calls `upsert('daily_data', row, ['property_id', 'report_date'])`.

```js
async function upsertDailyData(data) {
  // ...
}
```

---

## Error Handling

- Missing unique key in `data` throws an error before any database call.  
- SQL execution errors are caught, logged (`MySQL Upsert Error`), and re-thrown for upstream handlers.  
- Connections are always released in a `finally` block to prevent leaks.

---

## Usage Example

```js
const { upsert, upsertDailyData } = require('./mysql');

(async () => {
  // Single upsert
  await upsert('properties', { property_id: 123, name: 'Oak Apartments', location: 'Downtown' }, ['property_id']);

  // Batch daily data
  await upsertDailyData([
    { property_id: 123, report_date: '2025-06-08', units_occupied: 45 },
    { property_id: 124, report_date: '2025-06-08', units_occupied: 30 }
  ]);
})();
```

---

## Exported API

- `upsert(table: string, data: object, uniqueKeys: string[]): Promise<void>`  
- `upsertDailyData(data: object|object[]): Promise<void>`

---

*End of Documentation*
