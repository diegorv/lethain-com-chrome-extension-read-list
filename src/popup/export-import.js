// Data manipulation utilities (export, import, merge)
// Note: mergeArticleDataForImport is now in shared/utils/article-utils.js

/**
 * Process import batch - validates, merges, and categorizes articles
 * 
 * Import logic:
 * - Only imports articles marked as read (isRead=true)
 * - For existing articles: keeps the most recent readDate
 * - For new articles: imports them if they are marked as read
 * - Invalid articles are skipped
 * 
 * @param {Object} importData - Import data object with structure: { articles: Array<Object> }
 * @returns {Promise<Object>} Result object with:
 *   - articlesToSave: Array<Object> - Articles to save to storage
 *   - imported: number - Count of new articles imported
 *   - updated: number - Count of existing articles updated
 *   - skipped: number - Count of articles skipped (invalid or not read)
 * @throws {Error} If processing fails
 */
async function processImportBatch(importData) {
  // Runtime type validation
  if (!importData || typeof importData !== 'object') {
    throw new Error('processImportBatch: importData must be an object');
  }
  
  if (!Array.isArray(importData.articles)) {
    throw new Error('processImportBatch: importData.articles must be an array');
  }

  // Filter valid articles (must have valid structure and URL)
  const validArticles = importData.articles.filter(article => 
    validateArticle(article) && validateUrl(article.url)
  );

  // Process all articles in parallel for better performance
  const results = await Promise.all(
    validArticles.map(async (article) => {
      const existing = await Storage.getArticle(article.url);
      
      if (existing) {
        // Merge with existing article (keeps most recent readDate)
        const merged = mergeArticleDataForImport(existing, article);
        if (merged) {
          return { type: 'updated', article: merged };
        }
        // Skip if merge returns null (existing readDate is more recent)
        return { type: 'skipped', article: null };
      } else {
        // New article - only import if marked as read
        if (!article.isRead) {
          return { type: 'skipped', article: null };
        }
        
        return {
          type: 'imported',
          article: {
            url: article.url,
            title: article.title || '',
            publishedDate: article.publishedDate || '',
            dateText: article.dateText || article.publishedDate || '',
            isRead: true,
            readDate: article.readDate || null
          }
        };
      }
    })
  );

  // Extract articles to save (exclude skipped)
  const articlesToSave = results
    .filter(r => r.type !== 'skipped')
    .map(r => r.article);

  // Count results by type
  const imported = results.filter(r => r.type === 'imported').length;
  const updated = results.filter(r => r.type === 'updated').length;
  // Skipped = invalid articles + articles skipped during merge
  const skipped = importData.articles.length - validArticles.length + 
                  results.filter(r => r.type === 'skipped').length;

  return { articlesToSave, imported, updated, skipped };
}

/**
 * Export articles data
 * @param {Array} articles - Articles array
 * @returns {Object} Export data object
 */
function createExportData(articles) {
  return {
    version: CONFIG.export.version,
    exportDate: getCurrentDateISO(),
    totalArticles: articles.length,
    articles: articles
  };
}

/**
 * Download data as JSON file
 * @param {Object} data - Data to export
 * @param {string} filename - Filename for download
 * @returns {void}
 */
function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import data from JSON file
 * 
 * Process:
 * 1. Read file as text
 * 2. Parse JSON
 * 3. Validate structure
 * 4. Process and merge articles
 * 5. Save to storage
 * 
 * @param {File} file - JSON file to import (must have .json extension)
 * @returns {Promise<Object>} Import result with:
 *   - imported: number - Count of new articles imported
 *   - updated: number - Count of existing articles updated
 *   - skipped: number - Count of articles skipped
 * @throws {Error} If file reading, parsing, validation, or processing fails
 */
async function importDataFromFile(file) {
  // Runtime type validation
  if (!(file instanceof File)) {
    throw new Error('importDataFromFile: file must be a File object');
  }

  // Read file content
  let text;
  try {
    text = await file.text();
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }

  // Parse JSON with error handling
  let importData;
  try {
    importData = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error.message}`);
  }

  // Validate import data structure
  const validation = validateImportData(importData);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid import data');
  }

  // Process import batch
  const { articlesToSave, imported, updated, skipped } = await processImportBatch(importData);

  // Save articles to storage if any
  if (articlesToSave.length > 0) {
    await Storage.saveArticles(articlesToSave);
  }

  return { imported, updated, skipped };
}

