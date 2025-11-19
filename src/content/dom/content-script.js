// Content script that extracts articles from the lethain.com page
// Executes when the page loads

(function() {
  'use strict';

  if (!isLethainDomain()) {
    return;
  }

  /**
   * Automatically sync articles
   * @returns {Promise<void>}
   */
  async function autoSync() {
    const articles = extractArticles();
    if (articles.length > 0) {
      try {
        await Storage.syncArticles(articles);
      } catch (error) {
        Logger.warn('Error syncing articles:', error);
      }
    }
  }

  /**
   * Try to sync articles if on main page
   * @returns {Promise<void>}
   */
  async function trySync() {
    if (isMainPage()) {
      // Invalidate article elements cache before syncing to ensure fresh data
      if (typeof invalidateArticleElementsCache === 'function') {
        invalidateArticleElementsCache();
      }
      await autoSync();
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractArticles') {
      const articles = extractArticles();
      sendResponse({ articles: articles });
      return true;
    }
  });

  let syncTimeout = null;

  onDOMReady(() => {
    syncTimeout = setTimeout(() => {
      syncTimeout = null;
      trySync().catch((error) => {
        Logger.warn('Error in trySync:', error);
      });
    }, CONFIG.timeouts.sync);
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (syncTimeout != null) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
  });
})();
