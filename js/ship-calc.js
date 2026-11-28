// ============================================================
// Pure ship helpers: the hull condition players see, ship document
// defaults, and the item maths for the ship's hold (stacking, taking a
// few off a stack, turning a character's item into a hold item and back).
//
// No DOM or Firestore, so it's easy to test. js/ship.js does the writes.
// ============================================================

import { makeId, magnitudeOf } from "./rules-calc.js";

// ---- Hull condition ----
//
// Players never see the hull numbers, only one of these words. It goes by
// the share of max Hull left, since hulls run from 3 (rowboat) to 110
// (Man-of-War). `level` 0 is the best; the sheet fills 5 − level of its
// five bar segments, so the bar steps with the word instead of giving the
// exact value away.
export const SHIP_CONDITIONS = [
  { key: "perfect", level: 0, minPct: 100, label: "Perfect condition" },
  { key: "scraped", level: 1, minPct: 75, label: "A few scrapes" },
  { key: "damaged", level: 2, minPct: 50, label: "A bit damaged" },
  { key: "badly", level: 3, minPct: 25, label: "Badly damaged" },
  { key: "afloat", level: 4, minPct: 0, label: "Barely afloat" },
  // Hull 0 (rules Section 6.3).
  { key: "crippled", level: 5, minPct: null, label: "Crippled — dead in the water" }
];

export function shipCondition(current, max) {
  const cur = Math.max(0, Number(current) || 0);
  const m = Math.max(0, Number(max) || 0);
  if (m > 0 && cur <= 0) return SHIP_CONDITIONS[SHIP_CONDITIONS.length - 1];
  const pct = m > 0 ? (cur / m) * 100 : 100;
  return SHIP_CONDITIONS.find(c => c.minPct != null && pct >= c.minPct);
}

// ---- Guard Stones (rules Section 9) ----

export const GUARD_STONE_TIERS = [
  { key: "minor", label: "Minor", effect: "Magnitude −1" },
  { key: "moderate", label: "Moderate", effect: "Magnitude −2" },
  { key: "major", label: "Major", effect: "Magnitude −3" }
];

export const guardStoneTier = (key) => GUARD_STONE_TIERS.find(t => t.key === key) || GUARD_STONE_TIERS[0];

// ---- Hold categories ----

export const HOLD_CATEGORIES = [
  { key: "supplies", label: "Supplies", icon: "🪵", hint: "Repair materials, boarding gear, provisions" },
  { key: "cargo", label: "Cargo", icon: "📦", hint: "Trade goods" },
  { key: "weapons", label: "Weapons", icon: "⚔️" },
  { key: "armor", label: "Armor", icon: "🛡️" },
  { key: "potions", label: "Potions", icon: "🧪" },
  { key: "treasure", label: "Treasure", icon: "💎" },
  { key: "misc", label: "Misc", icon: "🧭" }
];

const CATEGORY_KEYS = HOLD_CATEGORIES.map(c => c.key);
export const holdCategory = (key) => HOLD_CATEGORIES.find(c => c.key === key) || HOLD_CATEGORIES[HOLD_CATEGORIES.length - 1];

// Where an item lands in the hold unless someone picks a category.
export function defaultCategoryFor(type) {
  if (type === "weapon") return "weapons";
  if (type === "armor") return "armor";
  if (type === "potion") return "potions";
  return "misc";
}

export const ITEM_TYPES = ["item", "potion", "armor", "weapon"];

// ---- Ship documents ----

// A ship that isn't in the compendium (a story ship): the GM fills it in.
export const CUSTOM_TYPE = {
  key: "custom", name: "Custom ship", de: "", hull: 10, armor: 0, maxSpeed: 4, handling: 1, turnRate: 45,
  maneuverability: "+0", broadside: "—", chasers: "—", crew: 0, cargo: "", traits: [], price: 0
};

// A new ship of a compendium type (a js/ship-catalog.js entry, read from
// the Ship Rules), at full Hull. No type: a custom ship.
export function defaultShip(name, type = CUSTOM_TYPE) {
  const t = type || CUSTOM_TYPE;
  return {
    name: (name || "").trim() || t.name,
    type: t.key,
    typeName: t.key === "custom" ? "" : t.name,
    hullMax: t.hull,
    hullCurrent: t.hull,
    armor: t.armor,
    maxSpeed: t.maxSpeed,
    handling: t.handling,
    turnRate: t.turnRate,
    maneuverability: t.maneuverability,
    broadside: t.broadside,
    chasers: t.chasers,
    crew: t.crew,
    cargo: t.cargo,
    traits: [...t.traits],
    price: t.price,
    terminalSlots: 0,
    guardStones: [],
    storyChanges: "",
    notes: "",
    imageUrl: "",
    chest: 0,
    hold: [],
    createdAt: Date.now()
  };
}

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

export function normalizeHoldItem(item) {
  const type = ITEM_TYPES.includes(item?.type) ? item.type : "item";
  return {
    ...item,
    id: item?.id || makeId(),
    type,
    name: String(item?.name ?? ""),
    qty: Math.max(1, Math.floor(num(item?.qty, 1)) || 1),
    category: CATEGORY_KEYS.includes(item?.category) ? item.category : defaultCategoryFor(type)
  };
}

