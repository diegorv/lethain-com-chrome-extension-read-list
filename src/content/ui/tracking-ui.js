// Tracking UI creation and management

/**
 * Create checkbox element
 * @returns {HTMLInputElement} Checkbox element
 */
function createCheckbox() {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'lethain-checkbox';
  return checkbox;
}

/**
 * Create status icon element
 * @returns {HTMLElement} Status icon element
 */
function createStatusIcon() {
  const statusIcon = document.createElement('span');
  statusIcon.className = 'lethain-status-icon';
  return statusIcon;
}

/**
 * Create tooltip element
 * @returns {HTMLElement} Tooltip element
 */
function createTooltip() {
  const tooltip = document.createElement('span');
  tooltip.className = 'lethain-date-tooltip';
  
  // Add arrow to tooltip
  const arrow = document.createElement('div');
  arrow.className = 'lethain-tooltip-arrow';
  tooltip.appendChild(arrow);
  
  return tooltip;
}

/**
 * Create status container (icon + tooltip)
 * @returns {Object} Object with container, icon, and tooltip elements
 */
function createStatusContainer() {
  const statusContainer = document.createElement('span');
  statusContainer.className = 'lethain-status-container';
  
  const statusIcon = createStatusIcon();
  const tooltip = createTooltip();
  
  statusContainer.appendChild(statusIcon);
  statusContainer.appendChild(tooltip);
  
  return { container: statusContainer, icon: statusIcon, tooltip: tooltip };
}

/**
 * Show/hide tooltip
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {boolean} show - Whether to show or hide
 */
function toggleTooltip(tooltip, show) {
  tooltip.classList.toggle('show', show);
}

/**
 * Update link read/unread styles
 * @param {HTMLElement} link - Link element
 * @param {boolean} isRead - Whether article is read
 */
function updateLinkStyles(link, isRead) {
  if (link) {
    link.classList.toggle('lethain-link-read', isRead);
    link.classList.toggle('lethain-link-unread', !isRead);
  }
}

/**
 * Update status icon appearance
 * @param {HTMLElement} statusIcon - Status icon element
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {Object|null} article - Article object or null
 * @param {HTMLElement} link - Link element
 */
function updateStatusIcon(statusIcon, tooltip, article, link) {
  // Remove all state classes
  statusIcon.classList.remove('lethain-status-icon-read', 'lethain-status-icon-unread');
  tooltip.classList.remove('show');
  
  if (article && article.isRead) {
    statusIcon.textContent = '✓';
    statusIcon.classList.add('lethain-status-icon-read');
    const readDateFull = formatDateFull(article.readDate);
    statusIcon.title = `Read on ${readDateFull}`;
    tooltip.textContent = `Read on ${readDateFull}`;
    updateLinkStyles(link, true);
  } else {
    statusIcon.textContent = '○';
    statusIcon.classList.add('lethain-status-icon-unread');
    statusIcon.title = 'Unread';
    tooltip.textContent = '';
    updateLinkStyles(link, false);
  }
}

/**
 * Create handler for closing tooltip when clicking outside
 * @param {HTMLElement} statusContainer - Status container element
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {ResourceManager} resourceManager - Resource manager instance
 * @returns {Function} Close handler function
 */
function createTooltipCloseHandler(statusContainer, tooltip, resourceManager) {
  return function closeHandler(event) {
    if (!statusContainer.contains(event.target)) {
      toggleTooltip(tooltip, false);
      resourceManager.removeDocumentListener(closeHandler);
    }
  };
}

/**
 * Handle tooltip open action
 * @param {HTMLElement} statusContainer - Status container element
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {ResourceManager} resourceManager - Resource manager instance
 * @param {Function|null} previousHandler - Previous close handler to remove
 * @param {number|null} previousTimeout - Previous timeout ID to cancel
 * @returns {{handler: Function, timeout: number}} Object with handler and timeout ID
 */
