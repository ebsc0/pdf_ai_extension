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