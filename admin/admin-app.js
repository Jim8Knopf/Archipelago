import {
  collectionGroup, doc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db } from "../js/firebase-init.js";
import * as R from "../js/rules-calc.js";
import { escapeHtml, flash as flashEl, portraitUrl } from "../js/format.js";
import { confirmDialog } from "../js/confirm.js";
import { trackWrite, watchConnection, mountSyncStatus } from "../js/sync-status.js";

// ============================================================
// Admin page UI. Loaded by admin.js only after the password gate.
//
// One collection-group listener over every "characters" collection keeps
// `campaigns` (campaign ID -> character ID -> data) current; campaigns
// are implicit — just the parent paths of their characters. Every
// snapshot re-renders the campaign list and the detail pane from that
// state. UI-only state (selection, open ⋯ menu, notices) lives in `ui`
// so it survives those re-renders.
// ============================================================

let els = {};

// campaignId -> Map(charId -> data). Only documents at
// campaigns/{campaignId}/characters/{charId} count; any other collection
// that happens to be called "characters" is ignored (and counted).
let campaigns = new Map();
let ignoredDocs = 0;
let loaded = false;
let loadError = false;

const ui = {
  // { kind: "tools" } | { kind: "campaign", id } | null (nothing picked:
  // the list on a phone, the overview on desktop)
  selected: null,
  filter: "",
  openMenu: null,
  // A message that stays at the top of the detail pane until dismissed,
  // e.g. the new player links after a move. { title, html } with html
  // already escaped.
  notice: null,
  // Set while a multi-step write runs, so a second click can't start
  // another one on top of it.
  busy: false,
  // Whether the current selection was opened from the list on this page,
  // so "‹ Campaigns" can go back in history instead of piling up entries.
  cameFromList: false
};

function flash(msg) {
  flashEl(els.toast, msg, 3500);
}

// ---- URLs ----

