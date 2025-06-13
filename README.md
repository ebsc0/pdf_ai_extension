# PDF.js Chrome Extension

A Chrome extension that renders PDF files using Mozilla's PDF.js library.

## Features

- Intercepts PDF file requests and displays them using PDF.js
- Provides a custom PDF viewer interface
- Supports standard PDF navigation and zoom controls
- Works with both local and remote PDF files

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this directory

## Usage

Once installed, the extension will automatically handle PDF files:
- Click on any PDF link and it will open in the custom viewer
- Navigate local PDF files and they will open in the viewer
- Use the viewer controls to navigate, zoom, and interact with PDFs

## Architecture

- `manifest.json` - Chrome extension configuration
- `background.js` - Background script that intercepts PDF requests
- `viewer.html` - PDF viewer interface
- `viewer.js` - PDF rendering logic using PDF.js
- `viewer.css` - Viewer styling
- `lib/` - PDF.js library files

## Dependencies

- [PDF.js](https://github.com/mozilla/pdf.js) - Mozilla's JavaScript PDF rendering library

## License

This project uses PDF.js which is licensed under the Apache License 2.0.