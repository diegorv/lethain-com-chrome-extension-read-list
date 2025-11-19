// Service worker for Lethain Article Tracker
// Minimal service worker to enable console access for debugging

// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Lethain Tracker] Service worker installed');
});

// Log when service worker starts
console.log('[Lethain Tracker] Service worker active');

