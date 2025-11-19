// Cache management for articles

let articlesCache = null;
let cacheTimestamp = 0;
let invalidateTimeout = null;
let resourceManager = null;
let fallbackCleanupAttached = false;

/**
 * Set resource manager for cache timeout tracking
 * @param {ResourceManager} rm - Resource manager instance
 */
function setResourceManager(rm) {
  resourceManager = rm;
}

/**
 * Get articles cache with TTL (Time To Live) management
 * 
 * Cache strategy:
 * - Cache is valid for CONFIG.cache.ttl milliseconds (default: 30 seconds)
 * - If cache is expired or doesn't exist, reloads from storage
 * - Cache is stored as object with normalized URLs as keys for O(1) lookup
 * 
 * @returns {Promise<Object>} Articles cache object with structure: { [normalizedUrl]: article }
 * @throws {Error} If Storage.getAllArticles fails
 */
async function getArticlesCache() {
  const now = Date.now();
  
  // Check if cache exists and is still valid (not expired)
  if (!articlesCache || (now - cacheTimestamp) > CONFIG.cache.ttl) {
    try {
      // Reload cache from storage
      const articles = await Storage.getAllArticles(false);
      articlesCache = {};
      
      // Build cache object with normalized URLs as keys
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        if (article && article.url) {
          articlesCache[article.url] = article;
        }
      }
      
      cacheTimestamp = now;
      return articlesCache;
    } catch (error) {
      // On error, reset cache to empty object to prevent stale data
      articlesCache = {};
      cacheTimestamp = now;
      throw error;
    }
  }
  
  // Return existing valid cache
  return articlesCache;
}

/**
 * Get article from cache by URL
 * @param {string} url - Article URL (should be normalized)
 * @returns {Object|null} Article object or null
 */
function getArticleFromCache(url) {
  if (!articlesCache || !url) return null;
  return articlesCache[normalizeUrl(url)] || null;
}

/**
 * Update a single article in cache (incremental update)
 * @param {string} url - Article URL (should be normalized)
 * @param {Object} article - Article object (should have normalized URL from Storage)
 * @returns {void}
 */
function updateCacheArticle(url, article) {
  if (!articlesCache) return;
  const normalizedUrl = normalizeUrl(url);
  if (article) {
    articlesCache[normalizedUrl] = article;
  } else {
    delete articlesCache[normalizedUrl];
  }
}

/**
 * Invalidate articles cache with debounce
 * 
 * Debounce strategy:
 * - Multiple calls within CONFIG.timeouts.cacheInvalidation ms are debounced
 * - Only the last invalidation actually clears the cache
 * - Prevents excessive cache clearing during rapid updates
 * 
 * @returns {void}
 */
function invalidateCache() {
  // Clear previous invalidation timeout if exists
  if (invalidateTimeout != null) {
    if (resourceManager) {
      resourceManager.clearTimeout(invalidateTimeout);
    } else {
      clearTimeout(invalidateTimeout);
    }
    invalidateTimeout = null;
  }
  
  // Define cache clearing function
  const timeoutFn = () => {
    articlesCache = null;
    cacheTimestamp = 0;
    invalidateTimeout = null;
  };
  
  // Schedule cache invalidation with debounce
  if (resourceManager) {
    invalidateTimeout = resourceManager.trackTimeout(timeoutFn, CONFIG.timeouts.cacheInvalidation);
  } else {
    // Fallback: use native setTimeout if resourceManager is not available
    // This should rarely happen, but we handle it for robustness
    invalidateTimeout = setTimeout(timeoutFn, CONFIG.timeouts.cacheInvalidation);
    
    // Cleanup on page unload as fallback (only attach once)
    if (typeof window !== 'undefined' && !fallbackCleanupAttached) {
      fallbackCleanupAttached = true;
      const cleanup = () => {
        if (invalidateTimeout != null) {
          clearTimeout(invalidateTimeout);
          invalidateTimeout = null;
        }
      };
      window.addEventListener('beforeunload', cleanup, { once: true });
      window.addEventListener('pagehide', cleanup, { once: true });
    }
  }
}

