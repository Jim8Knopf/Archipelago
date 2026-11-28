// ============================================================
// GM dashboard: the campaign's ships and the shipyard.
//
// Ships: one card per ship the campaign owns, built like the character
// cards — picture, name, hull with damage/repair, the condition word
// players see, values, a Details fold and the hold. The ★ on a card makes
// it the crew's ship (campaigns/{id}/settings/main → activeShipId): the one
// every player's sheet shows. Only the GM sees hull numbers.
//
// A ship's values come from its type file in rules/ships/ (the only place
// they live, js/ship-catalog.js); a ship stores just its story changes
// (js/ship-calc.js resolveShip()). Values that differ from the type are
// marked ✎ on the card.
//
// Shipyard: every type as a browsable card (js/ship-cards.js), with search
// and group filters. "Add to fleet" creates a ship of that type.
//
// Cards are patched, not rebuilt, while you work: a card's top part is
// redrawn only when its values change, the hold widget inside it is never
// replaced, and open folds and menus stay open.
// ============================================================

import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { escapeHtml, portraitUrl } from "../js/format.js";
import * as R from "../js/rules-calc.js";
import { loadShipCatalog } from "../js/ship-catalog.js";
import {
  resolveShip, overridesFor, shipCondition, guardStoneTier, GUARD_STONE_TIERS, CUSTOM_TYPE
} from "../js/ship-calc.js";
import {
  shipsCol, settingsRef, addShip, updateShip, deleteShip, setActiveShip, shipErrorMessage,
  isLegacyShip, migrateLegacyShip
} from "../js/ship.js";
import { createHoldView } from "../js/hold-ui.js";
import { shipTypeCardHtml, createShipTypeBrowser, traitsHtml } from "../js/ship-cards.js";
import { confirmDialog } from "../js/confirm.js";
import { formDialog } from "../js/dialogs.js";
import {
  compressPortrait, importFromUrl, PortraitError, SHIP_PICTURE
} from "../js/portrait-image.js";

// The values a GM can change on a ship (story changes), as edit fields.
const VALUE_FIELDS = [
  ["hull", "Max Hull", "number"], ["armor", "Armor", "number"], ["maxSpeed", "Max Speed (m/s)", "number"],
  ["handling", "Handling", "number"], ["turnRate", "Turn Rate (°)", "number"], ["maneuverability", "Maneuverability", "text"],
  ["broadside", "Broadside", "text"], ["chasers", "Chasers", "text"], ["crew", "Crew", "number"],
  ["cargo", "Cargo", "text"], ["price", "Price (Dbl.)", "number"]
];

