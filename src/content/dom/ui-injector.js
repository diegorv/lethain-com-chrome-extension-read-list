// UI injection logic - separated from page orchestrator

/**
 * Inject tracking UI into all articles on the page
 * @param {Object} pageState - PageState instance
 * @param {ResourceManager} resourceManager - Resource manager instance
 * @returns {void}
 */
function injectTrackingUI(pageState, resourceManager) {
  // Use cached findArticleElements to avoid repeated querySelectorAll
  const articleElements = findArticleElements();
  
  for (let i = 0; i < articleElements.length; i++) {
    const articleElement = articleElements[i];
    
    // Skip if already has tracker
    if (articleElement.querySelector(CONFIG.selectors.tracker)) {
      continue;
    }
    
    const link = extractLink(articleElement);
    if (!link) continue;

    const url = link.href || link.getAttribute('href');
    if (!url || !validateUrl(url)) continue;
    
    const pageStorage = createPageStorage(link, articleElement);
    const applyFilterFn = () => applyFilter(pageState.getFilter(), getArticlesCache);
    createTrackingUI(articleElement, url, pageStorage, getArticlesCache, invalidateCache, applyFilterFn, resourceManager);
  }
  
  // Invalidate cache after injection to ensure fresh data on next call
  invalidateArticleElementsCache();
}

/**
 * Create page storage object for article operations
 * @param {HTMLElement} link - Link element
 * @param {HTMLElement} articleElement - Article element
 * @returns {Object} Page storage object
 */
function createPageStorage(link, articleElement) {
  return {
    /**
     * Get article from storage
     * @param {string} url - Article URL
     * @returns {Promise<Object|null>} Article or null
     */
    async getArticle(url) {
      return Storage.getArticle(url);
    },
    
    /**
     * Mark article as read
     * @param {string} url - Article URL
     * @returns {Promise<Object|null>} Updated article or null
     */
    async markAsRead(url) {
      return Storage.markAsRead(url, link, articleElement);
    },
    
    /**
     * Mark article as unread
     * @param {string} url - Article URL
     * @returns {Promise<Object|null>} Updated article or null
     */
    async markAsUnread(url) {
      return Storage.markAsUnread(url, link, articleElement);
    }
  };
}

