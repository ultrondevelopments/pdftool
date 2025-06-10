// Global variables
let selectedFiles = []
let draggedIndex = null
let splitPdfFile = null
let splitPdfDocument = null
let splitPdfPageCount = 0

// Check if PDF.js is loaded
function checkPDFJS() {
  if (typeof pdfjsLib === "undefined") {
    showErrorBanner("PDF.js not loaded! Please download pdf.js and pdf.worker.js.")
    return false
  }
  return true
}

// Check if PDF-lib is loaded
function checkPDFLib() {
  if (typeof PDFLib === "undefined" || !PDFLib.PDFDocument || !PDFLib.PDFDocument.create) {
    showErrorBanner("PDF-lib not loaded! Please download pdf-lib.min.js.")
    return false
  }
  return true
}

// Check if JSZip is loaded
function checkJSZip() {
  if (typeof JSZip === "undefined") {
    showErrorBanner("JSZip not loaded! Please download jszip.min.js.")
    return false
  }
  return true
}

function showErrorBanner(message) {
  // Remove existing error banner if any
  const existingBanner = document.querySelector(".error-banner")
  if (existingBanner) {
    existingBanner.remove()
  }

  const errorDiv = document.createElement("div")
  errorDiv.className = "error-banner"
  errorDiv.innerHTML = `
        <strong>Error!</strong><br>
        ${message}
    `
  document.body.appendChild(errorDiv)

  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove()
  }, 5000)
}

function showSuccessMessage(message) {
  const successDiv = document.createElement("div")
  successDiv.className = "success-banner"
  successDiv.innerHTML = `
    <strong>✅ Success!</strong> ${message}
  `
  document.body.appendChild(successDiv)

  setTimeout(() => {
    successDiv.remove()
  }, 3000)
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners()
  handleURLParams()
  
  // Wait for all scripts to load
  window.addEventListener('load', () => {
    setTimeout(() => {
      checkPDFLib()
      checkJSZip()
      checkPDFJS()
    }, 500) // Increased timeout to ensure libraries are loaded
  })
})

function setupEventListeners() {
  // Tab switching
  document.getElementById("mergeTab").addEventListener("click", () => switchTab("merge"))
  document.getElementById("splitTab").addEventListener("click", () => switchTab("split"))
  document.getElementById("fillSignTab").addEventListener("click", () => switchTab("fillSign"))

  // Merge mode
  const uploadZone = document.getElementById("uploadZone")
  const fileInput = document.getElementById("fileInput")
  const mergeBtn = document.getElementById("mergeBtn")
  const fileList = document.getElementById("fileList")

  // Upload zone events
  uploadZone.addEventListener("click", () => fileInput.click())
  uploadZone.addEventListener("dragover", handleDragOver)
  uploadZone.addEventListener("dragleave", handleDragLeave)
  uploadZone.addEventListener("drop", handleFileDrop)

  // File input event
  fileInput.addEventListener("change", handleFileSelect)

  // Merge button event
  mergeBtn.addEventListener("click", mergePDFs)

  // Event delegation for dynamically created file items
  fileList.addEventListener("click", handleFileListClick)
  fileList.addEventListener("dragstart", handleFileListDragStart)
  fileList.addEventListener("dragover", handleFileListDragOver)
  fileList.addEventListener("drop", handleFileListDrop)
  fileList.addEventListener("dragend", handleFileListDragEnd)

  // Split mode
  const splitUploadZone = document.getElementById("splitUploadZone")
  const splitFileInput = document.getElementById("splitFileInput")
  const splitBtn = document.getElementById("splitBtn")

  // Split upload zone events
  splitUploadZone.addEventListener("click", () => splitFileInput.click())
  splitUploadZone.addEventListener("dragover", handleDragOver)
  splitUploadZone.addEventListener("dragleave", handleDragLeave)
  splitUploadZone.addEventListener("drop", handleSplitFileDrop)

  // Split file input event
  splitFileInput.addEventListener("change", handleSplitFileSelect)

  // Split button event
  splitBtn.addEventListener("click", splitPDF)

  // Split options
  document.getElementById("splitAll").addEventListener("change", updateSplitOptions)
  document.getElementById("splitRange").addEventListener("change", updateSplitOptions)
}

function switchTab(mode) {
  // Update tab buttons
  document.getElementById("mergeTab").classList.toggle("active", mode === "merge")
  document.getElementById("splitTab").classList.toggle("active", mode === "split")
  document.getElementById("fillSignTab").classList.toggle("active", mode === "fillSign")

  // Show/hide containers
  document.getElementById("mergeMode").classList.toggle("hidden", mode !== "merge")
  document.getElementById("splitMode").classList.toggle("hidden", mode !== "split")
  document.getElementById("fillSignMode").classList.toggle("hidden", mode !== "fillSign")
}

