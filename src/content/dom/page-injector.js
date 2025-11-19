// Script that injects the tracking interface directly into the lethain.com page
// Main orchestrator for page injection functionality

(function() {
  'use strict';

  if (!isLethainDomain()) {
    return;
  }

  // Initialize resource manager
  const resourceManager = new ResourceManager();
  setResourceManager(resourceManager);

  // Initialize page state
  const pageState = new PageState();

  /**
   * Cleanup resources on page unload
   * @returns {void}
   */
  function cleanup() {
    resourceManager.cleanup();
    invalidateCache();
  }

  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('pagehide', cleanup);

  /**
   * Handle page restoration from back/forward cache
   * Invalidates cache and refreshes UI to ensure data consistency
   * @param {Event} event - pageshow event
   * @returns {void}
   */
  function handlePageShow(event) {
    // Check if page was restored from bfcache (back/forward cache)
    if (event.persisted) {
      // Invalidate cache to force reload from storage
      invalidateCache();
      
      // If already initialized, refresh the UI with fresh data
      if (window.__lethainTrackerInitialized && isMainPage()) {
        // Refresh UI after a short delay to ensure cache is cleared
        resourceManager.trackTimeout(() => {
          // Remove existing trackers to force recreation with fresh data
          const existingTrackers = document.querySelectorAll(CONFIG.selectors.tracker);
          for (let i = 0; i < existingTrackers.length; i++) {
            existingTrackers[i].remove();
          }
          
          // Re-inject UI with fresh data
          injectTrackingUIWrapper();
          applyFilter(pageState.getFilter(), getArticlesCache).catch((error) => {
            Logger.warn('Error applying filter after page restore:', error);
          });
        }, CONFIG.timeouts.init);
      }
    }
  }

  window.addEventListener('pageshow', handlePageShow);

  /**
   * Set page filter wrapper
   * @param {string} filter - Filter value
   * @returns {Promise<void>}
   */
  async function setPageFilter(filter) {
    await pageState.setFilter(filter);
    await applyFilter(pageState.getFilter(), getArticlesCache);
  }

  /**
   * Inject tracking UI wrapper
   * @returns {void}
   */
  function injectTrackingUIWrapper() {
    injectTrackingUI(pageState, resourceManager);
  }

  /**
   * Initialize page injection
   * @returns {Promise<void>}
   */
  async function init() {
    // Initialize page state
    await pageState.initialize();

    // Start periodic cleanup to prevent memory leaks
    resourceManager.startPeriodicCleanup();

    // Initial UI injection with delay
    resourceManager.trackTimeout(() => {
      injectTrackingUIWrapper();
      createFilterControl(pageState.getFilter(), setPageFilter);
      applyFilter(pageState.getFilter(), getArticlesCache).catch((error) => {
        Logger.warn('Error applying initial filter:', error);
      });
    }, CONFIG.timeouts.init);

    // Setup mutation observer
    const observer = createMutationObserver(pageState, resourceManager, injectTrackingUIWrapper, setPageFilter);
    resourceManager.trackObserver(observer);
    startObserving(observer);
  }

  /**
   * Check and initialize if on main page
   * @returns {void}
   */
  function checkAndInit() {
    if (!isMainPage()) {
      return;
    }

    if (window.__lethainTrackerInitialized) {
      return;
    }
    window.__lethainTrackerInitialized = true;
    
    init().catch((error) => {
      Logger.error('Error initializing page injector:', error);
    });
  }

  onDOMReady(() => {
    resourceManager.trackTimeout(checkAndInit, CONFIG.timeouts.initSecondary);
  });
})();
