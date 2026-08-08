# Rudra 1.0

A Chrome extension that scans Terms & Conditions / Privacy Policy pages and
cookie-consent popups for common risky clauses, and shows you a warning
**before** your click on "Accept"/"Agree" actually goes through.

Everything runs locally in the browser using a fixed regex/keyword
checklist — no network calls, no API key, no data collection.

## What it flags

Data selling/sharing, arbitration/class-action waivers, terms that can
change without notice, broad perpetual licenses to your content,
auto-renewing charges, "as-is"/no-warranty disclaimers, indefinite data
retention, cross-site tracking/fingerprinting, sharing with law
enforcement, no-refund policies, children's data collection, precise
location tracking, targeted ad cookies, at-will account termination, and
distant governing-law clauses. See `risk-patterns.js` to edit or extend
the list.

## Install

See `INSTALL.md` for a step-by-step walkthrough of loading this as an
unpacked extension in Chrome.

## How it works

- **Cookie/consent popups:** the content script watches for clicks on
  buttons whose text looks like "Accept", "Agree", "Allow all", "Got it",
  etc. It intercepts the click, scans the surrounding banner (or the full
  page if the banner text is too short/generic) against the checklist,
  and shows a modal with what it found. Clicking "Proceed anyway" lets
  the original click through.
- **Full Terms/Privacy pages:** if the page title, URL, or headings look
  like a Terms/Privacy/Cookie policy, it scans the whole page on load and
  shows a small dismissible banner (not blocking) summarizing what it
  found, with a "Details" button for the full modal.
- The badge on the toolbar icon shows the number of flagged clauses found
  on the current tab's last scan.
- Click the extension icon to see the same summary, or to disable
  scanning for the current device.

## Fixed: the "screen goes black" bug

Earlier versions had a bug where, after a cookie-consent scan came back
clean and you clicked the button to dismiss the warning, the screen
would get progressively darker with each click. Cause: that dismiss
button was labeled "Continue," which happened to match the same
regex Rudra 1.0 uses to detect real "Accept/Agree" cookie buttons — and
since Rudra 1.0's click listener runs before the button's own click handler,
clicking "Continue" was re-triggering the interceptor on itself,
stacking a new dark overlay on top instead of closing the old one.

Fixed by: making Rudra 1.0 ignore clicks that originate inside its own popup
UI, guaranteeing only one overlay can ever exist at a time, and renaming
the button so it can't collide with a consent-word pattern again.

## Known limitations (worth knowing)

- It's keyword/regex-based, not a language model — it can miss clauses
  phrased unusually, and can occasionally flag boilerplate that isn't
  actually concerning. Treat the warnings as "worth a second look," not
  a legal verdict.
- Single-page apps that render consent banners inside closed shadow DOM
  or cross-origin iframes may not be scannable (browser security
  prevents reading into most cross-origin iframes).
- It only intercepts buttons with clearly consent-like text
  (Accept/Agree/Allow all/etc.) — a site using unusual wording may slip
  through.

## Ideas for extending it

- Add more patterns to `risk-patterns.js`.
- Add a per-domain "always trust" allowlist in `options.html`/`options.js`.
- Swap the local heuristic for a real language-model summary by adding a
  fetch call to an LLM API from `content.js` (would need a settings field
  for an API key and careful handling of that key).
