pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

let pdfDoc = null;
let scale = 1.0;
const resolution = 2.0; // Default to Very High quality
const PAGE_GAP = 10; // Gap between pages in pixels
const RENDER_RANGE = 3; // Number of pages to render before and after visible area

// Page rendering state
const pageStates = {};
const pageHeights = [];
let totalHeight = 0;
let currentPage = 1;

// Comment system
let comments = {};
let selectedText = null;
let activeHighlightId = null;

// Initialize viewer
async function initViewer() {
  const urlParams = new URLSearchParams(window.location.search);
  const fileUrl = urlParams.get('file');
  
  if (!fileUrl) {
    alert('No PDF file specified');
    return;
  }
  
  try {
    pdfDoc = await pdfjsLib.getDocument(fileUrl).promise;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    
    // Calculate page dimensions
    await calculatePageDimensions();
    
    // Set up scroll container
    setupScrollContainer();
    
    // Initial render
    updateVisiblePages();
    
    // Initialize comment system
    initCommentSystem();
    
    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Error loading PDF:', error);
    alert('Error loading PDF: ' + error.message);
  }
}

async function calculatePageDimensions() {
  pageHeights.length = 0;
  totalHeight = 0;
  
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: scale });
    const height = viewport.height / resolution;
    pageHeights.push(height);
    totalHeight += height + (i < pdfDoc.numPages ? PAGE_GAP : 0);
  }
}

function setupScrollContainer() {
  const scrollContainer = document.getElementById('scroll-container');
  scrollContainer.style.height = totalHeight + 'px';
  scrollContainer.style.position = 'relative';
  
  // Create placeholder divs for each page
  let currentTop = 0;
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pageContainer = document.createElement('div');
    pageContainer.id = `page-container-${i}`;
    pageContainer.className = 'page-container';
    pageContainer.style.position = 'absolute';
    pageContainer.style.top = currentTop + 'px';
    pageContainer.style.height = pageHeights[i - 1] + 'px';
    pageContainer.style.width = '100%';
    
    scrollContainer.appendChild(pageContainer);
    currentTop += pageHeights[i - 1] + PAGE_GAP;
  }
}

function updateVisiblePages() {
  const container = document.getElementById('canvas-container');
  const scrollTop = container.scrollTop;
  const containerHeight = container.clientHeight;
  
  // Find visible pages
  const visiblePages = [];
  let currentTop = 0;
  
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pageHeight = pageHeights[i - 1];
    const pageBottom = currentTop + pageHeight;
    
    // Check if page is in visible range (with buffer)
    if (pageBottom >= scrollTop - containerHeight && currentTop <= scrollTop + containerHeight * 2) {
      visiblePages.push(i);
    }
    
    // Update current page indicator
    if (currentTop <= scrollTop + containerHeight / 2 && pageBottom >= scrollTop + containerHeight / 2) {
      if (currentPage !== i) {
        currentPage = i;
        document.getElementById('page-num').textContent = i;
      }
    }
    
    currentTop += pageHeight + PAGE_GAP;
  }
  
  // Render visible pages and some buffer
  const pagesToRender = [];
  visiblePages.forEach(pageNum => {
    for (let j = Math.max(1, pageNum - RENDER_RANGE); j <= Math.min(pdfDoc.numPages, pageNum + RENDER_RANGE); j++) {
      if (!pagesToRender.includes(j)) {
        pagesToRender.push(j);
      }
    }
  });
  
  // Clean up pages that are far from view
  Object.keys(pageStates).forEach(pageNum => {
    if (!pagesToRender.includes(parseInt(pageNum))) {
      cleanupPage(parseInt(pageNum));
    }
  });
  
  // Render pages
  pagesToRender.forEach(pageNum => {
    if (!pageStates[pageNum] || pageStates[pageNum].scale !== scale) {
      renderPage(pageNum);
    }
  });
}

async function renderPage(pageNum) {
  if (pageStates[pageNum]?.rendering) return;
  
  const pageContainer = document.getElementById(`page-container-${pageNum}`);
  if (!pageContainer) return;
  
  // Mark as rendering
  if (!pageStates[pageNum]) {
    pageStates[pageNum] = {};
  }
  pageStates[pageNum].rendering = true;
  
  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: scale * resolution });
    
    // Create or get canvas
    let canvas = pageContainer.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      pageContainer.appendChild(canvas);
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = (viewport.width / resolution) + 'px';
    canvas.style.height = (viewport.height / resolution) + 'px';
    
    const ctx = canvas.getContext('2d');
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    
    // Render PDF page
    await page.render(renderContext).promise;
    
    // Create or update text layer
    let textLayer = pageContainer.querySelector('.text-layer');
    if (!textLayer) {
      textLayer = document.createElement('div');
      textLayer.className = 'text-layer';
      pageContainer.appendChild(textLayer);
    }
    
    textLayer.innerHTML = '';
    textLayer.style.width = canvas.style.width;
    textLayer.style.height = canvas.style.height;
    textLayer.style.setProperty('--scale-factor', scale);
    
    // Render text layer
    const textContent = await page.getTextContent();
    const textLayerViewport = page.getViewport({ scale: scale });
    
    pdfjsLib.renderTextLayer({
      textContent: textContent,
      container: textLayer,
      viewport: textLayerViewport,
      textDivs: []
    });
    
    // Create or update highlight layer
    let highlightLayer = pageContainer.querySelector('.highlight-layer');
    if (!highlightLayer) {
      highlightLayer = document.createElement('div');
      highlightLayer.className = 'highlight-layer';
      pageContainer.appendChild(highlightLayer);
    }
    
    highlightLayer.style.width = canvas.style.width;
    highlightLayer.style.height = canvas.style.height;
    
    // Update page state
    pageStates[pageNum] = {
      rendered: true,
      rendering: false,
      scale: scale
    };
    
    // Render highlights for this page
    renderHighlightsForPage(pageNum);
    
  } catch (error) {
    console.error(`Error rendering page ${pageNum}:`, error);
    pageStates[pageNum].rendering = false;
  }
}

