// PDF Fill & Sign functionality

// Global variables for Fill & Sign feature
let fillSignPdfFile = null;
let fillSignPdfDocument = null;
let currentPageIndex = 0; // 0-based index for the currently viewed page
let pdfScale = 1.5; // Current scale of the PDF on the canvas
let editorElements = []; // Array to store all added elements (text, signatures, dates)
let activeElement = null; // The currently selected element on the editor layer
let activeTool = null; // The currently active tool (e.g., 'text', 'signature', 'eraser')
let pdfViewport = null; // The viewport of the currently rendered PDF page
let lastCreatedSignature = null;

// Undo functionality
let undoStack = []; // Array to store undo actions
let maxUndoSteps = 20; // Maximum number of undo steps to keep in memory

// Initialize PDF.js worker
// This tells PDF.js where to find its worker script, crucial for background processing.
if (typeof pdfjsLib !== "undefined") {
    try {
        // Best practice for extensions: use chrome.runtime.getURL
        pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf.worker.js");
        console.log("PDF.js worker SRC set to (extension path):", pdfjsLib.GlobalWorkerOptions.workerSrc);
    } catch (e) {
        // Fallback if chrome.runtime is not available (e.g., not in extension context, or error)
        console.error("Error setting PDF.js worker SRC with chrome.runtime.getURL. This is expected if not in an extension context.", e);
        pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.js"; // Relative path fallback
        console.warn("PDF.js worker SRC set to fallback (relative path):", pdfjsLib.GlobalWorkerOptions.workerSrc);
    }
} else {
    console.error("pdfjsLib is not defined when attempting to set workerSrc. PDF.js might not be loaded.");
}

// Helper function to parse various color string formats to {r, g, b} components (0-1 range)
// This is important for converting CSS colors to a format PDF-lib can use.
function parseColorToRGBComponents(colorStr) {
    const defaultColor = { r: 0, g: 0, b: 0 }; // Default to black if parsing fails

    if (!colorStr || typeof colorStr !== 'string') {
        console.warn(`Invalid color string provided: "${colorStr}", defaulting to black.`);
        return defaultColor;
    }

    const sanitizedColorStr = colorStr.trim().toLowerCase();

    // Try to parse Hex format: #rgb, #rrggbb
    if (sanitizedColorStr.startsWith('#')) {
        let hex = sanitizedColorStr.slice(1);
        if (hex.length === 3) { // Expand shorthand hex (e.g., #0F0 to #00FF00)
            hex = hex.split('').map(char => char + char).join('');
        }
        if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                return { r: r / 255, g: g / 255, b: b / 255 }; // Convert to 0-1 range
            }
        }
    }
    // Try to parse RGB format: rgb(r, g, b)
    else if (sanitizedColorStr.startsWith('rgb(')) {
        const parts = sanitizedColorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (parts) {
            const r = parseInt(parts[1], 10);
            const g = parseInt(parts[2], 10);
            const b = parseInt(parts[3], 10);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b) &&
                r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
                return { r: r / 255, g: g / 255, b: b / 255 }; // Convert to 0-1 range
            }
        }
    }

    // If other formats are possible (e.g., named colors, rgba), add parsers here.
    console.warn(`Could not parse color string: "${sanitizedColorStr}", defaulting to black.`);
    return defaultColor;
}


// Initialize Fill & Sign functionality - sets up event listeners and UI.
function initFillSign() {
  console.log("initFillSign called - setting up Fill & Sign UI and event listeners.");
  // Check if PDF.js library is loaded
  if (typeof pdfjsLib === "undefined") {
    showErrorBanner("PDF.js (pdfjsLib) not loaded! Fill & Sign functionality will be impaired.");
    console.error("fill-sign.js: pdfjsLib is not defined in initFillSign.");
    return; // Stop initialization if PDF.js is missing
  }

  // Get DOM elements for file upload
  const fillSignUploadZone = document.getElementById("fillSignUploadZone");
  const fillSignFileInput = document.getElementById("fillSignFileInput");

  // Attach event listeners for file upload (click, drag-n-drop)
  if (fillSignUploadZone && fillSignFileInput) {
    fillSignUploadZone.addEventListener("click", () => fillSignFileInput.click());
    fillSignUploadZone.addEventListener("dragover", handleDragOver);
    fillSignUploadZone.addEventListener("dragleave", handleDragLeave);
    fillSignUploadZone.addEventListener("drop", handleFillSignFileDrop);
    fillSignFileInput.addEventListener("change", handleFillSignFileSelect);
    console.log("Fill & Sign upload event listeners attached");
  } else {
    console.error("Fill & Sign upload zone or file input element not found in the DOM.");
  }

  // Attach event listeners to tool buttons (Text, Signature, Date)
  const textToolBtn = document.getElementById("textToolBtn");
  const signToolBtn = document.getElementById("signToolBtn");
  const dateToolBtn = document.getElementById("dateToolBtn");
  const eraserToolBtn = document.getElementById("eraserToolBtn");
  
  if (textToolBtn) {
    textToolBtn.addEventListener("click", () => activateTool("text"));
    console.log("Text tool button event listener attached");
  }
  if (signToolBtn) {
    signToolBtn.addEventListener("click", () => activateTool("signature"));
    console.log("Signature tool button event listener attached");
  }
  if (dateToolBtn) {
    dateToolBtn.addEventListener("click", () => activateTool("date"));
    console.log("Date tool button event listener attached");
  }
  if (eraserToolBtn) {
    eraserToolBtn.addEventListener("click", () => activateTool("eraser"));
    console.log("Eraser tool button event listener attached");
  }

  // Attach event listeners for PDF page navigation
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", goToPreviousPage);
    console.log("Previous page button event listener attached");
  }
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", goToNextPage);
    console.log("Next page button event listener attached");
  }

  // Attach event listeners for the text properties panel
  const applyTextBtn = document.getElementById("applyTextBtn");
  const cancelTextBtn = document.getElementById("cancelTextBtn");
  
  if (applyTextBtn) {
    applyTextBtn.addEventListener("click", applyTextProperties);
    console.log("Apply text properties button event listener attached");
  }
  if (cancelTextBtn) {
    cancelTextBtn.addEventListener("click", cancelTextEdit);
    console.log("Cancel text edit button event listener attached");
  }

  // Attach event listeners for the signature panel (tabs, clear, save, cancel)
  const drawTabBtn = document.getElementById("drawTabBtn");
  const typeTabBtn = document.getElementById("typeTabBtn");
  const clearSignatureBtn = document.getElementById("clearSignatureBtn");
  const saveSignatureBtn = document.getElementById("saveSignatureBtn");
  const cancelSignatureBtn = document.getElementById("cancelSignatureBtn");
  
  if (drawTabBtn) {
    drawTabBtn.addEventListener("click", () => switchSignatureTab("draw"));
    console.log("Draw signature tab button event listener attached");
  }
  if (typeTabBtn) {
    typeTabBtn.addEventListener("click", () => switchSignatureTab("type"));
    console.log("Type signature tab button event listener attached");
  }
  if (clearSignatureBtn) {
    clearSignatureBtn.addEventListener("click", clearSignature);
    console.log("Clear signature button event listener attached");
  }
  if (saveSignatureBtn) {
    saveSignatureBtn.addEventListener("click", saveSignature);
    console.log("Save signature button event listener attached");
  }
  if (cancelSignatureBtn) {
    cancelSignatureBtn.addEventListener("click", cancelSignature);
    console.log("Cancel signature button event listener attached");
  }

  // Attach event listener for the main "Save PDF" button in Fill & Sign mode
  const saveFillSignBtn = document.getElementById("saveFillSignBtn");
  if (saveFillSignBtn) {
    saveFillSignBtn.addEventListener("click", saveFillSignPDF);
    console.log("Save Fill & Sign PDF button event listener attached");
  }

  // Attach event listener for the undo button
  const undoBtn = document.getElementById("undoBtn");
  if (undoBtn) {
    undoBtn.addEventListener("click", undoLastAction);
    console.log("Undo button event listener attached");
  }

  // Initialize the canvas used for drawing signatures
  const signatureCanvas = document.getElementById("signatureCanvas");
  if (signatureCanvas) {
    initSignatureCanvas();
    console.log("Signature canvas initialized");
  } else {
    console.log("Signature canvas not found during initialization - will be initialized when signature tool is activated");
  }
  console.log("Fill & Sign initialization completed");
}

