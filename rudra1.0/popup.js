const VERDICT_TEXT = {
  clean: "No red flags found",
  low: "Low concern",
  medium: "Medium concern",
  high: "High concern"
};

function render(result) {
  const content = document.getElementById("content");
  if (!result) {
    content.innerHTML = `<p class="muted">No scan yet on this page. Visit a Terms/Privacy page or click an "Accept" cookie prompt to trigger a scan.</p>`;
    return;
  }

  const { risks, verdict, sourceLabel, timestamp } = result;
  const when = new Date(timestamp).toLocaleString();

  let html = `
    <div class="verdict-row">
      <span class="verdict-dot ${verdict}"></span>
      <span class="verdict-text">${VERDICT_TEXT[verdict] || "Reviewed"}</span>
    </div>
    <div class="source-label">${sourceLabel || "Scan"} • ${when}</div>
  `;

  if (risks.length === 0) {
    html += `<p class="muted">Nothing on our checklist matched. Always fine to skim the real thing.</p>`;
  } else {
    html += risks.map((r, i) => `<div class="risk-item" data-index="${i}">⚠ ${escapeHtml(r.label)}</div>`).join("");
  }

  content.innerHTML = html;

  if (risks && risks.length > 0) {
    const items = content.querySelectorAll('.risk-item');
    items.forEach((item, i) => {
      item.onclick = () => {
        const risk = risks[i];
        const textToFind = risk.fullSentence || risk.example;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) return;
          const tabId = tabs[0].id;

          // Try sending the message; if content script isn't loaded, inject it first
          chrome.tabs.sendMessage(tabId, { type: "SCROLL_TO_TEXT", text: textToFind }, (response) => {
            if (chrome.runtime.lastError) {
              // Content script not loaded — inject it, then retry
              chrome.scripting.executeScript(
                { target: { tabId: tabId }, files: ["risk-patterns.js", "content.js"] },
                () => {
                  if (chrome.runtime.lastError) return; // can't inject (e.g. chrome:// page)
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, { type: "SCROLL_TO_TEXT", text: textToFind }, () => {
                      void chrome.runtime.lastError; // suppress any remaining error
                    });
                  }, 300);
                }
              );
            }
          });
        });
      };
    });
  }
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url) {
    render(null);
    return;
  }
  let domain;
  try {
    domain = new URL(tab.url).hostname;
  } catch (e) {
    render(null);
    return;
  }
  chrome.storage.local.get([`rudra_last_${domain}`, "rudra_settings"], (res) => {
    render(res[`rudra_last_${domain}`]);
    const settings = res.rudra_settings || { enabled: true };
    document.getElementById("enabledToggle").checked = settings.enabled !== false;
  });
});

document.getElementById("enabledToggle").addEventListener("change", (e) => {
  chrome.storage.local.get(["rudra_settings"], (res) => {
    const settings = res.rudra_settings || {};
    settings.enabled = e.target.checked;
    chrome.storage.local.set({ rudra_settings: settings });
  });
});