export function initShipPanel({ campaign, flash }) {
  const fleetEl = document.getElementById("fleet");
  const fleetHeading = document.getElementById("fleet-heading");
  const crewNote = document.getElementById("crew-ship-note");
  const shipyardEl = document.getElementById("shipyard");
  const shipyardGrid = document.getElementById("shipyard-grid");

  let rawShips = {};        // id -> document as stored
  let ships = {};           // id -> resolveShip() result
  let activeShipId = null;
  let shipsLoaded = false;
  let settingsLoaded = false;
  let catalog = null;       // js/ship-catalog.js result, once loaded
  let catalogDone = false;  // loaded, or failed (then only custom values are known)
  let scrollToId = null;    // a ship just added: scroll to its card once it's there
  const migrated = new Set();

  // id -> { el, main, holdView, holdCount, sig, hull }
  const cards = new Map();
  const openSections = new Set();

  const fail = (err) => { console.error(err); flash(shipErrorMessage(err)); };
  const order = (a, b) => (b === activeShipId) - (a === activeShipId)
    || (ships[a].createdAt || 0) - (ships[b].createdAt || 0)
    || (ships[a].name || "").localeCompare(ships[b].name || "");
  const shipIds = () => Object.keys(ships).sort(order);
  const typeOf = (ship) => (ship.type === "custom" ? null : catalog?.byKey?.[ship.type]) || null;

  function resolveAll() {
    ships = Object.fromEntries(Object.entries(rawShips).map(([id, raw]) => [id, resolveShip(raw, catalog)]));
  }

  // Ships saved in the older shape (a full copy of their type's values)
  // are rewritten once, now that the type files are known.
  function migrateLegacy() {
    if (!catalog) return;
    Object.entries(rawShips).forEach(([id, raw]) => {
      if (!isLegacyShip(raw) || migrated.has(id)) return;
      migrated.add(id);
      migrateLegacyShip(campaign, id, raw, catalog).catch(fail);
    });
  }

  // ---- Ship cards ----

  function pictureHtml(url) {
    const src = portraitUrl(url);
    return `
      <span class="gm-portrait gm-ship-pic">
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

  // A value, marked when it's a story change (differs from the type file).
  function valueHtml(ship, field, text) {
    if (!ship.changed.includes(field)) return `<b>${text}</b>`;
    const type = typeOf(ship);
    const rules = type ? (field === "traits" ? type.traits.join(", ") || "none" : type[field]) : "";
    return `<b class="ship-changed" title="Story change — the rules say ${escapeHtml(String(rules))}">${text}✎</b>`;
  }

  function detailsHtml(ship) {
    const stones = ship.guardStones.map(g => {
      const tier = guardStoneTier(g.tier);
      return `<li>${escapeHtml(tier.label)}${g.element ? ` · ${escapeHtml(g.element)}` : ""} <span class="muted">(${tier.effect})</span></li>`;
    }).join("");
    const rows = [
      ["Crew", "crew", ship.crew || "—"],
      ["Cargo", "cargo", ship.cargo || "—"],
      ["Price", "price", ship.price ? `${ship.price.toLocaleString("en")} Dbl.` : "—"]
    ].map(([k, f, v]) => `<tr><th>${k}</th><td>${valueHtml(ship, f, escapeHtml(String(v)))}</td></tr>`).join("");
    const changed = ship.changed.length
      ? `<p class="muted gm-sub-label">✎ ${ship.changed.length} value${ship.changed.length === 1 ? "" : "s"} changed by the story; everything else follows the ${escapeHtml(ship.typeName)} in the Ship Rules.</p>`
      : ship.type === "custom" ? "" : `<p class="muted gm-sub-label">All values follow the ${escapeHtml(ship.typeName)} in the Ship Rules.</p>`;
    return `
      ${ship.typeKnown ? "" : `<p class="gm-sub-label ship-warning">⚠ The type file “${escapeHtml(ship.type)}” is missing from rules/ships/ — only this ship's own story changes are known.</p>`}
      ${changed}
      <table class="gm-mini-table gm-info-table">${rows}</table>
      ${ship.traits.length ? `<p class="gm-sub-label">${traitsHtml(ship.traits, catalog?.traits)}${ship.changed.includes("traits") ? " ✎" : ""}</p>` : ""}
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
    const v = (field, text) => valueHtml(ship, field, escapeHtml(String(text)));
    return `
      <div class="gm-card-head">
        ${pictureHtml(ship.picture)}
        <div class="gm-card-title">
          <h3>${escapeHtml(ship.name || "Unnamed")}</h3>
          <span class="muted gm-ship-type">${ship.typeKnown ? "" : "⚠ "}${escapeHtml(ship.typeName)}</span>
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
        <div class="gauge-label"><span>Hull</span><span>${ship.hullCurrent} / ${ship.hullMax}${ship.changed.includes("hull") ? " ✎" : ""}</span></div>
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
        <span title="Armor">Arm ${v("armor", ship.armor)}</span>
        <span title="Max Speed (m/s)">Speed ${v("maxSpeed", ship.maxSpeed)}</span>
        <span title="Handling">Hand ${v("handling", ship.handling)}</span>
        <span title="Turn Rate">Turn ${v("turnRate", `${ship.turnRate}°`)}</span>
        <span title="Maneuverability">Man ${v("maneuverability", ship.maneuverability)}</span>
        <span title="Broadside">Broadside ${v("broadside", ship.broadside)}</span>
        <span title="Chasers">Chasers ${v("chasers", ship.chasers)}</span>
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
    if (!shipsLoaded || !settingsLoaded || !catalogDone) return;
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
      entry.holdCount.textContent = `${ship.hold.length} · ${ship.chest.toLocaleString("en")} Dbl.`;
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
    if (m !== except) m.open = false;
  });
  document.addEventListener("click", (e) => closeMenus(e.target.closest("details.gm-menu")));

  // A broken picture falls back to the placeholder.
  fleetEl.addEventListener("error", (e) => {
    if (e.target.tagName !== "IMG") return;
    e.target.style.display = "none";
    const ph = e.target.nextElementSibling;
    if (ph) ph.style.display = "";
  }, true);

  // Enter in the amount field = Damage.
  fleetEl.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !e.target.matches("[data-hull-amount]")) return;
    e.preventDefault();
    e.target.closest(".gm-vital").querySelector('[data-hull="hit"]').click();
  });

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
      try { await updateShip(campaign, id, { hullDamage: ship.hullMax - next }); } catch (err) { fail(err); }
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
        ? ` Its hold (${ship.hold.length} kind${ship.hold.length === 1 ? "" : "s"} of thing) and ${ship.chest.toLocaleString("en")} Dbl. go down with it — move them to another ship first if you want to keep them.`
        : "";
      if (!await confirmDialog({ message: `Delete ${ship.name} for good?${goods}`, confirmLabel: "Delete ship", danger: true })) return;
      try {
        if (activeShipId === id) await setActiveShip(campaign, null);
        await deleteShip(campaign, id);
        flash(`${ship.name} deleted.`);
      } catch (err) { fail(err); }
    }
  });

  // ---- Edit dialog ----
  //
  // Values start at what the ship has now; for a ship of a compendium type
  // each shows the rules value beside it, and only values that differ are
  // stored (as story changes). "Back to the rules" clears them all.

  function editShip(id) {
    const ship = ships[id];
    if (!ship) return Promise.resolve();
    const type = typeOf(ship);
    const previousFocus = document.activeElement;
    let picture = ship.imageUrl || "";
    let stones = ship.guardStones.map(g => ({ ...g }));

    const dialog = document.createElement("dialog");
    dialog.className = "confirm-dialog ship-edit-dialog";
    dialog.setAttribute("aria-label", `Edit ${ship.name}`);
    const rulesHint = (field) => {
      if (!type) return "";
      const value = field === "traits" ? type.traits.join(", ") || "none" : type[field];
      return `<span class="ship-rules-value" data-rules-for="${field}">rules: ${escapeHtml(String(value))}</span>`;
    };
    const field = (key, label, input, hint = "") => `<div class="field"><label for="ship-e-${key}">${label} ${hint}</label>${input}</div>`;
    dialog.innerHTML = `
      <form method="dialog" class="confirm-dialog-body" novalidate>
        <h3 class="confirm-dialog-title">Edit ${escapeHtml(ship.name)}</h3>
        <p class="muted">${type
          ? `A ${escapeHtml(type.name)}: its values come from the Ship Rules. Change one only for a story reason — it's stored as this ship's story change and marked ✎.`
          : ship.type === "custom" ? "A custom ship: all its values are its own." : `⚠ The type “${escapeHtml(ship.type)}” isn't in the Ship Rules any more.`}
          Players see everything here except the hull numbers.</p>

        ${field("name", "Name", `<input type="text" id="ship-e-name" name="name" value="${escapeHtml(ship.name)}">`)}

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

        <h4 class="gm-ship-subhead">Values</h4>
        <div class="gm-ship-form">
          ${VALUE_FIELDS.map(([k, l, kind]) => field(k, l,
            `<input type="${kind}"${kind === "number" ? ' min="0"' : ""} id="ship-e-${k}" name="${k}" value="${escapeHtml(String(ship[k]))}">`,
            rulesHint(k))).join("")}
        </div>
        ${field("traits", "Traits (comma-separated)", `<input type="text" id="ship-e-traits" name="traits" value="${escapeHtml(ship.traits.join(", "))}">`, rulesHint("traits"))}
        <p class="muted ship-edit-traits">Rules traits: ${Object.values(catalog?.traits || {}).map(t => `<span class="ship-trait" title="${escapeHtml(t.text)}">${escapeHtml(t.name)}</span>`).join(" ") || "—"}</p>
        ${type ? `<button type="button" class="small" data-reset-values>↺ All values back to the rules</button>` : ""}

        <h4 class="gm-ship-subhead">Guard Stones <span class="muted">(rules Section 9 — one per terminal slot)</span></h4>
        ${field("terminalSlots", "Guard Stone Terminal slots", `<input type="number" min="0" id="ship-e-terminalSlots" name="terminalSlots" value="${ship.terminalSlots}">`)}
        <ul class="inventory-list" data-stones></ul>
        <button type="button" class="small" data-add-stone>+ Seat a Guard Stone</button>

        ${field("storyChanges", "Story changes (text)", `<textarea id="ship-e-storyChanges" name="storyChanges" rows="2" placeholder="Why it differs — e.g. Guard Stone Terminal from a wreck, reinforced hull">${escapeHtml(ship.storyChanges)}</textarea>`)}
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
      const own = portraitUrl(picture);
      const src = own || (type?.image || "");
      $("[data-pic]").innerHTML = src
        ? `<img src="${escapeHtml(src)}" alt="" referrerpolicy="no-referrer">${own ? "" : `<span class="ship-banner-tag">picture of the ${escapeHtml(type.name)} type</span>`}`
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
      add.title = slots === 0 ? "No Guard Stone Terminal — set its slots first" : "";
    }

    // A value that differs from the rules gets its hint highlighted.
    function paintChanged() {
      if (!type) return;
      [...VALUE_FIELDS.map(([k]) => k), "traits"].forEach(k => {
        const input = $(`#ship-e-${k}`);
        const value = k === "traits" ? input.value.split(",").map(t => t.trim()).filter(Boolean) : input.value;
        const changed = Object.keys(overridesFor(ship.type, { [k]: value }, catalog)).length > 0;
        $(`[data-rules-for="${k}"]`)?.classList.toggle("is-changed", changed);
      });
    }
    paintPicture();
    paintStones();
    paintChanged();

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
      if (pic?.dataset.picAction === "remove") {
        picture = "";
        picStatus.textContent = type?.image ? "Own picture removed — the type's picture shows again. Save to keep it." : "Picture removed — Save to keep it that way.";
        paintPicture();
        return;
      }
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
      if (e.target.closest("[data-reset-values]")) {
        [...VALUE_FIELDS.map(([k]) => k), "traits"].forEach(k => {
          $(`#ship-e-${k}`).value = k === "traits" ? type.traits.join(", ") : String(type[k]);
        });
        paintChanged();
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
    form.addEventListener("input", paintChanged);
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
      const terminalSlots = Math.max(0, Math.floor(Number(v.terminalSlots) || 0));
      if (stones.length > terminalSlots) {
        error.textContent = `${stones.length} Guard Stones need ${stones.length} terminal slots — raise the slots or remove a stone.`;
        return;
      }
      const values = Object.fromEntries(VALUE_FIELDS.map(([k, , kind]) => [k, kind === "number" ? Math.max(0, Math.floor(Number(v[k]) || 0)) : (v[k] || "").trim()]));
      values.traits = (v.traits || "").split(",").map(t => t.trim()).filter(Boolean);
      const latest = ships[id] || ship;
      const fields = {
        name,
        imageUrl: picture,
        overrides: overridesFor(ship.type, values, catalog),
        // Lost Hull stays lost when Max Hull changes (never more than all of it).
        hullDamage: Math.min(latest.hullDamage, values.hull),
        terminalSlots,
        guardStones: stones.map(g => ({ id: g.id, tier: g.tier, element: (g.element || "").trim() })),
        storyChanges: (v.storyChanges || "").trim(),
        notes: (v.notes || "").trim()
      };
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

  const typeCards = new Map();   // key -> card element

  const browser = createShipTypeBrowser({
    grid: shipyardGrid,
    filter: document.getElementById("shipyard-filter"),
    chips: document.getElementById("shipyard-chips")
  }, {
    makeCard(type) {
      const el = document.createElement("div");
      el.className = "card gm-card shipyard-card";
      el.dataset.type = type.key;
      const add = `<button type="button" class="brass small shipyard-add" data-add-type="${escapeHtml(type.key)}">+ Add to fleet</button>`;
      el.innerHTML = type.key === "custom"
        ? `<div class="gm-card-head"><span class="gm-portrait shipyard-icon" aria-hidden="true">🛠️</span>
             <div class="gm-card-title"><h3>Custom ship</h3><span class="muted">not in the compendium</span></div>
             <span class="gm-count" data-owned hidden></span></div>
           <p class="shipyard-summary">A story ship that isn't in the Ship Rules — fill in every value yourself under Edit ship.</p>${add}`
        : shipTypeCardHtml(type, { traits: catalog?.traits, actionsHtml: add });
      typeCards.set(type.key, el);
      return el;
    }
  });

  const customType = { ...CUSTOM_TYPE, group: "", alwaysShow: true };

  // "2 in fleet" on each type the campaign already owns.
  function renderShipyardCounts() {
    const owned = {};
    Object.values(ships).forEach(s => { owned[s.type] = (owned[s.type] || 0) + 1; });
    typeCards.forEach((el, key) => {
      const badge = el.querySelector("[data-owned]");
      badge.hidden = !owned[key];
      badge.textContent = owned[key] ? `${owned[key]} in fleet` : "";
    });
  }

  shipyardGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-add-type]");
    if (!btn) return;
    const key = btn.dataset.addType;
    const type = key === "custom" ? null : catalog?.byKey?.[key];
    if (key !== "custom" && !type) return;
    const values = await formDialog({
      title: type ? `Add a ${type.name}` : "Add a custom ship",
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
    const name = values.name.trim();
    let ref;
    try {
      ref = await addShip(campaign, name, type);
    } catch (err) { fail(err); return; }
    openSections.add(`${ref.id}:details`);
    scrollToId = ref.id;
    renderFleet();
    if (values.crew) {
      try { await setActiveShip(campaign, ref.id); } catch (err) { fail(err); return; }
    }
    flash(`${name} joins the fleet.${values.crew ? " Players see it now." : ""}`);
  });

  document.getElementById("open-shipyard-btn").addEventListener("click", () => {
    shipyardEl.open = true;
    shipyardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("shipyard-filter").focus({ preventScroll: true });
  });

  loadShipCatalog("../rules/").then(c => {
    catalog = c;
    browser.setTypes([...c.ships, customType]);
    resolveAll();
    migrateLegacy();
  }, (err) => {
    console.error(err);
    browser.setTypes([customType]);
    shipyardGrid.insertAdjacentHTML("afterbegin", `<p class="card empty-state">Couldn't load the ship types from the Ship Rules (rules/ships/), so only a custom ship can be added, and ships show only their own values.</p>`);
  }).finally(() => {
    catalogDone = true;
    renderShipyardCounts();
    renderFleet();
  });

  // ---- Live data ----

  onSnapshot(shipsCol(campaign), (snap) => {
    rawShips = {};
    snap.docs.forEach(d => { rawShips[d.id] = d.data(); });
    resolveAll();
    migrateLegacy();
    shipsLoaded = true;
    renderFleet();
  }, (err) => {
    console.error(err);
    fleetEl.innerHTML = `<div class="card empty-state">Couldn't load the ships (${escapeHtml(err.code || err.message)}) — publish the ships and settings rules from firestore.rules in the Firebase console.</div>`;
  });

  onSnapshot(settingsRef(campaign), (snap) => {
    activeShipId = (snap.exists() && snap.data().activeShipId) || null;
    settingsLoaded = true;
    renderFleet();
  }, (err) => console.error(err));
}
