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

### Reverted to Single-Page View
- Removed continuous scroll implementation
- Restored original single-page PDF viewing
- Navigation uses Previous/Next buttons for page changes
- Maintained all comment and highlighting functionality
- Preserved text selection and zoom features

### Gemini AI Integration
- Added settings page for API key configuration and model selection
- Users can access settings via extension popup
- Implemented secure API key storage using Chrome storage
- Created Gemini API module for handling AI requests
- Added @gemini mention feature in comments
- AI responses appear as replies in comment threads
- Includes highlighted PDF text as context when enabled
- Option to include comment thread history for context
- Visual indicators for AI requests and responses
- Loading states and error handling for API calls
- Usage tracking with daily and total request counters
- Test connection feature to validate API key
- Special styling for AI-generated comments
- HTML rendering enabled for AI responses with sanitization
- Support for formatted text, lists, code blocks, tables, and links
- Safe HTML sanitization to prevent XSS attacks
- Enhanced styling for all HTML elements in AI responses

### HTML Rendering for AI Responses
- Implemented sanitizeHtml() function to safely process HTML from Gemini API
- Modified comment rendering to display HTML for AI responses while escaping regular comments
- Added comprehensive CSS styling for HTML elements in AI comments:
  - Headings (h1-h6) with proper sizing
  - Paragraphs with appropriate spacing
  - Lists (ordered and unordered) with proper indentation
  - Code blocks with background highlighting
  - Tables with borders and header styling
  - Links with blue color and hover effects
  - Text formatting (bold, italic, underline)
  - Blockquotes with left border styling
- Allowed safe HTML tags while removing dangerous elements (script, style, iframe, etc.)
- Removed event handlers and dangerous attributes for security
- Links automatically open in new tabs with security attributes

### Updated Gemini Model Selection
- Added latest Gemini 2.5 preview models to settings page:
  - Gemini 2.5 Pro (Preview 06-05) - Latest Pro preview
  - Gemini 2.5 Pro (Preview 05-06) - Pro preview version
  - Gemini 2.5 Flash (Preview 05-20) - Latest Flash preview
  - Gemini 2.5 Flash (Preview 04-17) - Flash preview version
  - Gemini 2.0 Flash (Experimental) - Stable experimental version
  - Gemini 1.5 Flash - Fast balanced model
  - Gemini 1.5 Flash-8B - Lightweight version
  - Gemini 1.5 Pro - Advanced capabilities
  - Gemini Pro - Original model
- Set Gemini 2.5 Flash (Preview 05-20) as default model
- Models arranged by version and release date

### Improved Comment Dialog UX
- Hide comment tooltip when "Add Comment" button is clicked
- Clear text selection after saving comment for better visual feedback
- Dialog already properly closes on save/cancel as implemented
- Fixed dialog remaining open during AI requests
- Dialog now closes immediately on save, AI processing happens asynchronously
- Better user experience with immediate visual feedback

### PDF.js Viewer Feature Integration
- Added search functionality with find bar:
  - Text search with case-sensitive option
  - Highlight all matches option
  - Previous/Next navigation through matches
  - Match counter display
  - Keyboard shortcut support (Ctrl/Cmd+F)
- Implemented page thumbnails sidebar:
  - Visual page previews
  - Click to navigate
  - Active page highlighting
  - Lazy loading for performance
- Added document outline/bookmarks sidebar:
  - Table of contents navigation
  - Nested outline support
  - Click to jump to sections
- Enhanced zoom controls:
  - Preset zoom levels dropdown
  - Automatic zoom, Page Fit, Page Width options
  - Standard zoom percentages (50% to 400%)
- Added keyboard shortcuts:
  - Arrow keys for page navigation
  - Page Up/Down for navigation
  - Home/End for first/last page
  - +/- for zoom control
  - Escape to close search
- Added toolbar buttons:
  - Search, Sidebar toggle, Print, Download
- Print and download functionality
- Improved UI with separators and better organization