// Shared article manipulation utilities

/**
 * Determine read status and read date from existing and new article data
 * 
 * Logic priority:
 * 1. If newArticle explicitly sets isRead: use it and set readDate accordingly
 * 2. If existing article exists: preserve its read status
 * 3. Otherwise: use newArticle defaults (typically false)
 * 
 * @param {Object|null} existing - Existing article from storage (may be null)
 * @param {Object} newArticle - New article data being saved
 * @returns {{isRead: boolean, readDate: string|null}} Object with isRead and readDate
 */
function determineReadStatus(existing, newArticle) {
  // Runtime type validation
  if (existing != null && (typeof existing !== 'object' || Array.isArray(existing))) {
    Logger.warn('determineReadStatus: existing must be an object or null', existing);
    existing = null;
  }
  
  if (!newArticle || typeof newArticle !== 'object' || Array.isArray(newArticle)) {
    Logger.warn('determineReadStatus: newArticle must be an object', newArticle);
    return { isRead: false, readDate: null };
  }
  // If new article explicitly sets isRead property
  if (newArticle.hasOwnProperty('isRead')) {
    const isRead = newArticle.isRead || false;
    // If readDate is explicitly provided, use it; otherwise set current date if marking as read
    const readDate = newArticle.readDate !== undefined 
      ? newArticle.readDate 
      : (isRead ? new Date().toISOString() : null);
    return { isRead, readDate };
  }
  
  // If existing article exists, preserve its read status
  if (existing) {
    return {
      isRead: existing.isRead || false,
      readDate: existing.readDate || null
    };
  }
  
  // Default: not read
  return {
    isRead: newArticle.isRead || false,
    readDate: newArticle.readDate || null
  };
}

/**
 * Merge article state preserving existing read status
 * Used for syncing and saving articles from page extraction
 * @param {Object|null} existing - Existing article
 * @param {Object} newArticle - New article data
 * @returns {Object} Merged article with normalized URL
 */
function mergeArticleState(existing, newArticle) {
  if (!existing) {
    return {
      url: normalizeUrl(newArticle.url),
      title: newArticle.title || '',
      publishedDate: newArticle.publishedDate || '',
      dateText: newArticle.dateText || newArticle.publishedDate || '',
      isRead: newArticle.isRead || false,
      readDate: newArticle.readDate || null
    };
  }
  
  return {
    url: existing.url || normalizeUrl(newArticle.url),
    title: newArticle.title || existing.title || '',
    publishedDate: newArticle.publishedDate || existing.publishedDate || '',
    dateText: newArticle.dateText || newArticle.publishedDate || existing.dateText || '',
    isRead: existing.isRead || false,
    readDate: existing.readDate || null
  };
}

/**
 * Merge article data keeping most recent read date (for import)
 * 
 * Import strategy:
 * - Only imports articles marked as read (isRead=true)
 * - If existing article is not read: accept imported read status
 * - If both are read: keep the one with the most recent readDate
 * - If imported article has no readDate: skip it (existing is more reliable)
 * 
 * @param {Object} existing - Existing article from storage
 * @param {Object} imported - Imported article from file
 * @returns {Object|null} Merged article with most recent readDate, or null if should skip
 */
function mergeArticleDataForImport(existing, imported) {
  // Runtime type validation
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
    Logger.warn('mergeArticleDataForImport: existing must be an object', existing);
    return null;
  }
  
  if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
    Logger.warn('mergeArticleDataForImport: imported must be an object', imported);
    return null;
  }

  // Only import articles that are marked as read
  if (!imported.isRead) {
    return null;
  }

  // If existing article is not read, accept imported read status
  if (!existing.isRead) {
    return {
      url: imported.url,
      title: imported.title || existing.title,
      publishedDate: imported.publishedDate || existing.publishedDate,
      dateText: imported.dateText || existing.dateText,
      isRead: true,
      readDate: imported.readDate
    };
  }

  // Both are read - compare dates to keep most recent
  const importedDate = imported.readDate ? new Date(imported.readDate) : null;
  const existingDate = existing.readDate ? new Date(existing.readDate) : null;

  // If imported doesn't have date, skip it (existing is more reliable)
  if (!importedDate) {
    return null;
  }

  // If imported date is more recent, use it
  if (!existingDate || importedDate > existingDate) {
    return {
      url: imported.url,
      title: imported.title || existing.title,
      publishedDate: imported.publishedDate || existing.publishedDate,
      dateText: imported.dateText || existing.dateText,
      isRead: true,
      readDate: imported.readDate
    };
  }

  // Existing date is more recent, skip import
  return null;
}

/**
 * Validate article object structure
 * @param {*} article - Article to validate
 * @returns {boolean} True if article is valid
 */
function validateArticleStructure(article) {
  if (!article || typeof article !== 'object') {
    return false;
  }
  
  if (!article.url || typeof article.url !== 'string') {
    return false;
  }
  
  // Optional fields should be correct types if present
  if (article.title !== undefined && typeof article.title !== 'string') {
    return false;
  }
  
  if (article.publishedDate !== undefined && typeof article.publishedDate !== 'string') {
    return false;
  }
  
  if (article.dateText !== undefined && typeof article.dateText !== 'string') {
    return false;
  }
  
  if (article.isRead !== undefined && typeof article.isRead !== 'boolean') {
    return false;
  }
  
  if (article.readDate !== undefined && article.readDate !== null && typeof article.readDate !== 'string') {
    return false;
  }
  
  return true;
}

