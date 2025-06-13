// FILE: background.js
// This is the service worker. It runs in the background to handle tasks like
// redirecting PDFs, managing the context menu, and communicating with the Gemini API.

// --- PDF Redirection ---
// On installation, we set up a rule to redirect any direct navigation to a .pdf file
// to our custom viewer page, viewer.html.
chrome.runtime.onInstalled.addListener(() => {
  const RULE = {
    id: 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        // We construct the URL to our viewer, passing the original PDF URL as a parameter.
        transform: {
          scheme: "chrome-extension",
          path: "/viewer.html",
          queryTransform: {
            addOrReplaceParams: [
              {
                key: "pdf_url",
                value: "{url}",
              },
            ],
          },
        },
      },
    },
    condition: {
      // This rule applies to top-level navigation requests...
      resourceTypes: ["main_frame"],
      // ...for URLs ending in .pdf.
      urlFilter: ".pdf",
    },
  };

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE.id],
    addRules: [RULE],
  });

  // --- Context Menu Setup ---
  // Create a context menu item that appears when the user has selected text.
  chrome.contextMenus.create({
    id: "ask-gemini",
    title: "Ask Gemini about '%s'", // '%s' is a placeholder for the selected text
    contexts: ["selection"],
  });
});

// --- Gemini API Interaction ---
// Listen for when the user clicks our context menu item.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ask-gemini") {
    const selectedText = info.selectionText;
    // Send a message to the active viewer tab with the selected text.
    chrome.tabs.sendMessage(tab.id, {
      type: "ASK_GEMINI_CONTEXT",
      text: selectedText,
    });
  }
});

// Listen for messages from the viewer page (e.g., a user's question).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CALL_GEMINI_API") {
    // IMPORTANT: Replace with your actual Gemini API Key.
    // It's recommended to have users configure this in an options page for security.
    const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `Based on the following context from a PDF, answer the user's question.
          
          Context: "${request.context}"
          
          Question: "${request.question}"
          `;

    const payload = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    // We use fetch to call the Gemini API.
    fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.candidates && data.candidates.length > 0) {
          const text = data.candidates[0].content.parts[0].text;
          sendResponse({ success: true, text: text });
        } else {
          const errorMessage = data.error
            ? data.error.message
            : "No content received from Gemini.";
          sendResponse({ success: false, error: errorMessage });
        }
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: "Failed to fetch from Gemini API: " + error.message,
        });
      });

    // Return true to indicate that we will send a response asynchronously.
    return true;
  }
});
