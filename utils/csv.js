// utils/csv.js

const { parse } = require('csv-parse/sync');

function parseCsv(buffer) {
  try {
    const content = buffer.toString('utf8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return Promise.resolve(records);
  } catch (err) {
    return Promise.reject(new Error(`CSV Parse Error: ${err.message}`));
  }
}

module.exports = { parseCsv };
