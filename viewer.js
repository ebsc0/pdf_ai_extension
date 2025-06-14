pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0;
const resolution = 2.0; // Default to Very High quality
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');

function renderPage(num) {
  pageRendering = true;
  pdfDoc.getPage(num).then(function(page) {
    const viewport = page.getViewport({ scale: scale * resolution });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = (viewport.width / resolution) + 'px';
    canvas.style.height = (viewport.height / resolution) + 'px';

    // Clear existing text layer
    const textLayerDiv = document.getElementById('text-layer');
    textLayerDiv.innerHTML = '';
    textLayerDiv.style.width = canvas.style.width;
    textLayerDiv.style.height = canvas.style.height;
    
    // Set the --scale-factor CSS variable for proper text alignment
    textLayerDiv.style.setProperty('--scale-factor', scale);
    
    // Clear and update highlight layer dimensions
    const highlightLayer = document.getElementById('highlight-layer');
    highlightLayer.style.width = canvas.style.width;
    highlightLayer.style.height = canvas.style.height;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    const renderTask = page.render(renderContext);

    renderTask.promise.then(function() {
      // Render text layer
      return page.getTextContent();
    }).then(function(textContent) {
      const textLayerViewport = page.getViewport({ scale: scale });
      
      // Create text layer
      pdfjsLib.renderTextLayer({
        textContent: textContent,
        container: textLayerDiv,
        viewport: textLayerViewport,
        textDivs: []
      });

      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });

  document.getElementById('page-num').textContent = num;
}

function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}

function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}

function onZoomIn() {
  scale += 0.25;
  updateZoomLevel();
  queueRenderPage(pageNum);
}

function onZoomOut() {
  if (scale <= 0.25) return;
  scale -= 0.25;
  updateZoomLevel();
  queueRenderPage(pageNum);
}

function updateZoomLevel() {
  document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
}

document.getElementById('prev-page').addEventListener('click', onPrevPage);
document.getElementById('next-page').addEventListener('click', onNextPage);
document.getElementById('zoom-in').addEventListener('click', onZoomIn);
document.getElementById('zoom-out').addEventListener('click', onZoomOut);

// Comment system
let comments = {};
let selectedText = null;
let activeHighlightId = null;

// Initialize comment system
function initCommentSystem() {
  // Load comments from storage
  chrome.storage.local.get(['comments'], function(result) {
    if (result.comments && result.comments[fileUrl]) {
      comments = result.comments[fileUrl];
      renderHighlights();
      renderCommentList();
    }
  });

  // Toggle comment pane
  document.getElementById('toggle-comments').addEventListener('click', function() {
    document.getElementById('comment-pane').classList.toggle('collapsed');
  });

  // Add comment button
  document.getElementById('add-comment-btn').addEventListener('click', function() {
    showCommentDialog();
  });

  // Comment dialog buttons
  document.getElementById('comment-save').addEventListener('click', saveComment);
  document.getElementById('comment-cancel').addEventListener('click', hideCommentDialog);

  // Handle text selection
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('selectionchange', handleSelectionChange);
}

function handleTextSelection(e) {
  const selection = window.getSelection();
  const selectedString = selection.toString().trim();
  
  if (selectedString && e.target.closest('#text-layer')) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    selectedText = {
      text: selectedString,
      range: range,
      rect: rect,
      pageNum: pageNum
    };
    
    showCommentTooltip(rect);
  } else {
    hideCommentTooltip();
  }
}

function handleSelectionChange() {
  const selection = window.getSelection();
  if (!selection.toString().trim()) {
    hideCommentTooltip();
  }
}

function showCommentTooltip(rect) {
  const tooltip = document.getElementById('comment-tooltip');
  tooltip.style.display = 'block';
  tooltip.style.left = (rect.right + 10) + 'px';
  tooltip.style.top = rect.top + 'px';
}

