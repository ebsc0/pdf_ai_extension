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

function saveComment() {
  const commentText = document.getElementById('comment-input').value.trim();
  if (!commentText) return;
  
  const dialog = document.getElementById('comment-dialog');
  const parentId = dialog.dataset.parentId;
  const highlightId = dialog.dataset.highlightId;
  
  if (!parentId && selectedText) {
    // Create new comment thread with highlight
    const commentId = 'comment_' + Date.now();
    const highlight = createHighlight(selectedText);
    
    comments[commentId] = {
      id: commentId,
      highlightId: highlight.id,
      highlightedText: selectedText.text,
      pageNum: selectedText.pageNum,
      bounds: highlight.bounds,
      comments: [{
        id: 'reply_' + Date.now(),
        text: commentText,
        timestamp: new Date().toISOString()
      }]
    };
    
    window.getSelection().removeAllRanges();
    selectedText = null;
  } else if (parentId && comments[parentId]) {
    // Add reply to existing thread
    comments[parentId].comments.push({
      id: 'reply_' + Date.now(),
      text: commentText,
      timestamp: new Date().toISOString()
    });
  }
  
  saveComments();
  renderHighlights();
  renderCommentList();
  hideCommentDialog();
}

function createHighlight(selection) {
  const highlightId = 'highlight_' + Date.now();
  const container = document.getElementById('pdf-container');
  const containerRect = container.getBoundingClientRect();
  
  // Calculate bounds relative to PDF container
  const bounds = {
    left: selection.rect.left - containerRect.left,
    top: selection.rect.top - containerRect.top,
    width: selection.rect.width,
    height: selection.rect.height
  };
  
  return {
    id: highlightId,
    bounds: bounds
  };
}

function renderHighlights() {
  const highlightLayer = document.getElementById('highlight-layer');
  highlightLayer.innerHTML = '';
  
  Object.values(comments).forEach(thread => {
    if (thread.pageNum === pageNum) {
      const highlight = document.createElement('div');
      highlight.className = 'text-highlight';
      highlight.id = thread.highlightId;
      highlight.style.left = thread.bounds.left + 'px';
      highlight.style.top = thread.bounds.top + 'px';
      highlight.style.width = thread.bounds.width + 'px';
      highlight.style.height = thread.bounds.height + 'px';
      
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
      commentDiv.className = 'comment-item';
      commentDiv.innerHTML = `
        <div class="comment-meta">${new Date(comment.timestamp).toLocaleString()}</div>
        <div class="comment-text">${comment.text}</div>
        <div class="comment-actions">
          <button class="reply-btn" data-thread-id="${thread.id}">Reply</button>
        </div>
      `;
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