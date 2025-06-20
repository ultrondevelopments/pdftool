// Image to PDF functionality
let imageFiles = [];
let draggedElement = null;

// Initialize Image to PDF functionality
function initImageToPdf() {
  console.log("Initializing Image to PDF functionality");
  
  const uploadZone = document.getElementById("imageToPdfUploadZone");
  const fileInput = document.getElementById("imageToPdfFileInput");
  const saveBtn = document.getElementById("saveImageToPdfBtn");
  
  if (uploadZone) {
    uploadZone.addEventListener("click", () => fileInput.click());
    uploadZone.addEventListener("dragover", handleImageDragOver);
    uploadZone.addEventListener("dragleave", handleImageDragLeave);
    uploadZone.addEventListener("drop", handleImageDrop);
    console.log("Image upload zone event listeners attached");
  }
  
  if (fileInput) {
    fileInput.addEventListener("change", handleImageFileSelect);
    console.log("Image file input event listener attached");
  }
  
  if (saveBtn) {
    saveBtn.addEventListener("click", convertImagesToPdf);
    console.log("Save Image to PDF button event listener attached");
  }
}

// Handle drag over for image upload
function handleImageDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("dragover");
}

// Handle drag leave for image upload
function handleImageDragLeave(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("dragover");
}

// Handle image file drop
function handleImageDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("dragover");
  
  const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
  if (files.length > 0) {
    handleImageFiles(files);
  } else {
    showErrorBanner("Please drop valid image files.");
  }
}

// Handle image file selection
function handleImageFileSelect(e) {
  const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
  if (files.length > 0) {
    handleImageFiles(files);
  } else {
    showErrorBanner("Please select valid image files.");
  }
}

// Process image files
function handleImageFiles(files) {
  console.log("Processing image files:", files.length);
  
  // Add new files to existing array
  imageFiles = imageFiles.concat(files);
  
  // Show preview and save sections
  document.getElementById("imagePreviewCard").classList.remove("hidden");
  document.getElementById("imageToPdfSaveCard").classList.remove("hidden");
  
  // Update preview
  updateImagePreview();
  
  console.log("Total images:", imageFiles.length);
}

// Update image preview
function updateImagePreview() {
  const container = document.getElementById("imagePreviewContainer");
  if (!container) return;
  
  container.innerHTML = "";
  
  imageFiles.forEach((file, index) => {
    const previewItem = createImagePreviewItem(file, index);
    container.appendChild(previewItem);
  });
}

// Create image preview item
function createImagePreviewItem(file, index) {
  const item = document.createElement("div");
  item.className = "image-preview-item";
  item.draggable = true;
  item.dataset.index = index;
  
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  img.alt = file.name;
  
  const pageNumber = document.createElement("div");
  pageNumber.className = "page-number";
  pageNumber.textContent = index + 1;
  
  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.innerHTML = "×";
  removeBtn.onclick = (e) => {
    e.stopPropagation();
    removeImage(index);
  };
  
  const imageInfo = document.createElement("div");
  imageInfo.className = "image-info";
  imageInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
  
  // Add drag and drop functionality
  item.addEventListener("dragstart", handleDragStart);
  item.addEventListener("dragover", handleDragOver);
  item.addEventListener("drop", handleDrop);
  item.addEventListener("dragend", handleDragEnd);
  
  item.appendChild(img);
  item.appendChild(pageNumber);
  item.appendChild(removeBtn);
  item.appendChild(imageInfo);
  
  return item;
}

