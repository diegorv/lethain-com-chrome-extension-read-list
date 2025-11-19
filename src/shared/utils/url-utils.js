// URL utility functions - shared across all contexts

/**
 * Normalize URL to ensure consistent format (remove trailing slash, ensure absolute URL)
 * @param {string} url - URL to normalize
 * @param {string} baseUrl - Base URL (default: https://lethain.com)
 * @returns {string} Normalized URL
 */
function normalizeUrl(url, baseUrl = 'https://lethain.com') {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url.trim(), baseUrl);
    let normalized = urlObj.href;
    
    // Remove trailing slash (except for root)
    if (normalized.endsWith('/') && normalized !== baseUrl + '/') {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  } catch (e) {
    // Fallback to manual normalization if URL constructor fails
    let normalized = url.trim();
    if (normalized.endsWith('/') && normalized !== baseUrl + '/') {
      normalized = normalized.slice(0, -1);
    }
    
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }
    
    return baseUrl + (normalized.startsWith('/') ? normalized : '/' + normalized);
  }
}

/**
 * Validate article URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function validateUrl(url) {
  return url && typeof url === 'string' && url.trim().length > 0;
}

/**
 * Check if current page is on lethain.com domain
 * Only works in contexts with window object (content scripts)
 * @returns {boolean} True if on lethain.com, false if window is not available
 */
function isLethainDomain() {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }
  return window.location.hostname === CONFIG.urls.hostname || 
         window.location.hostname.endsWith('.' + CONFIG.urls.hostname);
}

/**
 * Execute callback when DOM is ready
 * @param {Function} callback - Callback to execute
 * @returns {void}
 */
function onDOMReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