// Drag-n-drop helper: Handles when a dragged item is over the upload zone.
function handleDragOver(e) {
  e.preventDefault(); // Necessary to allow dropping
  e.currentTarget.classList.add("dragover"); // Visual feedback
}

// Drag-n-drop helper: Handles when a dragged item leaves the upload zone.
function handleDragLeave(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("dragover"); // Remove visual feedback
}

// Drag-n-drop helper: Handles when a file is dropped onto the upload zone.
function handleFillSignFileDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("dragover");
  // Process the dropped files if they exist and the first one is a PDF
  if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type === "application/pdf") {
    handleFillSignFileUpload(e.dataTransfer.files[0]);
  } else {
    showErrorBanner("Please drop a valid PDF file.");
  }
}

// File input helper: Handles when a file is selected via the file input dialog.
function handleFillSignFileSelect(e) {
  // Process the selected files if they exist
  if (e.target.files.length > 0) {
    handleFillSignFileUpload(e.target.files[0]);
  }
}

// Main function to process the uploaded PDF file for filling and signing.
async function handleFillSignFileUpload(file) {
  console.log("handleFillSignFileUpload called with file:", file.name);
  // Validate file type
  if (file.type !== "application/pdf") {
    showErrorBanner("Please select a valid PDF file.");
    return;
  }
  // Ensure PDF.js is loaded
  if (typeof pdfjsLib === "undefined") {
    showErrorBanner("PDF.js (pdfjsLib) is not loaded. Cannot process PDF.");
    console.error("fill-sign.js: pdfjsLib is not defined in handleFillSignFileUpload.");
    return;
  }
  try {
    fillSignPdfFile = file; // Store the File object globally

    // Update UI elements with file info and show editor sections
    document.getElementById("fillSignFileName").textContent = file.name;
    document.getElementById("pdfEditorCard").classList.add("show"); // Show the editor card
    document.getElementById("fillSignSaveCard").classList.remove("hidden"); // Show the save button card

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log("File loaded into arrayBuffer, length:", arrayBuffer.byteLength);

    // Load PDF document using PDF.js
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    fillSignPdfDocument = await loadingTask.promise; // Store PDFDocumentProxy globally
    console.log("PDF document loaded via PDF.js:", fillSignPdfDocument);

    // Reset state for the new document
    currentPageIndex = 0; // Start at the first page (0-indexed)
    editorElements = [];  // Clear any elements from a previous PDF
    document.getElementById("totalPages").textContent = fillSignPdfDocument.numPages;

    // Load and render the first page of the PDF
    await loadPdfPage(1); // loadPdfPage expects 1-based page number

    // Set up event listeners for the editor layer (where elements are placed)
    setupEditorEvents();
    
    console.log("Fill & Sign PDF loaded successfully and editor events set up.");
  } catch (error) {
    console.error("Error loading PDF for Fill & Sign:", error);
    showErrorBanner("Error loading PDF. The file might be corrupted or password protected.");
  }
}

