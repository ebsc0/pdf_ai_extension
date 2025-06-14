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

// Import Gemini API module
importScripts('gemini-api.js');

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'testGeminiConnection') {
    handleTestConnection(request, sendResponse);
    return true; // Will respond asynchronously
  } else if (request.action === 'generateAIResponse') {
    handleGenerateResponse(request, sendResponse);
    return true; // Will respond asynchronously
  }
});

async function handleTestConnection(request, sendResponse) {
  try {
    const api = new GeminiAPI(request.apiKey, request.model);
    const result = await api.testConnection();
    sendResponse(result);
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGenerateResponse(request, sendResponse) {
  try {
    // Get settings
    const { geminiSettings } = await chrome.storage.local.get(['geminiSettings']);
    
    if (!geminiSettings || !geminiSettings.apiKey) {
      sendResponse({ success: false, error: 'API key not configured' });
      return;
    }
    
    console.log('Using Gemini settings:', {
      model: geminiSettings.model,
      includeContext: geminiSettings.includeContext,
      includeThread: geminiSettings.includeThread
    });
    
    const api = new GeminiAPI(geminiSettings.apiKey, geminiSettings.model);
    
    // Prepare options
    const options = {
      context: geminiSettings.includeContext ? request.context : null,
      threadHistory: geminiSettings.includeThread ? request.threadHistory : null
    };
    
    // Generate response
    const result = await api.generateContent(request.prompt, options);
    
    // Update usage statistics if successful
    if (result.success) {
      await updateUsageStats();
    }
    
    sendResponse(result);
  } catch (error) {
    console.error('Error in handleGenerateResponse:', error);
    sendResponse({ success: false, error: error.message || 'Unknown error occurred' });
  }
}

async function updateUsageStats() {
  const { geminiUsage } = await chrome.storage.local.get(['geminiUsage']);
  const usage = geminiUsage || { today: 0, total: 0, lastDate: new Date().toDateString() };
  const today = new Date().toDateString();
  
  // Reset daily counter if it's a new day
  if (usage.lastDate !== today) {
    usage.today = 0;
    usage.lastDate = today;
  }
  
  usage.today++;
  usage.total++;
  
  await chrome.storage.local.set({ geminiUsage: usage });
}