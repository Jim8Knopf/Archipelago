// ============================================================
// GM dashboard: the campaign's ships and the shipyard.
//
// Ships: one card per ship the campaign owns, built like the character
// cards — picture, name, hull with ± buttons, the condition word players
// see, values, a Details fold and the hold. The ★ on a card makes it the
// crew's ship (campaigns/{id}/settings/main → activeShipId): the one every
// player's sheet shows. Only the GM sees hull numbers.
//
// Shipyard: every ship type in the Ship Rules (rules/ships.md, read by
// js/ship-catalog.js), as browsable cards with search and group filters.
// "Add to fleet" copies a type's values into a new ship.
//
// Cards are patched, not rebuilt, while you work: a card's top part is
// redrawn only when its values change, the hold widget inside it is never
// replaced (so a search or an open add row survives other people's
// changes), and open folds and menus stay open.
// ============================================================

import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { escapeHtml, portraitUrl } from "../js/format.js";
import * as R from "../js/rules-calc.js";
import { loadShipCatalog } from "../js/ship-catalog.js";
import { normalizeShip, shipCondition, guardStoneTier, GUARD_STONE_TIERS } from "../js/ship-calc.js";
import {
  shipsCol, settingsRef, addShip, updateShip, deleteShip, setActiveShip, shipErrorMessage
} from "../js/ship.js";
import { createHoldView } from "../js/hold-ui.js";
import { confirmDialog } from "../js/confirm.js";
import { formDialog } from "../js/dialogs.js";
import {
  compressPortrait, importFromUrl, isStoredPortrait, PortraitError, SHIP_PICTURE
} from "../js/portrait-image.js";

const GROUP_ICONS = {
  "Boats & Oared Ships": "🚣",
  "Working Boats": "🎣",
  "Traders": "📦",
  "Raiders": "🏴‍☠️",
  "Warships": "⚔️",
  "Great Haulers": "⚓"
};
const groupIcon = (group) => GROUP_ICONS[group] || "⛵";

// A ship type's picture path (relative to rules/, js/ship-catalog.js) as a
// full URL, so it works from this page and can be downloaded.
const typeImageUrl = (t) => t?.image ? new URL(t.image, new URL("../rules/", window.location.href)).href : "";

