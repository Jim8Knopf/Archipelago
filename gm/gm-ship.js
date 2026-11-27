// ============================================================
// GM dashboard: the ship panel.
//
// The GM can keep any number of ships. The dropdown picks which one this
// panel shows (edit it, manage its hold), and "Make it the crew's ship"
// sets the active ship — the one every player's sheet shows. Only the GM
// sees the hull numbers; players get the condition word (js/ship-calc.js),
// shown here as "Players see: …".
//
// Like the character cards, nothing is rebuilt while you work in it: the
// editor is built once per ship and later snapshots only refresh fields
// that aren't focused.
// ============================================================

import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { escapeHtml } from "../js/format.js";
import * as R from "../js/rules-calc.js";
import { SHIP_TYPES, CUSTOM_TYPE } from "../js/ship-types.js";
import { normalizeShip, shipCondition, GUARD_STONE_TIERS } from "../js/ship-calc.js";
import {
  shipsCol, settingsRef, addShip, updateShip, deleteShip, setActiveShip, shipErrorMessage
} from "../js/ship.js";
import { createHoldView } from "../js/hold-ui.js";
import { confirmDialog } from "../js/confirm.js";

export function initShipPanel({ campaign, flash }) {
  const els = {
    select: document.getElementById("ship-select"),
    makeActive: document.getElementById("make-active-btn"),
    activeNote: document.getElementById("ship-active-note"),
    body: document.getElementById("ship-body"),
    holdFold: document.getElementById("ship-hold-fold"),
    holdCount: document.getElementById("ship-hold-count"),
    editFold: document.getElementById("ship-edit-fold"),
    editor: document.getElementById("ship-editor"),
    fleetFold: document.getElementById("ship-fleet-fold"),
    fleet: document.getElementById("fleet-list"),
    newName: document.getElementById("new-ship-name"),
    newType: document.getElementById("new-ship-type"),
    addBtn: document.getElementById("add-ship-btn")
  };

  let ships = {};            // id -> normalized ship
  let activeShipId = null;
  let viewedId = null;       // the ship this panel shows
  let shipsLoaded = false;
  let settingsLoaded = false;
  let bodySig = "";
  let editorFor = null;
  let stonesSig = "";
  let fleetSig = "";
  let shownHull = null;

  const fail = (err) => { console.error(err); flash(shipErrorMessage(err)); };
  const byCreated = (a, b) => (ships[a].createdAt || 0) - (ships[b].createdAt || 0)
    || (ships[a].name || "").localeCompare(ships[b].name || "");
  const shipIds = () => Object.keys(ships).sort(byCreated);
  const viewed = () => (viewedId && ships[viewedId]) || null;

  const holdView = createHoldView(document.getElementById("gm-hold"), {
    campaign,
    mode: "gm",
    getOtherShips: () => shipIds().filter(id => id !== viewedId).map(id => ({ id, name: ships[id].name })),
    flash
  });

  // ---- Add a ship ----

  els.newType.innerHTML = [...SHIP_TYPES, CUSTOM_TYPE].map(t =>
    `<option value="${t.key}"${t.key === "sloop" ? " selected" : ""}>${escapeHtml(t.name)}${t.key === "custom" ? " (fill in yourself)" : ` — Hull ${t.hull}`}</option>`
  ).join("");

  els.addBtn.addEventListener("click", async () => {
    const name = els.newName.value.trim();
    if (!name) { els.newName.focus(); flash("Give the ship a name first."); return; }
    try {
      const ref = await addShip(campaign, name, els.newType.value);
      els.newName.value = "";
      viewedId = ref.id;
      // The first ship becomes the crew's ship straight away.
      if (!activeShipId) await setActiveShip(campaign, ref.id);
      flash(`${name} added.${activeShipId && activeShipId !== ref.id ? " Make it the crew's ship to show it to the players." : ""}`);
      render();
    } catch (err) { fail(err); }
  });
  els.newName.addEventListener("keydown", (e) => { if (e.key === "Enter") els.addBtn.click(); });

  // ---- Picking a ship ----

  els.select.addEventListener("change", () => {
    viewedId = els.select.value || null;
    render();
  });

  els.makeActive.addEventListener("click", async () => {
    if (!viewedId) return;
    try {
      await setActiveShip(campaign, viewedId);
      flash(`${ships[viewedId]?.name} is now the crew's ship.`);
    } catch (err) { fail(err); }
  });

  // ---- Hull ----

  els.body.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-hull]");
    const ship = viewed();
    if (!btn || !ship) return;
    const next = btn.dataset.hull === "full"
      ? ship.hullMax
      : Math.max(0, Math.min(ship.hullMax, ship.hullCurrent + parseInt(btn.dataset.hull, 10)));
    if (next === ship.hullCurrent) return;
    try { await updateShip(campaign, viewedId, { hullCurrent: next }); } catch (err) { fail(err); }
  });

  function gaugeClass(cur, max) {
    if (max <= 0) return "";
    const pct = (cur / max) * 100;
    return pct <= 25 ? "low" : pct <= 60 ? "mid" : "";
  }

  function bodyHtml(ship) {
    const cond = shipCondition(ship.hullCurrent, ship.hullMax);
    const pct = ship.hullMax > 0 ? Math.min(100, (ship.hullCurrent / ship.hullMax) * 100) : 0;
    return `
      <div class="gm-ship-type muted">${escapeHtml(ship.typeName || "")}${ship.traits.length ? ` · ${ship.traits.map(escapeHtml).join(", ")}` : ""}</div>
      <div class="gm-vital" data-vital="hull">
        <div class="gauge-label"><span>Hull</span><span>${ship.hullCurrent} / ${ship.hullMax}</span></div>
        <div class="gauge ${gaugeClass(ship.hullCurrent, ship.hullMax)}"><div class="fill" style="width:${pct}%"></div></div>
        <div class="gm-vital-controls gm-hull-controls">
          <button class="small" data-hull="-5">−5</button>
          <button class="small" data-hull="-1">−1</button>
          <button class="small" data-hull="1">+1</button>
          <button class="small" data-hull="5">+5</button>
          <button class="small brass" data-hull="full" title="Harbour or shipyard repair (rules Section 7)">Repair</button>
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
      </span>`;
  }

  // ---- Editor ----

  const TEXT_FIELDS = [
    ["name", "Name"], ["typeName", "Type"], ["maneuverability", "Maneuverability"],
    ["broadside", "Broadside"], ["chasers", "Chasers"], ["cargo", "Cargo"]
  ];
  const NUMBER_FIELDS = [
    ["hullMax", "Max Hull"], ["armor", "Armor"], ["maxSpeed", "Max Speed"], ["handling", "Handling"],
    ["turnRate", "Turn Rate (°)"], ["crew", "Crew"], ["price", "Price (Dbl.)"], ["terminalSlots", "Guard Stone slots"]
  ];

  function buildEditor(id) {
    editorFor = id;
    stonesSig = "";
    const field = (key, label, input) => `
      <div class="field"><label for="ship-f-${key}">${label}</label>${input}</div>`;
    els.editor.innerHTML = `
      <p class="muted">Players see everything here except the hull numbers. Changes save as you go.</p>
      <div class="gm-ship-form">
        ${TEXT_FIELDS.map(([k, l]) => field(k, l, `<input type="text" id="ship-f-${k}" data-ship-field="${k}">`)).join("")}
        ${NUMBER_FIELDS.map(([k, l]) => field(k, l, `<input type="number" id="ship-f-${k}" data-ship-field="${k}" data-number min="0">`)).join("")}
      </div>
      ${field("traits", "Traits (comma-separated)", `<input type="text" id="ship-f-traits" data-ship-field="traits" placeholder="Oars, Shallow Draft">`)}
      <h4 class="gm-ship-subhead">Guard Stones <span class="muted">(rules Section 9 — needs a terminal slot each)</span></h4>
      <ul class="inventory-list" data-stones></ul>
      <button type="button" class="small" data-add-stone>+ Seat a Guard Stone</button>
      ${field("storyChanges", "Story changes", `<textarea id="ship-f-storyChanges" data-ship-field="storyChanges" rows="2" placeholder="e.g. Guard Stone Terminal from the Black Reef wreck"></textarea>`)}
      ${field("notes", "Ship notes — every player sees these", `<textarea id="ship-f-notes" data-ship-field="notes" rows="2"></textarea>`)}
      <button type="button" class="small danger" data-delete-ship>Delete this ship</button>`;
  }

  function fillEditor(ship) {
    els.editor.querySelectorAll("[data-ship-field]").forEach(input => {
      if (input === document.activeElement) return;
      const k = input.dataset.shipField;
      const value = k === "traits" ? ship.traits.join(", ") : String(ship[k] ?? "");
      if (input.value !== value) input.value = value;
    });
    const sig = JSON.stringify([ship.guardStones, ship.terminalSlots]);
    const stonesEl = els.editor.querySelector("[data-stones]");
    if (sig !== stonesSig && !stonesEl.contains(document.activeElement)) {
      stonesSig = sig;
      stonesEl.innerHTML = ship.guardStones.length ? ship.guardStones.map(g => `
        <li class="row gm-stone" data-stone="${escapeHtml(g.id)}">
          <select data-stone-field="tier" aria-label="Tier">${GUARD_STONE_TIERS.map(t =>
            `<option value="${t.key}"${t.key === g.tier ? " selected" : ""}>${t.label} (${t.effect})</option>`).join("")}</select>
          <input type="text" data-stone-field="element" value="${escapeHtml(g.element)}" placeholder="Element, e.g. Fire" aria-label="Element">
          <button type="button" class="small danger" data-remove-stone aria-label="Remove stone">✕</button>
        </li>`).join("") : `<li class="muted">No stones seated.</li>`;
    }
    const addStone = els.editor.querySelector("[data-add-stone]");
    addStone.disabled = ship.guardStones.length >= ship.terminalSlots;
    addStone.title = ship.terminalSlots === 0 ? "The ship has no Guard Stone Terminal — set its slots first" : "";
  }

  els.editor.addEventListener("change", async (e) => {
    const ship = viewed();
    if (!ship) return;
    const input = e.target.closest("[data-ship-field]");
    if (input) {
      const k = input.dataset.shipField;
      const fields = {};
      if (k === "traits") {
        fields.traits = input.value.split(",").map(t => t.trim()).filter(Boolean);
      } else if (input.dataset.number != null) {
        fields[k] = Math.max(0, Math.floor(Number(input.value) || 0));
        if (k === "hullMax") fields.hullCurrent = R.currentAfterMaxChange(ship.hullCurrent, ship.hullMax, fields.hullMax);
      } else {
        fields[k] = input.value.trim();
        if (k === "name" && !fields.name) { input.value = ship.name; return; }
      }
      try { await updateShip(campaign, viewedId, fields); } catch (err) { fail(err); }
      return;
    }
    const stoneInput = e.target.closest("[data-stone-field]");
    if (stoneInput) {
      const id = stoneInput.closest("[data-stone]").dataset.stone;
      const key = stoneInput.dataset.stoneField;
      const guardStones = ship.guardStones.map(g => g.id === id ? { ...g, [key]: stoneInput.value.trim() } : g);
      try { await updateShip(campaign, viewedId, { guardStones }); } catch (err) { fail(err); }
    }
  });

  els.editor.addEventListener("click", async (e) => {
    const ship = viewed();
    if (!ship) return;
    if (e.target.closest("[data-add-stone]")) {
      const guardStones = [...ship.guardStones, { id: R.makeId(), tier: "minor", element: "Fire" }];
      try { await updateShip(campaign, viewedId, { guardStones }); } catch (err) { fail(err); }
      return;
    }
    const remove = e.target.closest("[data-remove-stone]");
    if (remove) {
      const id = remove.closest("[data-stone]").dataset.stone;
      try { await updateShip(campaign, viewedId, { guardStones: ship.guardStones.filter(g => g.id !== id) }); } catch (err) { fail(err); }
      return;
    }
    if (e.target.closest("[data-delete-ship]")) {
      const goods = ship.hold.length || ship.chest
        ? ` Its hold (${ship.hold.length} kind${ship.hold.length === 1 ? "" : "s"} of thing) and ${ship.chest.toLocaleString()} Dbl. go down with it — move them to another ship first if you want to keep them.`
        : "";
      if (!await confirmDialog({
        message: `Delete ${ship.name} for good?${goods}`,
        confirmLabel: "Delete ship",
        danger: true
      })) return;
      const id = viewedId;
      try {
        if (activeShipId === id) await setActiveShip(campaign, null);
        await deleteShip(campaign, id);
        flash(`${ship.name} deleted.`);
      } catch (err) { fail(err); }
    }
  });

  // ---- All ships ----

  function renderFleet() {
    const ids = shipIds();
    const html = ids.length ? ids.map(id => {
      const s = ships[id];
      const cond = shipCondition(s.hullCurrent, s.hullMax);
      const active = id === activeShipId;
      return `
        <li class="gm-fleet-row" data-ship="${escapeHtml(id)}">
          <span class="item-name">${active ? "★ " : ""}${escapeHtml(s.name)}</span>
          <span class="muted">${escapeHtml(s.typeName)} · Hull ${s.hullCurrent}/${s.hullMax} · <span class="ship-cond-badge cond-${cond.key}">${escapeHtml(cond.label)}</span></span>
          <span class="gm-fleet-actions">
            ${id === viewedId ? `<span class="muted">shown above</span>` : `<button type="button" class="small" data-fleet="show">Show</button>`}
            ${active ? `<span class="muted">crew's ship</span>` : `<button type="button" class="small brass" data-fleet="activate">Make crew's ship</button>`}
          </span>
        </li>`;
    }).join("") : `<li class="muted">No ships yet.</li>`;
    if (html !== fleetSig) { fleetSig = html; els.fleet.innerHTML = html; }
  }

  els.fleet.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-fleet]");
    if (!btn) return;
    const id = btn.closest("[data-ship]").dataset.ship;
    if (btn.dataset.fleet === "show") {
      viewedId = id;
      render();
      return;
    }
    try {
      await setActiveShip(campaign, id);
      flash(`${ships[id]?.name} is now the crew's ship.`);
    } catch (err) { fail(err); }
  });

  // ---- Render ----

  function render() {
    if (!shipsLoaded || !settingsLoaded) return;
    const ids = shipIds();
    if (!viewed()) viewedId = (activeShipId && ships[activeShipId]) ? activeShipId : ids[0] || null;
    const ship = viewed();

    const options = ids.map(id => `<option value="${escapeHtml(id)}">${id === activeShipId ? "★ " : ""}${escapeHtml(ships[id].name)}</option>`).join("");
    const selectHtml = options || `<option value="">No ships yet</option>`;
    if (els.select.innerHTML !== selectHtml) els.select.innerHTML = selectHtml;
    els.select.value = viewedId || "";
    els.select.disabled = !ids.length;

    const isActive = !!ship && viewedId === activeShipId;
    els.makeActive.hidden = !ship || isActive;
    els.activeNote.textContent = !ship ? ""
      : isActive ? "The crew's ship — players see this one."
        : activeShipId && ships[activeShipId] ? `Players see ${ships[activeShipId].name}, not this one.` : "Players see no ship right now.";

    els.holdFold.hidden = !ship;
    els.editFold.hidden = !ship;
    if (!ship) {
      bodySig = "";
      editorFor = null;
      shownHull = null;
      els.body.innerHTML = `<p class="muted">No ships yet — add the crew's ship under “All ships · add a ship”.</p>`;
      els.fleetFold.open = true;
      holdView.update(null, null);
      renderFleet();
      return;
    }

    const { hold, chest, ...bodyPart } = ship;
    const sig = viewedId + JSON.stringify(bodyPart);
    if (sig !== bodySig) {
      bodySig = sig;
      els.body.innerHTML = bodyHtml(ship);
      if (shownHull && shownHull.id === viewedId && shownHull.hull !== ship.hullCurrent) {
        els.body.querySelector('[data-vital="hull"]').classList.add(ship.hullCurrent < shownHull.hull ? "pulse-down" : "pulse-up");
      }
      shownHull = { id: viewedId, hull: ship.hullCurrent };
    }

    if (editorFor !== viewedId) buildEditor(viewedId);
    fillEditor(ship);

    els.holdCount.textContent = `${ship.hold.length} · ${ship.chest.toLocaleString()} Dbl.`;
    holdView.update(viewedId, ship);
    renderFleet();
  }

  onSnapshot(shipsCol(campaign), (snap) => {
    ships = {};
    snap.docs.forEach(d => { ships[d.id] = normalizeShip(d.data()); });
    shipsLoaded = true;
    render();
  }, (err) => {
    console.error(err);
    els.body.innerHTML = `<p class="muted">Couldn't load the ships — the Firestore rules need the ships and settings blocks from firestore.rules.</p>`;
  });

  onSnapshot(settingsRef(campaign), (snap) => {
    const next = (snap.exists() && snap.data().activeShipId) || null;
    // The panel follows the crew's ship when it was showing the old one.
    if (!settingsLoaded || viewedId === activeShipId) viewedId = next;
    activeShipId = next;
    settingsLoaded = true;
    render();
  }, (err) => console.error(err));
}
