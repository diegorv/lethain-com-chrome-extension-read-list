// Storage management using chrome.storage.local

/**
 * Get storage key for an article URL
 * @param {string} url - Article URL
 * @returns {string} Storage key
 */
function getStorageKey(url) {
  if (!url) return '';
  const normalizedUrl = normalizeUrl(url);
  return `${CONFIG.storage.prefix}${normalizedUrl}`;
}

/**
 * Get existing articles as a Map for efficient lookup
 * Optimized to avoid creating duplicate Map when cache is available
 * @returns {Promise<Map>} Map of normalized URL to article
 */
async function getExistingArticlesMap() {
  if (typeof getArticlesCache === 'function') {
    try {
      const cache = await getArticlesCache();
      // Optimize: If cache is already an object, convert directly without intermediate Map
      // Only create Map if we need to return it (since cache is already an object with URL keys)
      // However, we still need to return a Map for compatibility, but we can optimize the conversion
      const map = new Map();
      // Use for...in loop for better performance than Object.keys()
      for (const url in cache) {
        if (cache.hasOwnProperty(url)) {
          map.set(url, cache[url]);
        }
      }
      return map;
    } catch (e) {
      // Fallback to getAllArticles if cache fails
    }
  }
  
  const existingArticles = await Storage.getAllArticles(false);
  const map = new Map();
  for (let i = 0; i < existingArticles.length; i++) {
    const article = existingArticles[i];
    if (article && article.url) {
      map.set(article.url, article);
    }
  }
  return map;
}

/**
 * Get or create article (helper for markAsRead/markAsUnread)
 * @param {string} url - Article URL (will be normalized)
 * @param {HTMLElement} linkElement - Link element (optional)
 * @param {HTMLElement} articleElement - Article element (optional)
 * @returns {Promise<Object|null>} Article or null
 */
async function getOrCreateArticle(url, linkElement = null, articleElement = null) {
  if (!url || !validateUrl(url)) return null;
  
  const normalizedUrl = normalizeUrl(url);
  let article = await Storage.getArticle(normalizedUrl);
  
  if (article) return article;
  
  // Create article if it doesn't exist
  let title = '';
  let publishedDate = '';
  let dateText = '';
  
  if (linkElement) {
    title = linkElement.textContent.trim() || '';
  }
  
  if (articleElement) {
    const time = articleElement.querySelector(CONFIG.selectors.time);
    if (time) {
      publishedDate = time.getAttribute('datetime') || time.textContent.trim() || '';
      dateText = time.textContent.trim() || '';
    }
  }
  
  const newArticle = {
    url: normalizedUrl,
    title: title,
    publishedDate: publishedDate,
    dateText: dateText,
    isRead: false,
    readDate: null
  };
  
  return Storage.saveArticle(newArticle);
}

