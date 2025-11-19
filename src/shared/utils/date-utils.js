// Date formatting utilities

/**
 * Format date to full format with time
 * @param {string} isoString - ISO date string
 * @param {string} [locale] - Locale string (defaults to 'en-US')
 * @returns {string} Formatted date string
 */
function formatDateFull(isoString, locale = 'en-US') {
  if (!isoString) return '';
  
  const date = new Date(isoString);
  return date.toLocaleDateString(locale, CONFIG.dateFormats.full);
}

/**
 * Get current date as ISO string
 * @returns {string} Current date in ISO format
 */
function getCurrentDateISO() {
  return new Date().toISOString();
}