// Loads and renders a specific page of the PDF onto the canvas.
async function loadPdfPage(pageNumber) { // pageNumber is 1-based
  console.log("loadPdfPage called for pageNumber (1-based):", pageNumber);
  if (!fillSignPdfDocument) {
    console.error("fillSignPdfDocument is null in loadPdfPage. Cannot load page.");
    showErrorBanner("PDF document not loaded. Cannot render page.");
    return;
  }
  try {
    const editorLayer = document.getElementById("editorLayer");
    if (editorLayer) editorLayer.innerHTML = ""; // Clear elements from previous page view

    // Get the PDF page object from PDF.js
    const page = await fillSignPdfDocument.getPage(pageNumber); // PDF.js getPage is 1-based
    console.log("Page", pageNumber, "object loaded from PDF document via PDF.js.");

    // Get canvas and its container
    const canvas = document.getElementById("pdfCanvas");
    const context = canvas.getContext("2d");
    const pdfContainer = document.getElementById("pdfContainer");

    if (!pdfContainer || !canvas) {
        console.error("PDF container or canvas element not found in loadPdfPage.");
        return;
    }

    // Calculate scale to fit PDF page width into the container
    const containerWidth = pdfContainer.clientWidth - 40; // Account for padding (20px each side)
    const viewportUnscaled = page.getViewport({ scale: 1 }); // Get unscaled viewport to find original width
    pdfScale = containerWidth / viewportUnscaled.width; // Calculate scale factor
    pdfViewport = page.getViewport({ scale: pdfScale }); // Get scaled viewport for rendering

    // Set canvas dimensions to match the scaled PDF page
    canvas.width = pdfViewport.width;
    canvas.height = pdfViewport.height;

    // Set editor layer dimensions to match canvas, for element positioning
    if (editorLayer) {
        editorLayer.style.width = `${pdfViewport.width}px`;
        editorLayer.style.height = `${pdfViewport.height}px`;
    }

    // Render the PDF page onto the canvas
    await page.render({ canvasContext: context, viewport: pdfViewport }).promise;
    console.log("Page", pageNumber, "rendered on canvas.");

    // Update UI elements for page navigation
    document.getElementById("currentPage").textContent = pageNumber;
    document.getElementById("prevPageBtn").disabled = pageNumber <= 1;
    document.getElementById("nextPageBtn").disabled = pageNumber >= fillSignPdfDocument.numPages;

    currentPageIndex = pageNumber - 1; // Update global 0-based index

    // Restore any previously added elements for this page
    restoreEditorElements();
  } catch (error) {
    console.error("Error rendering PDF page", pageNumber, ":", error);
    showErrorBanner(`Error rendering PDF page ${pageNumber}: ${error.message}.`);
  }
}

// Navigation: Go to the previous PDF page.
function goToPreviousPage() {
  if (currentPageIndex > 0) { // currentPageIndex is 0-based
    loadPdfPage(currentPageIndex); 
  }
}

// Navigation: Go to the next PDF page.
function goToNextPage() {
  if (currentPageIndex < fillSignPdfDocument.numPages - 1) { // currentPageIndex is 0-based
    loadPdfPage(currentPageIndex + 2); 
  }
}

// Activates a selected tool (Text, Signature, Date) and updates UI accordingly.
function activateTool(tool) {
  console.log("Activating tool:", tool);

  const currentActiveBtn = document.querySelector(".tool-btn.active");
  if (currentActiveBtn) currentActiveBtn.classList.remove("active");

  activeTool = tool; 
  document.getElementById(`${tool}ToolBtn`)?.classList.add("active"); 

  const textPropertiesPanel = document.getElementById("textPropertiesPanel");
  const signaturePanel = document.getElementById("signaturePanel");
  const editorLayer = document.getElementById("editorLayer");

  // Enable pointer events on editor layer when a tool is active
  if (editorLayer) {
    if (tool === "text" || tool === "signature" || tool === "eraser") {
      editorLayer.style.pointerEvents = "auto";
    } else {
      editorLayer.style.pointerEvents = "none";
    }
  }

  if (tool === "text") {
    if (textPropertiesPanel) textPropertiesPanel.classList.remove("hidden");
    if (signaturePanel) signaturePanel.classList.add("hidden");
  } else if (tool === "signature") {
    if (signaturePanel) signaturePanel.classList.remove("hidden");
    if (textPropertiesPanel) textPropertiesPanel.classList.add("hidden");
    initSignatureCanvas(); 
  } else if (tool === "date") {
    addDateElement(); 
    activeTool = null; 
    document.getElementById("dateToolBtn")?.classList.remove("active");
    if (textPropertiesPanel) textPropertiesPanel.classList.add("hidden");
    if (signaturePanel) signaturePanel.classList.add("hidden");
    if (editorLayer) editorLayer.style.pointerEvents = "none";
  } else { 
    if (textPropertiesPanel) textPropertiesPanel.classList.add("hidden");
    if (signaturePanel) signaturePanel.classList.add("hidden");
    if (editorLayer) editorLayer.style.pointerEvents = "none";
  }
}

// Sets up event listeners on the editor layer for adding elements.
function setupEditorEvents() {
  const editorLayer = document.getElementById("editorLayer");
  if (!editorLayer) {
    console.error("Editor layer not found for setting up events.");
    return;
  }

  editorLayer.addEventListener("click", (e) => {
    if (!activeTool || !pdfViewport) {
        if (!activeTool) return; 
        console.warn("pdfViewport not available in editorLayer click handler. Page might not be rendered yet.");
        return;
    }

    // Prevent adding new element if click is on an existing one.
    // This allows existing elements' own click/mousedown handlers to take over.
    if (e.target.closest('.editor-element')) {
        console.log("Click on existing editor element, not adding new one.");
        return;
    }

    const rect = editorLayer.getBoundingClientRect(); 
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    console.log(`Editor layer clicked at screen (${e.clientX}, ${e.clientY}), translated to editor layer coords (${x}, ${y}) for tool: ${activeTool}`);

    if (activeTool === "text") {
      addTextElement(x, y);
    } else if (activeTool === "signature") {
      // For signature, we need to check if there's a saved signature to place
      const signaturePanel = document.getElementById("signaturePanel");
      if (signaturePanel && !signaturePanel.classList.contains("hidden")) {
        console.log("Signature panel is open. Please create and save a signature first.");
        return;
      }
      
      // If signature panel is hidden, we can place a signature if one was previously created
      const lastSignature = getLastCreatedSignature();
      if (lastSignature) {
        addSignatureElementAtPosition(lastSignature, x, y);
      } else {
        console.log("No signature available. Please create a signature first.");
        // Show the signature panel to create one
        activateTool("signature");
      }
    } else if (activeTool === "eraser") {
      // Find and remove the element at the clicked position
      eraseElementAtPosition(x, y);
    }
  });
}

