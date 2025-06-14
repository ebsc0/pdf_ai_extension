# PDF AI Chrome Extension

A Chrome extension that allows you to view PDF files with integrated AI capabilities. It intercepts PDF files and displays them using Mozilla's PDF.js library, enhanced with AI-powered features for intelligent document interaction.

## Features

### Core PDF Viewing
- **PDF Interception**: Automatically captures PDF files when you navigate to them
- **Custom PDF Viewer**: Uses PDF.js for reliable, consistent rendering
- **Text Selection**: Select and copy text from PDFs
- **Navigation Controls**: Previous/Next page buttons with keyboard shortcuts
- **Advanced Zoom**: Preset zoom levels, auto-fit, page width options
- **Search**: Find text within PDFs with highlighting
- **Thumbnails**: Visual page navigation sidebar
- **Outline**: Document table of contents navigation
- **Print & Download**: Built-in print and download functionality

### AI-Powered Features
- **Smart Comments**: Highlight text and add comments with AI assistance
- **Gemini Integration**: Use @gemini in comments to get AI responses
- **Context-Aware**: AI understands highlighted text and comment threads
- **Multiple Models**: Support for latest Gemini models including 2.5 preview versions
- **HTML Rendering**: AI responses support formatted text, lists, code blocks, and more

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this directory
5. The PDF AI icon will appear in your Chrome toolbar

## Usage

### Basic PDF Viewing
Once installed, the extension will automatically handle PDF files:
- Click on any PDF link and it will open in the PDF AI viewer
- Navigate local PDF files and they will open in the viewer
- Use keyboard shortcuts:
  - Arrow keys or Page Up/Down for navigation
  - Ctrl/Cmd + F for search
  - +/- for zoom
  - Home/End for first/last page

### AI Setup
1. Click the PDF AI extension icon in Chrome toolbar
2. Enter your Gemini API key (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))
3. Select your preferred AI model
4. Configure options like context inclusion

### Using AI Features
1. Select text in any PDF to highlight it
2. Click "Add Comment" to start a comment thread
3. Type `@gemini` followed by your question to get AI assistance
4. AI will respond with context from the highlighted text and thread history

## Architecture

- `manifest.json` - Chrome extension configuration
- `background.js` - Service worker that intercepts PDF requests and handles AI
- `viewer.html` - PDF viewer interface
- `viewer.js` - PDF rendering and interaction logic
- `viewer.css` - Viewer styling with dark theme
- `settings.html/js/css` - AI configuration interface
- `gemini-api.js` - Gemini API integration module
- `lib/` - PDF.js library files

## Dependencies

- [PDF.js](https://github.com/mozilla/pdf.js) - Mozilla's JavaScript PDF rendering library
- [Google Gemini API](https://ai.google.dev/) - For AI-powered features

## Privacy

- API keys are stored locally in Chrome storage
- No data is sent to external servers except for AI requests to Google's API
- All comments and highlights are stored locally

## Credits

- Mozilla's PDF.js team for the excellent PDF rendering library
- Google for the Gemini AI API

## License

This project uses PDF.js which is licensed under the Apache License 2.0.