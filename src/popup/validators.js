// Validation utilities

/**
 * Validate article object
 * @param {Object} article - Article object to validate
 * @returns {boolean} True if valid
 */
function validateArticle(article) {
  return article && typeof article === 'object' && article.url;
}

/**
 * Validate import data structure
 * @param {Object} importData - Import data to validate
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateImportData(importData) {
  if (!importData || typeof importData !== 'object') {
    return { valid: false, error: 'Invalid file format. Expected an object.' };
  }

  if (!importData.articles || !Array.isArray(importData.articles)) {
    return { valid: false, error: 'Invalid file format. The file must contain an array of articles.' };
  }

  return { valid: true, error: null };
}