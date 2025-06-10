# PDF Tools Chrome Extension - Setup Guide

## 🎉 What's New: Split PDF Feature!

✅ **Merge PDFs** - Combine multiple PDFs into one  
✅ **Split PDF** - Extract pages or page ranges  
✅ **Zero Permissions** - Complete privacy  
✅ **Tabbed Interface** - Easy switching between tools  

## 📋 Required Libraries

You need to download two JavaScript libraries:

### 1. PDF-lib (Required for PDF processing)
- **URL:** https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js
- **Save as:** `pdf-lib.min.js` in your extension folder

### 2. JSZip (Required for split PDF feature)
- **URL:** https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
- **Save as:** `jszip.min.js` in your extension folder

## 🚀 Installation Steps

### Step 1: Download Required Libraries
1. Download both libraries mentioned above
2. Save them in your extension folder
3. Replace the placeholder files completely

### Step 2: Load Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select your folder
5. Notice: No permission warnings! 🎉

### Step 3: Test Both Features
1. Click extension icon
2. Try both "Merge PDFs" and "Split PDF" buttons
3. Upload files and test functionality
4. Everything works without permissions!

## 🔧 Split PDF Features

### Two Splitting Methods:
1. **Individual Pages** - Each page becomes a separate PDF
2. **Page Ranges** - Create PDFs from specific page ranges

### Page Range Examples:
- `1-3, 5, 7-9` creates three PDFs:
  - Pages 1, 2, and 3
  - Page 5
  - Pages 7, 8, and 9

### Output Format:
- Split PDFs are packaged in a ZIP file
- Each file is named based on the original filename and page numbers

## 🔒 Privacy Benefits

- ✅ Zero permissions required
- ✅ All processing happens locally
- ✅ Files never leave your device
- ✅ No data storage or tracking

## 🎯 Perfect for Distribution

This extension is now even more valuable with:
- **Multiple PDF tools** in one extension
- **Zero permissions** for maximum privacy
- **Simple interface** anyone can use
- **Complete offline functionality**

Your extension is now a complete PDF toolkit ready for distribution! 🚀
