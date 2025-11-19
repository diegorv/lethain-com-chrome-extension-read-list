// Mutation observer handling for dynamic content

/**
 * Check if mutation contains new article elements
 * @param {Array<MutationRecord>} mutations - Mutation records
 * @returns {boolean} True if new articles detected
 */
function hasNewArticles(mutations) {
  for (let i = 0; i < mutations.length; i++) {
    const mutation = mutations[i];
    const addedNodes = mutation.addedNodes;
    
    for (let j = 0; j < addedNodes.length; j++) {
      const node = addedNodes[j];
      if (node.nodeType === 1) { // Element node
        if (node.matches(CONFIG.selectors.article) || node.querySelector(CONFIG.selectors.article)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Handle filter control positioning after mutations
 * @param {Object} pageState - PageState instance
 * @param {Function} setPageFilter - Function to set page filter
 * @returns {void}
 */
function handleFilterControlPosition(pageState, setPageFilter) {
  const filterControl = document.getElementById(CONFIG.selectors.filterControl.substring(1));
  // Use cached findArticleElements to avoid repeated querySelector
  const articleElements = findArticleElements();
  const firstArticle = articleElements.length > 0 ? articleElements[0] : null;
  
  if (!filterControl && firstArticle) {
    // Create filter control if it doesn't exist
    createFilterControl(pageState.getFilter(), setPageFilter);
  } else if (filterControl && firstArticle) {
    // Reposition filter control if needed
    const articleContainer = findArticleContainer();
    if (articleContainer && !articleContainer.contains(filterControl)) {
      filterControl.remove();
      createFilterControl(pageState.getFilter(), setPageFilter);
    }
  }
}

/**
 * Create mutation observer handler
 * @param {Object} pageState - PageState instance
 * @param {ResourceManager} resourceManager - Resource manager instance
 * @param {Function} injectTrackingUI - Function to inject tracking UI
 * @param {Function} setPageFilter - Function to set page filter
 * @returns {MutationObserver} Configured mutation observer
 */
function createMutationObserver(pageState, resourceManager, injectTrackingUI, setPageFilter) {
  let mutationTimeout = null;
  let filterTimeout = null;
  
  const observer = new MutationObserver((mutations) => {
    if (!hasNewArticles(mutations)) {
      return;
    }

    // Clear previous timeouts
    if (mutationTimeout != null) {
      resourceManager.clearTimeout(mutationTimeout);
      mutationTimeout = null;
    }
    if (filterTimeout != null) {
      resourceManager.clearTimeout(filterTimeout);
      filterTimeout = null;
    }
    
    // Debounce mutation handling
    mutationTimeout = resourceManager.trackTimeout(() => {
      // Inject UI for new articles
      injectTrackingUI();
      
      // Handle filter control and apply filter after delay
      filterTimeout = resourceManager.trackTimeout(() => {
        handleFilterControlPosition(pageState, setPageFilter);
        applyFilter(pageState.getFilter(), getArticlesCache).catch((error) => {
          Logger.warn('Error applying filter:', error);
        });
        filterTimeout = null;
      }, CONFIG.timeouts.mutationFilterDelay);
      
      mutationTimeout = null;
    }, CONFIG.timeouts.mutationDebounce);
  });

  return observer;
}

/**
 * Start observing DOM mutations
 * @param {MutationObserver} observer - Mutation observer instance
 * @returns {void}
 */
function startObserving(observer) {
  const articleSection = document.querySelector(CONFIG.selectors.articleSection) || 
                          document.querySelector(CONFIG.selectors.articleSectionFallback);
  
  const targetNode = articleSection || document.body;
  // Optimize: Only use subtree if absolutely necessary (when target is body)
  // For article sections, childList is sufficient since articles are direct children
  const useSubtree = targetNode === document.body;
  
  observer.observe(targetNode, {
    childList: true,
    subtree: useSubtree
  });
}

