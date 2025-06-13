// Track tabs that are already being handled to prevent loops
const handledTabs = new Set();

// Handle PDF navigation by checking URLs
chrome.webNavigation.onBeforeNavigate.addListener(
  async function(details) {
    // Skip if this is our viewer or if we're already handling this tab
    if (details.frameId === 0 && 
        !details.url.includes(chrome.runtime.getURL('viewer.html')) &&
        !handledTabs.has(details.tabId) &&
        details.url.toLowerCase().endsWith('.pdf')) {
      
      handledTabs.add(details.tabId);
      const viewerUrl = chrome.runtime.getURL('viewer.html') + '?file=' + encodeURIComponent(details.url);
      
      await chrome.tabs.update(details.tabId, { url: viewerUrl });
      
      // Clear the tab from handled set after a delay
      setTimeout(() => handledTabs.delete(details.tabId), 1000);
    }
  }
);

// Clean up handled tabs when they're closed
chrome.tabs.onRemoved.addListener((tabId) => {
  handledTabs.delete(tabId);
});