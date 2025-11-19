// Page state management for tracking UI

/**
 * Page state manager
 * Manages filter state and provides interface for state changes
 */
class PageState {
  constructor() {
    this.currentFilter = CONFIG.filters.all;
    this.isInitialized = false;
  }

  /**
   * Initialize page state by loading saved filter
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      this.currentFilter = await Storage.getPageFilter();
      this.isInitialized = true;
    } catch (error) {
      Logger.warn('Error loading filter:', error);
      this.currentFilter = CONFIG.filters.all;
      this.isInitialized = true;
    }
  }

  /**
   * Get current filter value
   * @returns {string} Current filter
   */
  getFilter() {
    return this.currentFilter;
  }

  /**
   * Set filter value and save to storage
   * @param {string} filter - Filter value
   * @returns {Promise<void>}
   */
  async setFilter(filter) {
    this.currentFilter = filter;
    try {
      await Storage.setPageFilter(filter);
    } catch (error) {
      Logger.warn('Error saving filter:', error);
    }
  }
}

