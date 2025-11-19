// Resource management for cleanup (timeouts, listeners, observers)

class ResourceManager {
  constructor() {
    this.timeouts = new Set();
    this.documentListeners = new Map(); // Map<handler, event> for easy removal
    this.observers = [];
    this.abortController = new AbortController();
    this.cleanupInterval = null;
    this.lastCleanupTime = Date.now();
  }

  /**
   * Create a tracked timeout
   * @param {Function} callback - Callback function
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timeout ID
   */
  trackTimeout(callback, delay) {
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      callback();
    }, delay);
    this.timeouts.add(id);
    return id;
  }

  /**
   * Clear a specific timeout
   * @param {number} id - Timeout ID
   * @returns {void}
   */
  clearTimeout(id) {
    if (id == null || typeof id !== 'number') {
      Logger.warn('ResourceManager.clearTimeout: Invalid timeout ID provided', id);
      return;
    }
    
    if (this.timeouts.has(id)) {
      clearTimeout(id);
      this.timeouts.delete(id);
    } else {
      // Timeout may have already executed and been removed
      // This is not an error, but we log it for debugging if needed
      Logger.debug('ResourceManager.clearTimeout: Timeout ID not found in tracked set', id);
    }
  }

  /**
   * Clear all tracked timeouts
   * @returns {void}
   */
  clearAllTimeouts() {
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts.clear();
  }

  /**
   * Track a document event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {void}
   */
  trackDocumentListener(event, handler) {
    document.addEventListener(event, handler);
    this.documentListeners.set(handler, event);
  }

  /**
   * Remove a tracked document listener
   * @param {Function} handler - Event handler to remove
   * @returns {void}
   */
  removeDocumentListener(handler) {
    if (this.documentListeners.has(handler)) {
      const event = this.documentListeners.get(handler);
      document.removeEventListener(event, handler);
      this.documentListeners.delete(handler);
    }
  }

  /**
   * Track a MutationObserver
   * @param {MutationObserver} observer - Observer to track
   * @returns {void}
   */
  trackObserver(observer) {
    this.observers.push(observer);
  }

  /**
   * Get abort signal for event listeners
   * @returns {AbortSignal} Abort signal
   */
  getAbortSignal() {
    return this.abortController.signal;
  }

  /**
   * Periodic cleanup of expired resources
   * Removes timeouts that have already executed but weren't cleaned up
   * @returns {void}
   */
  periodicCleanup() {
    const now = Date.now();
    // Only run periodic cleanup every 30 seconds to avoid overhead
    if (now - this.lastCleanupTime < 30000) {
      return;
    }
    this.lastCleanupTime = now;
    
    // Clean up any timeouts that may have been missed
    // (timeouts that executed but weren't properly removed from Set)
    // Note: We can't detect executed timeouts directly, but we can ensure
    // the Set doesn't grow unbounded by checking its size
    if (this.timeouts.size > 100) {
      // If we have more than 100 timeouts, something is wrong
      // Clear all and log a warning
      Logger.warn('ResourceManager: Excessive timeouts detected, clearing all');
      this.clearAllTimeouts();
    }
    
    // Clean up orphaned document listeners if any
    // (This is a safety measure, normally listeners should be properly removed)
    if (this.documentListeners.size > 50) {
      Logger.warn('ResourceManager: Excessive document listeners detected');
    }
  }

  /**
   * Start periodic cleanup
   * @returns {void}
   */
  startPeriodicCleanup() {
    if (this.cleanupInterval) {
      return; // Already started
    }
    
    // Run periodic cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.periodicCleanup();
    }, 30000);
  }

  /**
   * Stop periodic cleanup
   * @returns {void}
   */
  stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Cleanup all tracked resources
   * @returns {void}
   */
  cleanup() {
    // Stop periodic cleanup
    this.stopPeriodicCleanup();
    
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Clear all timeouts
    this.clearAllTimeouts();

    // Remove all document listeners
    this.documentListeners.forEach((event, handler) => {
      document.removeEventListener(event, handler);
    });
    this.documentListeners.clear();

    // Abort pending operations
    this.abortController.abort();
    
    // Create new AbortController for potential reuse
    this.abortController = new AbortController();
  }
}