// Adds a new text element to the editor layer at specified coordinates.
function addTextElement(x, y) {
  const editorLayer = document.getElementById("editorLayer");
  if (!editorLayer) {
      console.error("Cannot add text element: Editor layer not found.");
      return;
  }

  const textElement = document.createElement("div");
  textElement.className = "editor-element text-element"; 
  textElement.contentEditable = true; 
  textElement.setAttribute("tabindex", "-1"); // Make div focusable

  textElement.style.left = `${x}px`;  
  textElement.style.top = `${y}px`;   
  textElement.style.position = 'absolute'; 
  textElement.style.fontSize = `${document.getElementById("fontSize").value || 12}px`; 
  textElement.style.color = document.getElementById("fontColor").value || "#000000";   
  textElement.textContent = "Click to edit"; 
  textElement.dataset.type = "text"; 
  textElement.dataset.page = currentPageIndex.toString(); 
  
  textElement.style.backgroundColor = "rgba(255, 255, 0, 0.3)"; 
  textElement.style.border = "1px solid orange"; 


  textElement.addEventListener('input', () => {
    console.log(`Input event on text element (ID: ${textElement.dataset.id || 'pending'}), new content: ${textElement.textContent}`);
    updateStoredElement(textElement); 
  });
  textElement.addEventListener('blur', () => {
    console.log(`Blur event on text element (ID: ${textElement.dataset.id || 'pending'}), final content: ${textElement.textContent}`);
    updateStoredElement(textElement);
    textElement.style.backgroundColor = "transparent"; 
    textElement.style.border = "1px dashed transparent"; 
  });
   textElement.addEventListener('focus', () => {
    textElement.style.backgroundColor = "rgba(220, 220, 0, 0.2)"; 
    textElement.style.border = "1px solid blue"; 
  });

  editorLayer.appendChild(textElement); 
  makeElementDraggable(textElement);    
  storeEditorElement(textElement); // This assigns dataset.id
  console.log("Text element (ID:", textElement.dataset.id, ") added at editor coords:", {x, y});
  
  // Add to undo stack
  addToUndoStack({
    type: 'add',
    elementId: textElement.dataset.id
  });
  
  // It's crucial to select and focus *after* it's in the DOM and draggable logic is attached.
  selectElement(textElement); 
  
  // Delay focus slightly to ensure DOM updates and selections are processed.
  setTimeout(() => {
      textElement.focus();
      console.log("Attempted to focus text element:", textElement.dataset.id, " Is document.activeElement this textElement?", document.activeElement === textElement);
      if (document.activeElement !== textElement) {
          console.warn("Focus on text element failed or was lost immediately.");
      }
  }, 0);
}

// Adds a new date element to the editor layer.
function addDateElement() {
  const editorLayer = document.getElementById("editorLayer");
  if (!editorLayer) {
      console.error("Cannot add date element: Editor layer not found.");
      return;
  }

  const dateElement = document.createElement("div");
  dateElement.className = "editor-element date-element";
  dateElement.style.left = "50px";
  dateElement.style.top = "50px";
  dateElement.style.position = 'absolute';
  dateElement.style.fontSize = "14px"; 
  dateElement.style.color = "#000000";

  const today = new Date();
  dateElement.textContent = today.toLocaleDateString(); 
  dateElement.dataset.type = "date";
  dateElement.dataset.page = currentPageIndex.toString();

  editorLayer.appendChild(dateElement);
  makeElementDraggable(dateElement);
  selectElement(dateElement);
  storeEditorElement(dateElement);
  
  // Add to undo stack
  addToUndoStack({
    type: 'add',
    elementId: dateElement.dataset.id
  });
  
  console.log("Date element added.");
}

// Makes a DOM element draggable within its parent (the editor layer).
function makeElementDraggable(element) {
  let offsetX = 0, offsetY = 0, isDragging = false, hasDragged = false;

  element.addEventListener("mousedown", (e) => {
    // If the target of the mousedown is an interactive child (e.g. if we had resize handles), ignore.
    if (e.target !== element && e.target.closest('.drag-handle')) { // Example for handles
        // Let handle manage its own drag
        return;
    }

    // For contentEditable elements, we want to be careful not to prevent default focusing behavior.
    // Default behavior is that mousedown on contentEditable sets focus and places cursor.
    // If we e.preventDefault() here, that won't happen.
    // So, for contentEditable, we will only start "actual" drag on mousemove.
    
    isDragging = true; // Mark that a mousedown has occurred, potential drag.
    hasDragged = false; // Reset flag that indicates actual movement.
    
    selectElement(element); // Select the element on mousedown for immediate visual feedback.

    const rect = element.getBoundingClientRect(); 
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    document.addEventListener("mousemove", moveElement);
    document.addEventListener("mouseup", stopMovingElement);

    // IMPORTANT: Only call e.preventDefault() if NOT contentEditable or if drag truly starts.
    // If contentEditable, let the browser handle focus first.
    // If it's NOT contentEditable (e.g., an image/signature), prevent default to stop image drag artifacts.
    if (element.contentEditable !== 'true') {
        e.preventDefault();
    }
  });

  function moveElement(e) {
    if (!isDragging) return;

    if (!hasDragged) {
        // This is the first significant mousemove after mousedown.
        // Now we can confirm it's a drag operation.
        hasDragged = true;
        element.style.cursor = 'grabbing';
        // If it was a contentEditable element, and now we're definitely dragging,
        // it's often too late to prevent text selection that might have started.
        // This is a common challenge balancing editability and draggability of contentEditable.
    }
    
    const editorLayer = document.getElementById("editorLayer");
    if (!editorLayer) return; // Should not happen
    const parentRect = editorLayer.getBoundingClientRect(); 

    let newX = e.clientX - parentRect.left - offsetX;
    let newY = e.clientY - parentRect.top - offsetY;

    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  }

  function stopMovingElement() {
    if (!isDragging) return;
    
    if (hasDragged) { // Only update and reset cursor if a drag actually occurred
        updateStoredElement(element); 
    }
    element.style.cursor = 'grab'; // Reset cursor even if no drag, or after drag
    
    isDragging = false;
    hasDragged = false;
    
    document.removeEventListener("mousemove", moveElement);
    document.removeEventListener("mouseup", stopMovingElement);
  }
  element.style.cursor = 'grab'; 
}

