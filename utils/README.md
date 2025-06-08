# Utils Directory

This directory contains utility modules used across the **reports_processor** project. Utilities provide common functionality shared by multiple modules.

## Files

- **logger.js**  
  Provides a centralized logging utility with timestamped, leveled logging to the console. Supports verbose mode.

  ### Functions
  - `initLogger(isVerbose: boolean)`  
    Initializes the logger with verbose mode if `isVerbose` is `true`. Subsequent log calls respect verbosity.

  - `log(message: string, level: 'info' | 'warn' | 'error' = 'info')`  
    Logs a message with a timestamp and level. In verbose mode, additional debug output may be shown.

  - `verbose(message: string)`  
    Shortcut for logging debug-level messages; only outputs when verbose mode is enabled.

  ### Usage Example

  ```js
  const { initLogger, log, verbose } = require('../utils/logger');

  // Initialize logger based on CLI flag
  const isVerbose = process.argv.includes('--verbose');
  initLogger(isVerbose);

  log('Application started');
  verbose('Debug details: %o', someDebugData);
  ```

## Adding New Utilities

1. Create a new `.js` file in this directory.
2. Export named functions or objects.
3. Document each function with JSDoc or comments.
4. Update this README with the new utility description.