function handleTooltipOpen(statusContainer, tooltip, resourceManager, previousHandler, previousTimeout) {
  // Optimize: Remove previous handler immediately if it exists
  if (previousHandler) {
    resourceManager.removeDocumentListener(previousHandler);
  }
  
  // Optimize: Cancel previous timeout immediately if it exists
  if (previousTimeout != null) {
    resourceManager.clearTimeout(previousTimeout);
  }
  
  // Create new close handler
  const closeHandler = createTooltipCloseHandler(statusContainer, tooltip, resourceManager);
  
  // Attach handler after delay to avoid immediate close
  const timeoutId = resourceManager.trackTimeout(() => {
    resourceManager.trackDocumentListener('click', closeHandler);
  }, CONFIG.timeouts.tooltipDelay);
  
  return { handler: closeHandler, timeout: timeoutId };
}

/**
 * Handle tooltip close action
 * @param {Function|null} closeHandler - Close handler to remove
 * @param {ResourceManager} resourceManager - Resource manager instance
 */
function handleTooltipClose(closeHandler, resourceManager) {
  if (closeHandler) {
    resourceManager.removeDocumentListener(closeHandler);
  }
}

/**
 * Attach tooltip event listeners
 * @param {HTMLElement} statusContainer - Status container element
 * @param {HTMLElement} statusIcon - Status icon element
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {ResourceManager} resourceManager - Resource manager instance
 */
function attachTooltipListeners(statusContainer, statusIcon, tooltip, resourceManager) {
  let closeTooltipHandler = null;
  let tooltipTimeout = null;
  
  statusIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = tooltip.classList.contains('show');
    toggleTooltip(tooltip, !isActive);
    
    if (!isActive) {
      // Opening tooltip - attach close handler
      const result = handleTooltipOpen(statusContainer, tooltip, resourceManager, closeTooltipHandler, tooltipTimeout);
      closeTooltipHandler = result.handler;
      tooltipTimeout = result.timeout;
    } else {
      // Closing tooltip - remove close handler and cancel timeout immediately
      handleTooltipClose(closeTooltipHandler, resourceManager);
      if (tooltipTimeout != null) {
        resourceManager.clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
      closeTooltipHandler = null;
    }
  }, { signal: resourceManager.getAbortSignal() });
  
  // Ensure handler is cleaned up when element is removed
  // This prevents memory leaks if the element is removed before cleanup
  const cleanupHandler = () => {
    handleTooltipClose(closeTooltipHandler, resourceManager);
    if (tooltipTimeout != null) {
      resourceManager.clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }
    closeTooltipHandler = null;
  };
  
  // Store cleanup function on element for potential manual cleanup
  if (statusContainer.dataset) {
    statusContainer.dataset.lethainCleanupTooltip = 'true';
  }
}

/**
 * Handle checkbox change - update article status
 * @param {string} url - Article URL
 * @param {boolean} isChecked - Whether checkbox is checked
 * @param {Object} pageStorage - PageStorage object
 * @param {Function} invalidateCache - Cache invalidation function
 * @returns {Promise<Object|null>} Updated article or null
 */
async function handleArticleStatusChange(url, isChecked, pageStorage, invalidateCache) {
  try {
    const updatedArticle = isChecked
      ? await pageStorage.markAsRead(url)
      : await pageStorage.markAsUnread(url);
    
    if (updatedArticle && typeof updateCacheArticle === 'function') {
      updateCacheArticle(url, updatedArticle);
    } else {
      invalidateCache();
    }
    
    return updatedArticle;
  } catch (error) {
    Logger.error('Error updating article status:', error);
    invalidateCache();
    return null;
  }
}

/**
 * Update UI after article status change
 * @param {HTMLInputElement} checkbox - Checkbox element
 * @param {HTMLElement} statusIcon - Status icon element
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {HTMLElement} link - Link element
 * @param {Object|null} updatedArticle - Updated article or null
 */
