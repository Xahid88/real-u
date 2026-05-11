// This runs in the context of the webpage
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ANALYZE_PAGE") {
    console.log("Real U: Content script received analysis request.");
    
    // 1. Extract context
    const images = document.querySelectorAll('img').length;
    const videos = document.querySelectorAll('video').length;
    
    // Get text content but limit length to avoid massive payloads
    // We get innerText from body to grab visible text
    let textContent = document.body.innerText || "";
    if (textContent.length > 5000) {
      textContent = textContent.substring(0, 5000);
    }
    
    console.log("Real U: Extracted page data.", { images, videos, textLength: textContent.length });

    // Send summary back to popup
    sendResponse({ 
      images, 
      videos, 
      textContent, 
      title: document.title 
    });
  }
  return true; // Keep message channel open for async response
});
