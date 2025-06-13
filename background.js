chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    if (details.url.endsWith('.pdf')) {
      const viewerUrl = chrome.runtime.getURL('viewer.html') + '?file=' + encodeURIComponent(details.url);
      chrome.tabs.update(details.tabId, { url: viewerUrl });
      return { cancel: true };
    }
  },
  {
    urls: ['<all_urls>'],
    types: ['main_frame', 'sub_frame']
  },
  ['blocking', 'responseHeaders']
);

chrome.webNavigation.onBeforeNavigate.addListener(
  function(details) {
    if (details.url.endsWith('.pdf')) {
      const viewerUrl = chrome.runtime.getURL('viewer.html') + '?file=' + encodeURIComponent(details.url);
      chrome.tabs.update(details.tabId, { url: viewerUrl });
    }
  }
);