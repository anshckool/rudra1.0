chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "RUDRA_SCAN_RESULT" && sender.tab && sender.tab.id != null) {
    const colors = { clean: "#2f9e44", low: "#f08c00", medium: "#e8590c", high: "#c92a2a" };
    
    // Use callbacks and check lastError to safely suppress "tab closed" errors
    try {
      chrome.action.setBadgeText({
        tabId: sender.tab.id,
        text: msg.count > 0 ? String(msg.count) : ""
      }, () => {
        const _ = chrome.runtime.lastError; // Accessing it clears the unhandled error
      });
      
      chrome.action.setBadgeBackgroundColor({
        tabId: sender.tab.id,
        color: colors[msg.verdict] || "#868e96"
      }, () => {
        const _ = chrome.runtime.lastError; // Accessing it clears the unhandled error
      });
    } catch (err) {
      // Ignore synchronous errors
    }
  }
});