// Selects an element on the editor layer, deselecting any other.
function selectElement(element) {
  // Remove selection from all other elements
  document.querySelectorAll(".editor-element.selected").forEach(el => {
    el.classList.remove("selected");
  });

  // Select the new element
  element.classList.add("selected");
  activeElement = element;

  // Show appropriate properties panel based on element type
  const textPropertiesPanel = document.getElementById("textPropertiesPanel");
  const signaturePanel = document.getElementById("signaturePanel");

  if (element.dataset.type === "text" || element.dataset.type === "date") {
    if (textPropertiesPanel) {
      textPropertiesPanel.classList.remove("hidden");
      // Update panel values to match current element
      const fontSize = element.style.fontSize?.replace('px', '') || '12';
      const fontColor = element.style.color || '#000000';
      document.getElementById("fontSize").value = fontSize;
      document.getElementById("fontColor").value = fontColor;
    }
    if (signaturePanel) signaturePanel.classList.add("hidden");
  } else if (element.dataset.type === "signature") {
    if (signaturePanel) signaturePanel.classList.add("hidden");
    if (textPropertiesPanel) textPropertiesPanel.classList.add("hidden");
  }

  console.log("Element selected:", element.dataset.id, "Type:", element.dataset.type);
}

// Applies currently selected font size and color to the active text element.
function applyTextProperties() {
  if (!activeElement || (activeElement.dataset.type !== "text" && activeElement.dataset.type !== "date")) {
    console.warn("No text element selected for applying properties.");
    return;
  }

  const fontSize = document.getElementById("fontSize")?.value;
  const fontColor = document.getElementById("fontColor")?.value;

  if (fontSize) {
    activeElement.style.fontSize = `${fontSize}px`;
  }
  if (fontColor) {
    activeElement.style.color = fontColor;
  }

  updateStoredElement(activeElement);
  console.log("Text properties applied to element:", activeElement.dataset.id);
}

// Cancels text editing, hides properties panel, and deselects the tool/element.
function cancelTextEdit() {
  document.getElementById("textPropertiesPanel")?.classList.add("hidden");
  if (activeElement && activeElement.dataset.type === 'text') { 
     activeElement.style.backgroundColor = "transparent";
     activeElement.style.border = "1px dashed transparent";
  }
  if (activeElement) {
    activeElement.classList.remove("selected");
    activeElement = null;
  }
  if (activeTool === 'text') {
    document.getElementById("textToolBtn")?.classList.remove("active");
    activeTool = null;
  }
}

// Initializes the signature drawing canvas.
function initSignatureCanvas() {
  const canvas = document.getElementById("signatureCanvas");
  if (!canvas) {
    console.error("Signature canvas element not found in initSignatureCanvas.");
    return;
  }
  
  const ctx = canvas.getContext("2d");
  let isDrawing = false;

  // Set canvas size to match its display size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  // Clear and set background
  ctx.fillStyle = "#f9fafb"; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set drawing style
  ctx.lineWidth = 2;
  ctx.lineCap = "round"; 
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000000"; 

  const getEventPosition = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    isDrawing = true;
    const pos = getEventPosition(e);
    ctx.beginPath(); 
    ctx.moveTo(pos.x, pos.y); 
  };
  
  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getEventPosition(e);
    ctx.lineTo(pos.x, pos.y); 
    ctx.stroke(); 
  };
  
  const stopDrawing = () => {
    if (isDrawing) {
        ctx.closePath(); 
        isDrawing = false;
    }
  };
  
  // Remove existing event listeners if any
  if (canvas.eventListenersAttached) { 
    canvas.eventListenersAttached.forEach(listener => {
        canvas.removeEventListener(listener.type, listener.handler, listener.options);
    });
  }
  
  // Add new event listeners
  const eventListeners = [
    { type: "mousedown", handler: startDrawing },
    { type: "mousemove", handler: draw },
    { type: "mouseup", handler: stopDrawing },
    { type: "mouseout", handler: stopDrawing }, 
    { type: "touchstart", handler: startDrawing, options: { passive: false } },
    { type: "touchmove", handler: draw, options: { passive: false } },
    { type: "touchend", handler: stopDrawing }
  ];

  eventListeners.forEach(listener => {
    canvas.addEventListener(listener.type, listener.handler, listener.options || false);
  });
  
  canvas.eventListenersAttached = eventListeners;
  console.log("Signature canvas initialized with size:", canvas.width, "x", canvas.height);
}

// Switches between "Draw" and "Type" tabs in the signature panel.
function switchSignatureTab(tab) {
  document.getElementById("drawTabBtn")?.classList.toggle("active", tab === "draw");
  document.getElementById("typeTabBtn")?.classList.toggle("active", tab === "type");
  document.getElementById("drawSignatureTab")?.classList.toggle("hidden", tab !== "draw");
  document.getElementById("typeSignatureTab")?.classList.toggle("hidden", tab !== "type");
}

