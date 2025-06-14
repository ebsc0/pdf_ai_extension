pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0;
const resolution = 2.0; // Default to Very High quality
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');

// Search functionality
let searchState = {
  query: '',
  phraseSearch: false,
  caseSensitive: false,
  highlightAll: false,
  findPrevious: false,
  matchCount: 0,
  currentMatch: 0,
  matches: []
};

// Sidebar state
let sidebarVisible = false;
let thumbnails = [];

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
  const zoomSelect = document.getElementById('zoom-select');
  const currentValue = Math.round(scale * 100) / 100;
  
  // Update dropdown to match current scale
  let found = false;
  for (let option of zoomSelect.options) {
    if (!isNaN(option.value) && parseFloat(option.value) === currentValue) {
      zoomSelect.value = option.value;
      found = true;
      break;
    }
  }
  
  if (!found) {
    // Add custom zoom level if not in presets
    const customOption = document.createElement('option');
    customOption.value = currentValue;
    customOption.text = Math.round(scale * 100) + '%';
    customOption.selected = true;
    zoomSelect.add(customOption);
  }
}

// Handle zoom dropdown
function onZoomSelectChange() {
  const zoomSelect = document.getElementById('zoom-select');
  const value = zoomSelect.value;
  
  switch (value) {
    case 'auto':
      autoZoom();
      break;
    case 'page-actual':
      scale = 1.0;
      break;
    case 'page-fit':
      fitPage();
      break;
    case 'page-width':
      fitPageWidth();
      break;
    default:
      scale = parseFloat(value);
  }
  
  queueRenderPage(pageNum);
}

function autoZoom() {
  // Implement auto zoom logic
  fitPageWidth();
}

function fitPage() {
  if (!pdfDoc) return;
  
  pdfDoc.getPage(pageNum).then(function(page) {
    const viewport = page.getViewport({ scale: 1 });
    const container = document.getElementById('canvas-container');
    const containerWidth = container.clientWidth - 40; // Padding
    const containerHeight = container.clientHeight - 40;
    
    const scaleWidth = containerWidth / viewport.width;
    const scaleHeight = containerHeight / viewport.height;
    scale = Math.min(scaleWidth, scaleHeight);
    
    queueRenderPage(pageNum);
  });
}

function fitPageWidth() {
  if (!pdfDoc) return;
  
  pdfDoc.getPage(pageNum).then(function(page) {
    const viewport = page.getViewport({ scale: 1 });
    const container = document.getElementById('canvas-container');
    const containerWidth = container.clientWidth - 40; // Padding
    
    scale = containerWidth / viewport.width;
    queueRenderPage(pageNum);
  });
}

document.getElementById('prev-page').addEventListener('click', onPrevPage);
document.getElementById('next-page').addEventListener('click', onNextPage);
document.getElementById('zoom-in').addEventListener('click', onZoomIn);
document.getElementById('zoom-out').addEventListener('click', onZoomOut);
document.getElementById('zoom-select').addEventListener('change', onZoomSelectChange);

// Search functionality
document.getElementById('search-button').addEventListener('click', toggleSearchBar);
document.getElementById('search-close').addEventListener('click', closeSearchBar);
document.getElementById('search-input').addEventListener('input', performSearch);
document.getElementById('search-prev').addEventListener('click', findPrevious);
document.getElementById('search-next').addEventListener('click', findNext);
document.getElementById('search-case-sensitive').addEventListener('change', performSearch);
document.getElementById('search-highlight-all').addEventListener('change', performSearch);

// Sidebar functionality
document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);

// Print functionality
document.getElementById('print-button').addEventListener('click', printDocument);

// Download functionality
document.getElementById('download-button').addEventListener('click', downloadDocument);

// Keyboard shortcuts
document.addEventListener('keydown', handleKeyboardShortcuts);

// Sidebar tabs
document.querySelectorAll('.sidebar-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    switchSidebarTab(this.dataset.tab);
  });
});

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
    hideCommentTooltip();
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

