// Configuration constants for the extension

const CONFIG = {
  // CSS Selectors
  selectors: {
    article: 'p.pv1.cf.flex',
    link: 'a.link.black.dim',
    linkFallback: 'a[href]',
    time: 'time',
    timeFallback: '[datetime]',
    timeSpan: 'span.pv1.pr4.w-25',
    articleContainer: 'div.relative.mb4.pa4-ns.pa2-s.bg-white',
    articleSection: 'section.flex-ns',
    articleSectionFallback: 'div.pa3-ns',
    tracker: '.lethain-tracker',
    filterControl: '#lethain-filter-control'
  },

  // Timeouts (in milliseconds)
  timeouts: {
    sync: 500,
    init: 300,
    initSecondary: 100,
    debounce: 150,
    filterDebounce: 150,
    mutationDebounce: 500,
    mutationFilterDelay: 200,
    tooltipDelay: 0,
    statsReload: 500,
    messageHide: 5000,
    cacheInvalidation: 100, // Delay before invalidating cache after changes
    tooltipCloseDelay: 0 // Delay before attaching close handler for tooltip
  },

  // Cache configuration
  cache: {
    ttl: 30000 // 30 seconds (no size limit - cache all articles)
  },

  // Storage keys
  storage: {
    prefix: 'article_',
    filterKey: 'lethain_page_filter'
  },

  // URLs
  urls: {
    base: 'https://lethain.com',
    hostname: 'lethain.com'
  },

  // Filter values
  filters: {
    all: 'all',
    read: 'read',
    unread: 'unread'
  },

  // Date formats
  dateFormats: {
    locale: 'pt-BR',
    full: {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  },

  // Export/Import
  export: {
    version: '1.0.0'
  }
};