const Storage = {
  /**
   * Save or update an article
   * @param {Object} article - Article object with properties: url (string, required), title (string, optional), 
   *                           publishedDate (string, optional), dateText (string, optional), 
   *                           isRead (boolean, optional), readDate (string|null, optional)
   * @returns {Promise<Object|null>} Saved article data with normalized URL or null if invalid
   * @throws {Error} If chrome.storage.local.set fails
   */
  async saveArticle(article) {
    // Runtime type validation
    if (!article || typeof article !== 'object') {
      Logger.warn('saveArticle: article must be an object', article);
      return null;
    }
    
    if (!article.url) {
      Logger.warn('saveArticle: article.url is required', article);
      return null;
    }
    
    // Validate article structure
    if (!validateArticleStructure(article)) {
      Logger.warn('Invalid article structure in saveArticle:', article);
      return null;
    }
    
    if (!validateUrl(article.url)) return null;
    
    const normalizedUrl = normalizeUrl(article.url);
    const key = getStorageKey(normalizedUrl);
    const existing = await this.getArticle(normalizedUrl);
    
    // Use centralized function to determine read status
    const { isRead, readDate } = determineReadStatus(existing, article);
    
    const articleData = {
      url: normalizedUrl,
      title: article.title || (existing && existing.title) || '',
      publishedDate: article.publishedDate || (existing && existing.publishedDate) || '',
      dateText: article.dateText || article.publishedDate || (existing && existing.dateText) || '',
      isRead: isRead,
      readDate: readDate
    };
    
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: articleData }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(articleData);
        }
      });
    });
  },

  /**
   * Save multiple articles in a single batch operation
   * @param {Array<Object>} articles - Array of article objects to save
   * @param {Map<string, Object>|null} existingArticlesMap - Existing articles map for efficient lookup (optional)
   * @returns {Promise<void>} Resolves when all articles are saved
   * @throws {Error} If chrome.storage.local.set fails
   */
  async saveArticles(articles, existingArticlesMap = null) {
    // Runtime type validation
    if (!Array.isArray(articles)) {
      Logger.warn('saveArticles: articles must be an array', articles);
      return;
    }
    
    if (articles.length === 0) return;
    
    // Validate existingArticlesMap if provided
    if (existingArticlesMap != null && !(existingArticlesMap instanceof Map)) {
      Logger.warn('saveArticles: existingArticlesMap must be a Map or null', existingArticlesMap);
      existingArticlesMap = null;
    }
    
    const existingMap = existingArticlesMap || await getExistingArticlesMap();
    
    const data = {};
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      if (!article || !article.url || !validateUrl(article.url)) continue;
      
      const normalizedUrl = normalizeUrl(article.url);
      const key = getStorageKey(normalizedUrl);
      const existing = existingMap.get(normalizedUrl);
      
      data[key] = mergeArticleState(existing, article);
    }
    
    if (Object.keys(data).length > 0) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
  },

  /**
   * Get a specific article by URL
   * @param {string} url - Article URL (will be normalized)
   * @returns {Promise<Object|null>} Article object with properties: url, title, publishedDate, 
   *                                 dateText, isRead, readDate; or null if not found
   * @throws {Error} If chrome.storage.local.get fails
   */
  async getArticle(url) {
    // Runtime type validation
    if (typeof url !== 'string') {
      Logger.warn('getArticle: url must be a string', url);
      return null;
    }
    
    if (!url || !validateUrl(url)) return null;
    
    const normalizedUrl = normalizeUrl(url);
    const key = getStorageKey(normalizedUrl);
    
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result[key] || null);
        }
      });
    });
  },

  /**
   * Get all articles from storage
   * @param {boolean} [sorted=true] - Whether to sort by publication date (newest first)
   * @returns {Promise<Array<Object>>} Array of article objects, sorted by publishedDate if sorted=true
   * @throws {Error} If chrome.storage.local.get fails
   */
  async getAllArticles(sorted = true) {
    // Runtime type validation
    if (typeof sorted !== 'boolean') {
      Logger.warn('getAllArticles: sorted must be a boolean, defaulting to true', sorted);
      sorted = true;
    }
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (items) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        // Optimize: filter early and avoid creating intermediate arrays
        const articles = [];
        const prefix = CONFIG.storage.prefix;
        const prefixLength = prefix.length;
        
        // Use for...in loop and early filtering to avoid processing non-article keys
        for (const key in items) {
          // Fast prefix check using string comparison
          if (key.length >= prefixLength && key.substring(0, prefixLength) === prefix) {
            articles.push(items[key]);
          }
        }
        
        if (sorted) {
          articles.sort((a, b) => {
            const dateA = new Date(a.publishedDate);
            const dateB = new Date(b.publishedDate);
            return dateB - dateA;
          });
        }
        
        resolve(articles);
      });
    });
  },

  /**
   * Mark article as read and set readDate to current timestamp
   * @param {string} url - Article URL (will be normalized)
   * @param {HTMLElement|null} [linkElement=null] - Link element for extracting title (optional)
   * @param {HTMLElement|null} [articleElement=null] - Article element for extracting date (optional)
   * @returns {Promise<Object|null>} Updated article with isRead=true and readDate set, or null if invalid
   */
  async markAsRead(url, linkElement = null, articleElement = null) {
    // Runtime type validation
    if (typeof url !== 'string') {
      Logger.warn('markAsRead: url must be a string', url);
      return null;
    }
    
    if (!url || !validateUrl(url)) return null;
    
    const article = await getOrCreateArticle(url, linkElement, articleElement);
    if (!article) return null;
    
    article.isRead = true;
    article.readDate = new Date().toISOString();
    return this.saveArticle(article);
  },

  /**
   * Mark article as unread and clear readDate
   * @param {string} url - Article URL (will be normalized)
   * @param {HTMLElement|null} [linkElement=null] - Link element for extracting title (optional)
   * @param {HTMLElement|null} [articleElement=null] - Article element for extracting date (optional)
   * @returns {Promise<Object|null>} Updated article with isRead=false and readDate=null, or null if invalid
   */
  async markAsUnread(url, linkElement = null, articleElement = null) {
    // Runtime type validation
    if (typeof url !== 'string') {
      Logger.warn('markAsUnread: url must be a string', url);
      return null;
    }
    
    if (!url || !validateUrl(url)) return null;
    
    const article = await getOrCreateArticle(url, linkElement, articleElement);
    if (!article) return null;
    
    article.isRead = false;
    article.readDate = null;
    return this.saveArticle(article);
  },

  /**
   * Sync new articles (adds only those that don't exist in storage)
   * @param {Array<Object>} newArticles - Array of new article objects to sync
   * @returns {Promise<number>} Number of new articles added (0 if none or all already exist)
   */
  async syncArticles(newArticles) {
    // Runtime type validation
    if (!Array.isArray(newArticles)) {
      Logger.warn('syncArticles: newArticles must be an array', newArticles);
      return 0;
    }
    
    if (newArticles.length === 0) return 0;
    
    const existingMap = await getExistingArticlesMap();
    const articlesToSave = [];
    let newCount = 0;
    
    for (let i = 0; i < newArticles.length; i++) {
      const newArticle = newArticles[i];
      if (!newArticle || !newArticle.url || !validateUrl(newArticle.url)) continue;
      
      const normalizedUrl = normalizeUrl(newArticle.url);
      if (existingMap.has(normalizedUrl)) {
        continue;
      }
      
      articlesToSave.push({
        ...newArticle,
        url: normalizedUrl
      });
      newCount++;
    }
    
    if (articlesToSave.length > 0) {
      await this.saveArticles(articlesToSave, existingMap);
    }
    
    return newCount;
  },

  /**
   * Get current page filter value from storage
   * @returns {Promise<string>} Current filter value (CONFIG.filters.all, CONFIG.filters.read, or CONFIG.filters.unread)
   * @throws {Error} If chrome.storage.local.get fails
   */
  async getPageFilter() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([CONFIG.storage.filterKey], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result[CONFIG.storage.filterKey] || CONFIG.filters.all);
        }
      });
    });
  },

  /**
   * Set page filter value in storage
   * @param {string} filter - Filter value (should be CONFIG.filters.all, CONFIG.filters.read, or CONFIG.filters.unread)
   * @returns {Promise<void>} Resolves when filter is saved
   * @throws {Error} If chrome.storage.local.set fails
   */
  async setPageFilter(filter) {
    // Runtime type validation
    if (typeof filter !== 'string') {
      Logger.warn('setPageFilter: filter must be a string', filter);
      return;
    }
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [CONFIG.storage.filterKey]: filter }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
};

