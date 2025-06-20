document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("openMerger").addEventListener("click", () => {
    browser.tabs.create({
      url: browser.runtime.getURL("index.html#merge"),
    })
    window.close()
  })

  document.getElementById("openSplitter").addEventListener("click", () => {
    browser.tabs.create({
      url: browser.runtime.getURL("index.html#split"),
    })
    window.close()
  })

  document.getElementById("openFillSign").addEventListener("click", () => {
    browser.tabs.create({
      url: browser.runtime.getURL("index.html#fillSign"),
    })
    window.close()
  })

  document.getElementById("openImageToPdf").addEventListener("click", () => {
    browser.tabs.create({
      url: browser.runtime.getURL("index.html#imageToPdf"),
    })
    window.close()
  })
})

function openTab(hash) {
  browser.tabs.create({
    url: browser.runtime.getURL(`index.html#${hash}`),
  });
}

document.getElementById('mergeTabBtn').addEventListener('click', () => openTab('merge'));
document.getElementById('splitTabBtn').addEventListener('click', () => openTab('split'));
document.getElementById('fillSignTabBtn').addEventListener('click', () => openTab('fillSign'));
document.getElementById('imageToPdfTabBtn').addEventListener('click', () => openTab('imageToPdf'));
