// Background script for the PDF Tools extension
browser.runtime.onInstalled.addListener(() => {
  console.log("PDF Tools extension installed")
})

// Handle extension icon click
browser.action.onClicked.addListener((tab) => {
  browser.tabs.create({
    url: browser.runtime.getURL("index.html"),
  })
})
