// ==========================
// logger.js
// ==========================
const fs = require('fs');
const path = require('path');

let verbose = false;
const logFilePath = path.join(__dirname, '..', 'logs', `run-${new Date().toISOString().split('T')[0]}.log`);

function initLogger(isVerbose) {
  verbose = isVerbose;
  // Ensure logs directory exists
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  // Start fresh log file
  fs.appendFileSync(logFilePath, `\n===== New Run at ${new Date().toISOString()} =====\n`);
}

function log(message) {
  const timestamp = new Date().toISOString();
  const output = `[${timestamp}] ${message}`;
  console.log(output);
  if (verbose) {
    fs.appendFileSync(logFilePath, output + '\n');
  }
}

function logData(label, data) {
  const timestamp = new Date().toISOString();
  const output = `\n[${timestamp}] ${label}:\n${JSON.stringify(data, null, 2)}\n`;
  if (verbose) {
    fs.appendFileSync(logFilePath, output);
  }
}

function stringifyIfNeeded(input) {
  if (Array.isArray(input)) {
    return input.join(', '); // remove [] brackets, just comma-separated values
  }
  return input;
}

module.exports = {
  log,
  logData,
  initLogger,
  stringifyIfNeeded,
};
