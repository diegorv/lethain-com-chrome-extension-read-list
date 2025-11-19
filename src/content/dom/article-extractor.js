// Article extraction utilities

// Cache for article elements to avoid repeated queries
let cachedArticleElements = null;
let cachedArticleElementsTimestamp = 0;
const ARTICLE_ELEMENTS_CACHE_TTL = 1000; // 1 second cache

/**
 * Find article elements in the DOM
 * @param {boolean} [useCache=true] - Whether to use cached result
 * @returns {NodeList|Array} Article elements
 */
function findArticleElements(useCache = true) {
  const now = Date.now();
  
  // Use cache if valid and enabled
  if (useCache && cachedArticleElements && (now - cachedArticleElementsTimestamp) < ARTICLE_ELEMENTS_CACHE_TTL) {
    return cachedArticleElements;
  }
  
  // Try primary selector first
  let articleElements = document.querySelectorAll(CONFIG.selectors.article);
  
  // Fallback: if not found, try other common patterns
  if (articleElements.length === 0) {
    // Try without specific classes, looking for paragraphs with link and time
    const allParagraphs = document.querySelectorAll('p');
    const filtered = [];
    for (let i = 0; i < allParagraphs.length; i++) {
      const p = allParagraphs[i];
      if (p.querySelector(CONFIG.selectors.linkFallback) && p.querySelector(CONFIG.selectors.time)) {
        filtered.push(p);
      }
    }
    articleElements = filtered;
  }
  
  // Cache result
  cachedArticleElements = articleElements;
  cachedArticleElementsTimestamp = now;
  
  return articleElements;
}

/**
 * Invalidate article elements cache
 * @returns {void}
 */
function invalidateArticleElementsCache() {
  cachedArticleElements = null;
  cachedArticleElementsTimestamp = 0;
}

/**
 * Query selector with fallback
 * @param {Element} element - Element to search in
 * @param {string} primary - Primary selector
 * @param {string} fallback - Fallback selector
 * @returns {Element|null} Found element or null
 */
function querySelectorWithFallback(element, primary, fallback) {
  return element.querySelector(primary) || element.querySelector(fallback);
}

/**
 * Extract link from article element
 * @param {Element} articleElement - Article element
 * @returns {Element|null} Link element
 */
function extractLink(articleElement) {
  return querySelectorWithFallback(articleElement, CONFIG.selectors.link, CONFIG.selectors.linkFallback);
}

/**
 * Extract time element from article element
 * @param {Element} articleElement - Article element
 * @returns {Element|null} Time element
 */
function extractTime(articleElement) {
  return querySelectorWithFallback(articleElement, CONFIG.selectors.time, CONFIG.selectors.timeFallback);
}

/**
 * Extract date from text using regex fallback
 * @param {string} text - Text to search
 * @returns {string|null} Date string or null
 */
function extractDateFromText(text) {
  const dateMatch = text.match(/(\w+\s+\d{1,2},\s+\d{4})/);
  return dateMatch ? dateMatch[1] : null;
}

/**
 * Extract article data from a single article element
 * @param {Element} articleElement - Article element
 * @returns {Object|null} Article object or null
 */
function extractArticleFromElement(articleElement) {
  const link = extractLink(articleElement);
  if (!link) return null;

  const url = link.href || link.getAttribute('href');
  const title = link.textContent.trim();
  
  if (!url || !title) return null;
  
  if (!validateUrl(url)) return null;

  const time = extractTime(articleElement);
  
  let datetime = null;
  let dateText = null;
  
  if (time) {
    datetime = time.getAttribute('datetime');
    dateText = time.textContent.trim();
  } else {
    // Fallback: look for date in nearby text
    const text = articleElement.textContent;
    dateText = extractDateFromText(text);
  }
  
  return {
    url: url,
    title: title,
    publishedDate: datetime || dateText || '',
    dateText: dateText || ''
  };
}

/**
 * Extract all articles from the DOM
 * @returns {Array} Array of article objects
 */
function extractArticles() {
  const articleElements = findArticleElements();
  // Optimize: Use direct loop instead of Array.from().map().filter() to avoid intermediate arrays
  const articles = [];
  const length = articleElements.length;
  
  for (let i = 0; i < length; i++) {
    const article = extractArticleFromElement(articleElements[i]);
    if (article !== null) {
      articles.push(article);
    }
  }
  
  if (articles.length === 0) {
    Logger.warn('No articles found. The site HTML may have changed.');
  }
  
  return articles;
}

/**
 * Check if current page is the main page (with article list)
 * @returns {boolean} True if main page
 */
function isMainPage() {
  const articleElements = findArticleElements();
  return articleElements.length > 0;
}

