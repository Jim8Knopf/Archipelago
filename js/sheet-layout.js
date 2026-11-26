// ============================================================
// Per-player sheet layout: which order the sections of the character sheet
// come in, which are collapsed, and which the player has hidden. Stored on
// the character as `layout`, so it follows the player to any device.
//
// Pure helpers only (no DOM/Firestore), so they're easy to test. Only the
// player sheet uses this — the GM screen and the points maths never read it.
// ============================================================

// Every movable section of the sheet, in its default order. `key` matches the
// data-section attribute in sheet/index.html. A section added later just
// gets a new entry here: normalizeLayout() slots it into older saved orders.
export const SHEET_SECTIONS = [
  { key: "basic", label: "Basic Info & Attributes" },
  { key: "skills", label: "Basic Skills" },
  { key: "weapons", label: "Weapons" },
  { key: "magic", label: "Magic" },
  { key: "traits", label: "Traits" },
  { key: "notes", label: "Notes" },
  { key: "inventory", label: "Inventory" }
];

const KEYS = SHEET_SECTIONS.map(s => s.key);

export function defaultLayout() {
  return { order: [...KEYS], collapsed: [], hidden: [] };
}

// Known keys only, each once, in the order given.
function cleanKeys(list) {
  return Array.isArray(list) ? [...new Set(list)].filter(k => KEYS.includes(k)) : [];
}

// Fills in a missing or partial layout, drops unknown keys and duplicates,
// and puts any section the saved order doesn't list yet in its default
// place: right after the section that comes before it by default.
export function normalizeLayout(raw) {
  const layout = raw && typeof raw === "object" ? raw : {};
  const order = cleanKeys(layout.order);
  KEYS.forEach((key, i) => {
    if (order.includes(key)) return;
    const before = KEYS.slice(0, i).reverse().find(k => order.includes(k));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, key);
  });
  return { order, collapsed: cleanKeys(layout.collapsed), hidden: cleanKeys(layout.hidden) };
}

// Moves `key` one place up (dir -1) or down (dir 1) past the next section
// that isn't hidden, so every press visibly moves it. Returns a new order,
// or the same one when it's already first/last.
export function moveSection(layout, key, dir) {
  const visible = layout.order.filter(k => !layout.hidden.includes(k));
  const target = visible[visible.indexOf(key) + dir];
  if (!visible.includes(key) || !target) return layout.order;
  const order = layout.order.filter(k => k !== key);
  order.splice(order.indexOf(target) + (dir > 0 ? 1 : 0), 0, key);
  return order;
}

export function isDefaultLayout(layout) {
  const def = defaultLayout();
  return layout.order.join() === def.order.join() && !layout.collapsed.length && !layout.hidden.length;
}