function updateSplitOptions() {
  const rangeInput = document.getElementById("rangeInputContainer")
  if (document.getElementById("splitRange").checked) {
    rangeInput.style.display = "block"
  } else {
    rangeInput.style.display = "none"
  }
}

// Merge mode functions
function handleDragOver(e) {
  e.preventDefault()
  e.currentTarget.classList.add("dragover")
}

function handleDragLeave(e) {
  e.preventDefault()
  e.currentTarget.classList.remove("dragover")
}

function handleFileDrop(e) {
  e.preventDefault()
  e.currentTarget.classList.remove("dragover")
  handleFileUpload(e.dataTransfer.files)
}

function handleFileSelect(e) {
  handleFileUpload(e.target.files)
}

function handleFileUpload(files) {
  Array.from(files).forEach((file) => {
    if (file.type === "application/pdf") {
      selectedFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        file: file,
        name: file.name,
        size: formatFileSize(file.size),
      })
    }
  })
  updateFileList()
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function updateFileList() {
  const fileListCard = document.getElementById("fileListCard")
  const fileList = document.getElementById("fileList")
  const fileCount = document.getElementById("fileCount")
  const mergeCard = document.getElementById("mergeCard")

  fileCount.textContent = selectedFiles.length

  if (selectedFiles.length === 0) {
    fileListCard.classList.remove("show")
    mergeCard.classList.remove("show")
    return
  }

  fileListCard.classList.add("show")
  mergeCard.classList.toggle("show", selectedFiles.length > 1)

  fileList.innerHTML = selectedFiles
    .map(
      (file, index) => `
        <div class="file-item" 
             draggable="true" 
             data-index="${index}"
             data-file-id="${file.id}">
            <div class="grip-icon icon-grip"></div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-size">${file.size}</div>
            </div>
            <div class="file-number">#${index + 1}</div>
            <button class="remove-btn" data-file-id="${file.id}" type="button">
                <span class="icon-x"></span>
            </button>
        </div>
    `,
    )
    .join("")
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// Event delegation handlers
function handleFileListClick(e) {
  if (e.target.closest(".remove-btn")) {
    const fileId = e.target.closest(".remove-btn").getAttribute("data-file-id")
    removeFile(fileId)
  }
}

function handleFileListDragStart(e) {
  const fileItem = e.target.closest(".file-item")
  if (fileItem) {
    draggedIndex = Number.parseInt(fileItem.getAttribute("data-index"))
    fileItem.classList.add("dragging")
  }
}

function handleFileListDragOver(e) {
  e.preventDefault()
}

function handleFileListDrop(e) {
  e.preventDefault()
  const fileItem = e.target.closest(".file-item")
  if (fileItem && draggedIndex !== null) {
    const dropIndex = Number.parseInt(fileItem.getAttribute("data-index"))
    if (draggedIndex !== dropIndex) {
      const draggedFile = selectedFiles[draggedIndex]
      selectedFiles.splice(draggedIndex, 1)
      selectedFiles.splice(dropIndex, 0, draggedFile)
      updateFileList()
    }
  }
  draggedIndex = null
}

function handleFileListDragEnd(e) {
  const draggingElement = document.querySelector(".dragging")
  if (draggingElement) {
    draggingElement.classList.remove("dragging")
  }
  draggedIndex = null
}

function removeFile(id) {
  selectedFiles = selectedFiles.filter((file) => file.id !== id)
  updateFileList()
}

async function mergePDFs() {
  if (selectedFiles.length < 2) return

  if (!checkPDFLib()) {
    return
  }

  const mergeBtn = document.getElementById("mergeBtn")
  const mergeText = document.getElementById("mergeText")

  mergeBtn.disabled = true
  mergeText.innerHTML = '<div class="spinner"></div>Processing...'

  try {
    const mergedPdf = await PDFLib.PDFDocument.create()

    for (const pdfFile of selectedFiles) {
      const arrayBuffer = await pdfFile.file.arrayBuffer()
      const pdf = await PDFLib.PDFDocument.load(arrayBuffer)
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((page) => mergedPdf.addPage(page))
    }

    const pdfBytes = await mergedPdf.save()
    const blob = new Blob([pdfBytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = "merged-document.pdf"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Show success message
    showSuccessMessage("Your PDF has been merged and saved to your device.")
  } catch (error) {
    console.error("Error merging PDFs:", error)
    showErrorBanner("Error merging PDFs. Please try again.")
  } finally {
    mergeBtn.disabled = false
    mergeText.innerHTML = '<span class="icon icon-download"></span>Merge & Save PDF to Device'
  }
}

// Split mode functions
function handleSplitFileDrop(e) {
  e.preventDefault()
  e.currentTarget.classList.remove("dragover")
  if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type === "application/pdf") {
    handleSplitFileUpload(e.dataTransfer.files[0])
  } else {
    showErrorBanner("Please select a valid PDF file.")
  }
}

function handleSplitFileSelect(e) {
  if (e.target.files.length > 0) {
    handleSplitFileUpload(e.target.files[0])
  }
}

async function handleSplitFileUpload(file) {
  if (file.type !== "application/pdf") {
    showErrorBanner("Please select a valid PDF file.")
    return
  }

  try {
    // Store the file
    splitPdfFile = file

    // Load the PDF document
    const arrayBuffer = await file.arrayBuffer()
    splitPdfDocument = await PDFLib.PDFDocument.load(arrayBuffer)
    splitPdfPageCount = splitPdfDocument.getPageCount()

    // Update UI
    document.getElementById("pdfFileName").textContent = file.name
    document.getElementById("pdfPageCount").textContent = splitPdfPageCount
    document.getElementById("pdfPreviewCard").classList.add("show")
    document.getElementById("splitActionCard").classList.remove("hidden")

    // Initialize split options
    updateSplitOptions()
  } catch (error) {
    console.error("Error loading PDF:", error)
    showErrorBanner("Error loading PDF. The file might be corrupted or password protected.")
  }
}

async function splitPDF() {
  if (!splitPdfDocument || !checkPDFLib() || !checkJSZip()) {
    return
  }

  const splitBtn = document.getElementById("splitBtn")
  const splitText = document.getElementById("splitText")

  splitBtn.disabled = true
  splitText.innerHTML = '<div class="spinner"></div>Processing...'

  try {
    const zip = new JSZip()
    const splitOption = document.querySelector('input[name="splitOption"]:checked').value
    const fileName = splitPdfFile.name.replace(".pdf", "")

    if (splitOption === "all") {
      // Split into individual pages
      for (let i = 0; i < splitPdfPageCount; i++) {
        const newPdf = await PDFLib.PDFDocument.create()
        const [copiedPage] = await newPdf.copyPages(splitPdfDocument, [i])
        newPdf.addPage(copiedPage)

        const pdfBytes = await newPdf.save()
        zip.file(`${fileName}_page_${i + 1}.pdf`, pdfBytes)
      }
    } else if (splitOption === "range") {
      // Split by page ranges
      const rangeInput = document.getElementById("pageRanges").value.trim()

      if (!rangeInput) {
        showErrorBanner("Please enter valid page ranges.")
        splitBtn.disabled = false
        splitText.innerHTML = '<span class="icon icon-download"></span>Split & Save PDFs to Device'
        return
      }

      const ranges = parsePageRanges(rangeInput, splitPdfPageCount)

      if (ranges.length === 0) {
        showErrorBanner("Please enter valid page ranges.")
        splitBtn.disabled = false
        splitText.innerHTML = '<span class="icon icon-download"></span>Split & Save PDFs to Device'
        return
      }

      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i]
        const newPdf = await PDFLib.PDFDocument.create()

        // Convert from 1-based to 0-based page indices
        const pageIndices = range.map((pageNum) => pageNum - 1)
        const copiedPages = await newPdf.copyPages(splitPdfDocument, pageIndices)

        copiedPages.forEach((page) => newPdf.addPage(page))

        const pdfBytes = await newPdf.save()
        zip.file(`${fileName}_pages_${range[0]}-${range[range.length - 1]}.pdf`, pdfBytes)
      }
    }

    // Generate and download the zip file
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(zipBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `${fileName}_split.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Show success message
    showSuccessMessage("Your PDF has been split and saved as a ZIP file to your device.")
  } catch (error) {
    console.error("Error splitting PDF:", error)
    showErrorBanner("Error splitting PDF. Please try again.")
  } finally {
    splitBtn.disabled = false
    splitText.innerHTML = '<span class="icon icon-download"></span>Split & Save PDFs to Device'
  }
}

function parsePageRanges(input, maxPages) {
  const ranges = []
  const parts = input.split(",")

  for (const part of parts) {
    const trimmedPart = part.trim()

    if (trimmedPart.includes("-")) {
      // Range like "1-5"
      const [start, end] = trimmedPart.split("-").map((num) => Number.parseInt(num.trim(), 10))

      if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
        continue
      }

      const range = []
      for (let i = start; i <= end; i++) {
        range.push(i)
      }
      ranges.push(range)
    } else {
      // Single page like "3"
      const pageNum = Number.parseInt(trimmedPart, 10)

      if (isNaN(pageNum) || pageNum < 1 || pageNum > maxPages) {
        continue
      }

      ranges.push([pageNum])
    }
  }

  return ranges
}

// Handle URL parameters to set initial tab
function handleURLParams() {
  const urlParams = new URLSearchParams(window.location.search)
  const mode = urlParams.get("mode")

  if (mode === "split") {
    switchTab("split")
  } else if (mode === "fillSign") {
    switchTab("fillSign")
  } else {
    switchTab("merge")
  }
}
