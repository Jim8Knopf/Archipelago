// ============================================================
// Shared formatting / small UI helpers.
// Both sheet.js and gm.js used to keep their own private copies of
// escapeHtml() and flash() — that's exactly the kind of duplication that
// quietly drifts out of sync, so both now import from here instead.
// ============================================================

// Safe HTML-escaping for any user-entered text before it goes into
// innerHTML (character names, item names, trait descriptions, ...).
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// Shows a short-lived status message in the given element, then clears it
// again — used for "Link copied", save errors, etc. Guards against a newer
// message being wiped out by an older message's timeout.
export function flash(el, msg, durationMs = 2500) {
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => {
    if (el.textContent === msg) el.textContent = "";
  }, durationMs);
}

export function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

// Roman numerals for magnitude 1–8 (Section 5.2), shown as a small prefix
// tag in front of a spell's name instead of a separate "Mag" column.
// Written generically rather than a hardcoded I–VIII lookup table, so it
// keeps working correctly if the magnitude scale is ever extended.
const ROMAN_NUMERALS = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
];

export function toRoman(num) {
  let n = Math.max(1, Math.round(Number(num) || 1));
  let out = "";
  for (const [value, symbol] of ROMAN_NUMERALS) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

// URL-safe slug for turning a character name into a Firestore document ID.
export function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "char-" + Math.random().toString(36).slice(2, 7);
}