// The admin page lives at <site>/admin/, so the others are one folder up.
function pageUrl(folder, params) {
  const url = new URL(`../${folder}`, window.location.href);
  url.search = "";
  url.hash = "";
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

const sheetUrl = (campaignId, charId) => pageUrl("sheet/", { campaign: campaignId, char: charId });
const gmUrl = (campaignId) => pageUrl("gm/", { campaign: campaignId });

// ---- Data helpers ----

const byText = (a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base" });

function campaignIds() {
  return [...campaigns.keys()].sort(byText);
}

function charsOf(campaignId) {
  const chars = campaigns.get(campaignId);
  if (!chars) return [];
  return [...chars.entries()]
    .map(([id, data]) => ({ id, data }))
    .sort((a, b) => byText(a.data.name, b.data.name) || byText(a.id, b.id));
}

function charCount() {
  let n = 0;
  campaigns.forEach(chars => { n += chars.size; });
  return n;
}

const charRef = (campaignId, charId) => doc(db, "campaigns", campaignId, "characters", charId);

function toMillis(ts) {
  if (ts == null) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  const n = Number(ts);
  return Number.isFinite(n) ? n : null;
}

// Last activity we can actually see: the most recent rest. Character
// documents carry no other timestamp, so there's nothing better to show.
function lastRestOf(campaignId) {
  let latest = null;
  (campaigns.get(campaignId) || new Map()).forEach(data => {
    const at = toMillis(data.lastRestAt);
    if (at != null && (latest == null || at > latest)) latest = at;
  });
  return latest;
}

function formatDate(ms) {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// The GM dashboard's "Not playing today" list is stored per browser.
// Removing a deleted character from this browser's copy keeps it tidy;
// other browsers keep their own (harmless) stale entries.
function benchKey(campaignId) {
  return `gm-benched:${campaignId}`;
}

function benchRemove(campaignId, charIds) {
  try {
    const raw = localStorage.getItem(benchKey(campaignId));
    if (!raw) return;
    const ids = JSON.parse(raw).filter(id => !charIds.includes(id));
    if (ids.length) localStorage.setItem(benchKey(campaignId), JSON.stringify(ids));
    else localStorage.removeItem(benchKey(campaignId));
  } catch { /* view-only setting */ }
}

// ---- Routing: #tools, #campaign=<id>, or nothing ----

function readHash() {
  const hash = window.location.hash.slice(1);
  if (hash === "tools") return { kind: "tools" };
  if (hash.startsWith("campaign=")) {
    try {
      return { kind: "campaign", id: decodeURIComponent(hash.slice("campaign=".length)) };
    } catch {
      return null;
    }
  }
  return null;
}

function hashFor(selected) {
  if (!selected) return "";
  return selected.kind === "tools" ? "#tools" : `#campaign=${encodeURIComponent(selected.id)}`;
}

function navigate(selected, { replace = false, fromList = false } = {}) {
  const url = window.location.pathname + window.location.search + hashFor(selected);
  if (replace) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
  ui.cameFromList = fromList;
  ui.selected = selected;
  ui.openMenu = null;
  render();
  // On a phone the detail replaces the list, so start it at the top.
  if (window.matchMedia("(max-width: 720px)").matches) window.scrollTo(0, 0);
}

function goBack() {
  if (ui.cameFromList) {
    history.back();
  } else {
    navigate(null);
  }
}

// ---- Rendering ----

// Small portrait thumbnail next to each character's name. Only http(s)
// URLs are used; anything else (or a broken link, see the error handler)
// falls back to the same anchor placeholder the sheet shows.
function thumbHtml(imageUrl) {
  const url = portraitUrl(imageUrl);
  return `
    <span class="admin-thumb">
      ${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
      <span class="admin-thumb-placeholder"${url ? ' style="display:none;"' : ""}>⚓</span>
    </span>
  `;
}

function menuHtml(key, label, buttons) {
  const open = ui.openMenu === key ? " open" : "";
  return `
    <details class="gm-menu" data-menu="${escapeHtml(key)}"${open}>
      <summary aria-label="${escapeHtml(label)}">⋯</summary>
      <div class="gm-menu-panel">${buttons}</div>
    </details>
  `;
}

// data-* attributes every action button carries.
function target(campaignId, charId) {
  return `data-campaign="${escapeHtml(campaignId)}"${charId != null ? ` data-char="${escapeHtml(charId)}"` : ""}`;
}

function listItemHtml(id) {
  const n = campaigns.get(id).size;
  const current = ui.selected?.kind === "campaign" && ui.selected.id === id;
  return `
    <button type="button" class="admin-list-item" data-action="select-campaign" ${target(id)}${current ? ' aria-current="true"' : ""}>
      <span class="admin-list-name">${escapeHtml(id)}</span>
      <span class="gm-count" title="${n} character${n === 1 ? "" : "s"}">${n}</span>
    </button>
  `;
}

function renderList() {
  const filter = ui.filter.trim().toLowerCase();
  const ids = campaignIds().filter(id => !filter || id.toLowerCase().includes(filter));
  const toolsCurrent = !ui.selected || ui.selected.kind === "tools";

  let items = "";
  if (!loaded) items = `<p class="muted admin-list-empty">Loading…</p>`;
  else if (campaigns.size === 0) items = `<p class="muted admin-list-empty">No campaigns yet.</p>`;
  else if (ids.length === 0) items = `<p class="muted admin-list-empty">No campaign matches “${escapeHtml(ui.filter.trim())}”.</p>`;
  else items = ids.map(listItemHtml).join("");

  els.list.innerHTML = `
    <button type="button" class="admin-list-item admin-list-tools" data-action="select-tools"${toolsCurrent ? ' aria-current="true"' : ""}>
      <span class="admin-list-name">🧭 Overview &amp; tools</span>
    </button>
    <h3 class="admin-list-head">Campaigns <span class="gm-count">${campaigns.size}</span></h3>
    ${items}
  `;
}

function noticeHtml() {
  if (!ui.notice) return "";
  return `
    <div class="card admin-notice" role="status">
      <div class="admin-notice-head">
        <h3>${escapeHtml(ui.notice.title)}</h3>
        <button type="button" class="small" data-action="dismiss-notice" aria-label="Dismiss">✕</button>
      </div>
      ${ui.notice.html}
    </div>
  `;
}

function backHtml() {
  return `<button type="button" class="admin-back" data-action="back">‹ Campaigns</button>`;
}

function vitalsText(data) {
  const hp = `HP ${data.currentHP ?? 0}/${R.hpFromPoints(data.hpPoints)}`;
  if (!R.hasMagic(data)) return hp;
  return `${hp} · Mana ${Math.floor(data.currentMana ?? 0)}/${R.manaPoolFromPoints(data.manaPoints, data.categories)}`;
}

function charRowHtml(campaignId, { id, data }) {
  const name = data.name || "Unnamed";
  const buttons = `
    <button type="button" class="small" data-action="copy-link" ${target(campaignId, id)}>Copy player link</button>
    <button type="button" class="small danger" data-action="delete-char" ${target(campaignId, id)}>Delete character</button>
  `;
  return `
    <div class="admin-char-row">
      <span class="admin-char-name">
        ${thumbHtml(data.imageUrl)}
        <span class="admin-char-text">
          <b>${escapeHtml(name)}</b> <span class="muted">${escapeHtml(vitalsText(data))}</span>
          <code class="admin-char-id">${escapeHtml(id)}</code>
        </span>
      </span>
      <span class="admin-char-actions">
        <a class="button-link small" href="${escapeHtml(sheetUrl(campaignId, id))}" target="_blank" rel="noopener">Sheet ↗</a>
        ${menuHtml(`char:${campaignId}/${id}`, `More actions for ${name}`, buttons)}
      </span>
    </div>
  `;
}

function campaignMenuButtons(campaignId) {
  return `
    <button type="button" class="small" data-action="copy-gm-link" ${target(campaignId)}>Copy GM link</button>
  `;
}

function campaignDetailHtml(campaignId) {
  const chars = charsOf(campaignId);
  const lastRest = lastRestOf(campaignId);
  return `
    <div class="card admin-head">
      <div class="admin-head-row">
        <h2 class="admin-campaign-title">${escapeHtml(campaignId)}</h2>
        ${menuHtml(`campaign:${campaignId}`, `More actions for campaign ${campaignId}`, campaignMenuButtons(campaignId))}
      </div>
      <dl class="admin-facts">
        <div><dt>Campaign ID</dt><dd><code>${escapeHtml(campaignId)}</code></dd></div>
        <div><dt>Characters</dt><dd>${chars.length}</dd></div>
        ${lastRest != null ? `<div><dt>Last rest</dt><dd>${escapeHtml(formatDate(lastRest))}</dd></div>` : ""}
      </dl>
      <div class="row">
        <a class="button-link brass" href="${escapeHtml(gmUrl(campaignId))}" target="_blank" rel="noopener">GM dashboard ↗</a>
      </div>
    </div>

    <div class="card admin-chars">
      <h3>Characters</h3>
      ${chars.map(c => charRowHtml(campaignId, c)).join("")}
    </div>
  `;
}

function toolsDetailHtml() {
  return `
    <div class="card admin-head">
      <h2>Overview &amp; tools</h2>
      <dl class="admin-facts">
        <div><dt>Campaigns</dt><dd>${campaigns.size}</dd></div>
        <div><dt>Characters</dt><dd>${charCount()}</dd></div>
      </dl>
      ${ignoredDocs ? `<p class="muted">${ignoredDocs} document(s) in a “characters” collection outside <code>campaigns/…</code> are ignored here.</p>` : ""}
      <p class="muted">Every campaign and character in this Firebase project. Campaigns aren't stored on their own — a campaign exists as long as it has at least one character.</p>
      <p class="muted">⚠️ The password only hides this page. The Firestore rules are still open, so anyone with a campaign ID (or the know-how to query the database directly) can read and change everything listed here.</p>
    </div>
  `;
}

function renderDetail() {
  let html;
  if (loadError) {
    html = `<div class="card empty-state">Couldn't load campaigns — check firebase-config.js and firestore.rules.</div>`;
  } else if (!loaded) {
    html = `<div class="card"><p class="muted">Loading…</p></div>`;
  } else if (ui.selected?.kind === "campaign") {
    html = campaigns.has(ui.selected.id)
      ? campaignDetailHtml(ui.selected.id)
      : `<div class="card empty-state">No campaign “${escapeHtml(ui.selected.id)}” — it has no characters (any more).</div>`;
  } else {
    html = toolsDetailHtml();
  }
  els.detail.innerHTML = backHtml() + noticeHtml() + html;
}

function render() {
  els.main.dataset.view = ui.selected ? "detail" : "list";
  renderList();
  renderDetail();
}

// ---- Actions ----

async function deleteCharacter(campaignId, charId) {
  const data = campaigns.get(campaignId)?.get(charId);
  if (!data) return;
  if (!await confirmDialog({
    message: `Delete ${data.name || "this character"} (${charId}) from “${campaignId}” for good?`,
    confirmLabel: "Delete",
    danger: true
  })) return;
  try {
    await trackWrite(deleteDoc(charRef(campaignId, charId)));
    benchRemove(campaignId, [charId]);
    flash("Character deleted.");
  } catch (err) {
    console.error(err);
    flash("Couldn't delete — check firestore.rules.");
  }
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    flash(message);
  } catch {
    flash("Couldn't copy — select the link and copy it by hand.");
  }
}

// Every [data-action] button in the admin UI lands here.
const ACTIONS = {
  "select-tools": () => navigate({ kind: "tools" }, { fromList: true }),
  "select-campaign": (btn) => navigate({ kind: "campaign", id: btn.dataset.campaign }, { fromList: true }),
  "back": () => goBack(),
  "dismiss-notice": () => { ui.notice = null; renderDetail(); },
  "copy-link": (btn) => copyText(sheetUrl(btn.dataset.campaign, btn.dataset.char), "Player link copied."),
  "copy-gm-link": (btn) => copyText(gmUrl(btn.dataset.campaign), "GM link copied."),
  "delete-char": (btn) => deleteCharacter(btn.dataset.campaign, btn.dataset.char)
};

// Actions that write; only one of these runs at a time.
const WRITE_ACTIONS = new Set(["delete-char"]);

async function handleAction(btn) {
  const action = btn.dataset.action;
  const fn = ACTIONS[action];
  if (!fn) return;
  if (btn.closest("details.gm-menu")) closeMenus();
  if (!WRITE_ACTIONS.has(action)) { fn(btn); return; }
  if (ui.busy) { flash("Still working on the last change…"); return; }
  ui.busy = true;
  try {
    await fn(btn);
  } finally {
    ui.busy = false;
  }
}

function closeMenus(except) {
  els.main.querySelectorAll("details.gm-menu[open]").forEach(m => { if (m !== except) m.open = false; });
  if (!except) ui.openMenu = null;
}

// ---- Startup ----

export function startAdmin(root, { onLock }) {
  root.classList.add("admin-unlocked");
  root.innerHTML = document.getElementById("admin-app-template").innerHTML;
  els = {
    main: document.getElementById("admin-main"),
    list: document.getElementById("admin-list"),
    detail: document.getElementById("admin-detail"),
    filter: document.getElementById("admin-filter"),
    toast: document.getElementById("admin-toast")
  };
  document.getElementById("admin-lock-btn").addEventListener("click", onLock);
  const toolbarActions = root.querySelector(".admin-toolbar-actions");
  mountSyncStatus(toolbarActions.parentElement, toolbarActions);

  ui.selected = readHash();
  window.addEventListener("popstate", () => {
    ui.selected = readHash();
    ui.cameFromList = false;
    ui.openMenu = null;
    render();
  });

  els.filter.addEventListener("input", () => {
    ui.filter = els.filter.value;
    renderList();
  });

  els.main.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (btn && !btn.disabled) handleAction(btn);
  });

  // Remember which ⋯ menu is open, so a snapshot re-render keeps it open.
  els.main.addEventListener("toggle", (e) => {
    const menu = e.target;
    if (!menu.matches?.("details.gm-menu")) return;
    if (menu.open) {
      ui.openMenu = menu.dataset.menu;
      closeMenus(menu);
    } else if (ui.openMenu === menu.dataset.menu) {
      ui.openMenu = null;
    }
  }, true);

  // Clicking anywhere outside an open ⋯ menu closes it.
  document.addEventListener("click", (e) => {
    const inside = e.target.closest("details.gm-menu");
    if (!inside) closeMenus();
  });

  // Broken portrait link → show the placeholder instead. "error" doesn't
  // bubble, so listen in the capture phase to catch it from every <img>.
  els.main.addEventListener("error", (e) => {
    if (e.target.tagName !== "IMG") return;
    e.target.style.display = "none";
    const ph = e.target.nextElementSibling;
    if (ph) ph.style.display = "";
  }, true);

  render();

  // collectionGroup finds every "characters" subcollection across every
  // campaign in the project — this is what makes a true cross-campaign
  // admin view possible without knowing campaign IDs in advance. Needs the
  // `match /{path=**}/characters/{id}` read rule in firestore.rules.
  const allCharacters = collectionGroup(db, "characters");
  watchConnection(allCharacters);
  onSnapshot(allCharacters, (snap) => {
    const next = new Map();
    let ignored = 0;
    snap.docs.forEach(d => {
      const parts = d.ref.path.split("/");
      if (parts.length !== 4 || parts[0] !== "campaigns") { ignored++; return; }
      const campaignId = parts[1];
      if (!next.has(campaignId)) next.set(campaignId, new Map());
      next.get(campaignId).set(d.id, d.data());
    });
    campaigns = next;
    ignoredDocs = ignored;
    loaded = true;
    loadError = false;
    render();
  }, (err) => {
    console.error(err);
    loadError = true;
    flash("Connection error — check firebase-config.js and firestore.rules.");
    render();
  });
}
