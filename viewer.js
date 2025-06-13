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

const urlParams = new URLSearchParams(window.location.search);
const fileUrl = urlParams.get('file');

if (fileUrl) {
  pdfjsLib.getDocument(fileUrl).promise.then(function(pdfDoc_) {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
  }).catch(function(error) {
    console.error('Error loading PDF:', error);
    alert('Error loading PDF: ' + error.message);
  });
}