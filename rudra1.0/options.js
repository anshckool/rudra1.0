const enabledEl = document.getElementById("enabled");
const modeEl = document.getElementById("mode");

chrome.storage.local.get(["rudra_settings"], (res) => {
  const settings = res.rudra_settings || { enabled: true, mode: "warn" };
  enabledEl.checked = settings.enabled !== false;
  modeEl.value = settings.mode || "warn";
});

function save() {
  chrome.storage.local.set({
    rudra_settings: {
      enabled: enabledEl.checked,
      mode: modeEl.value
    }
  });
}

enabledEl.addEventListener("change", save);
modeEl.addEventListener("change", save);
