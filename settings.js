// Settings page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  setupEventListeners();
  updateUsageStats();
});

function setupEventListeners() {
  // Toggle API key visibility
  document.getElementById('toggle-visibility').addEventListener('click', function() {
    const apiKeyInput = document.getElementById('api-key');
    const toggleBtn = document.getElementById('toggle-visibility');
    
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleBtn.textContent = '🔒';
    } else {
      apiKeyInput.type = 'password';
      toggleBtn.textContent = '👁️';
    }
  });
  
  // Save settings
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  
  // Test connection
  document.getElementById('test-connection').addEventListener('click', testConnection);
  
  // Clear all data
  document.getElementById('clear-data').addEventListener('click', clearAllData);
}

function loadSettings() {
  chrome.storage.local.get(['geminiSettings'], function(result) {
    if (result.geminiSettings) {
      const settings = result.geminiSettings;
      
      if (settings.apiKey) {
        document.getElementById('api-key').value = settings.apiKey;
      }
      
      if (settings.model) {
        document.getElementById('model-select').value = settings.model;
      }
      
      if (settings.includeContext !== undefined) {
        document.getElementById('include-context').checked = settings.includeContext;
      }
      
      if (settings.includeThread !== undefined) {
        document.getElementById('include-thread').checked = settings.includeThread;
      }
    }
  });
}

function saveSettings() {
  const apiKey = document.getElementById('api-key').value.trim();
  const model = document.getElementById('model-select').value;
  const includeContext = document.getElementById('include-context').checked;
  const includeThread = document.getElementById('include-thread').checked;
  
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }
  
  const settings = {
    apiKey: apiKey,
    model: model,
    includeContext: includeContext,
    includeThread: includeThread
  };
  
  chrome.storage.local.set({ geminiSettings: settings }, function() {
    showStatus('Settings saved successfully!', 'success');
  });
}

async function testConnection() {
  const apiKey = document.getElementById('api-key').value.trim();
  const model = document.getElementById('model-select').value;
  
  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
    return;
  }
  
  showStatus('Testing connection...', 'info');
  
  try {
    // Send test request to background script
    const response = await chrome.runtime.sendMessage({
      action: 'testGeminiConnection',
      apiKey: apiKey,
      model: model
    });
    
    if (response.success) {
      showStatus('Connection successful! Model is ready.', 'success');
    } else {
      showStatus('Connection failed: ' + response.error, 'error');
    }
  } catch (error) {
    showStatus('Connection failed: ' + error.message, 'error');
  }
}

function clearAllData() {
  if (confirm('This will clear all settings and usage data. Continue?')) {
    chrome.storage.local.remove(['geminiSettings', 'geminiUsage'], function() {
      showStatus('All data cleared', 'success');
      document.getElementById('api-key').value = '';
      document.getElementById('model-select').value = 'gemini-2.0-flash-001';
      document.getElementById('include-context').checked = true;
      document.getElementById('include-thread').checked = false;
      updateUsageStats();
    });
  }
}

function updateUsageStats() {
  chrome.storage.local.get(['geminiUsage'], function(result) {
    const usage = result.geminiUsage || { today: 0, total: 0 };
    const today = new Date().toDateString();
    
    // Reset daily counter if it's a new day
    if (usage.lastDate !== today) {
      usage.today = 0;
      usage.lastDate = today;
    }
    
    document.getElementById('requests-today').textContent = usage.today || 0;
    document.getElementById('total-requests').textContent = usage.total || 0;
  });
}

function showStatus(message, type) {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.className = 'status-message ' + type;
  statusElement.style.display = 'block';
  
  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 5000);
}