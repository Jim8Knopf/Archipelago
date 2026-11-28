// ============================================================
// The ship's hold and chest, as one widget used by the player sheet
// (mode "player": Take moves an item into that character's inventory) and
// the GM dashboard (mode "gm": move items to another ship).
//
// Everyone has full access: anyone can add, change, take or throw out
// anything, and put Doubloons in or take them out of the chest. Every
// change goes through a transaction in js/ship.js.
//
// The search box, category chips and add row are built once and never
// replaced, so typing isn't interrupted when someone else changes the
// hold; each snapshot only redraws the list and the chest amount.
// ============================================================

import { escapeHtml, toRoman } from "./format.js";
import * as R from "./rules-calc.js";
import { HOLD_CATEGORIES, holdCategory, qtyOf, addStacked } from "./ship-calc.js";
import {
  updateHold, changeChest, takeItem, moveBetweenShips, shipErrorMessage, ShipError
} from "./ship.js";
import { confirmDialog } from "./confirm.js";
import { formDialog } from "./dialogs.js";

let viewCount = 0;

const ADD_LABELS = {
  item: "Item name", potion: "Potion name", armor: "Armor name", weapon: "Weapon name"
};

const CATEGORY_FOR_TYPE = { item: null, potion: "potions", armor: "armor", weapon: "weapons" };

const categoryOptions = (selected) => HOLD_CATEGORIES.map(c =>
  `<option value="${c.key}"${c.key === selected ? " selected" : ""}>${c.icon} ${escapeHtml(c.label)}</option>`
).join("");

// Asks how many of a stack (1–max). Resolves to a number, or null if
// cancelled. A single item needs no question.
export async function askQuantity({ title, max, initial = max, confirmLabel = "OK", extraHtml = "" }) {
  if (max <= 1 && !extraHtml) return 1;
  const id = `qty-${++viewCount}`;
  const values = await formDialog({
    title,
    confirmLabel,
    bodyHtml: `
      ${extraHtml}
      ${max > 1 ? `<div class="field">
        <label for="${id}">How many? (1–${max})</label>
        <input type="number" name="qty" id="${id}" min="1" max="${max}" value="${initial}" inputmode="numeric">
      </div>` : ""}`,
    validate: (v) => {
      if (max <= 1) return "";
      const n = Number(v.qty);
      return Number.isInteger(n) && n >= 1 && n <= max ? "" : `Pick a number from 1 to ${max}.`;
    }
  });
  if (!values) return null;
  return max > 1 ? Number(values.qty) : 1;
}

function itemDetail(item) {
  if (item.type === "armor") return `Armor ${item.armorValue ?? 0}`;
  if (item.type === "weapon") return escapeHtml(item.woundDice || "");
  return "";
}

function itemNameHtml(item) {
  const tag = item.type === "potion"
    ? `<span class="magnitude-tag" title="Magnitude ${R.magnitudeOf(item)}">${toRoman(R.magnitudeOf(item))}</span>`
    : "";
  return `${tag}${escapeHtml(item.name || "Unnamed")}`;
}