function hideCommentTooltip() {
  document.getElementById('comment-tooltip').style.display = 'none';
}

function showCommentDialog(parentId = null) {
  const dialog = document.getElementById('comment-dialog');
  dialog.style.display = 'block';
  document.getElementById('comment-input').value = '';
  document.getElementById('comment-input').focus();
  
  // Store parent ID for replies
  dialog.dataset.parentId = parentId || '';
  dialog.dataset.highlightId = activeHighlightId || '';
}

function hideCommentDialog() {
  document.getElementById('comment-dialog').style.display = 'none';
  document.getElementById('comment-input').value = '';
  hideCommentTooltip();
}

async function saveComment() {
  const commentText = document.getElementById('comment-input').value.trim();
  if (!commentText) return;
  
  const dialog = document.getElementById('comment-dialog');
  const parentId = dialog.dataset.parentId;
  const highlightId = dialog.dataset.highlightId;
  
  // Check if this is an AI request
  const isAIRequest = commentText.toLowerCase().startsWith('@gemini');
  
  if (!parentId && selectedText) {
    // Create new comment thread with highlight
    const commentId = 'comment_' + Date.now();
    const highlight = createHighlight(selectedText);
    
    const newComment = {
      id: 'reply_' + Date.now(),
      text: commentText,
      timestamp: new Date().toISOString(),
      isAIRequest: isAIRequest
    };
    
    comments[commentId] = {
      id: commentId,
      highlightId: highlight.id,
      highlightedText: selectedText.text,
      pageNum: selectedText.pageNum,
      bounds: highlight.bounds,
      comments: [newComment]
    };
    
    window.getSelection().removeAllRanges();
    
    // Process AI request if needed
    if (isAIRequest) {
      await processAIComment(commentId, newComment, selectedText.text);
    }
    
    selectedText = null;
  } else if (parentId && comments[parentId]) {
    // Add reply to existing thread
    const newComment = {
      id: 'reply_' + Date.now(),
      text: commentText,
      timestamp: new Date().toISOString(),
      isAIRequest: isAIRequest
    };
    
    comments[parentId].comments.push(newComment);
    
    // Process AI request if needed
    if (isAIRequest) {
      await processAIComment(parentId, newComment, comments[parentId].highlightedText);
    }
  }
  
  saveComments();
  renderHighlights();
  renderCommentList();
  hideCommentDialog();
}

async function processAIComment(threadId, comment, context) {
  // Extract prompt from @gemini mention
  const prompt = comment.text.replace(/^@gemini\s*/i, '').trim();
  
  if (!prompt) {
    addAIResponse(threadId, 'Please provide a question after @gemini');
    return;
  }
  
  // Update comment to show pending state
  comment.aiStatus = 'pending';
  renderCommentList();
  
  try {
    // Get thread history
    const threadHistory = comments[threadId].comments
      .filter(c => !c.isAIRequest && c.id !== comment.id)
      .map(c => ({ text: c.text, timestamp: new Date(c.timestamp).toLocaleString() }));
    
    // Send request to background script
    const response = await chrome.runtime.sendMessage({
      action: 'generateAIResponse',
      prompt: prompt,
      context: context,
      threadHistory: threadHistory
    });
    
    if (response.success) {
      addAIResponse(threadId, response.content);
      comment.aiStatus = 'completed';
    } else {
      addAIResponse(threadId, `Error: ${response.error}`, true);
      comment.aiStatus = 'error';
    }
  } catch (error) {
    addAIResponse(threadId, `Error: ${error.message}`, true);
    comment.aiStatus = 'error';
  }
  
  saveComments();
  renderCommentList();
}

function addAIResponse(threadId, responseText, isError = false) {
  if (!comments[threadId]) return;
  
  comments[threadId].comments.push({
    id: 'ai_reply_' + Date.now(),
    text: responseText,
    timestamp: new Date().toISOString(),
    isAIResponse: true,
    isError: isError
  });
}

