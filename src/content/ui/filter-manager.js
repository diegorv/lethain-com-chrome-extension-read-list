// Filter management for article list

/**
 * Find article container element
 * @returns {HTMLElement|null} Article container or null
 */
function findArticleContainer() {
  // Use cached findArticleElements to avoid repeated querySelector
  const articleElements = findArticleElements();
  const firstArticle = articleElements.length > 0 ? articleElements[0] : null;
  if (!firstArticle) return null;
  
  return firstArticle.closest(CONFIG.selectors.articleContainer) ||
         firstArticle.closest(CONFIG.selectors.articleSection) ||
         firstArticle.closest('section') || 
         firstArticle.closest(CONFIG.selectors.articleSectionFallback) ||
         firstArticle.parentElement;
}

/**
 * Create filter button
 * @param {Object} filter - Filter object with value and label
 * @param {string} currentFilter - Current active filter
 * @param {Function} setPageFilter - Function to set filter
 * @returns {HTMLButtonElement} Filter button element
 */
function createFilterButton(filter, currentFilter, setPageFilter) {
  const btn = document.createElement('button');
  btn.textContent = filter.label;
  btn.dataset.filter = filter.value;
  btn.className = 'lethain-filter-btn';
  
  if (currentFilter === filter.value) {
    btn.classList.add('active');
  }

  btn.addEventListener('click', () => {
    setPageFilter(filter.value);
    const buttons = document.querySelectorAll('.lethain-filter-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter.value);
    });
  });

  return btn;
}

/**
 * Create filter control UI
 * @param {string} currentFilter - Current active filter
 * @param {Function} setPageFilter - Function to set filter
 */
function createFilterControl(currentFilter, setPageFilter) {
  if (document.getElementById(CONFIG.selectors.filterControl.substring(1))) {
    return;
  }

  // Use cached findArticleElements to avoid repeated querySelector
  const articleElements = findArticleElements();
  const firstArticle = articleElements.length > 0 ? articleElements[0] : null;
  if (!firstArticle) {
    return;
  }

  const filterContainer = document.createElement('div');
  filterContainer.id = CONFIG.selectors.filterControl.substring(1);

  const filterButtons = document.createElement('div');
  filterButtons.className = 'lethain-filter-buttons';

  const filterLabel = document.createElement('span');
  filterLabel.textContent = 'Filter:';
  filterLabel.className = 'lethain-filter-label';

  const filters = [
    { value: CONFIG.filters.all, label: 'All' },
    { value: CONFIG.filters.unread, label: 'Unread' },
    { value: CONFIG.filters.read, label: 'Read' }
  ];

  filters.forEach(filter => {
    const btn = createFilterButton(filter, currentFilter, setPageFilter);
    filterButtons.appendChild(btn);
  });

  filterContainer.appendChild(filterLabel);
  filterContainer.appendChild(filterButtons);
  
  const relativeDiv = firstArticle.closest(CONFIG.selectors.articleContainer);
  
  if (relativeDiv) {
    const firstChildArticle = relativeDiv.querySelector(CONFIG.selectors.article);
    
    if (firstChildArticle) {
      relativeDiv.insertBefore(filterContainer, firstChildArticle);
    } else if (relativeDiv.firstChild) {
      relativeDiv.insertBefore(filterContainer, relativeDiv.firstChild);
    } else {
      relativeDiv.appendChild(filterContainer);
    }
  } else {
    const parent = firstArticle.parentElement;
    if (parent) {
      parent.insertBefore(filterContainer, firstArticle);
    }
  }
}

/**
 * Show all articles
 * @param {NodeList} articleElements - Article elements
 * @param {HTMLElement|null} articleContainer - Article container
 */
function showAllArticles(articleElements, articleContainer) {
  articleElements.forEach(el => el.classList.remove('lethain-article-hidden'));
  if (articleContainer && articleContainer.dataset.lethainOriginalWidth) {
    articleContainer.style.width = '';
    articleContainer.style.minWidth = '';
    delete articleContainer.dataset.lethainOriginalWidth;
  }
}

/**
 * Preserve container width
 * @param {HTMLElement|null} articleContainer - Article container
 */
function preserveContainerWidth(articleContainer) {
  if (articleContainer && !articleContainer.dataset.lethainOriginalWidth) {
    const computedStyle = window.getComputedStyle(articleContainer);
    const currentWidth = computedStyle.width;
    if (currentWidth && currentWidth !== 'auto') {
      articleContainer.dataset.lethainOriginalWidth = currentWidth;
      articleContainer.style.width = currentWidth;
      articleContainer.style.minWidth = currentWidth;
    }
  }
}

/**
 * Filter articles by read status
 * @param {NodeList} articleElements - Article elements
 * @param {Object} articles - Articles cache object
 * @param {string} currentFilter - Current filter value
 */
function filterByReadStatus(articleElements, articles, currentFilter) {
  // Early return if cache is empty or invalid
  if (!articles || typeof articles !== 'object' || Object.keys(articles).length === 0) {
    // If cache is empty, show all articles for safety
    Logger.debug('Filter: Cache is empty, showing all articles');
    return;
  }
  
  const filterRead = currentFilter === CONFIG.filters.read;
  const filterUnread = currentFilter === CONFIG.filters.unread;
  
  // Use traditional for loop for better performance
  for (let i = 0; i < articleElements.length; i++) {
    const articleEl = articleElements[i];
    const link = extractLink(articleEl);
    
    if (!link) {
      articleEl.classList.add('lethain-article-hidden');
      continue;
    }

    const url = link.href || link.getAttribute('href');
    if (!url || !validateUrl(url)) {
      articleEl.classList.add('lethain-article-hidden');
      continue;
    }

    const article = getArticleFromCache(url);
    const isRead = article?.isRead || false;
    
    // Determine if article should be shown based on filter
    let shouldShow = true;
    if (filterRead) {
      shouldShow = isRead;
    } else if (filterUnread) {
      shouldShow = !isRead;
    }

    articleEl.classList.toggle('lethain-article-hidden', !shouldShow);
  }
}

/**
 * Apply filter to article list
 * @param {string} currentFilter - Current filter value
 * @param {Function} getArticlesCache - Cache getter function
 */
async function applyFilter(currentFilter, getArticlesCache) {
  // Use cached findArticleElements to avoid repeated querySelectorAll
  const articleElements = findArticleElements();
  if (articleElements.length === 0) return;

  const articleContainer = findArticleContainer();

  if (currentFilter === CONFIG.filters.all) {
    showAllArticles(articleElements, articleContainer);
    return;
  }

  preserveContainerWidth(articleContainer);
  const articles = await getArticlesCache();
  filterByReadStatus(articleElements, articles, currentFilter);
}