function updateUIAfterStatusChange(checkbox, statusIcon, tooltip, link, updatedArticle) {
  updateStatusIcon(statusIcon, tooltip, updatedArticle, link);
  if (updatedArticle) {
    checkbox.checked = updatedArticle.isRead;
  }
}

/**
 * Schedule filter application with debounce
 * @param {Function} applyFilter - Filter application function
 * @param {ResourceManager} resourceManager - Resource manager instance
 * @param {number|null} previousTimeout - Previous timeout ID to clear
 * @returns {number} New timeout ID
 */
function scheduleFilterApplication(applyFilter, resourceManager, previousTimeout) {
  if (previousTimeout != null) {
    resourceManager.clearTimeout(previousTimeout);
  }
  
  return resourceManager.trackTimeout(() => {
    applyFilter().catch((error) => {
      Logger.warn('Error applying filter:', error);
    });
  }, CONFIG.timeouts.filterDebounce);
}

/**
 * Attach checkbox event listeners
 * @param {HTMLInputElement} checkbox - Checkbox element
 * @param {string} url - Article URL
 * @param {HTMLElement} statusIcon - Status icon element
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {HTMLElement} articleElement - Article element
 * @param {HTMLElement} link - Link element
 * @param {Object} pageStorage - PageStorage object
 * @param {Function} invalidateCache - Cache invalidation function
 * @param {Function} applyFilter - Filter application function
 * @param {ResourceManager} resourceManager - Resource manager instance
 */
function attachCheckboxListeners(checkbox, url, statusIcon, tooltip, articleElement, link, pageStorage, invalidateCache, applyFilter, resourceManager) {
  let filterTimeout = null;
  
  checkbox.addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
    
    // Update article status
    const updatedArticle = await handleArticleStatusChange(url, isChecked, pageStorage, invalidateCache);
    
    // Update UI
    updateUIAfterStatusChange(checkbox, statusIcon, tooltip, link, updatedArticle);
    
    // Schedule filter application
    filterTimeout = scheduleFilterApplication(applyFilter, resourceManager, filterTimeout);
  }, { signal: resourceManager.getAbortSignal() });
}

/**
 * Create tracking UI for an article
 * @param {HTMLElement} articleElement - Article element
 * @param {string} url - Article URL
 * @param {Object} pageStorage - PageStorage object
 * @param {Function} getArticlesCache - Cache getter function
 * @param {Function} invalidateCache - Cache invalidation function
 * @param {Function} applyFilter - Filter application function
 * @param {ResourceManager} resourceManager - Resource manager instance
 */
function createTrackingUI(articleElement, url, pageStorage, getArticlesCache, invalidateCache, applyFilter, resourceManager) {
  if (articleElement.querySelector(CONFIG.selectors.tracker)) {
    return;
  }

  const trackerDiv = document.createElement('div');
  trackerDiv.className = 'lethain-tracker';

  const checkbox = createCheckbox();
  const { container: statusContainer, icon: statusIcon, tooltip: tooltip } = createStatusContainer();
  const link = extractLink(articleElement);

  attachTooltipListeners(statusContainer, statusIcon, tooltip, resourceManager);
  attachCheckboxListeners(checkbox, url, statusIcon, tooltip, articleElement, link, pageStorage, invalidateCache, applyFilter, resourceManager);

  trackerDiv.appendChild(checkbox);
  trackerDiv.appendChild(statusContainer);
  
  const timeSpan = articleElement.querySelector(CONFIG.selectors.timeSpan);
  if (timeSpan && timeSpan.parentElement) {
    timeSpan.parentElement.insertBefore(trackerDiv, timeSpan.nextSibling);
  } else {
    articleElement.appendChild(trackerDiv);
  }

  getArticlesCache().then(() => {
    const article = getArticleFromCache(url);
    updateStatusIcon(statusIcon, tooltip, article, link);
    checkbox.checked = article && article.isRead;
  }).catch((error) => {
    Logger.warn('Error loading article state from cache:', error);
  });
}


