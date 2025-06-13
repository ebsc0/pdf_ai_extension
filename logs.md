# PDF.js Chrome Extension - Development Log

## 2025-06-13

### Initial Setup
- Created logs.md file to track all development actions
- Project initialized as a Chrome extension for displaying PDFs using pdf.js
- Created README.md with project description, features, installation instructions, and architecture overview

### Chrome Extension Implementation
- Created manifest.json with Manifest V3 configuration
- Created background.js to intercept PDF requests and redirect to custom viewer
- Created viewer.html with simple PDF viewer interface
- Created viewer.js with PDF rendering logic using PDF.js library
- Created viewer.css with dark theme styling
- Downloaded PDF.js library files (v3.11.174) from CDN to lib/ directory

### Manifest V3 Migration
- Fixed "webRequestBlocking" permission error
- Migrated from webRequest API to declarativeNetRequest API
- Updated manifest.json permissions to use declarativeNetRequest
- Rewrote background.js to use webNavigation API for PDF detection
- Removed blocking webRequest listeners in favor of navigation-based interception

### Bug Fixes
- Fixed infinite refresh loop in PDF viewer
- Added check to prevent re-triggering navigation events on viewer.html itself
- Implemented tab tracking to prevent multiple redirects for the same PDF
- Added cleanup for tracked tabs when they're closed

### New Features
- Added resolution quality dropdown to PDF viewer
- Implemented 5 resolution options: Low (0.5x), Normal (1x), High (1.5x), Very High (2x), Ultra (3x)
- Resolution scaling improves PDF rendering quality while maintaining display size
- Higher resolutions provide sharper text and images for better readability
- Enabled PDF text selection functionality
- Added text layer rendering on top of canvas
- Implemented transparent text layer for native selection behavior
- Added CSS styling for text selection highlight

### Improvements
- Removed resolution dropdown selector from UI
- Set default resolution to Very High (2x) for better text quality
- Simplified user interface by removing resolution complexity
- Fixed text layer alignment to properly match rendered text
- Added --scale-factor CSS variable to text layer for proper text positioning

### Comment Feature Implementation
- Added comment pane on the right side with collapsible UI
- Implemented text selection highlighting functionality
- Users can select text and click "Add Comment" to start a comment thread
- Each highlighted text creates a unique comment chain
- Comment threads support replies for discussion
- Highlights are displayed with yellow background on the PDF
- Comments persist using Chrome storage API
- Clicking on highlights or comment threads navigates to the relevant page
- Comment pane shows highlighted text snippet and page number
- Full comment history with timestamps for each comment
- Fixed highlight displacement on zoom/resize by using percentage-based positioning
- Highlights now scale properly with page zoom maintaining position on text
- Adjusted comment pane width to 33.33% of screen (1/3) with min/max constraints

### Continuous Scroll Implementation
- Replaced single-page view with continuous vertical scroll
- Implemented virtual scrolling for performance with large PDFs
- Only renders visible pages plus buffer (3 pages before/after)
- Automatically loads/unloads pages as user scrolls
- Navigation buttons now smoothly scroll to pages
- Page indicator updates based on scroll position
- Comments and highlights work seamlessly with continuous scroll
- Zoom maintains scroll position proportionally
- Optimized memory usage by cleaning up off-screen pages