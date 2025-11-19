// Centralized logging system

const Logger = {
  prefix: '[Lethain Tracker]',

  /**
   * Internal log function
   * @param {string} level - Log level
   * @param {string} message - Message to log
   * @param {*} data - Optional data to log
   * @returns {void}
   */
  _log(level, message, data) {
    const logFn = console[level] || console.log;
    if (data !== null && data !== undefined) {
      logFn(`${this.prefix} ${message}`, data);
    } else {
      logFn(`${this.prefix} ${message}`);
    }
  },

  /**
   * Log debug message
   * @param {string} message - Message to log
   * @param {*} data - Optional data to log
   * @returns {void}
   */
  debug(message, data = null) {
    this._log('debug', message, data);
  },

  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {*} data - Optional data to log
   * @returns {void}
   */
  info(message, data = null) {
    this._log('log', message, data);
  },

  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {*} data - Optional data to log
   * @returns {void}
   */
  warn(message, data = null) {
    this._log('warn', message, data);
  },

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {Error|*} error - Error object or data to log
   * @returns {void}
   */
  error(message, error = null) {
    this._log('error', message, error);
  }
};

