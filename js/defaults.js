// ============================================================
// Per-device defaults: the GM's campaign and the player's own character.
//
// Stored in localStorage, so each phone/tablet has its own. They only fill
// in what a link leaves out: gm/ with no ?campaign= opens the default
// campaign, sheet/ with no ?char= opens the default character. A link that
// names a campaign or character always wins, so shared player links keep
// working. sheet/?pick=1 skips the default to show the character picker.
//
// applyDefaultsToUrl() runs from js/pwa.js, which every page loads before
// its own script, and rewrites the URL in place (no reload), so sheet.js
// and gm.js just read the usual URL parameters.
// ============================================================

const CAMPAIGN_KEY = "archipelago:defaultCampaign";
const CHARACTER_KEY = "archipelago:defaultCharacter";

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage blocked: defaults just don't stick */ }
}

export function getDefaultCampaign() {
  return read(CAMPAIGN_KEY);
}

export function setDefaultCampaign(campaign) {
  write(CAMPAIGN_KEY, campaign || null);
}

// { campaign, char } or null
export function getDefaultCharacter() {
  try {
    const value = JSON.parse(read(CHARACTER_KEY));
    return value && value.campaign && value.char ? value : null;
  } catch {
    return null;
  }
}

export function setDefaultCharacter(campaign, char) {
  write(CHARACTER_KEY, campaign && char ? JSON.stringify({ campaign, char }) : null);
}

export function isDefaultCharacter(campaign, char) {
  const d = getDefaultCharacter();
  return !!d && d.campaign === campaign && d.char === char;
}

// `page` is "gm", "sheet" or anything else (no-op).
export function applyDefaultsToUrl(page) {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  if (page === "gm" && !params.get("campaign")) {
    const campaign = getDefaultCampaign();
    if (!campaign) return;
    params.set("campaign", campaign);
  } else if (page === "sheet" && !params.get("char") && !params.has("pick")) {
    const d = getDefaultCharacter();
    if (!d) return;
    params.set("campaign", d.campaign);
    params.set("char", d.char);
  } else {
    return;
  }
  history.replaceState(null, "", url);
}
