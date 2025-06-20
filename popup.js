document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("openMerger").addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html#merge"),
    })
    window.close()
  })

  document.getElementById("openSplitter").addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html#split"),
    })
    window.close()
  })

  document.getElementById("openFillSign").addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html#fillSign"),
    })
    window.close()
  })

  document.getElementById("openImageToPdf").addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html#imageToPdf"),
    })
    window.close()
  })
})