function cleanupPage(pageNum) {
  const pageContainer = document.getElementById(`page-container-${pageNum}`);
  if (pageContainer) {
    pageContainer.innerHTML = '';
  }
  delete pageStates[pageNum];
}

function setupEventListeners() {
  const container = document.getElementById('canvas-container');
  
  // Scroll event with debouncing
  let scrollTimeout;
  container.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateVisiblePages, 100);
  });
  
  // Navigation buttons
  document.getElementById('prev-page').addEventListener('click', () => {
    scrollToPage(Math.max(1, currentPage - 1));
  });
  
  document.getElementById('next-page').addEventListener('click', () => {
    scrollToPage(Math.min(pdfDoc.numPages, currentPage + 1));
  });
  
  // Zoom controls
  document.getElementById('zoom-in').addEventListener('click', async () => {
    scale += 0.25;
    await handleZoomChange();
  });
  
  document.getElementById('zoom-out').addEventListener('click', async () => {
    if (scale <= 0.25) return;
    scale -= 0.25;
    await handleZoomChange();
  });
}

async function handleZoomChange() {
  document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
  
  // Save scroll position
  const container = document.getElementById('canvas-container');
  const scrollRatio = container.scrollTop / totalHeight;
  
  // Recalculate dimensions
  await calculatePageDimensions();
  setupScrollContainer();
  
  // Restore scroll position
  container.scrollTop = scrollRatio * totalHeight;
  
  // Re-render visible pages
  updateVisiblePages();
}

function scrollToPage(pageNum) {
  let targetTop = 0;
  for (let i = 1; i < pageNum; i++) {
    targetTop += pageHeights[i - 1] + PAGE_GAP;
  }
  
  document.getElementById('canvas-container').scrollTo({
    top: targetTop,
    behavior: 'smooth'
  });
}

// Comment system functions
function initCommentSystem() {
  const urlParams = new URLSearchParams(window.location.search);
  const fileUrl = urlParams.get('file');
  
  // Load comments from storage
  chrome.storage.local.get(['comments'], function(result) {
    if (result.comments && result.comments[fileUrl]) {
      comments = result.comments[fileUrl];
      renderAllHighlights();
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
  
  if (selectedString && e.target.closest('.text-layer')) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Find which page this selection is on
    const pageContainer = e.target.closest('.page-container');
    const pageNum = parseInt(pageContainer.id.replace('page-container-', ''));
    
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
  renderAllHighlights();
  renderCommentList();
  hideCommentDialog();
}

function createHighlight(selection) {
  const highlightId = 'highlight_' + Date.now();
  const pageContainer = document.getElementById(`page-container-${selection.pageNum}`);
  const canvas = pageContainer.querySelector('canvas');
  
  if (!canvas) return null;
  
  const containerRect = pageContainer.getBoundingClientRect();
  const canvasWidth = parseFloat(canvas.style.width);
  const canvasHeight = parseFloat(canvas.style.height);
  
  // Calculate bounds as percentages
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

function renderAllHighlights() {
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    if (pageStates[i]?.rendered) {
      renderHighlightsForPage(i);
    }
  }
}

function renderHighlightsForPage(pageNum) {
  const pageContainer = document.getElementById(`page-container-${pageNum}`);
  if (!pageContainer) return;
  
  const highlightLayer = pageContainer.querySelector('.highlight-layer');
  if (!highlightLayer) return;
  
  highlightLayer.innerHTML = '';
  
  Object.values(comments).forEach(thread => {
    if (thread.pageNum === pageNum) {
      const highlight = document.createElement('div');
      highlight.className = 'text-highlight';
      highlight.id = thread.highlightId;
      
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
  if (thread) {
    // Scroll to the page with the highlight
    scrollToPage(thread.pageNum);
    
    // Wait for scroll and render to complete
    setTimeout(() => {
      const highlight = document.getElementById(thread.highlightId);
      if (highlight) {
        highlight.classList.add('active');
      }
    }, 500);
  }
  
  // Scroll to comment in list
  const commentThread = document.querySelector(`[data-thread-id="${threadId}"]`);
  if (commentThread) {
    commentThread.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function saveComments() {
  const urlParams = new URLSearchParams(window.location.search);
  const fileUrl = urlParams.get('file');
  
  chrome.storage.local.get(['comments'], function(result) {
    const allComments = result.comments || {};
    allComments[fileUrl] = comments;
    chrome.storage.local.set({ comments: allComments });
  });
}

// Initialize viewer when DOM is ready
document.addEventListener('DOMContentLoaded', initViewer);