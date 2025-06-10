document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("openMerger").addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html"),
    })
    window.close()
  })

  document.getElementById("openSplitter").addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html?mode=split"),
    })
    window.close()
  })

  document.getElementById("openFillSign").addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html?mode=fillSign"),
    })
    window.close()
  })
})