// Fills in anything an older or partial ship document is missing.
export function normalizeShip(d) {
  const def = defaultShip(d?.name, null);
  const ship = { ...def, ...(d || {}) };
  ship.hullMax = Math.max(0, Math.floor(num(ship.hullMax, def.hullMax)));
  ship.hullCurrent = Math.max(0, Math.min(ship.hullMax, Math.floor(num(ship.hullCurrent, ship.hullMax))));
  ship.chest = Math.max(0, Math.floor(num(ship.chest)));
  ship.terminalSlots = Math.max(0, Math.floor(num(ship.terminalSlots)));
  ["name", "type", "typeName", "maneuverability", "broadside", "chasers", "cargo", "storyChanges", "notes", "imageUrl"]
    .forEach(k => { ship[k] = String(ship[k] ?? ""); });
  ["armor", "maxSpeed", "handling", "turnRate", "crew", "price"]
    .forEach(k => { ship[k] = num(ship[k], def[k]); });
  ship.traits = Array.isArray(ship.traits) ? ship.traits.filter(Boolean).map(String) : [];
  ship.guardStones = (Array.isArray(ship.guardStones) ? ship.guardStones : []).map(g => ({
    id: g?.id || makeId(),
    tier: guardStoneTier(g?.tier).key,
    element: String(g?.element ?? "")
  }));
  ship.hold = Array.isArray(ship.hold) ? ship.hold.map(normalizeHoldItem) : [];
  return ship;
}

// ---- Items: stacking and splitting ----
//
// Character inventory: "item" and "potion" entries carry a qty, armor and
// weapons are one entry per piece (no qty). In the hold every entry has a
// qty, so twelve cutlasses are one line.

export const qtyOf = (item) => Math.max(1, Math.floor(num(item?.qty, 1)) || 1);

const sameText = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

// Same kind of thing, so they go on one stack.
export function sameStack(a, b) {
  if (a.type !== b.type || !sameText(a.name, b.name)) return false;
  if (a.type === "potion") return magnitudeOf(a) === magnitudeOf(b);
  if (a.type === "armor") return num(a.armorValue) === num(b.armorValue);
  if (a.type === "weapon") return sameText(a.woundDice, b.woundDice);
  return true;
}

// Adds `qty` of `item` to a list that keeps a qty on every entry (the
// hold, or character items/potions), stacking onto a matching entry.
export function addStacked(list, item, qty) {
  const n = Math.max(1, Math.floor(qty) || 1);
  const stack = list.find(i => sameStack(i, item));
  if (stack) return list.map(i => i === stack ? { ...i, qty: qtyOf(i) + n } : i);
  return [...list, { ...item, id: makeId(), qty: n }];
}

// Takes up to `qty` off the entry with this id. Returns the new list and
// how many were really taken (0 if the entry is gone).
export function takeFrom(list, id, qty) {
  const entry = list.find(i => i.id === id);
  if (!entry) return { list, taken: 0, entry: null };
  const have = qtyOf(entry);
  const taken = Math.max(1, Math.min(have, Math.floor(qty) || 1));
  const next = taken >= have
    ? list.filter(i => i.id !== id)
    : list.map(i => i.id === id ? { ...i, qty: have - taken } : i);
  return { list: next, taken, entry };
}

// A character's item as it goes into the hold. Worn armor comes off.
export function toHoldItem(item, addedBy) {
  const { worn, ...rest } = item;
  return {
    ...rest,
    type: ITEM_TYPES.includes(item.type) ? item.type : "item",
    category: CATEGORY_KEYS.includes(item.category) ? item.category : defaultCategoryFor(item.type),
    ...(addedBy ? { addedBy } : {})
  };
}

// Adds `qty` of a hold item to a character's inventory: items and potions
// stack, armor and weapons become one entry each.
export function addToInventory(inventory, holdItem, qty) {
  const { addedBy, qty: _q, id: _id, ...rest } = holdItem;
  const n = Math.max(1, Math.floor(qty) || 1);
  if (rest.type === "armor" || rest.type === "weapon") {
    const pieces = Array.from({ length: n }, () => ({
      ...rest, id: makeId(), ...(rest.type === "armor" ? { worn: false } : {})
    }));
    return [...inventory, ...pieces];
  }
  return addStacked(inventory, rest, n);
}

// Takes up to `qty` of an inventory entry out of a character's inventory.
// Armor and weapons are single pieces, so at most one comes off.
export function takeFromInventory(inventory, id, qty) {
  const entry = inventory.find(i => i.id === id);
  if (!entry) return { list: inventory, taken: 0, entry: null };
  if (entry.type === "armor" || entry.type === "weapon") {
    return { list: inventory.filter(i => i.id !== id), taken: 1, entry };
  }
  return takeFrom(inventory, id, qty);
}

// Section 9.1 bottles: a potion takes its bottle with it, so the bottle
// count goes down when one goes into the hold and up when one comes out.
// Never below 0.
export function bottlesAfter(bottlesMax, delta) {
  return Math.max(0, Math.floor(num(bottlesMax)) + delta);
}
