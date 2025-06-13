// Handle PDF navigation by checking URLs
chrome.webNavigation.onBeforeNavigate.addListener(
  async function(details) {
    if (details.frameId === 0 && details.url.toLowerCase().endsWith('.pdf')) {
      const viewerUrl = chrome.runtime.getURL('viewer.html') + '?file=' + encodeURIComponent(details.url);
      chrome.tabs.update(details.tabId, { url: viewerUrl });
    }
  }
);

// Handle PDF downloads and responses
chrome.webNavigation.onCommitted.addListener(
  async function(details) {
    if (details.frameId === 0 && details.url.toLowerCase().endsWith('.pdf')) {
      const viewerUrl = chrome.runtime.getURL('viewer.html') + '?file=' + encodeURIComponent(details.url);
      chrome.tabs.update(details.tabId, { url: viewerUrl });
    }
  }
);

// Intercept direct PDF file access via content type
chrome.webNavigation.onCompleted.addListener(
  async function(details) {
    if (details.frameId === 0) {
      try {
        // Check if the response is a PDF by examining headers
        const response = await fetch(details.url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/pdf')) {
          const viewerUrl = chrome.runtime.getURL('viewer.html') + '?file=' + encodeURIComponent(details.url);
          chrome.tabs.update(details.tabId, { url: viewerUrl });
        }
      } catch (error) {
        // Ignore errors for cross-origin requests
      }
    }
  },
  { url: [{ schemes: ['http', 'https'] }] }
);