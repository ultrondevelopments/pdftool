# PDF Merger Chrome Extension - Installation Guide

## Quick Setup

### 1. Download PDF-lib Library
**Important:** You need to download the PDF-lib library locally for the extension to work properly.

1. Go to: https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js
2. Save the file as `pdf-lib.min.js` in your extension folder
3. Replace the placeholder `pdf-lib.min.js` file with the downloaded version

### 2. Install the Extension

1. **Open Chrome Extensions:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

2. **Load the Extension:**
   - Click "Load unpacked"
   - Select your `chrome-extension` folder
   - The extension should appear with the PDF icon

3. **Test the Extension:**
   - Click the extension icon in your toolbar
   - Click "Open PDF Merger"
   - Try uploading and merging some PDF files

## Features

✅ **Removed External Dependencies:** No more Tailwind CSS or Lucide icons from CDN  
✅ **Inline CSS:** All styling is now embedded in the HTML  
✅ **CSS Icons:** Using emoji and CSS for icons instead of external libraries  
✅ **Local PDF-lib:** Instructions to download PDF-lib locally  
✅ **CSP Compliant:** Updated Content Security Policy for Chrome extensions  

## File Structure

\`\`\`
chrome-extension/
├── manifest.json          # Extension configuration
├── index.html             # Main PDF merger (with inline CSS)
├── popup.html             # Extension popup
├── popup.js               # Popup functionality  
├── background.js          # Background service worker
├── pdf-lib.min.js         # PDF library (download separately)
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── INSTALL.md             # This guide
\`\`\`

## Features

- 🎨 **Beautiful Design:** Clean, modern interface with gradients
- 📱 **Responsive:** Works on all screen sizes
- 🔒 **100% Private:** All processing happens locally
- 🎯 **Drag & Drop:** Easy file upload and reordering
- ⚡ **Fast:** No external dependencies to load
- 🛡️ **Secure:** CSP compliant for Chrome extensions

## Troubleshooting

**"PDFLib is not defined" error:**
- Make sure you downloaded `pdf-lib.min.js` from the URL above
- Check that the file is in the same folder as `index.html`

**Extension won't load:**
- Verify all icon files are present in the `icons/` folder
- Check the browser console for any errors
- Make sure `manifest.json` syntax is correct

**Styling looks broken:**
- The new version has all CSS inline, so it should work
- Try refreshing the extension in `chrome://extensions/`
- Clear browser cache if needed

Now your extension should look beautiful and work perfectly! 🎉