// Clears the signature drawing canvas.
function clearSignature() {
  const canvas = document.getElementById("signatureCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f9fafb"; 
  ctx.fillRect(0, 0, canvas.width, canvas.height); 
}

// Saves the created signature (drawn or typed) and adds it to the PDF editor.
function saveSignature() {
  let signatureImgDataUrl; 
  const drawTabActive = document.getElementById("drawTabBtn")?.classList.contains("active");

  if (drawTabActive) { 
    const canvas = document.getElementById("signatureCanvas");
    if (isCanvasBlank(canvas)) { 
      showErrorBanner("Signature is blank. Please draw your signature.");
      return;
    }
    signatureImgDataUrl = canvas.toDataURL("image/png"); 
  } else { 
    const text = document.getElementById("signatureText")?.value;
    const font = document.getElementById("signatureFont")?.value;
    if (!text || !text.trim()) { 
      showErrorBanner("Please type your signature.");
      return;
    }
    signatureImgDataUrl = createTextSignatureImage(text, font); 
  }

  if (signatureImgDataUrl) {
    // Store the signature for later use
    lastCreatedSignature = signatureImgDataUrl;
    
    // Add the signature to the current page at a default position
    addSignatureElement(signatureImgDataUrl); 
    
    // Hide the signature panel and deactivate the tool
    document.getElementById("signaturePanel")?.classList.add("hidden");
    document.getElementById("signToolBtn")?.classList.remove("active");
    activeTool = null;
    
    // Disable pointer events on editor layer
    const editorLayer = document.getElementById("editorLayer");
    if (editorLayer) editorLayer.style.pointerEvents = "none";
    
    console.log("Signature saved and added to PDF");
  }
}

// Checks if the signature canvas is blank (nothing drawn).
function isCanvasBlank(canvas) {
    if (!canvas) return true;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    const blankCtx = blank.getContext('2d');
    blankCtx.fillStyle = "#f9fafb"; 
    blankCtx.fillRect(0,0,blank.width, blank.height);

    return canvas.toDataURL() === blank.toDataURL();
}

// Creates an image (as data URL) from typed text and a selected font.
function createTextSignatureImage(text, fontFamily) {
  const canvas = document.createElement("canvas"); 
  const ctx = canvas.getContext("2d");
  const fontSize = 36; 
  ctx.font = `${fontSize}px ${fontFamily}`; 

  const textMetrics = ctx.measureText(text);
  canvas.width = textMetrics.width + 20; 
  canvas.height = fontSize + 20;       

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = "#000000"; 
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL("image/png"); 
}

// Adds a signature image element to the editor layer.
function addSignatureElement(signatureImgDataUrl) {
  const editorLayer = document.getElementById("editorLayer");
  if (!editorLayer) return;

  const signatureElement = document.createElement("img");
  signatureElement.className = "editor-element signature-element";
  signatureElement.src = signatureImgDataUrl; 
  signatureElement.style.left = "50px";
  signatureElement.style.top = "50px";
  signatureElement.style.position = 'absolute';
  signatureElement.style.maxWidth = "200px"; 
  signatureElement.style.maxHeight = "100px";
  signatureElement.dataset.type = "signature";
  signatureElement.dataset.page = currentPageIndex.toString(); 
  signatureElement.dataset.src = signatureImgDataUrl; 

  editorLayer.appendChild(signatureElement);
  makeElementDraggable(signatureElement);
  selectElement(signatureElement);
  storeEditorElement(signatureElement); 
  
  // Add to undo stack
  addToUndoStack({
    type: 'add',
    elementId: signatureElement.dataset.id
  });
  
  console.log("Signature element added to editor.");
}

// Cancels signature creation process, hides panel, and deselects tool.
function cancelSignature() {
  document.getElementById("signaturePanel")?.classList.add("hidden");
  document.getElementById("signToolBtn")?.classList.remove("active");
  activeTool = null;
}

// Stores the state (properties, position, content) of an editor element.
function storeEditorElement(element) {
  const elementId = element.dataset.id || `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  element.dataset.id = elementId; 

  const elementData = {
    id: elementId,
    type: element.dataset.type,
    page: Number.parseInt(element.dataset.page), 
    left: element.style.left,
    top: element.style.top,
    width: element.style.width || (element.offsetWidth ? `${element.offsetWidth}px` : 'auto'),
    height: element.style.height || (element.offsetHeight ? `${element.offsetHeight}px` : 'auto'),
    fontSize: element.style.fontSize,
    color: element.style.color,
    content: (element.dataset.type === 'text' || element.dataset.type === 'date') ? element.textContent : '',
    src: element.dataset.src || (element.tagName === 'IMG' ? element.src : ''),
  };

  editorElements = editorElements.filter(el => el.id !== elementData.id);
  editorElements.push(elementData);
  console.log("Stored/Updated element:", elementData.id, `(Total elements: ${editorElements.length})`);
}

// Updates the stored state of an element (e.g., after dragging or property change).
function updateStoredElement(element) {
  const existingElementData = editorElements.find(el => el.id === element.dataset.id);
  if (existingElementData) { 
    existingElementData.left = element.style.left;
    existingElementData.top = element.style.top;
    existingElementData.width = element.style.width || (element.offsetWidth ? `${element.offsetWidth}px` : 'auto');
    existingElementData.height = element.style.height || (element.offsetHeight ? `${element.offsetHeight}px` : 'auto');
    if (element.dataset.type === 'text' || element.dataset.type === 'date') {
      existingElementData.fontSize = element.style.fontSize;
      existingElementData.color = element.style.color;
      existingElementData.content = element.textContent; 
    }
    console.log("Updated stored element data for ID:", existingElementData.id, "New content:", existingElementData.content);
  } else { 
    console.warn("Attempted to update non-existing element (ID:", element.dataset.id,"). Storing as new.");
    storeEditorElement(element);
  }
}

// Restores all stored editor elements onto the editor layer for the current page.
function restoreEditorElements() {
  const editorLayer = document.getElementById("editorLayer");
  if (!editorLayer) return;
  editorLayer.innerHTML = ""; 

  const pageElements = editorElements.filter(el => el.page === currentPageIndex);
  console.log(`Restoring ${pageElements.length} elements for page index ${currentPageIndex}`);

  pageElements.forEach(elData => {
    let element;
    if (elData.type === "text" || elData.type === "date") {
      element = document.createElement("div");
      element.textContent = elData.content;
      element.style.fontSize = elData.fontSize;
      element.style.color = elData.color;
      element.className = `editor-element ${elData.type}-element`;
      if (elData.type === "text") {
        element.contentEditable = true; 
        element.setAttribute("tabindex", "-1"); // Ensure focusability
        element.addEventListener('input', () => updateStoredElement(element));
        element.addEventListener('blur', () => {
            updateStoredElement(element);
            element.style.backgroundColor = "transparent"; 
            element.style.border = "1px dashed transparent";
        });
        element.addEventListener('focus', () => {
            element.style.backgroundColor = "rgba(220, 220, 0, 0.2)"; 
            element.style.border = "1px solid blue";
        });
      }
    } else if (elData.type === "signature") {
      element = document.createElement("img");
      element.src = elData.src; 
      element.className = "editor-element signature-element";
      element.style.maxWidth = "200px"; 
      element.style.maxHeight = "100px";
    }

    if (element) {
      element.dataset.id = elData.id;
      element.dataset.type = elData.type;
      element.dataset.page = elData.page.toString();
      element.style.left = elData.left;
      element.style.top = elData.top;
      element.style.width = elData.width; 
      element.style.height = elData.height;
      element.style.position = 'absolute';
      if (elData.type === 'signature' && elData.src) element.dataset.src = elData.src; 

      editorLayer.appendChild(element);
      makeElementDraggable(element); 
    }
  });
}

// Gets the last created signature
function getLastCreatedSignature() {
  return lastCreatedSignature;
}

// Adds a signature element at a specific position
function addSignatureElementAtPosition(signatureImgDataUrl, x, y) {
  const editorLayer = document.getElementById("editorLayer");
  if (!editorLayer) return;

  const signatureElement = document.createElement("img");
  signatureElement.className = "editor-element signature-element";
  signatureElement.src = signatureImgDataUrl; 
  signatureElement.style.left = `${x}px`;
  signatureElement.style.top = `${y}px`;
  signatureElement.style.position = 'absolute';
  signatureElement.style.maxWidth = "200px"; 
  signatureElement.style.maxHeight = "100px";
  signatureElement.dataset.type = "signature";
  signatureElement.dataset.page = currentPageIndex.toString(); 
  signatureElement.dataset.src = signatureImgDataUrl; 

  editorLayer.appendChild(signatureElement);
  makeElementDraggable(signatureElement);
  selectElement(signatureElement);
  storeEditorElement(signatureElement); 
  
  // Add to undo stack
  addToUndoStack({
    type: 'add',
    elementId: signatureElement.dataset.id
  });
  
  console.log("Signature element added to editor at position:", x, y);
}

// Erases an element at the specified position
function eraseElementAtPosition(x, y) {
  const editorLayer = document.getElementById("editorLayer");
  if (!editorLayer) return;

  // Find all editor elements
  const elements = editorLayer.querySelectorAll('.editor-element');
  let elementToErase = null;

  // Check each element to see if the click position is within its bounds
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    const layerRect = editorLayer.getBoundingClientRect();
    
    // Convert element position relative to editor layer
    const elementLeft = rect.left - layerRect.left;
    const elementTop = rect.top - layerRect.top;
    const elementRight = elementLeft + rect.width;
    const elementBottom = elementTop + rect.height;

    if (x >= elementLeft && x <= elementRight && y >= elementTop && y <= elementBottom) {
      elementToErase = element;
      break;
    }
  }

  if (elementToErase) {
    // Store the element data for undo
    const elementData = {
      id: elementToErase.dataset.id,
      type: elementToErase.dataset.type,
      page: parseInt(elementToErase.dataset.page),
      left: elementToErase.style.left,
      top: elementToErase.style.top,
      width: elementToErase.style.width,
      height: elementToErase.style.height,
      fontSize: elementToErase.style.fontSize,
      color: elementToErase.style.color,
      content: elementToErase.textContent || '',
      src: elementToErase.dataset.src || ''
    };

    // Add to undo stack
    addToUndoStack({
      type: 'erase',
      element: elementData
    });

    // Remove from DOM and storage
    const elementId = elementToErase.dataset.id;
    elementToErase.remove();
    editorElements = editorElements.filter(el => el.id !== elementId);
    
    console.log("Element erased:", elementId);
  } else {
    console.log("No element found at position:", x, y);
  }
}

// Adds an action to the undo stack
function addToUndoStack(action) {
  undoStack.push(action);
  
  // Limit the undo stack size
  if (undoStack.length > maxUndoSteps) {
    undoStack.shift();
  }
  
  updateUndoButtonState();
}

// Updates the undo button state (enabled/disabled)
function updateUndoButtonState() {
  const undoBtn = document.getElementById("undoBtn");
  if (undoBtn) {
    undoBtn.disabled = undoStack.length === 0;
  }
}

// Undoes the last action
function undoLastAction() {
  if (undoStack.length === 0) {
    console.log("No actions to undo");
    return;
  }

  const lastAction = undoStack.pop();
  
  if (lastAction.type === 'erase') {
    // Restore the erased element
    restoreErasedElement(lastAction.element);
  } else if (lastAction.type === 'add') {
    // Remove the added element
    removeAddedElement(lastAction.elementId);
  }
  
  updateUndoButtonState();
  console.log("Undid action:", lastAction.type);
}

// Restores an erased element
function restoreErasedElement(elementData) {
  const editorLayer = document.getElementById("editorLayer");
  if (!editorLayer) return;

  let element;
  
  if (elementData.type === "text" || elementData.type === "date") {
    element = document.createElement("div");
    element.textContent = elementData.content;
    element.className = `editor-element ${elementData.type}-element`;
    if (elementData.type === "text") {
      element.contentEditable = true;
      element.setAttribute("tabindex", "-1");
      element.addEventListener('input', () => updateStoredElement(element));
      element.addEventListener('blur', () => {
        updateStoredElement(element);
        element.style.backgroundColor = "transparent";
        element.style.border = "1px dashed transparent";
      });
      element.addEventListener('focus', () => {
        element.style.backgroundColor = "rgba(220, 220, 0, 0.2)";
        element.style.border = "1px solid blue";
      });
    }
  } else if (elementData.type === "signature") {
    element = document.createElement("img");
    element.src = elementData.src;
    element.className = "editor-element signature-element";
    element.style.maxWidth = "200px";
    element.style.maxHeight = "100px";
  }

  if (element) {
    element.dataset.id = elementData.id;
    element.dataset.type = elementData.type;
    element.dataset.page = elementData.page.toString();
    element.style.left = elementData.left;
    element.style.top = elementData.top;
    element.style.width = elementData.width;
    element.style.height = elementData.height;
    element.style.position = 'absolute';
    element.style.fontSize = elementData.fontSize;
    element.style.color = elementData.color;
    if (elementData.src) element.dataset.src = elementData.src;

    editorLayer.appendChild(element);
    makeElementDraggable(element);
    
    // Add back to storage
    editorElements.push(elementData);
  }
}

// Removes an added element (for undo)
function removeAddedElement(elementId) {
  const element = document.querySelector(`[data-id="${elementId}"]`);
  if (element) {
    element.remove();
    editorElements = editorElements.filter(el => el.id !== elementId);
  }
}

// Saves the PDF with all added elements (text, signatures, dates) embedded.
async function saveFillSignPDF() {
  console.log("saveFillSignPDF called - preparing to embed elements and save.");
  if (!fillSignPdfFile || !fillSignPdfDocument) {
    showErrorBanner("No PDF loaded. Please upload a PDF first.");
    return;
  }
  if (typeof PDFLib === "undefined") { 
      showErrorBanner("PDF-lib is not loaded. Cannot save PDF.");
      console.error("PDFLib (from pdf-lib.min.js) is undefined in saveFillSignPDF");
      return;
  }

  const saveBtn = document.getElementById("saveFillSignBtn");
  const saveText = document.getElementById("saveFillSignText");
  if (saveBtn) saveBtn.disabled = true;
  if (saveText) saveText.innerHTML = '<div class="spinner"></div>Processing...';

  try {
    const arrayBuffer = await fillSignPdfFile.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer); 
    const { StandardFonts, rgb } = PDFLib; 

    const embeddedFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const page = pdfDoc.getPage(i); 
      const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize(); 

      const pageElementsToEmbed = editorElements.filter(el => el.page === i);
      console.log(`Processing ${pageElementsToEmbed.length} elements for PDF page index ${i} (PDF dims: ${pdfPageWidth}x${pdfPageHeight})`);

      let scaleForSaving = pdfScale; 
      
      if (currentPageIndex !== i || !pdfViewport) {
          console.warn(`Recalculating display viewport for PDF page ${i+1} during save operation as it's not the currently viewed page or viewport is missing.`);
          const pdfjsPage = await fillSignPdfDocument.getPage(i + 1); 
          const pdfContainer = document.getElementById("pdfContainer");
          const displayWidthReference = pdfContainer ? pdfContainer.clientWidth - 40 : 600; 
          
          const unscaledPdfjsViewport = pdfjsPage.getViewport({ scale: 1 });
          scaleForSaving = displayWidthReference / unscaledPdfjsViewport.width;
          console.log(`Recalculated scale for page ${i} to use for saving: ${scaleForSaving}`);
      } else {
        scaleForSaving = pdfScale; 
        console.log(`Using current view scale for page ${i}: ${scaleForSaving}`);
      }

      for (const el of pageElementsToEmbed) {
        const elLeftPx = parseFloat(el.left);
        const elTopPx = parseFloat(el.top);
        const elWidthPx = parseFloat(el.width);
        const elHeightPx = parseFloat(el.height);

        const x_pdf = elLeftPx / scaleForSaving;
        let y_pdf_top_of_element_in_pdf_coords = pdfPageHeight - (elTopPx / scaleForSaving);

        if (el.type === "text" || el.type === "date") {
          const fontSizePoints = (parseFloat(el.fontSize) || 12) / scaleForSaving;
          let y_pdf_baseline = y_pdf_top_of_element_in_pdf_coords - fontSizePoints;
          
          const colorComps = parseColorToRGBComponents(el.color);
          console.log(`Drawing text "${el.content}" at (x:${x_pdf}, y:${y_pdf_baseline}), size:${fontSizePoints}`);
          page.drawText(el.content || "", {
            x: x_pdf,
            y: y_pdf_baseline,
            size: fontSizePoints,
            font: embeddedFont,
            color: rgb(colorComps.r, colorComps.g, colorComps.b),
          });
        } else if (el.type === "signature" && el.src) {
          const signatureImageBytes = await fetch(el.src).then(res => res.arrayBuffer());
          const signatureImageEmbed = await pdfDoc.embedPng(signatureImageBytes);
          
          const sigPdfWidth = elWidthPx / scaleForSaving;
          const sigPdfHeight = elHeightPx / scaleForSaving;
          
          let y_pdf_image_origin = y_pdf_top_of_element_in_pdf_coords - sigPdfHeight;
          console.log(`Drawing signature at (x:${x_pdf}, y:${y_pdf_image_origin}), w:${sigPdfWidth}, h:${sigPdfHeight}`);
          page.drawImage(signatureImageEmbed, {
            x: x_pdf,
            y: y_pdf_image_origin,
            width: sigPdfWidth,
            height: sigPdfHeight,
          });
        }
      }
    }
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const originalName = fillSignPdfFile.name.replace(/\.pdf$/i, "");
    const newFilename = `${originalName}_filled.pdf`;
    const link = document.createElement("a");
    link.href = url;
    link.download = newFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccessMessage("Your filled PDF has been saved to your device.");
  } catch (error) {
    console.error("Error saving filled PDF:", error);
    showErrorBanner(`Error saving PDF: ${error.message}. Check console for extensive details.`);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
    if (saveText) saveText.innerHTML = '<span class="icon icon-download"></span>Save Completed PDF to Device';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("fill-sign.js: DOMContentLoaded event fired.");
  
  window.switchTab = (mode) => {
    document.getElementById("mergeTab")?.classList.toggle("active", mode === "merge");
    document.getElementById("splitTab")?.classList.toggle("active", mode === "split");
    document.getElementById("fillSignTab")?.classList.toggle("active", mode === "fillSign");

    document.getElementById("mergeMode")?.classList.toggle("hidden", mode !== "merge");
    document.getElementById("splitMode")?.classList.toggle("hidden", mode !== "split");
    document.getElementById("fillSignMode")?.classList.toggle("hidden", mode !== "fillSign");
  };

  document.getElementById("fillSignTab")?.addEventListener("click", () => window.switchTab("fillSign"));
  
  initFillSign();
});

if (typeof showErrorBanner === 'undefined') {
    window.showErrorBanner = function(message) {
        console.error("Error Banner (fallback):", message);
        alert("Error: " + message);
    };
}
if (typeof showSuccessMessage === 'undefined') {
    window.showSuccessMessage = function(message) {
        console.log("Success Banner (fallback):", message);
        alert("Success: " + message);
    };
}
