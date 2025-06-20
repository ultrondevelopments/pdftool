# PDF Merge, Split, Sign and Fill Tool (Firefox Extension)

This is the Firefox-compatible version of the privacy-focused PDF tools extension. All processing is local and private.

## Features
- Merge, split, fill, and sign PDFs
- Convert images to PDF
- Modern, drag-and-drop UI
- No data leaves your device

## How to Install in Firefox (for testing)
1. Open Firefox and go to `about:debugging` > "This Firefox".
2. Click "Load Temporary Add-on...".
3. Select any file in this folder (e.g., `manifest.json`).
4. The extension will appear in your toolbar for testing.

## Publishing
- Update the `browser_specific_settings.gecko.id` in `manifest.json` as needed.
- Submit the extension to [addons.mozilla.org](https://addons.mozilla.org/).

## Notes
- All code is adapted for Firefox WebExtensions API.
- If you encounter issues, check the [MDN WebExtensions documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions).