export function initShipPanel({ campaign, flash }) {
  const fleetEl = document.getElementById("fleet");
  const fleetHeading = document.getElementById("fleet-heading");
  const crewNote = document.getElementById("crew-ship-note");
  const shipyardEl = document.getElementById("shipyard");
  const shipyardGrid = document.getElementById("shipyard-grid");
  const shipyardFilter = document.getElementById("shipyard-filter");
  const shipyardChips = document.getElementById("shipyard-chips");

  let ships = {};           // id -> normalized ship
  let activeShipId = null;
  let shipsLoaded = false;
  let settingsLoaded = false;
  let catalog = { ships: [], traits: {} };
  let scrollToId = null;    // a ship just added: scroll to its card once it's there

  // id -> { el, main, holdView, holdCount, sig, hull }
  const cards = new Map();
  const openSections = new Set();

  const fail = (err) => { console.error(err); flash(shipErrorMessage(err)); };
  const order = (a, b) => (b === activeShipId) - (a === activeShipId)
    || (ships[a].createdAt || 0) - (ships[b].createdAt || 0)
    || (ships[a].name || "").localeCompare(ships[b].name || "");
  const shipIds = () => Object.keys(ships).sort(order);

  const traitTitle = (name) => catalog.traits[name.toLowerCase()]?.text || "";
  const traitsHtml = (traits) => traits.map(t =>
    `<span class="ship-trait" title="${escapeHtml(traitTitle(t))}">${escapeHtml(t)}</span>`).join("");

  // ---- Ship cards ----

  function pictureHtml(url, cls = "") {
    const src = portraitUrl(url);
    return `
      <span class="gm-portrait gm-ship-pic ${cls}">
        ${src ? `<img src="${escapeHtml(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
        <span class="gm-portrait-placeholder"${src ? ' style="display:none;"' : ""}>⛵</span>
      </span>`;
  }

  function gaugeClass(cur, max) {
    if (max <= 0) return "";
    const pct = (cur / max) * 100;
    return pct <= 25 ? "low" : pct <= 60 ? "mid" : "";
  }

  function subFold(id, section, summary, body) {
    const open = openSections.has(`${id}:${section}`) ? " open" : "";
    return `
      <details class="gm-sub" data-section="${section}"${open}>
        <summary>${summary}</summary>
        <div class="gm-sub-body">${body}</div>
      </details>`;
  }

  function detailsHtml(ship) {
    const stones = ship.guardStones.map(g => {
      const tier = guardStoneTier(g.tier);
      return `<li>${escapeHtml(tier.label)}${g.element ? ` · ${escapeHtml(g.element)}` : ""} <span class="muted">(${tier.effect})</span></li>`;
    }).join("");
    const rows = [
      ["Crew", ship.crew || "—"],
      ["Cargo", ship.cargo || "—"],
      ["Price", ship.price ? `${ship.price.toLocaleString()} Dbl.` : "—"]
    ].map(([k, v]) => `<tr><th>${k}</th><td>${escapeHtml(String(v))}</td></tr>`).join("");
    return `
      <table class="gm-mini-table gm-info-table">${rows}</table>
      ${ship.traits.length ? `<p class="gm-sub-label">${traitsHtml(ship.traits)}</p>` : ""}
      ${ship.terminalSlots > 0
        ? `<p class="muted gm-sub-label"><strong>Guard Stone Terminal</strong> — ${ship.guardStones.length} of ${ship.terminalSlots} slot${ship.terminalSlots === 1 ? "" : "s"} filled</p>
           ${stones ? `<ul class="gm-stone-list">${stones}</ul>` : ""}`
        : ""}
      ${ship.storyChanges.trim() ? `<p class="gm-sub-label"><strong>Story changes:</strong> ${escapeHtml(ship.storyChanges)}</p>` : ""}
      ${ship.notes.trim() ? `<p class="gm-sub-label ship-notes"><strong>Notes</strong> <span class="muted">(players see these)</span><br>${escapeHtml(ship.notes)}</p>` : ""}
      <button type="button" class="small" data-ship-action="edit">✎ Edit ship…</button>`;
  }

  function mainHtml(id, ship) {
    const active = id === activeShipId;
    const cond = shipCondition(ship.hullCurrent, ship.hullMax);
    const pct = ship.hullMax > 0 ? Math.min(100, (ship.hullCurrent / ship.hullMax) * 100) : 0;
    const menuOpen = openSections.has(`${id}:menu`) ? " open" : "";
    const crewTitle = active
      ? "The crew's ship: every player's sheet shows it. Click to show players no ship."
      : "Make this the crew's ship: every player's sheet shows it.";
    return `
      <div class="gm-card-head">
        ${pictureHtml(ship.imageUrl)}
        <div class="gm-card-title">
          <h3>${escapeHtml(ship.name || "Unnamed")}</h3>
          <span class="muted gm-ship-type">${escapeHtml(ship.typeName || "Custom ship")}</span>
        </div>
        <button type="button" class="star-toggle" data-ship-action="crew" aria-pressed="${active}" title="${crewTitle}" aria-label="${crewTitle}">${active ? "★" : "☆"}</button>
        <details class="gm-menu" data-section="menu"${menuOpen}>
          <summary aria-label="More actions for ${escapeHtml(ship.name || "this ship")}">⋯</summary>
          <div class="gm-menu-panel">
            <button class="small" data-ship-action="edit">Edit ship…</button>
            <button class="small brass" data-ship-action="crew">${active ? "Show players no ship" : "Make it the crew's ship"}</button>
            <button class="small danger" data-ship-action="delete">Delete ship</button>
          </div>
        </details>
      </div>
      ${active ? `<p class="gm-crew-badge">★ The crew's ship — players see this one</p>` : ""}
      <div class="gm-vital" data-vital="hull">
        <div class="gauge-label"><span>Hull</span><span>${ship.hullCurrent} / ${ship.hullMax}</span></div>
        <div class="gauge ${gaugeClass(ship.hullCurrent, ship.hullMax)}"><div class="fill" style="width:${pct}%"></div></div>
        <div class="gm-vital-controls">
          <button class="small" data-hull="-10">−10</button>
          <button class="small" data-hull="-1">−1</button>
          <button class="small" data-hull="1">+1</button>
          <button class="small" data-hull="10">+10</button>
        </div>
        <div class="gm-hull-amount">
          <input type="number" min="1" inputmode="numeric" placeholder="Amount" aria-label="Hull amount" data-hull-amount>
          <button class="small danger" data-hull="hit" title="Take this much damage (after Armor)">Damage</button>
          <button class="small" data-hull="fix" title="Repair this much (rules Section 7)">Repair</button>
          <button class="small brass" data-hull="full" title="Harbour or shipyard repair: back to full Hull">Full</button>
        </div>
      </div>
      <p class="gm-ship-sees">Players see: <span class="ship-cond-badge cond-${cond.key}">${escapeHtml(cond.label)}</span></p>
      <span class="gm-stats">
        <span title="Armor">Arm <b>${ship.armor}</b></span>
        <span title="Max Speed (m/s)">Speed <b>${ship.maxSpeed}</b></span>
        <span title="Handling">Hand <b>${ship.handling}</b></span>
        <span title="Turn Rate">Turn <b>${ship.turnRate}°</b></span>
        <span title="Maneuverability">Man <b>${escapeHtml(ship.maneuverability)}</b></span>
        <span title="Broadside">Broadside <b>${escapeHtml(ship.broadside)}</b></span>
        <span title="Chasers">Chasers <b>${escapeHtml(ship.chasers)}</b></span>
      </span>
      ${subFold(id, "details", "Details", detailsHtml(ship))}`;
  }

  function createCard(id) {
    const el = document.createElement("div");
    el.className = "card gm-card gm-ship-card";
    el.dataset.ship = id;
    el.innerHTML = `
      <div data-part="main"></div>
      <details class="gm-sub" data-section="hold"${openSections.has(`${id}:hold`) ? " open" : ""}>
        <summary>Hold &amp; chest <span class="gm-count" data-hold-count></span></summary>
        <div class="gm-sub-body"><div data-hold></div></div>
      </details>`;
    const holdView = createHoldView(el.querySelector("[data-hold]"), {
      campaign,
      mode: "gm",
      getOtherShips: () => shipIds().filter(other => other !== id).map(other => ({ id: other, name: ships[other].name })),
      flash
    });
    return { el, main: el.querySelector('[data-part="main"]'), holdView, holdCount: el.querySelector("[data-hold-count]"), sig: "", hull: null };
  }

  function renderFleet() {
    if (!shipsLoaded || !settingsLoaded) return;
    const ids = shipIds();
    const keep = new Set(ids);
    for (const [id, entry] of cards) {
      if (!keep.has(id)) { entry.el.remove(); cards.delete(id); }
    }
    fleetEl.querySelector(":scope > .empty-state")?.remove();

    ids.forEach((id, index) => {
      const ship = ships[id];
      let entry = cards.get(id);
      if (!entry) { entry = createCard(id); cards.set(id, entry); }

      const { hold, chest, ...shown } = ship;
      const sig = JSON.stringify([id === activeShipId, shown]);
      if (sig !== entry.sig) {
        entry.sig = sig;
        entry.main.innerHTML = mainHtml(id, ship);
        if (entry.hull != null && entry.hull !== ship.hullCurrent) {
          entry.main.querySelector('[data-vital="hull"]').classList.add(ship.hullCurrent < entry.hull ? "pulse-down" : "pulse-up");
        }
        entry.hull = ship.hullCurrent;
      }
      entry.holdCount.textContent = `${ship.hold.length} · ${ship.chest.toLocaleString()} Dbl.`;
      entry.holdView.update(id, ship);

      if (fleetEl.children[index] !== entry.el) fleetEl.insertBefore(entry.el, fleetEl.children[index] || null);
    });

    if (!ids.length) {
      fleetEl.insertAdjacentHTML("beforeend", `<div class="card empty-state">No ships yet — pick one in the Shipyard below.</div>`);
      shipyardEl.open = true;
    }
    fleetHeading.textContent = `Ships (${ids.length})`;
    crewNote.textContent = activeShipId && ships[activeShipId]
      ? `Players see ${ships[activeShipId].name}.`
      : ids.length ? "Players see no ship — ★ one to show it to them." : "";

    if (scrollToId && cards.has(scrollToId)) {
      cards.get(scrollToId).el.scrollIntoView({ behavior: "smooth", block: "center" });
      scrollToId = null;
    }
    renderShipyardCounts();
  }

  // ---- Card actions ----

  fleetEl.addEventListener("toggle", (e) => {
    const det = e.target;
    if (!(det instanceof HTMLDetailsElement) || !det.dataset.section) return;
    const card = det.closest(".gm-ship-card");
    if (!card) return;
    const key = `${card.dataset.ship}:${det.dataset.section}`;
    if (det.open) openSections.add(key); else openSections.delete(key);
  }, true);

  const closeMenus = (except) => fleetEl.querySelectorAll("details.gm-menu[open]").forEach(m => {
    if (m !== except) { m.open = false; }
  });
  document.addEventListener("click", (e) => closeMenus(e.target.closest("details.gm-menu")));

  // A broken picture falls back to the placeholder.
  [fleetEl, shipyardGrid].forEach(el => el.addEventListener("error", (e) => {
    if (e.target.tagName !== "IMG") return;
    e.target.style.display = "none";
    const ph = e.target.nextElementSibling;
    if (ph) ph.style.display = "";
  }, true));

  fleetEl.addEventListener("click", async (e) => {
    const card = e.target.closest(".gm-ship-card");
    if (!card) return;
    const id = card.dataset.ship;
    const ship = ships[id];
    if (!ship) return;

    const hullBtn = e.target.closest("button[data-hull]");
    if (hullBtn) {
      const kind = hullBtn.dataset.hull;
      let delta;
      if (kind === "full") {
        delta = ship.hullMax - ship.hullCurrent;
      } else if (kind === "hit" || kind === "fix") {
        const input = card.querySelector("[data-hull-amount]");
        const amount = Math.floor(Number(input.value));
        if (!(amount > 0)) { input.focus(); return; }
        delta = kind === "hit" ? -amount : amount;
        input.value = "";
      } else {
        delta = parseInt(kind, 10);
      }
      const next = Math.max(0, Math.min(ship.hullMax, ship.hullCurrent + delta));
      if (next === ship.hullCurrent) return;
      try { await updateShip(campaign, id, { hullCurrent: next }); } catch (err) { fail(err); }
      return;
    }

    const btn = e.target.closest("button[data-ship-action]");
    if (!btn) return;
    if (btn.closest("details.gm-menu")) closeMenus();
    const action = btn.dataset.shipAction;

    if (action === "crew") {
      try {
        if (id === activeShipId) {
          await setActiveShip(campaign, null);
          flash("Players see no ship now.");
        } else {
          await setActiveShip(campaign, id);
          flash(`${ship.name} is now the crew's ship.`);
        }
      } catch (err) { fail(err); }
      return;
    }

    if (action === "edit") {
      await editShip(id);
      return;
    }

    if (action === "delete") {
      const goods = ship.hold.length || ship.chest
        ? ` Its hold (${ship.hold.length} kind${ship.hold.length === 1 ? "" : "s"} of thing) and ${ship.chest.toLocaleString()} Dbl. go down with it — move them to another ship first if you want to keep them.`
        : "";
      if (!await confirmDialog({ message: `Delete ${ship.name} for good?${goods}`, confirmLabel: "Delete ship", danger: true })) return;
      try {
        if (activeShipId === id) await setActiveShip(campaign, null);
        await deleteShip(campaign, id);
        flash(`${ship.name} deleted.`);
      } catch (err) { fail(err); }
    }
  });

  // Enter in the amount field = Damage.
  fleetEl.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !e.target.matches("[data-hull-amount]")) return;
    e.preventDefault();
    e.target.closest(".gm-vital").querySelector('[data-hull="hit"]').click();
  });

  // ---- Edit dialog ----

  const TEXT_FIELDS = [
    ["name", "Name"], ["typeName", "Type"], ["maneuverability", "Maneuverability"],
    ["broadside", "Broadside"], ["chasers", "Chasers"], ["cargo", "Cargo"]
  ];
  const NUMBER_FIELDS = [
    ["hullMax", "Max Hull"], ["armor", "Armor"], ["maxSpeed", "Max Speed (m/s)"], ["handling", "Handling"],
    ["turnRate", "Turn Rate (°)"], ["crew", "Crew"], ["price", "Price (Dbl.)"], ["terminalSlots", "Guard Stone slots"]
  ];

  function editShip(id) {
    const ship = ships[id];
    if (!ship) return Promise.resolve();
    const previousFocus = document.activeElement;
    let picture = ship.imageUrl || "";
    let stones = ship.guardStones.map(g => ({ ...g }));

    const dialog = document.createElement("dialog");
    dialog.className = "confirm-dialog ship-edit-dialog";
    dialog.setAttribute("aria-label", `Edit ${ship.name}`);
    const field = (key, label, input) => `<div class="field"><label for="ship-e-${key}">${label}</label>${input}</div>`;
    dialog.innerHTML = `
      <form method="dialog" class="confirm-dialog-body" novalidate>
        <h3 class="confirm-dialog-title">Edit ${escapeHtml(ship.name)}</h3>
        <p class="muted">Players see everything here except the hull numbers.</p>

        <div class="ship-edit-picture">
          <div class="ship-banner" data-pic></div>
          <div class="row portrait-actions">
            <button type="button" class="small brass" data-pic-action="upload">📷 Upload picture</button>
            <button type="button" class="small" data-pic-action="remove">Remove</button>
            <input type="file" accept="image/*" hidden data-pic-file>
          </div>
          <div class="row portrait-actions">
            <input type="url" placeholder="…or paste a picture link" aria-label="Picture link" data-pic-link>
            <button type="button" class="small" data-pic-action="link">Use link</button>
          </div>
          <p class="muted" data-pic-status></p>
        </div>

        <div class="gm-ship-form">
          ${TEXT_FIELDS.map(([k, l]) => field(k, l, `<input type="text" id="ship-e-${k}" name="${k}" value="${escapeHtml(ship[k])}">`)).join("")}
          ${NUMBER_FIELDS.map(([k, l]) => field(k, l, `<input type="number" min="0" id="ship-e-${k}" name="${k}" value="${ship[k]}">`)).join("")}
        </div>
        ${field("traits", "Traits (comma-separated)", `<input type="text" id="ship-e-traits" name="traits" value="${escapeHtml(ship.traits.join(", "))}" placeholder="Oars, Shallow Draft">`)}
        <p class="muted ship-edit-traits">Rules traits: ${Object.values(catalog.traits).map(t => `<span class="ship-trait" title="${escapeHtml(t.text)}">${escapeHtml(t.name)}</span>`).join(" ") || "—"}</p>

        <h4 class="gm-ship-subhead">Guard Stones <span class="muted">(rules Section 9 — one per terminal slot)</span></h4>
        <ul class="inventory-list" data-stones></ul>
        <button type="button" class="small" data-add-stone>+ Seat a Guard Stone</button>

        ${field("storyChanges", "Story changes", `<textarea id="ship-e-storyChanges" name="storyChanges" rows="2" placeholder="e.g. Guard Stone Terminal from a wreck">${escapeHtml(ship.storyChanges)}</textarea>`)}
        ${field("notes", "Ship notes — every player sees these", `<textarea id="ship-e-notes" name="notes" rows="2">${escapeHtml(ship.notes)}</textarea>`)}

        <p class="admin-gate-error admin-dialog-error" role="alert" data-error></p>
        <div class="confirm-dialog-actions">
          <button type="button" data-cancel>Cancel</button>
          <button type="submit" class="brass" value="confirm">Save</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);

    const $ = (sel) => dialog.querySelector(sel);
    const form = $("form");
    const picStatus = $("[data-pic-status]");
    const slotsInput = $("#ship-e-terminalSlots");

    function paintPicture() {
      const src = portraitUrl(picture);
      $("[data-pic]").innerHTML = src
        ? `<img src="${escapeHtml(src)}" alt="" referrerpolicy="no-referrer">`
        : `<span class="ship-banner-empty">⛵ No picture yet</span>`;
      $('[data-pic-action="remove"]').hidden = !picture;
    }

    function paintStones() {
      const slots = Math.max(0, Math.floor(Number(slotsInput.value) || 0));
      $("[data-stones]").innerHTML = stones.length ? stones.map((g, i) => `
        <li class="row gm-stone" data-stone="${i}">
          <select data-stone-field="tier" aria-label="Tier" class="dialog-select">${GUARD_STONE_TIERS.map(t =>
            `<option value="${t.key}"${t.key === g.tier ? " selected" : ""}>${t.label} (${t.effect})</option>`).join("")}</select>
          <input type="text" data-stone-field="element" value="${escapeHtml(g.element)}" placeholder="Element, e.g. Fire" aria-label="Element">
          <button type="button" class="small danger" data-remove-stone aria-label="Remove stone">✕</button>
        </li>`).join("") : `<li class="muted">No stones seated.</li>`;
      const add = $("[data-add-stone]");
      add.disabled = stones.length >= slots;
      add.title = slots === 0 ? "No Guard Stone Terminal — set Guard Stone slots first" : "";
    }
    paintPicture();
    paintStones();

    async function usePicture(make) {
      dialog.querySelectorAll("[data-pic-action]").forEach(b => { b.disabled = true; });
      picStatus.textContent = "Shrinking picture…";
      try {
        picture = await make();
        picStatus.textContent = "Picture ready — Save to keep it.";
        $("[data-pic-link]").value = "";
        paintPicture();
        return null;
      } catch (err) {
        if (!(err instanceof PortraitError)) console.error(err);
        picStatus.textContent = err instanceof PortraitError ? err.message : "Couldn't use that picture.";
        return err;
      } finally {
        dialog.querySelectorAll("[data-pic-action]").forEach(b => { b.disabled = false; });
      }
    }

    dialog.addEventListener("click", async (e) => {
      if (e.target === dialog) { dialog.close("cancel"); return; }
      const pic = e.target.closest("[data-pic-action]");
      if (pic?.dataset.picAction === "upload") { $("[data-pic-file]").click(); return; }
      if (pic?.dataset.picAction === "remove") { picture = ""; picStatus.textContent = "Picture removed — Save to keep it that way."; paintPicture(); return; }
      if (pic?.dataset.picAction === "link") {
        const link = $("[data-pic-link]").value.trim();
        if (!link) { picStatus.textContent = "Paste a picture link first."; return; }
        const err = await usePicture(() => importFromUrl(link, SHIP_PICTURE));
        if (err?.blockedByHost && await confirmDialog({
          message: "That site doesn't allow copying its pictures, so it can't be stored in the ship. Use the link as it is? It breaks if the link expires.",
          confirmLabel: "Use link anyway"
        })) {
          picture = link;
          picStatus.textContent = "Link ready — Save to keep it.";
          paintPicture();
        }
        return;
      }
      if (e.target.closest("[data-add-stone]")) { stones.push({ id: R.makeId(), tier: "minor", element: "Fire" }); paintStones(); return; }
      const remove = e.target.closest("[data-remove-stone]");
      if (remove) { stones.splice(Number(remove.closest("[data-stone]").dataset.stone), 1); paintStones(); return; }
      if (e.target.closest("[data-cancel]")) dialog.close("cancel");
    });
    $("[data-pic-file]").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (file) await usePicture(() => compressPortrait(file, SHIP_PICTURE));
    });
    $("[data-pic-link]").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); $('[data-pic-action="link"]').click(); }
    });
    slotsInput.addEventListener("input", paintStones);
    $("[data-stones]").addEventListener("input", (e) => {
      const input = e.target.closest("[data-stone-field]");
      if (!input) return;
      stones[Number(input.closest("[data-stone]").dataset.stone)][input.dataset.stoneField] = input.value;
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(form).entries());
      const error = $("[data-error]");
      const name = (v.name || "").trim();
      if (!name) { error.textContent = "Give the ship a name."; return; }
      const fields = { imageUrl: picture };
      TEXT_FIELDS.forEach(([k]) => { fields[k] = (v[k] || "").trim(); });
      NUMBER_FIELDS.forEach(([k]) => { fields[k] = Math.max(0, Math.floor(Number(v[k]) || 0)); });
      if (stones.length > fields.terminalSlots) {
        error.textContent = `${stones.length} Guard Stones need ${stones.length} terminal slots — raise the slots or remove a stone.`;
        return;
      }
      fields.traits = (v.traits || "").split(",").map(t => t.trim()).filter(Boolean);
      fields.guardStones = stones.map(g => ({ id: g.id, tier: g.tier, element: (g.element || "").trim() }));
      fields.storyChanges = (v.storyChanges || "").trim();
      fields.notes = (v.notes || "").trim();
      const latest = ships[id] || ship;
      fields.hullCurrent = R.currentAfterMaxChange(latest.hullCurrent, latest.hullMax, fields.hullMax);
      try {
        await updateShip(campaign, id, fields);
        flash(`${name} saved.`);
        dialog.close("confirm");
      } catch (err) {
        console.error(err);
        error.textContent = shipErrorMessage(err);
      }
    });

    return new Promise((resolve) => {
      dialog.addEventListener("close", () => {
        dialog.remove();
        if (previousFocus?.isConnected) previousFocus.focus();
        resolve();
      }, { once: true });
      dialog.showModal();
      $("#ship-e-name").focus();
    });
  }

  // ---- Shipyard ----

  let shipyardGroup = "all";
  const typeCards = new Map();   // key -> { el, type }

  function typeCardHtml(t) {
    const stat = (label, value, title = "") => `
      <div class="ship-stat"${title ? ` title="${escapeHtml(title)}"` : ""}>
        <span class="ship-stat-label">${label}</span><span class="ship-stat-value">${escapeHtml(String(value))}</span>
      </div>`;
    const custom = t.key === "custom";
    const pic = typeImageUrl(t);
    return `
      ${pic ? `<div class="ship-banner"><img src="${escapeHtml(pic)}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>` : ""}
      <div class="gm-card-head">
        <span class="gm-portrait shipyard-icon" aria-hidden="true">${custom ? "🛠️" : groupIcon(t.group)}</span>
        <div class="gm-card-title">
          <h3>${escapeHtml(t.name)}</h3>
          <span class="muted">${escapeHtml([t.de, t.alt].filter(Boolean).join(" · ") || t.group)}</span>
        </div>
        <span class="gm-count" data-owned hidden></span>
      </div>
      <p class="shipyard-summary">${escapeHtml(t.summary)}</p>
      ${custom ? "" : `
        <div class="ship-stats shipyard-stats">
          ${stat("Hull", t.hull)}${stat("Armor", t.armor)}${stat("Speed", `${t.maxSpeed} m/s`)}
          ${stat("Handling", t.handling)}${stat("Turn", `${t.turnRate}°`)}${stat("Man.", t.maneuverability)}
          ${stat("Broadside", t.broadside)}${stat("Chasers", t.chasers)}
          ${stat("Crew", t.crew || "—")}${stat("Cargo", t.cargo || "—")}
        </div>
        ${t.traits.length ? `<p class="shipyard-traits">${traitsHtml(t.traits)}</p>` : ""}
        <p class="shipyard-price">💰 ${t.price.toLocaleString()} Dbl. <span class="muted">· ${escapeHtml(t.group)}</span></p>
        <details class="gm-sub">
          <summary>About this ship</summary>
          <div class="gm-sub-body">
            <p>${escapeHtml(t.description)}</p>
            ${t.benefits ? `<p><strong>Benefits:</strong> ${escapeHtml(t.benefits)}</p>` : ""}
            ${t.flaws ? `<p><strong>Flaws:</strong> ${escapeHtml(t.flaws)}</p>` : ""}
          </div>
        </details>`}
      <button type="button" class="brass small shipyard-add" data-add-type="${escapeHtml(t.key)}">+ Add to fleet</button>`;
  }

  function buildShipyard() {
    const custom = {
      key: "custom", name: "Custom ship", de: "", alt: "", group: "",
      summary: "A ship that isn't in the compendium — fill in every value yourself under Edit ship."
    };
    shipyardGrid.innerHTML = "";
    typeCards.clear();
    [...catalog.ships, custom].forEach(t => {
      const el = document.createElement("div");
      el.className = "card gm-card shipyard-card";
      el.dataset.type = t.key;
      el.innerHTML = typeCardHtml(t);
      shipyardGrid.appendChild(el);
      typeCards.set(t.key, { el, type: t });
    });
    const groups = [...new Set(catalog.ships.map(t => t.group))];
    shipyardChips.innerHTML = [["all", "All"], ...groups.map(g => [g, `${groupIcon(g)} ${g}`])].map(([key, label]) =>
      `<button type="button" class="small hold-chip" data-group="${escapeHtml(key)}" aria-pressed="${key === shipyardGroup}">${escapeHtml(label)}</button>`).join("");
    filterShipyard();
    renderShipyardCounts();
  }

  function filterShipyard() {
    const q = shipyardFilter.value.trim().toLowerCase();
    typeCards.forEach(({ el, type: t }) => {
      const inGroup = shipyardGroup === "all" || t.group === shipyardGroup || t.key === "custom";
      const text = [t.name, t.de, t.alt, t.group, t.summary, t.description, t.benefits, t.flaws, ...(t.traits || [])].join(" ").toLowerCase();
      el.hidden = !(inGroup && (!q || text.includes(q) || t.key === "custom"));
    });
    shipyardChips.querySelectorAll("[data-group]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.group === shipyardGroup)));
  }

  // "2 in fleet" on each type the campaign already owns.
  function renderShipyardCounts() {
    const owned = {};
    Object.values(ships).forEach(s => { owned[s.type] = (owned[s.type] || 0) + 1; });
    typeCards.forEach(({ el }, key) => {
      const badge = el.querySelector("[data-owned]");
      badge.hidden = !owned[key];
      badge.textContent = owned[key] ? `${owned[key]} in fleet` : "";
    });
  }

  shipyardFilter.addEventListener("input", filterShipyard);
  shipyardChips.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-group]");
    if (!chip) return;
    shipyardGroup = chip.dataset.group;
    filterShipyard();
  });

  shipyardGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-add-type]");
    if (!btn) return;
    const type = typeCards.get(btn.dataset.addType)?.type;
    if (!type) return;
    const values = await formDialog({
      title: type.key === "custom" ? "Add a custom ship" : `Add a ${type.name}`,
      confirmLabel: "Add to fleet",
      bodyHtml: `
        <div class="field">
          <label for="new-ship-name">Ship name</label>
          <input type="text" id="new-ship-name" name="name" placeholder="e.g. Salt Widow" autocomplete="off">
        </div>
        <label class="admin-check"><input type="checkbox" name="crew"${activeShipId && ships[activeShipId] ? "" : " checked"}> Make it the crew's ship (players see it)</label>`,
      validate: (v) => (v.name || "").trim() ? "" : "Give the ship a name."
    });
    if (!values) return;
    // The type's picture from the rules, stored in the new ship like an
    // uploaded one. Without it (or if it won't load) the ship just has none.
    let imageUrl = "";
    if (typeImageUrl(type)) {
      try { imageUrl = await importFromUrl(typeImageUrl(type), SHIP_PICTURE); } catch (err) { console.warn(err); }
    }
    try {
      const ref = await addShip(campaign, values.name.trim(), type.key === "custom" ? null : type, imageUrl ? { imageUrl } : {});
      if (values.crew) await setActiveShip(campaign, ref.id);
      openSections.add(`${ref.id}:details`);
      scrollToId = ref.id;
      flash(`${values.name.trim()} joins the fleet.${values.crew ? " Players see it now." : ""}`);
      renderFleet();
    } catch (err) { fail(err); }
  });

  document.getElementById("open-shipyard-btn").addEventListener("click", () => {
    shipyardEl.open = true;
    shipyardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    shipyardFilter.focus({ preventScroll: true });
  });

  loadShipCatalog().then(c => { catalog = c; buildShipyard(); renderFleet(); }, (err) => {
    console.error(err);
    buildShipyard();
    shipyardGrid.insertAdjacentHTML("afterbegin", `<p class="card empty-state">Couldn't load the Ship Rules, so only a custom ship can be added right now.</p>`);
  });

  // ---- Live data ----

  onSnapshot(shipsCol(campaign), (snap) => {
    ships = {};
    snap.docs.forEach(d => { ships[d.id] = normalizeShip(d.data()); });
    shipsLoaded = true;
    renderFleet();
  }, (err) => {
    console.error(err);
    fleetEl.innerHTML = `<div class="card empty-state">Couldn't load the ships — publish the ships and settings rules from firestore.rules in the Firebase console.</div>`;
  });

  onSnapshot(settingsRef(campaign), (snap) => {
    activeShipId = (snap.exists() && snap.data().activeShipId) || null;
    settingsLoaded = true;
    renderFleet();
  }, (err) => console.error(err));
}
