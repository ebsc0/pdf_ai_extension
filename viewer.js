// FILE: viewer.js
// This script contains all the client-side logic for the viewer page.
// It loads the PDF, handles text selection, and manages the chat sidebar UI.

const pdfViewerContainer = document.getElementById("pdf-viewer-container");
const canvas = document.getElementById("pdf-canvas");
const context = canvas.getContext("2d");

const sidebar = document.getElementById("gemini-sidebar");
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendChatBtn = document.getElementById("send-chat-btn");
const closeSidebarBtn = document.getElementById("close-sidebar-btn");

let pdfDoc = null;
let currentConversation = [];
let currentContext = "";

// Function to load and render the PDF
async function renderPDF(url) {
  try {
    const loadingTask = pdfjsLib.getDocument({ url });
    pdfDoc = await loadingTask.promise;
    renderPage(1); // Render the first page initially
  } catch (error) {
    console.error("Error loading PDF:", error);
    pdfViewerContainer.textContent =
      "Failed to load PDF. Please check the URL and that the server allows cross-origin requests.";
  }
}

// Function to render a specific page
async function renderPage(pageNum) {
  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext).promise;
  } catch (e) {
    console.error("Error rendering page", e);
  }
}

// --- Sidebar and Chat Logic ---

function showSidebar() {
  sidebar.classList.remove("hidden");
}

function hideSidebar() {
  sidebar.classList.add("hidden");
}

function addMessageToChat(message, sender, contextText = null) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("chat-message", `${sender}-message`);

  // If there's context, add a special block for it.
  if (contextText) {
    const contextElement = document.createElement("div");
    contextElement.classList.add("context-highlight");
    contextElement.textContent = `"${contextText}"`;
    messageElement.appendChild(contextElement);
  }

  // Create a container for the main message content
  const messageContent = document.createElement("div");

  if (sender === "gemini") {
    // Basic markdown parsing for bold and lists
    let html = message.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/^\* (.*$)/gm, "<ul><li>$1</li></ul>");
    html = html.replace(/<\/ul>\n<ul>/g, ""); // Join adjacent lists
    messageContent.innerHTML = html;
  } else {
    messageContent.textContent = message;
  }

  messageElement.appendChild(messageContent);
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight; // Auto-scroll to bottom
}

// Function to call the background script's Gemini API handler
function callGeminiAPI(context, question) {
  addMessageToChat("Thinking...", "gemini");
  sendChatBtn.disabled = true;
  sendChatBtn.textContent = "Thinking...";

  chrome.runtime.sendMessage(
    {
      type: "CALL_GEMINI_API",
      context: context,
      question: question,
    },
    (response) => {
      // Remove "Thinking..." message
      chatContainer.removeChild(chatContainer.lastChild);

      if (response && response.success) {
        currentConversation.push({
          role: "model",
          parts: [{ text: response.text }],
        });
        addMessageToChat(response.text, "gemini");
      } else {
        const errorMsg = response ? response.error : "Unknown error occurred.";
        addMessageToChat(`Error: ${errorMsg}`, "gemini");
      }
      sendChatBtn.disabled = false;
      sendChatBtn.textContent = "Send";
    }
  );
}

// --- Event Listeners ---

// Listen for messages from the background script (from context menu)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ASK_GEMINI_CONTEXT") {
    currentContext = request.text;
    const question = "Can you please summarize this?"; // Default question

    currentConversation = [
      {
        role: "user",
        parts: [
          { text: `Context: "${currentContext}"\nQuestion: ${question}` },
        ],
      },
    ];

    chatContainer.innerHTML = ""; // Clear previous chat
    showSidebar();
    addMessageToChat(question, "user", currentContext);

    callGeminiAPI(currentContext, question);
  }
});

sendChatBtn.addEventListener("click", () => {
  const question = chatInput.value.trim();
  if (!question) return;

  addMessageToChat(question, "user");
  chatInput.value = "";

  callGeminiAPI(currentContext, question);
});

closeSidebarBtn.addEventListener("click", hideSidebar);

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  // Get the PDF URL from the query parameter.
  const urlParams = new URLSearchParams(window.location.search);
  const pdfUrl = urlParams.get("pdf_url");

  if (pdfUrl) {
    renderPDF(decodeURIComponent(pdfUrl));
  } else {
    pdfViewerContainer.textContent = "No PDF URL provided.";
  }
});