// Remove image from array
function removeImage(index) {
  imageFiles.splice(index, 1);
  updateImagePreview();
  
  if (imageFiles.length === 0) {
    document.getElementById("imagePreviewCard").classList.add("hidden");
    document.getElementById("imageToPdfSaveCard").classList.add("hidden");
  }
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Drag and drop functionality for reordering
function handleDragStart(e) {
  draggedElement = e.target;
  e.target.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", e.target.outerHTML);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function handleDrop(e) {
  e.preventDefault();
  if (draggedElement === e.target) return;
  
  const draggedIndex = parseInt(draggedElement.dataset.index);
  const targetIndex = parseInt(e.target.dataset.index);
  
  if (draggedIndex !== targetIndex) {
    // Reorder array
    const [movedFile] = imageFiles.splice(draggedIndex, 1);
    imageFiles.splice(targetIndex, 0, movedFile);
    
    // Update preview
    updateImagePreview();
  }
}

function handleDragEnd(e) {
  e.target.classList.remove("dragging");
  draggedElement = null;
}

// Convert images to PDF
async function convertImagesToPdf() {
  if (imageFiles.length === 0) {
    showErrorBanner("No images to convert.");
    return;
  }
  
  if (typeof PDFLib === "undefined") {
    showErrorBanner("PDF-lib is not loaded. Cannot create PDF.");
    return;
  }
  
  const saveBtn = document.getElementById("saveImageToPdfBtn");
  const saveText = document.getElementById("saveImageToPdfText");
  
  if (saveBtn) saveBtn.disabled = true;
  if (saveText) saveText.innerHTML = '<div class="spinner"></div>Converting...';
  
  try {
    console.log("Starting PDF conversion for", imageFiles.length, "images");
    
    // Create new PDF document
    const pdfDoc = await PDFLib.PDFDocument.create();
    
    // Process each image
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      console.log(`Processing image ${i + 1}/${imageFiles.length}:`, file.name, "Type:", file.type);
      
      // Add page to PDF
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      // Embed image based on its type
      let imageEmbed;
      try {
        if (file.type === "image/jpeg" || file.type === "image/jpg") {
          const imageBytes = await file.arrayBuffer();
          imageEmbed = await pdfDoc.embedJpg(imageBytes);
          console.log("Embedded as JPEG");
        } else if (file.type === "image/png") {
          const imageBytes = await file.arrayBuffer();
          imageEmbed = await pdfDoc.embedPng(imageBytes);
          console.log("Embedded as PNG");
        } else {
          // For other formats (GIF, WebP, etc.), convert to JPEG first
          console.log("Converting to JPEG for embedding");
          const imageDataUrl = await convertImageToDataUrl(file);
          const imageBytes = await fetch(imageDataUrl).then(res => res.arrayBuffer());
          imageEmbed = await pdfDoc.embedJpg(imageBytes);
        }
      } catch (embedError) {
        console.error("Error embedding image:", embedError);
        // Fallback: convert to JPEG and try again
        try {
          console.log("Fallback: converting to JPEG");
          const imageDataUrl = await convertImageToDataUrl(file);
          const imageBytes = await fetch(imageDataUrl).then(res => res.arrayBuffer());
          imageEmbed = await pdfDoc.embedJpg(imageBytes);
        } catch (fallbackError) {
          console.error("Fallback embedding failed:", fallbackError);
          showErrorBanner(`Failed to process image: ${file.name}. Please try a different image.`);
          return;
        }
      }
      
      // Calculate dimensions to fit page while maintaining aspect ratio
      const imageAspectRatio = imageEmbed.width / imageEmbed.height;
      const pageAspectRatio = width / height;
      
      let imageWidth, imageHeight;
      if (imageAspectRatio > pageAspectRatio) {
        // Image is wider than page
        imageWidth = width * 0.9;
        imageHeight = imageWidth / imageAspectRatio;
      } else {
        // Image is taller than page
        imageHeight = height * 0.9;
        imageWidth = imageHeight * imageAspectRatio;
      }
      
      // Center image on page
      const x = (width - imageWidth) / 2;
      const y = (height - imageHeight) / 2;
      
      // Draw image
      page.drawImage(imageEmbed, {
        x: x,
        y: y,
        width: imageWidth,
        height: imageHeight,
      });
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    
    // Download file
    const link = document.createElement("a");
    link.href = url;
    link.download = `images_to_pdf_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showSuccessMessage("Your PDF has been created and saved to your device.");
    console.log("PDF conversion completed successfully");
    
  } catch (error) {
    console.error("Error converting images to PDF:", error);
    showErrorBanner(`Error creating PDF: ${error.message}`);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
    if (saveText) saveText.innerHTML = '<span class="icon icon-download"></span>Convert Images to PDF';
  }
}

// Convert image file to data URL
function convertImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("image-to-pdf.js: DOMContentLoaded event fired.");
  initImageToPdf();
});

// Fallback error and success functions
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