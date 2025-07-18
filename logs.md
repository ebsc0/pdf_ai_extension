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

### Extension Rebranding
- Renamed extension from "PDF.js Viewer" to "PDF AI"
- Updated description to "View PDF files using AI"
- Added icon.png as extension icon in all sizes (16, 48, 128)
- Updated all page titles to reflect new branding
- Rewrote README.md with comprehensive feature documentation
- Emphasized AI capabilities in description and documentation

### Delete Comment Feature
- Added delete functionality for individual comments and entire threads
- Individual comment deletion:
  - Delete button added to each comment
  - Confirmation dialog before deletion
  - If last comment in thread is deleted, entire thread is removed
  - Updates storage and re-renders comment list
- Thread deletion:
  - Delete button (×) added to comment thread headers
  - Deletes all comments in the thread
  - Removes highlight from PDF page
  - Confirmation dialog before deletion
- UI improvements:
  - Delete buttons styled to be subtle by default
  - Red color on hover for clear indication
  - Thread delete button positioned on right side of header
  - Individual comment delete buttons appear next to reply button
- Proper cleanup:
  - Highlights removed from page when thread deleted
  - Storage updated to persist deletion
  - Comment list re-rendered after any deletion

### Fix Insecure Connection Errors
- Automatically upgrade HTTP PDF URLs to HTTPS in viewer.js
- Added Content-Security-Policy meta tag with upgrade-insecure-requests
- Enhanced PDF.js configuration with proper CORS settings
- Improved error handling with specific messages for HTTPS failures
- Added viewport meta tag for better responsive behavior
- Log warnings when upgrading HTTP to HTTPS for debugging

### Fix Gemini API Error
- Fixed "Cannot read properties of undefined (reading '0')" error
- Added comprehensive error checking for API response structure
- Added detailed logging for debugging API requests and responses
- Improved error messages to identify specific issues:
  - Missing candidates array
  - Invalid response structure
  - Empty content parts
  - No text content
- Enhanced error handling in background.js with better logging
- Added model name logging to debug potential model name issues
- Better error propagation from API to user interface

### Migrate to Gemini API v1 with 2.5 Models
- Updated API endpoint from v1beta to v1
- Simplified model selection to only Gemini 2.5 models:
  - gemini-2.5-flash (default)
  - gemini-2.5-pro
- Updated response parsing for v1 API structure
- Removed deprecated and experimental model options
- Changed default model to gemini-2.5-flash

### Fix Model Name Format
- Updated to use exact model name: gemini-2.5-flash-preview-05-20
- Removed "models/" prefix from API calls
- Simplified to single 2.5 Flash preview model
- Fixed "model not found" error by using correct model identifier

### Update API to Match Google GenAI Structure
- Changed API endpoint to /models:generateContent (generic endpoint)
- Moved model specification from URL to request body
- Now matches Google GenAI client library structure
- Allows use of preview models like gemini-2.5-flash-preview-05-20
- Fixed API calls to work with latest Gemini API format