// Service worker for background tasks, caching, and server communication

chrome.runtime.onInstalled.addListener(() => {
  console.log("Real U Extension Installed and Ready.");
  
  // Initialize local cache for fast lookup
  chrome.storage.local.set({ analysisCache: {} });
});

// Mock Server Communication & Caching Layer
// In reality, this would intercept requests, query the Real U backend API, 
// checking if hashed media/text was already fact-checked (cache memory), 
// or initiate a new AI crawl using Gemini / other LLMs.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CHECK_CACHE") {
    // Example of caching logic
    chrome.storage.local.get(['analysisCache'], (result) => {
      if (result.analysisCache[request.url]) {
        sendResponse({ cached: true, data: result.analysisCache[request.url] });
      } else {
        sendResponse({ cached: false });
      }
    });
    return true;
  }
});
