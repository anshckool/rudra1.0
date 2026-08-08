// content.js — runs on every page.
// 1) Decides if the current page looks like a Terms/Privacy/Cookie surface.
// 2) Scans visible text for risky clauses using RISK_PATTERNS.
// 3) Intercepts "Accept/Agree" style buttons and shows a warning first.

(() => {
  if (window.__rudraInjected) return;
  window.__rudraInjected = true;

  const CONSENT_BTN_REGEX = /^(accept( all)?( cookies)?|accept necessary( cookies)?|agree|i agree|allow all( cookies)?|allow cookies|got it|ok(,)? got it|yes, i agree|i understand|save preferences|save choices|accept choices)$/i;
  const POLICY_HINT_REGEX = /(terms( and | & )?conditions|terms of (service|use)|privacy (policy|notice|statement)|cookie (policy|notice|statement)|eula|end user license)/i;

  let settings = { enabled: true, mode: "warn" }; // mode: "warn" or "block"

  chrome.storage.local.get(["rudra_settings"], (res) => {
    if (res.rudra_settings) settings = { ...settings, ...res.rudra_settings };
  });

  function getSentences(text) {
    // Normalize: collapse newlines and extra whitespace into single spaces
    // so multi-line sentences don't get split prematurely
    const normalized = text.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ');
    return normalized.match(/[^.!?]{20,600}[.!?]?/g) || [];
  }

  // Phrases that negate a risk (e.g. "we do NOT collect data from children")
  const NEGATION_REGEX = /\b(do not|does not|don't|doesn't|never|no|nor|not|will not|won't|cannot|isn't|aren't|is not|are not)\b/i;

  // Some patterns should be ignored when the sentence clearly says "we don't do this"
  const NEGATION_SAFE_IDS = new Set([
    "sell-data", "tracking", "minors-data", "location-tracking", "ad-cookies", "indefinite-retention"
  ]);

  function scanText(text) {
    const sentences = getSentences(text);
    const found = new Map(); // id -> {label, severity, count, example}
    for (const sentence of sentences) {
      for (const pattern of RISK_PATTERNS) {
        if (pattern.regex.test(sentence)) {
          // If this pattern type can be negated, check for negation words nearby
          if (NEGATION_SAFE_IDS.has(pattern.id)) {
            const lowerSentence = sentence.toLowerCase();
            // Check if negation words appear before the matched keyword
            const keywordMatch = lowerSentence.match(pattern.regex);
            if (keywordMatch) {
              const keywordPos = lowerSentence.indexOf(keywordMatch[0]);
              // Look at the 60 chars before the keyword for negation
              const prefix = lowerSentence.slice(Math.max(0, keywordPos - 60), keywordPos);
              if (NEGATION_REGEX.test(prefix)) {
                continue; // Skip — sentence says they DON'T do this
              }
            }
          }

          if (!found.has(pattern.id)) {
            found.set(pattern.id, {
              label: pattern.label,
              severity: pattern.severity,
              count: 0,
              example: sentence.trim().slice(0, 180),
              fullSentence: sentence.trim()
            });
          }
          found.get(pattern.id).count++;
        }
      }
    }
    return Array.from(found.values()).sort((a, b) => b.severity - a.severity);
  }

  function scoreToVerdict(risks) {
    const score = risks.reduce((s, r) => s + r.severity * Math.min(r.count, 3), 0);
    if (score === 0) return "clean";
    if (score <= 3) return "low";
    if (score <= 8) return "medium";
    return "high";
  }

  function pageLooksLikePolicy() {
    const titleMatch = POLICY_HINT_REGEX.test(document.title);
    const urlMatch = POLICY_HINT_REGEX.test(location.href);
    const h1s = Array.from(document.querySelectorAll("h1, h2")).slice(0, 8);
    const headingMatch = h1s.some((h) => POLICY_HINT_REGEX.test(h.textContent || ""));
    return titleMatch || urlMatch || headingMatch;
  }

  function getMainText(scope) {
    const root = scope || document.body;
    return (root.innerText || "").slice(0, 200000); // cap for performance
  }

  function saveResult(risks, verdict, sourceLabel) {
    const domain = location.hostname;
    chrome.storage.local.set({
      [`rudra_last_${domain}`]: {
        risks,
        verdict,
        sourceLabel,
        url: location.href,
        timestamp: Date.now()
      }
    });
    chrome.runtime.sendMessage({
      type: "RUDRA_SCAN_RESULT",
      count: risks.length,
      verdict
    }, () => {
      // Suppress "Receiving end does not exist" when background service worker is inactive
      void chrome.runtime.lastError;
    });
  }

  function scrollToText(text) {
    if (!text) return;

    // Remove any previous Rudra highlights
    document.querySelectorAll('.mike-highlight').forEach(el => {
      el.classList.remove('mike-highlight');
    });

    const lowerText = text.toLowerCase().trim();
    if (!lowerText) return;

    // Build a list of search queries to try, from most specific to least:
    // 1. First 50 chars (works when text is in one node)
    // 2. Middle portion (skip heading that might be a separate element)
    // 3. Last 50 chars
    // 4. Shorter snippets from different positions
    const queries = [];
    if (lowerText.length > 10) queries.push(lowerText.slice(0, 50));
    if (lowerText.length > 60) queries.push(lowerText.slice(20, 70));
    if (lowerText.length > 50) queries.push(lowerText.slice(-50));
    if (lowerText.length > 30) queries.push(lowerText.slice(10, 40));
    // Try to extract a meaningful phrase — skip first word (often a heading) and grab the next chunk
    const words = lowerText.split(/\s+/);
    if (words.length > 4) queries.push(words.slice(1, 8).join(' '));
    if (words.length > 6) queries.push(words.slice(2, 10).join(' '));
    // Last resort: short snippets
    queries.push(lowerText.slice(0, 25));
    if (lowerText.length > 30) queries.push(lowerText.slice(15, 40));

    let matchNode = null;

    for (const query of queries) {
      if (!query || query.length < 10) continue;

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            if (node.parentElement && node.parentElement.closest('.mike-overlay, .mike-banner, .mike-card')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      while (walker.nextNode()) {
        const nodeText = walker.currentNode.textContent.toLowerCase();
        if (nodeText.indexOf(query) !== -1) {
          matchNode = walker.currentNode;
          break;
        }
      }

      if (matchNode) break; // Found it, stop trying
    }

    if (!matchNode) return;

    // Walk up to the nearest block-level parent (p, div, li, td, section, article, blockquote)
    const blockTags = new Set(['P', 'DIV', 'LI', 'TD', 'TH', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'DD', 'DT', 'FIGCAPTION']);
    let targetEl = matchNode.parentElement;
    while (targetEl && !blockTags.has(targetEl.tagName)) {
      targetEl = targetEl.parentElement;
    }
    if (!targetEl) {
      targetEl = matchNode.parentElement;
    }

    // Add highlight class to the full block element
    targetEl.classList.add('mike-highlight');

    // Scroll to it
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Auto-remove highlight after 6 seconds
    setTimeout(() => {
      targetEl.classList.remove('mike-highlight');
    }, 6000);
  }

  // ---------- Modal UI ----------
  function buildModal(risks, verdict, onProceed, onCancel) {
    const overlay = document.createElement("div");
    overlay.className = "mike-overlay";

    const card = document.createElement("div");
    card.className = "mike-card";

    const header = document.createElement("div");
    header.className = `mike-header mike-${verdict}`;
    header.innerHTML = `<span class="mike-shield">👔</span> <span>Rudra 1.0 — ${verdictLabel(verdict)}</span>`;
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "mike-body";

    if (risks.length === 0) {
      body.innerHTML = `<p class="mike-clean">No red-flag clauses matched our checklist. That doesn't guarantee the terms are fine — just that nothing on our list was found. Read carefully if it matters to you.</p>`;
    } else {
      const intro = document.createElement("p");
      intro.textContent = `Found ${risks.length} potentially concerning clause${risks.length > 1 ? "s" : ""} before you accept:`;
      body.appendChild(intro);

      const list = document.createElement("ul");
      list.className = "mike-list";
      risks.forEach((r) => {
        const li = document.createElement("li");
        li.className = `mike-item mike-sev-${r.severity}`;
        li.innerHTML = `<div class="mike-item-label">${escapeHtml(r.label)}</div>
          <div class="mike-item-example">"${escapeHtml(r.example)}${r.example.length >= 180 ? "…" : ""}"</div>`;
        li.onclick = () => scrollToText(r.fullSentence);
        list.appendChild(li);
      });
      body.appendChild(list);
    }
    card.appendChild(body);

    const footer = document.createElement("div");
    footer.className = "mike-footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "mike-btn mike-btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => {
      overlay.remove();
      onCancel && onCancel();
    };

    const proceedBtn = document.createElement("button");
    proceedBtn.className = "mike-btn mike-btn-primary";
    proceedBtn.textContent = risks.length ? "Proceed anyway" : "Looks fine, close this";
    proceedBtn.onclick = () => {
      overlay.remove();
      onProceed && onProceed();
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(proceedBtn);
    card.appendChild(footer);

    overlay.appendChild(card);
    return overlay;
  }

  function verdictLabel(v) {
    return { clean: "Looks clean", low: "Low concern", medium: "Medium concern", high: "High concern" }[v] || "Reviewed";
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // ---------- Consent button interception ----------
  const warnedThisPage = new WeakSet();
  let modalOpen = false;

  function closeAnyOpenOverlay() {
    document.querySelectorAll(".mike-overlay").forEach((el) => el.remove());
    modalOpen = false;
  }

  function openModal(risks, verdict, onProceed, onCancel) {
    closeAnyOpenOverlay(); // guarantee only one overlay ever exists at a time
    modalOpen = true;
    const modal = buildModal(
      risks,
      verdict,
      () => {
        modalOpen = false;
        onProceed && onProceed();
      },
      () => {
        modalOpen = false;
        onCancel && onCancel();
      }
    );
    document.documentElement.appendChild(modal);
  }

  function isConsentButton(el) {
    if (!el || !el.textContent) return false;
    const text = el.textContent.trim();
    if (text.length > 40) return false;
    return CONSENT_BTN_REGEX.test(text);
  }

  function findConsentContainer(el) {
    // Walk up a few levels to find a plausible banner/dialog container.
    let node = el;
    for (let i = 0; i < 6 && node; i++) {
      if (node.getAttribute && (node.getAttribute("role") === "dialog" || node.getAttribute("role") === "alertdialog")) return node;
      if (node.id && /cookie|consent|gdpr|privacy/i.test(node.id)) return node;
      if (node.className && typeof node.className === "string" && /cookie|consent|gdpr|privacy/i.test(node.className)) return node;
      node = node.parentElement;
    }
    return el.closest("div") || document.body;
  }

  function handleConsentClick(e) {
    if (!settings.enabled) return;
    // Never intercept clicks on our own UI (this was the root cause of the
    // "screen goes black" bug: our own "Continue" button text matched the
    // same consent-word regex, so clicking it re-triggered the interceptor
    // and stacked a fresh overlay on top instead of closing).
    if (e.target.closest(".mike-overlay, .mike-banner")) return;
    if (modalOpen) return; // a review modal is already up — ignore further clicks until it's resolved

    const target = e.target.closest("button, a, [role='button'], input[type='button'], input[type='submit']");
    if (!target || !isConsentButton(target)) return;
    if (warnedThisPage.has(target)) return; // already reviewed, let it through

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const container = findConsentContainer(target);
    const scopeText = getMainText(container).length > 60 ? getMainText(container) : getMainText(document.body);
    const risks = scanText(scopeText);
    const verdict = scoreToVerdict(risks);
    saveResult(risks, verdict, "Cookie/consent prompt");

    openModal(
      risks,
      verdict,
      () => {
        warnedThisPage.add(target);
        target.click();
      },
      () => {}
    );
  }

  document.addEventListener("click", handleConsentClick, true);

  // ---------- Full-page Terms/Privacy scan ----------
  function scanFullPageIfPolicy() {
    if (!settings.enabled) return;
    if (!pageLooksLikePolicy()) return;
    const text = getMainText(document.body);
    if (text.length < 500) return; // too short to be a real policy
    const risks = scanText(text);
    const verdict = scoreToVerdict(risks);
    saveResult(risks, verdict, "Full page scan");

    // Show a small badge banner (not a blocking modal) for full policy pages.
    const banner = document.createElement("div");
    banner.className = `mike-banner mike-${verdict}`;
    banner.innerHTML = `<span class="mike-shield">👔</span> Rudra 1.0 found <b>${risks.length}</b> flagged clause${risks.length === 1 ? "" : "s"} on this page. <button class="mike-banner-btn">Details</button> <button class="mike-banner-close">✕</button>`;
    document.documentElement.appendChild(banner);

    banner.querySelector(".mike-banner-btn").onclick = () => {
      openModal(risks, verdict, () => {}, () => {});
    };
    banner.querySelector(".mike-banner-close").onclick = () => banner.remove();

    setTimeout(() => banner.classList.add("mike-banner-show"), 50);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(scanFullPageIfPolicy, 400);
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(scanFullPageIfPolicy, 400));
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "SCROLL_TO_TEXT") {
      scrollToText(msg.text);
    }
  });
})();
