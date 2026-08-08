# Installing Rudra 1.0

Rudra 1.0 is a normal unpacked Chrome extension — it's not on the Chrome Web
Store, so Chrome needs "Developer mode" turned on to load it. This takes
about a minute.

## 1. Unzip it somewhere permanent

Unzip the extension into a folder you won't delete or move later
— Chrome loads the extension directly from this folder every time it
starts, so if you move or delete it, the extension breaks.

A good spot: `Documents/rudra-extension/` (or similar). You should end up
with a folder containing `manifest.json`, `content.js`, etc.

## 2. Open Chrome's extensions page

Type this into your address bar and hit Enter:

```
chrome://extensions
```

## 3. Turn on Developer mode

Top-right corner of that page, there's a **Developer mode** toggle.
Switch it on. Three new buttons will appear: "Load unpacked", "Pack
extension", "Update".

## 4. Load the extension

Click **Load unpacked**, then select the folder (the one with
`manifest.json` directly inside it — not the zip, and not a parent
folder). Chrome will install it immediately, no restart needed.

## 5. Pin it (optional but recommended)

Click the puzzle-piece icon in Chrome's toolbar, find **Rudra 1.0** in the
list, and click the pin icon next to it. Now you'll see Rudra 1.0's icon in
your toolbar at all times, with a badge showing how many flagged clauses
were found on the current page.

## You're done

Visit any site with a cookie banner or a Terms/Privacy Policy page and
Rudra 1.0 will scan it automatically. Click the toolbar icon any time to see
the last scan's results, or to toggle scanning off.

## Updating later

If you ever get a new version of the files, just replace the contents of
the same folder and click the ↻ (reload) icon on Rudra 1.0's card at
`chrome://extensions`. You don't need to remove and re-add it.

## Uninstalling

Go to `chrome://extensions`, find Rudra 1.0, click **Remove**. Deleting the
folder from your computer alone won't remove it from Chrome —
always remove it from the extensions page first.

## Troubleshooting

- **"Manifest file is missing or unreadable"** — you selected the wrong
  folder. Make sure you picked the folder that directly contains
  `manifest.json`.
- **Nothing happens on a page** — check the toggle in the popup (click
  the toolbar icon) to make sure scanning is enabled, and check
  `chrome://extensions` to make sure Rudra 1.0's card doesn't show an "Errors"
  button (click it if it does — it'll show what broke).
- **Icon looks blank/broken** — make sure the `icons` folder was included
  when you unzipped (it should sit next to `manifest.json`).