function createHighlight(selection) {
  const highlightId = 'highlight_' + Date.now();
  const container = document.getElementById('pdf-container');
  const containerRect = container.getBoundingClientRect();
  const canvasWidth = parseFloat(canvas.style.width);
  const canvasHeight = parseFloat(canvas.style.height);
  
  // Calculate bounds as percentages of canvas size for scale-independent positioning
  const bounds = {
    left: ((selection.rect.left - containerRect.left) / canvasWidth) * 100,
    top: ((selection.rect.top - containerRect.top) / canvasHeight) * 100,
    width: (selection.rect.width / canvasWidth) * 100,
    height: (selection.rect.height / canvasHeight) * 100
  };
  
  return {
    id: highlightId,
    bounds: bounds
  };
}

function renderHighlights() {
  const highlightLayer = document.getElementById('highlight-layer');
  highlightLayer.innerHTML = '';
  
  // Set highlight layer dimensions to match canvas
  highlightLayer.style.width = canvas.style.width;
  highlightLayer.style.height = canvas.style.height;
  
  const canvasWidth = parseFloat(canvas.style.width);
  const canvasHeight = parseFloat(canvas.style.height);
  
  Object.values(comments).forEach(thread => {
    if (thread.pageNum === pageNum) {
      const highlight = document.createElement('div');
      highlight.className = 'text-highlight';
      highlight.id = thread.highlightId;
      
      // Apply percentage-based positioning that scales with canvas
      highlight.style.left = thread.bounds.left + '%';
      highlight.style.top = thread.bounds.top + '%';
      highlight.style.width = thread.bounds.width + '%';
      highlight.style.height = thread.bounds.height + '%';
      
      highlight.addEventListener('click', function() {
        setActiveHighlight(thread.id);
      });
      
      highlightLayer.appendChild(highlight);
    }
  });
}

function renderCommentList() {
  const commentList = document.getElementById('comment-list');
  commentList.innerHTML = '';
  
  Object.values(comments).forEach(thread => {
    const threadDiv = document.createElement('div');
    threadDiv.className = 'comment-thread';
    threadDiv.dataset.threadId = thread.id;
    
    const header = document.createElement('div');
    header.className = 'comment-thread-header';
    header.innerHTML = `
      <div class="highlighted-text">"${thread.highlightedText.substring(0, 50)}..."</div>
      <div class="comment-meta">Page ${thread.pageNum}</div>
    `;
    header.addEventListener('click', function() {
      setActiveHighlight(thread.id);
    });
    
    const commentsContainer = document.createElement('div');
    thread.comments.forEach(comment => {
      const commentDiv = document.createElement('div');
      
      // Add appropriate classes based on comment type
      let className = 'comment-item';
      if (comment.isAIResponse) {
        className += ' ai-response';
      }
      if (comment.isAIRequest) {
        className += ' ai-request';
      }
      if (comment.isError) {
        className += ' ai-error';
      }
      commentDiv.className = className;
      
      // Build comment HTML
      let metaText = new Date(comment.timestamp).toLocaleString();
      if (comment.isAIResponse) {
        metaText = '🤖 Gemini • ' + metaText;
      }
      if (comment.aiStatus === 'pending') {
        metaText += ' • Generating response...';
      }
      
      // Render HTML for AI responses, escape for regular comments
      const commentText = comment.isAIResponse ? sanitizeHtml(comment.text) : escapeHtml(comment.text);
      
      commentDiv.innerHTML = `
        <div class="comment-meta">${metaText}</div>
        <div class="comment-text">${commentText}</div>
        <div class="comment-actions">
          ${!comment.isAIResponse ? `<button class="reply-btn" data-thread-id="${thread.id}">Reply</button>` : ''}
        </div>
      `;
      
      // Add loading spinner for pending AI requests
      if (comment.aiStatus === 'pending') {
        const spinner = document.createElement('div');
        spinner.className = 'ai-loading';
        spinner.innerHTML = '<div class="spinner"></div>';
        commentDiv.appendChild(spinner);
      }
      
      commentsContainer.appendChild(commentDiv);
    });
    
    threadDiv.appendChild(header);
    threadDiv.appendChild(commentsContainer);
    commentList.appendChild(threadDiv);
  });
  
  // Add reply button listeners
  document.querySelectorAll('.reply-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const threadId = this.dataset.threadId;
      activeHighlightId = comments[threadId].highlightId;
      showCommentDialog(threadId);
    });
  });
}

