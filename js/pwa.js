// ============================================================
// Installed-app support (loaded on every page).
//
// 1. Registers the service worker (sw.js at the site root).
// 2. Remembers where you were: the last character sheet you opened, or the
//    GM dashboard for a campaign.
//    (Before that, the device's default campaign/character from
//    js/defaults.js fills in a bare gm/ or sheet/ URL.)
// 3. When the installed app launches (manifest start_url is
//    "./?launch=app"), it jumps straight back there, so a player lands on
//    their own sheet and the GM on their dashboard. Opening Home from the
//    nav has no ?launch=app, so the landing page itself stays reachable.
// ============================================================

import { applyDefaultsToUrl } from "./defaults.js";

const LAST_PLACE_KEY = "archipelago:lastPlace";
const siteRoot = new URL("../", import.meta.url);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(new URL("sw.js", siteRoot), { scope: siteRoot.pathname })
    .catch(err => console.warn("Service worker not registered:", err));
}

function currentPath() {
  return window.location.pathname.slice(siteRoot.pathname.length).replace(/index\.html$/, "");
}

function rememberPlace() {
  const path = currentPath();
  const params = new URLSearchParams(window.location.search);

  let place = null;
  if (path === "sheet/" && params.get("char")) {
    place = `sheet/?campaign=${encodeURIComponent(params.get("campaign") || "default-campaign")}` +
            `&char=${encodeURIComponent(params.get("char"))}`;
  } else if (path === "gm/") {
    place = `gm/?campaign=${encodeURIComponent(params.get("campaign") || "default-campaign")}`;
  }
  if (!place) return;
  try { localStorage.setItem(LAST_PLACE_KEY, place); } catch { /* storage blocked: no resume */ }
}

function resumeOnLaunch() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("launch") !== "app") return;

  let place = null;
  try { place = localStorage.getItem(LAST_PLACE_KEY); } catch { /* storage blocked */ }
  if (place) {
    window.location.replace(new URL(place, siteRoot));
  } else {
    // First launch: show the landing page, with the launch marker removed.
    history.replaceState(null, "", siteRoot.pathname);
  }
}

// Fill in the device's default campaign/character first, so the place
// remembered below is the one actually shown.
applyDefaultsToUrl({ "gm/": "gm", "sheet/": "sheet" }[currentPath()]);
rememberPlace();
resumeOnLaunch();