// opts:
//   campaign
//   mode:          "player" | "gm"
//   getCharacter:  () => ({ id, name }) | null     (player: who takes things)
//   getOtherShips: () => [{ id, name }]            (gm: where "→ Ship" can go)
//   flash:         (message) => void
export function createHoldView(root, opts) {
  const n = ++viewCount;
  const isPlayer = opts.mode === "player";
  // On the sheet, the fiddly controls (− + ✎ ✕) are Edit mode only, like
  // the rest of the sheet; Take, the chest and adding stay in View mode.
  const editOnly = isPlayer ? ' data-edit-control="true"' : "";
  let shipId = null;
  let ship = null;
  let category = "all";

  root.classList.add("hold-view");
  root.innerHTML = `
    <div class="hold-chest">
      <span class="hold-chest-label">💰 Ship's chest: <b data-chest-value>0</b> Dbl.</span>
      <span class="hold-chest-controls">
        <input type="number" min="1" step="1" inputmode="numeric" placeholder="Dbl." aria-label="Doubloons" data-chest-amount>
        <button type="button" class="small brass" data-chest="add">Put in</button>
        <button type="button" class="small" data-chest="take">Take out</button>
      </span>
    </div>

    <details class="hold-add">
      <summary>+ Add to the hold</summary>
      <div class="row add-item-row">
        <div class="field type-field">
          <label for="hold-type-${n}">Type</label>
          <select id="hold-type-${n}" data-add="type">
            <option value="item">Item</option>
            <option value="potion">Potion</option>
            <option value="armor">Armor</option>
            <option value="weapon">Weapon</option>
          </select>
        </div>
        <div class="field type-field">
          <label for="hold-cat-${n}">Category</label>
          <select id="hold-cat-${n}" data-add="category">${categoryOptions("misc")}</select>
        </div>
        <div class="field name-field">
          <label for="hold-name-${n}">Name</label>
          <input type="text" id="hold-name-${n}" data-add="name" placeholder="Item name">
        </div>
        <div class="field num-field" data-for="potion">
          <label for="hold-mag-${n}" title="Magnitude 1–8">Magnitude</label>
          <input type="number" id="hold-mag-${n}" data-add="magnitude" value="1" min="1" max="8">
        </div>
        <div class="field num-field">
          <label for="hold-qty-${n}">Qty</label>
          <input type="number" id="hold-qty-${n}" data-add="qty" value="1" min="1">
        </div>
        <div class="field num-field" data-for="armor">
          <label for="hold-armor-${n}">Armor</label>
          <input type="number" id="hold-armor-${n}" data-add="armor" value="1" min="0">
        </div>
        <div class="field dice-field" data-for="weapon">
          <label for="hold-dice-${n}">Wound dice</label>
          <input type="text" id="hold-dice-${n}" data-add="dice" placeholder="e.g. 1d6">
        </div>
        <button type="button" class="brass small" data-add="submit">Add</button>
      </div>
    </details>

    <div class="hold-tools">
      <input type="search" placeholder="Search the hold…" aria-label="Search the hold" data-hold-search>
      <div class="hold-chips" role="group" aria-label="Show category" data-hold-chips></div>
    </div>
    <div data-hold-list></div>
  `;

  const $ = (sel) => root.querySelector(sel);
  const chestValue = $("[data-chest-value]");
  const chestAmount = $("[data-chest-amount]");
  const search = $("[data-hold-search]");
  const chipsEl = $("[data-hold-chips]");
  const listEl = $("[data-hold-list]");
  const add = (key) => $(`[data-add="${key}"]`);

  const fail = (err) => {
    if (!(err instanceof ShipError)) console.error(err);
    opts.flash(shipErrorMessage(err));
  };

  // ---- Add row ----

  function syncAddRow() {
    const type = add("type").value;
    root.querySelectorAll(".hold-add [data-for]").forEach(el => {
      el.style.display = el.dataset.for.split(" ").includes(type) ? "" : "none";
    });
    add("name").placeholder = ADD_LABELS[type];
    if (CATEGORY_FOR_TYPE[type]) add("category").value = CATEGORY_FOR_TYPE[type];
  }
  add("type").addEventListener("change", syncAddRow);
  syncAddRow();

  async function addFromRow() {
    if (!shipId) return;
    const name = add("name").value.trim();
    if (!name) { add("name").focus(); return; }
    const type = add("type").value;
    const qty = Math.max(1, parseInt(add("qty").value, 10) || 1);
    const item = { type, name, category: add("category").value };
    if (type === "potion") item.magnitude = R.magnitudeOf({ magnitude: add("magnitude").value });
    if (type === "armor") item.armorValue = Math.max(0, parseInt(add("armor").value, 10) || 0);
    if (type === "weapon") item.woundDice = add("dice").value.trim();
    const by = isPlayer ? opts.getCharacter()?.name : "";
    if (by) item.addedBy = by;

    add("name").value = "";
    add("qty").value = "1";
    add("dice").value = "";
    add("name").focus();
    try {
      await updateHold(opts.campaign, shipId, hold => addStacked(hold, item, qty));
      opts.flash(`${qty > 1 ? `${qty} × ` : ""}${name} stowed in the hold.`);
    } catch (err) { fail(err); }
  }
  add("submit").addEventListener("click", addFromRow);
  add("name").addEventListener("keydown", (e) => { if (e.key === "Enter") addFromRow(); });

  // ---- Chest ----

  root.querySelector(".hold-chest").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-chest]");
    if (!btn || !shipId) return;
    const amount = Math.floor(Number(chestAmount.value));
    if (!(amount > 0)) { chestAmount.focus(); return; }
    const delta = btn.dataset.chest === "add" ? amount : -amount;
    try {
      const total = await changeChest(opts.campaign, shipId, delta);
      chestAmount.value = "";
      opts.flash(`${delta > 0 ? "Put" : "Took"} ${amount.toLocaleString()} Dbl. ${delta > 0 ? "in" : "out of"} the chest — ${total.toLocaleString()} Dbl. now.`);
    } catch (err) { fail(err); }
  });

  // ---- Filtering ----

  search.addEventListener("input", renderList);
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { search.value = ""; renderList(); }
  });
  chipsEl.addEventListener("click", (e) => {
    const chip = e.target.closest("button[data-cat]");
    if (!chip) return;
    category = chip.dataset.cat;
    renderList();
    chipsEl.querySelector(`[data-cat="${category}"]`)?.focus();
  });

  function matches(item, q) {
    if (!q) return true;
    return [item.name, item.note, item.addedBy, holdCategory(item.category).label, item.woundDice]
      .some(t => (t || "").toLowerCase().includes(q));
  }

  function renderChips(hold) {
    const counts = {};
    hold.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    if (category !== "all" && !counts[category]) category = "all";
    const chip = (key, label, count) =>
      `<button type="button" class="small hold-chip" data-cat="${key}" aria-pressed="${category === key}">${label} <span class="gm-count">${count}</span></button>`;
    const html = hold.length
      ? chip("all", "All", hold.length) + HOLD_CATEGORIES.filter(c => counts[c.key])
        .map(c => chip(c.key, `${c.icon} ${escapeHtml(c.label)}`, counts[c.key])).join("")
      : "";
    if (chipsEl.innerHTML !== html) {
      const focused = chipsEl.contains(document.activeElement) ? document.activeElement.dataset.cat : null;
      chipsEl.innerHTML = html;
      if (focused) chipsEl.querySelector(`[data-cat="${focused}"]`)?.focus();
    }
  }

  function rowHtml(item, canMove) {
    const qty = qtyOf(item);
    const meta = [
      item.note ? escapeHtml(item.note) : "",
      item.addedBy ? `stowed by ${escapeHtml(item.addedBy)}` : ""
    ].filter(Boolean).join(" · ");
    const detail = itemDetail(item);
    return `
      <li class="hold-row" data-id="${escapeHtml(item.id)}">
        <span class="item-name">${itemNameHtml(item)}</span>
        ${detail ? `<span class="muted hold-detail">${detail}</span>` : ""}
        <span class="item-qty">×${qty}</span>
        <span class="hold-actions">
          <button type="button" class="small" data-hold="dec" aria-label="One less" title="One less"${qty <= 1 ? " disabled" : ""}${editOnly}>−</button>
          <button type="button" class="small" data-hold="inc" aria-label="One more" title="One more"${editOnly}>+</button>
          ${isPlayer ? `<button type="button" class="small brass" data-hold="take" title="Take it into your inventory">Take</button>` : ""}
          ${canMove ? `<button type="button" class="small" data-hold="move" title="Move to another ship's hold">→ Ship</button>` : ""}
          <button type="button" class="small" data-hold="edit" aria-label="Edit" title="Edit"${editOnly}>✎</button>
          <button type="button" class="small danger" data-hold="remove" aria-label="Throw out" title="Throw out"${editOnly}>✕</button>
        </span>
        ${meta ? `<div class="hold-meta muted">${meta}</div>` : ""}
      </li>`;
  }

  function renderList() {
    const hold = ship?.hold || [];
    renderChips(hold);
    const q = search.value.trim().toLowerCase();
    const shown = hold.filter(i => (category === "all" || i.category === category) && matches(i, q));
    const canMove = !isPlayer && (opts.getOtherShips?.() || []).length > 0;

    if (!hold.length) {
      listEl.innerHTML = `<p class="empty-state">The hold is empty.</p>`;
      return;
    }
    if (!shown.length) {
      listEl.innerHTML = `<p class="empty-state">Nothing in the hold matches “${escapeHtml(search.value.trim())}”.</p>`;
      return;
    }
    const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
    listEl.innerHTML = HOLD_CATEGORIES.map(c => {
      const items = shown.filter(i => i.category === c.key).sort(byName);
      if (!items.length) return "";
      return `
        <h4 class="hold-group" title="${escapeHtml(c.hint || "")}">${c.icon} ${escapeHtml(c.label)} <span class="gm-count">${items.length}</span></h4>
        <ul class="inventory-list hold-list">${items.map(i => rowHtml(i, canMove)).join("")}</ul>`;
    }).join("") + (shown.length < hold.length
      ? `<p class="muted hold-count">Showing ${shown.length} of ${hold.length}.</p>` : "");
  }

  // ---- Row actions ----

  const findItem = (id) => (ship?.hold || []).find(i => i.id === id);

  // Changes one item in the latest hold; it may have been taken meanwhile.
  function changeItem(id, change) {
    return updateHold(opts.campaign, shipId, hold => {
      if (!hold.some(i => i.id === id)) throw new ShipError("Someone already took that.");
      return hold.map(i => i.id === id ? change(i) : i);
    });
  }

  async function editItem(item) {
    const id = `hold-edit-${++viewCount}`;
    const extra = item.type === "potion"
      ? `<div class="field"><label for="${id}-mag">Magnitude</label><input type="number" name="magnitude" id="${id}-mag" min="1" max="8" value="${R.magnitudeOf(item)}"></div>`
      : item.type === "armor"
        ? `<div class="field"><label for="${id}-armor">Armor</label><input type="number" name="armorValue" id="${id}-armor" min="0" value="${item.armorValue ?? 0}"></div>`
        : item.type === "weapon"
          ? `<div class="field"><label for="${id}-dice">Wound dice</label><input type="text" name="woundDice" id="${id}-dice" value="${escapeHtml(item.woundDice || "")}"></div>`
          : "";
    const values = await formDialog({
      title: `Edit ${item.name || "item"}`,
      confirmLabel: "Save",
      bodyHtml: `
        <div class="field"><label for="${id}-name">Name</label><input type="text" name="name" id="${id}-name" value="${escapeHtml(item.name || "")}"></div>
        <div class="field"><label for="${id}-cat">Category</label><select name="category" id="${id}-cat" class="dialog-select">${categoryOptions(item.category)}</select></div>
        <div class="field"><label for="${id}-qty">Quantity</label><input type="number" name="qty" id="${id}-qty" min="1" value="${qtyOf(item)}"></div>
        ${extra}
        <div class="field"><label for="${id}-note">Note</label><input type="text" name="note" id="${id}-note" value="${escapeHtml(item.note || "")}" placeholder="Where it's from, what it's for…"></div>`,
      validate: (v) => {
        if (!v.name.trim()) return "Give it a name.";
        return Number(v.qty) >= 1 ? "" : "Quantity is at least 1.";
      }
    });
    if (!values) return;
    const fields = {
      name: values.name.trim(),
      category: values.category,
      qty: Math.max(1, Math.floor(Number(values.qty))),
      note: values.note.trim()
    };
    if ("magnitude" in values) fields.magnitude = R.magnitudeOf({ magnitude: values.magnitude });
    if ("armorValue" in values) fields.armorValue = Math.max(0, parseInt(values.armorValue, 10) || 0);
    if ("woundDice" in values) fields.woundDice = values.woundDice.trim();
    await changeItem(item.id, i => ({ ...i, ...fields }));
  }

  async function takeIntoInventory(item) {
    const who = opts.getCharacter();
    if (!who) return;
    const qty = await askQuantity({ title: `Take ${item.name}`, max: qtyOf(item), initial: 1, confirmLabel: "Take" });
    if (!qty) return;
    const taken = await takeItem({ campaign: opts.campaign, charId: who.id, shipId, itemId: item.id, qty });
    opts.flash(`Took ${taken > 1 ? `${taken} × ` : ""}${item.name} from the hold.`);
  }

  async function moveToShip(item) {
    const others = opts.getOtherShips() || [];
    if (!others.length) return;
    const id = `hold-move-${++viewCount}`;
    const values = await formDialog({
      title: `Move ${item.name}`,
      confirmLabel: "Move",
      bodyHtml: `
        <div class="field"><label for="${id}-ship">To ship</label>
          <select name="ship" id="${id}-ship" class="dialog-select">${others.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("")}</select></div>
        ${qtyOf(item) > 1 ? `<div class="field"><label for="${id}-qty">How many? (1–${qtyOf(item)})</label>
          <input type="number" name="qty" id="${id}-qty" min="1" max="${qtyOf(item)}" value="${qtyOf(item)}"></div>` : ""}`,
      validate: (v) => {
        if (!("qty" in v)) return "";
        const q = Number(v.qty);
        return Number.isInteger(q) && q >= 1 && q <= qtyOf(item) ? "" : `Pick a number from 1 to ${qtyOf(item)}.`;
      }
    });
    if (!values) return;
    const target = others.find(s => s.id === values.ship);
    const moved = await moveBetweenShips({
      campaign: opts.campaign, fromShipId: shipId, toShipId: values.ship, itemId: item.id, qty: Number(values.qty || 1)
    });
    opts.flash(`Moved ${moved > 1 ? `${moved} × ` : ""}${item.name} to ${target?.name || "the other ship"}.`);
  }

  listEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-hold]");
    if (!btn || !shipId) return;
    const item = findItem(btn.closest("li").dataset.id);
    if (!item) return;
    try {
      switch (btn.dataset.hold) {
        case "inc": await changeItem(item.id, i => ({ ...i, qty: qtyOf(i) + 1 })); break;
        case "dec": await changeItem(item.id, i => ({ ...i, qty: Math.max(1, qtyOf(i) - 1) })); break;
        case "edit": await editItem(item); break;
        case "take": await takeIntoInventory(item); break;
        case "move": await moveToShip(item); break;
        case "remove":
          if (!await confirmDialog({
            message: `Throw ${qtyOf(item) > 1 ? `all ${qtyOf(item)} × ` : ""}${item.name} out of the hold? It's gone for good.`,
            confirmLabel: "Throw out",
            danger: true
          })) return;
          await updateHold(opts.campaign, shipId, hold => hold.filter(i => i.id !== item.id));
          break;
      }
    } catch (err) { fail(err); }
  });

  return {
    // Shows this ship's hold (or nothing for null).
    update(nextShipId, nextShip) {
      if (nextShipId !== shipId) { category = "all"; }
      shipId = nextShipId;
      ship = nextShip;
      chestValue.textContent = (ship?.chest ?? 0).toLocaleString();
      renderList();
    }
  };
}