function setActiveHighlight(threadId) {
  // Remove previous active highlight
  document.querySelectorAll('.text-highlight').forEach(h => h.classList.remove('active'));
  
  const thread = comments[threadId];
  if (thread && thread.pageNum === pageNum) {
    const highlight = document.getElementById(thread.highlightId);
    if (highlight) {
      highlight.classList.add('active');
      highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } else if (thread && thread.pageNum !== pageNum) {
    // Navigate to the page with the highlight
    pageNum = thread.pageNum;
    queueRenderPage(pageNum);
  }
  
  // Scroll to comment in list
  const commentThread = document.querySelector(`[data-thread-id="${threadId}"]`);
  if (commentThread) {
    commentThread.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function saveComments() {
  chrome.storage.local.get(['comments'], function(result) {
    const allComments = result.comments || {};
    allComments[fileUrl] = comments;
    chrome.storage.local.set({ comments: allComments });
  });
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Sanitize HTML for AI responses (allow safe tags)
function sanitizeHtml(html) {
  // Create a temporary container
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Define allowed tags
  const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'code', 'pre', 
                      'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                      'a', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody'];
  
  // Define allowed attributes
  const allowedAttributes = {
    'a': ['href', 'target', 'rel'],
    'code': ['class'],
    'pre': ['class'],
    'span': ['class'],
    'div': ['class']
  };
  
  // Recursively clean nodes
  function cleanNode(node) {
    // Remove script and style tags entirely
    const dangerousTags = node.querySelectorAll('script, style, iframe, object, embed, form');
    dangerousTags.forEach(tag => tag.remove());
    
    // Process all elements
    const allElements = node.getElementsByTagName('*');
    for (let i = allElements.length - 1; i >= 0; i--) {
      const element = allElements[i];
      const tagName = element.tagName.toLowerCase();
      
      // Remove if not in allowed tags
      if (!allowedTags.includes(tagName)) {
        // Keep the text content but remove the tag
        const parent = element.parentNode;
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
        continue;
      }
      
      // Remove dangerous attributes
      const attributes = Array.from(element.attributes);
      attributes.forEach(attr => {
        const attrName = attr.name.toLowerCase();
        
        // Remove event handlers and dangerous attributes
        if (attrName.startsWith('on') || attrName === 'style') {
          element.removeAttribute(attr.name);
          return;
        }
        
        // Check if attribute is allowed for this tag
        const allowedAttrs = allowedAttributes[tagName] || [];
        if (!allowedAttrs.includes(attrName)) {
          element.removeAttribute(attr.name);
        }
      });
      
      // Special handling for links
      if (tagName === 'a') {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }
  }
  
  cleanNode(temp);
  return temp.innerHTML;
}

// Update renderPage to also render highlights
const originalRenderPage = renderPage;
renderPage = function(num) {
  originalRenderPage(num);
  // Render highlights after page is rendered
  setTimeout(() => {
    renderHighlights();
  }, 500);
};

const urlParams = new URLSearchParams(window.location.search);
const fileUrl = urlParams.get('file');

if (fileUrl) {
  pdfjsLib.getDocument(fileUrl).promise.then(function(pdfDoc_) {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
    initCommentSystem();
  }).catch(function(error) {
    console.error('Error loading PDF:', error);
    alert('Error loading PDF: ' + error.message);
  });
}