function saveComment() {
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
    
    // Save and update UI immediately
    saveComments();
    renderHighlights();
    renderCommentList();
    hideCommentDialog();
    
    // Process AI request after UI updates
    if (isAIRequest) {
      processAIComment(commentId, newComment, selectedText.text);
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
    
    // Save and update UI immediately
    saveComments();
    renderHighlights();
    renderCommentList();
    hideCommentDialog();
    
    // Process AI request after UI updates
    if (isAIRequest) {
      processAIComment(parentId, newComment, comments[parentId].highlightedText);
    }
  }
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
      <div class="thread-info">
        <div class="highlighted-text">"${thread.highlightedText.substring(0, 50)}..."</div>
        <div class="comment-meta">Page ${thread.pageNum}</div>
      </div>
      <button class="delete-thread-btn" data-thread-id="${thread.id}" title="Delete thread">×</button>
    `;
    header.querySelector('.thread-info').addEventListener('click', function() {
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
          <button class="delete-comment-btn" data-thread-id="${thread.id}" data-comment-id="${comment.id}">Delete</button>
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
  
  // Add delete comment button listeners
  document.querySelectorAll('.delete-comment-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const threadId = this.dataset.threadId;
      const commentId = this.dataset.commentId;
      deleteComment(threadId, commentId);
    });
  });
  
  // Add delete thread button listeners
  document.querySelectorAll('.delete-thread-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const threadId = this.dataset.threadId;
      deleteThread(threadId);
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

function deleteComment(threadId, commentId) {
  if (confirm('Are you sure you want to delete this comment?')) {
    const thread = comments[threadId];
    if (thread) {
      // Find and remove the comment
      const commentIndex = thread.comments.findIndex(c => c.id === commentId);
      if (commentIndex !== -1) {
        thread.comments.splice(commentIndex, 1);
        
        // If this was the last comment, delete the entire thread
        if (thread.comments.length === 0) {
          deleteThread(threadId);
        } else {
          // Save and re-render
          saveComments();
          renderCommentList();
        }
      }
    }
  }
}

function deleteThread(threadId) {
  if (confirm('Are you sure you want to delete this entire thread?')) {
    const thread = comments[threadId];
    if (thread) {
      // Remove the highlight from the page
      const highlight = document.getElementById(thread.highlightId);
      if (highlight) {
        highlight.remove();
      }
      
      // Delete the thread from comments
      delete comments[threadId];
      
      // Save and re-render
      saveComments();
      renderCommentList();
    }
  }
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
    updateActiveThumbnail();
  }, 500);
};

// Search Functions
function toggleSearchBar() {
  const searchBar = document.getElementById('search-bar');
  const isVisible = searchBar.style.display !== 'none';
  
  if (!isVisible) {
    searchBar.style.display = 'flex';
    document.getElementById('search-input').focus();
  } else {
    closeSearchBar();
  }
}

function closeSearchBar() {
  document.getElementById('search-bar').style.display = 'none';
  clearSearchHighlights();
  searchState.query = '';
  searchState.matches = [];
  updateSearchResults();
}

function performSearch() {
  const query = document.getElementById('search-input').value;
  const caseSensitive = document.getElementById('search-case-sensitive').checked;
  const highlightAll = document.getElementById('search-highlight-all').checked;
  
  if (!query) {
    clearSearchHighlights();
    updateSearchResults();
    return;
  }
  
  searchState.query = query;
  searchState.caseSensitive = caseSensitive;
  searchState.highlightAll = highlightAll;
  searchState.matches = [];
  searchState.currentMatch = 0;
  
  // Search in current page text
  searchInPage(pageNum);
}

function searchInPage(pageNumber) {
  if (!pdfDoc) return;
  
  pdfDoc.getPage(pageNumber).then(function(page) {
    page.getTextContent().then(function(textContent) {
      const textItems = textContent.items;
      const query = searchState.caseSensitive ? searchState.query : searchState.query.toLowerCase();
      
      clearSearchHighlights();
      searchState.matches = [];
      
      textItems.forEach((item, index) => {
        const text = searchState.caseSensitive ? item.str : item.str.toLowerCase();
        let pos = 0;
        
        while ((pos = text.indexOf(query, pos)) !== -1) {
          searchState.matches.push({
            pageNum: pageNumber,
            itemIndex: index,
            offset: pos,
            length: query.length
          });
          pos += query.length;
        }
      });
      
      if (searchState.matches.length > 0) {
        highlightSearchMatches();
      }
      
      updateSearchResults();
    });
  });
}

function highlightSearchMatches() {
  const textLayer = document.getElementById('text-layer');
  const textDivs = textLayer.querySelectorAll('span');
  
  searchState.matches.forEach((match, index) => {
    if (match.itemIndex < textDivs.length) {
      const textDiv = textDivs[match.itemIndex];
      const text = textDiv.textContent;
      
      // Create highlight span
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'highlight';
      if (index === searchState.currentMatch) {
        highlightSpan.className += ' selected';
      }
      
      // Wrap the matching text
      const before = text.substring(0, match.offset);
      const matchText = text.substring(match.offset, match.offset + match.length);
      const after = text.substring(match.offset + match.length);
      
      textDiv.innerHTML = '';
      textDiv.appendChild(document.createTextNode(before));
      textDiv.appendChild(highlightSpan);
      highlightSpan.appendChild(document.createTextNode(matchText));
      textDiv.appendChild(document.createTextNode(after));
    }
  });
}

function clearSearchHighlights() {
  const textLayer = document.getElementById('text-layer');
  const highlights = textLayer.querySelectorAll('.highlight');
  
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
    parent.normalize();
  });
}

function updateSearchResults() {
  const resultsSpan = document.getElementById('search-results');
  
  if (searchState.matches.length === 0) {
    resultsSpan.textContent = searchState.query ? 'No matches' : '';
  } else {
    resultsSpan.textContent = `${searchState.currentMatch + 1} of ${searchState.matches.length}`;
  }
}

function findNext() {
  if (searchState.matches.length === 0) return;
  
  searchState.currentMatch = (searchState.currentMatch + 1) % searchState.matches.length;
  highlightSearchMatches();
  updateSearchResults();
  
  // Scroll to current match
  const highlights = document.querySelectorAll('.highlight.selected');
  if (highlights.length > 0) {
    highlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function findPrevious() {
  if (searchState.matches.length === 0) return;
  
  searchState.currentMatch = (searchState.currentMatch - 1 + searchState.matches.length) % searchState.matches.length;
  highlightSearchMatches();
  updateSearchResults();
  
  // Scroll to current match
  const highlights = document.querySelectorAll('.highlight.selected');
  if (highlights.length > 0) {
    highlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Sidebar Functions
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebarVisible = !sidebarVisible;
  
  if (sidebarVisible) {
    sidebar.style.display = 'flex';
    generateThumbnails();
  } else {
    sidebar.style.display = 'none';
  }
}

function switchSidebarTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update panels
  document.getElementById('thumbnails-panel').style.display = tabName === 'thumbnails' ? 'block' : 'none';
  document.getElementById('outline-panel').style.display = tabName === 'outline' ? 'block' : 'none';
  
  if (tabName === 'outline') {
    loadOutline();
  }
}

function generateThumbnails() {
  if (!pdfDoc || thumbnails.length > 0) return;
  
  const panel = document.getElementById('thumbnails-panel');
  panel.innerHTML = '';
  
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    createThumbnail(i);
  }
}

function createThumbnail(pageNumber) {
  const thumbnailDiv = document.createElement('div');
  thumbnailDiv.className = 'thumbnail-item';
  if (pageNumber === pageNum) {
    thumbnailDiv.classList.add('active');
  }
  
  const thumbnailCanvas = document.createElement('canvas');
  thumbnailCanvas.className = 'thumbnail-canvas';
  
  const label = document.createElement('div');
  label.className = 'thumbnail-label';
  label.textContent = pageNumber;
  
  thumbnailDiv.appendChild(thumbnailCanvas);
  thumbnailDiv.appendChild(label);
  
  thumbnailDiv.addEventListener('click', function() {
    pageNum = pageNumber;
    queueRenderPage(pageNum);
    updateActiveThumbnail();
  });
  
  document.getElementById('thumbnails-panel').appendChild(thumbnailDiv);
  
  // Render thumbnail
  pdfDoc.getPage(pageNumber).then(function(page) {
    const viewport = page.getViewport({ scale: 0.2 });
    thumbnailCanvas.width = viewport.width;
    thumbnailCanvas.height = viewport.height;
    
    const context = thumbnailCanvas.getContext('2d');
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    page.render(renderContext);
  });
}

function updateActiveThumbnail() {
  document.querySelectorAll('.thumbnail-item').forEach((item, index) => {
    item.classList.toggle('active', index + 1 === pageNum);
  });
}

function loadOutline() {
  if (!pdfDoc) return;
  
  pdfDoc.getOutline().then(function(outline) {
    const panel = document.getElementById('outline-panel');
    panel.innerHTML = '';
    
    if (!outline) {
      panel.innerHTML = '<p style="color: #999; text-align: center;">No outline available</p>';
      return;
    }
    
    renderOutlineItem(outline, panel, 0);
  });
}

function renderOutlineItem(outline, container, level) {
  outline.forEach(item => {
    const div = document.createElement('div');
    div.className = 'outline-item';
    if (level > 0) {
      div.classList.add('nested');
      div.style.paddingLeft = (15 + level * 15) + 'px';
    }
    
    div.textContent = item.title;
    div.addEventListener('click', function() {
      if (item.dest) {
        // Navigate to destination
        pdfDoc.getPageIndex(item.dest[0]).then(function(pageIndex) {
          pageNum = pageIndex + 1;
          queueRenderPage(pageNum);
        });
      }
    });
    
    container.appendChild(div);
    
    if (item.items && item.items.length > 0) {
      renderOutlineItem(item.items, container, level + 1);
    }
  });
}

// Print functionality
function printDocument() {
  window.print();
}

// Download functionality
function downloadDocument() {
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileUrl.split('/').pop();
  link.click();
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
  // Ctrl/Cmd + F for search
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    toggleSearchBar();
  }
  
  // Escape to close search
  if (e.key === 'Escape') {
    const searchBar = document.getElementById('search-bar');
    if (searchBar.style.display !== 'none') {
      closeSearchBar();
    }
  }
  
  // Arrow keys for navigation
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    onPrevPage();
  } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
    onNextPage();
  }
  
  // Home/End for first/last page
  if (e.key === 'Home') {
    pageNum = 1;
    queueRenderPage(pageNum);
  } else if (e.key === 'End' && pdfDoc) {
    pageNum = pdfDoc.numPages;
    queueRenderPage(pageNum);
  }
  
  // + and - for zoom
  if (e.key === '+' || e.key === '=') {
    onZoomIn();
  } else if (e.key === '-' || e.key === '_') {
    onZoomOut();
  }
}

const urlParams = new URLSearchParams(window.location.search);
let fileUrl = urlParams.get('file');

if (fileUrl) {
  // Automatically upgrade HTTP to HTTPS to avoid mixed content issues
  if (fileUrl.startsWith('http://')) {
    console.warn('Upgrading HTTP URL to HTTPS:', fileUrl);
    fileUrl = fileUrl.replace('http://', 'https://');
  }
  
  // Configure PDF.js to handle CORS and mixed content
  const loadingTask = pdfjsLib.getDocument({
    url: fileUrl,
    withCredentials: false,
    isEvalSupported: false,
    disableAutoFetch: false
  });
  
  loadingTask.promise.then(function(pdfDoc_) {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
    initCommentSystem();
  }).catch(function(error) {
    console.error('Error loading PDF:', error);
    // If HTTPS fails, provide more helpful error message
    if (fileUrl.startsWith('https://') && error.message.includes('Failed to fetch')) {
      alert('Error loading PDF: The server may not support HTTPS. Please check if the PDF is accessible at: ' + fileUrl);
    } else {
      alert('Error loading PDF: ' + error.message);
    }
  });
}