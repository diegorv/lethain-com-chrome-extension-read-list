// Popup script to export/import data

document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const fileInput = document.getElementById('fileInput');
  const message = document.getElementById('message');
  const totalArticlesEl = document.getElementById('totalArticles');
  const readArticlesEl = document.getElementById('readArticles');
  const unreadArticlesEl = document.getElementById('unreadArticles');

  let statsTimeout = null;
  let messageTimeout = null;
  let articlesCache = null; // Cache to avoid duplicate getAllArticles() calls

  loadStats();

  exportBtn.addEventListener('click', () => {
    handleExport();
  });

  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImport(file);
    }
    e.target.value = '';
  });

  /**
   * Load and display statistics
   * @param {Array<Object>|null} articles - Optional articles array to use (avoids duplicate call)
   * @returns {Promise<void>}
   */
  async function loadStats(articles = null) {
    try {
      if (!articles) {
        articles = await Storage.getAllArticles();
        articlesCache = articles; // Cache for potential reuse
      }
      
      const total = articles.length;
      // Use loop instead of filter to avoid intermediate array
      let read = 0;
      for (let i = 0; i < articles.length; i++) {
        if (articles[i] && articles[i].isRead) {
          read++;
        }
      }
      const unread = total - read;

      totalArticlesEl.textContent = total;
      readArticlesEl.textContent = read;
      unreadArticlesEl.textContent = unread;
    } catch (error) {
      Logger.error('Error loading statistics:', error);
      showMessage('Error loading statistics', 'error');
    }
  }

  /**
   * Handle export action
   * @returns {Promise<void>}
   */
  async function handleExport() {
    try {
      // Reuse cached articles if available, otherwise fetch
      let articles = articlesCache;
      if (!articles) {
        articles = await Storage.getAllArticles();
        articlesCache = articles;
      }
      
      const exportData = createExportData(articles);
      const filename = `lethain-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      downloadJSON(exportData, filename);
      showMessage(`Data exported successfully! (${articles.length} articles)`, 'success');
      
      // Update stats using cached articles to avoid duplicate call
      if (statsTimeout) clearTimeout(statsTimeout);
      statsTimeout = setTimeout(() => {
        loadStats(articles);
        statsTimeout = null;
      }, CONFIG.timeouts.statsReload);
    } catch (error) {
      Logger.error('Error exporting data:', error);
      showMessage('Error exporting data: ' + error.message, 'error');
    }
  }

  /**
   * Handle import action
   * @param {File} file - File to import
   * @returns {Promise<void>}
   */
  async function handleImport(file) {
    try {
      showMessage('Importing data...', 'info');
      
      const { imported, updated, skipped } = await importDataFromFile(file);
      
      const summary = `Import completed! ${imported} new, ${updated} updated, ${skipped} skipped.`;
      showMessage(summary, 'success');
      
      // Invalidate cache after import
      articlesCache = null;
      
      if (statsTimeout) clearTimeout(statsTimeout);
      statsTimeout = setTimeout(() => {
        loadStats();
        statsTimeout = null;
      }, CONFIG.timeouts.statsReload);
    } catch (error) {
      Logger.error('Error importing data:', error);
      showMessage('Error importing data: ' + error.message, 'error');
    }
  }

  /**
   * Show message to user
   * @param {string} text - Message text
   * @param {string} type - Message type (info, success, error)
   * @returns {void}
   */
  function showMessage(text, type = 'info') {
    message.textContent = text;
    message.className = `message ${type}`;
    message.style.display = 'block';

    if (type !== 'error') {
      if (messageTimeout) clearTimeout(messageTimeout);
      messageTimeout = setTimeout(() => {
        message.style.display = 'none';
        messageTimeout = null;
      }, CONFIG.timeouts.messageHide);
    }
  }
});
