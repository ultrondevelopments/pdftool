// Background script for the PDF Tools extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("PDF Tools extension installed")
})

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html"),
  })
})
