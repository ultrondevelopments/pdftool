# PDF Merge, Split, Sign and Fill Tool (Chrome Extension)

A privacy-focused Chrome extension for working with PDF files and images, featuring a modern, intuitive UI. All processing happens locally in your browser—your files never leave your device.

## Features

- **Merge PDFs**: Combine multiple PDF files into one. Drag and drop to reorder before merging.
- **Split PDF**: Split a PDF into individual pages or custom page ranges. Download as separate files or a ZIP archive.
- **Fill & Sign**: Add text, dates, signatures, and colored strikethroughs to your PDFs. Includes undo/redo, drag-and-drop, and color picker for strikethroughs.
- **Image to PDF**: Convert multiple images (JPG, PNG, GIF, WebP, etc.) into a single PDF. Drag and drop to reorder, preview images, and download the result. All processing is local and private.

## Privacy
- **100% Local**: All PDF and image processing is done in your browser. No files are uploaded or sent to any server.
- **No Tracking**: The extension does not collect or transmit any data.

## Usage
1. **Install the extension** in Chrome (load unpacked or from the Chrome Web Store).
2. **Click the extension icon** to open the popup and choose a tool: Merge PDFs, Split PDF, Fill & Sign, or Image to PDF.
3. **Use the modern web UI** to upload files, drag and drop, edit, and save your results.

## Modern UI
- Clean, responsive design
- Drag-and-drop everywhere
- Tooltips and accessibility features
- Consistent look and feel across popup and main app

## Coming Soon
- Advanced Image to PDF features: image compression, page size selection, margin settings, PDF metadata, and more.

## License
MIT

## Firefox Extension

A Firefox-compatible version is available in the releases as a zip file.

### How to Install in Firefox
1. Download the latest Firefox extension zip from the [Releases](https://github.com/ultron/pdfmergetool/releases) page.
2. Extract the zip file to a folder on your computer.
3. Open Firefox and go to `about:debugging` > "This Firefox".
4. Click "Load Temporary Add-on..." and select any file in the extracted folder (e.g., `manifest.json`).
5. The extension will appear in your toolbar for testing and use.

> **Note:** Due to Firefox's current limitations, the extension uses a background script instead of a service worker. All features are supported, but if you encounter issues, please report them.
