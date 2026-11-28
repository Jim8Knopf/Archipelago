// ============================================================
// Ship type cards, shared by the GM Dashboard's shipyard and the Ship
// Gallery on the Rules page, so both show a type the same way: picture,
// name, values, traits, price and the description from its file in
// rules/ships/ (js/ship-catalog.js).
// ============================================================

import { escapeHtml } from "./format.js";

const GROUP_ICONS = {
  "Boats & Oared Ships": "🚣",
  "Working Boats": "🎣",
  "Traders": "📦",
  "Raiders": "🏴‍☠️",
  "Warships": "⚔️",
  "Great Haulers": "⚓"
};
export const groupIcon = (group) => GROUP_ICONS[group] || "⛵";

export function traitsHtml(traits, catalogTraits = {}) {
  return (traits || []).map(t =>
    `<span class="ship-trait" title="${escapeHtml(catalogTraits[t.toLowerCase()]?.text || "")}">${escapeHtml(t)}</span>`
  ).join("");
}

// `t`: a catalog ship type. `actionsHtml`: buttons at the bottom (the
// shipyard's "Add to fleet"); `aboutOpen`: show the description unfolded.
export function shipTypeCardHtml(t, { traits = {}, actionsHtml = "", aboutOpen = false } = {}) {
  const stat = (label, value) => `
    <div class="ship-stat"><span class="ship-stat-label">${label}</span><span class="ship-stat-value">${escapeHtml(String(value))}</span></div>`;
  return `
    ${t.image ? `<div class="ship-banner"><img src="${escapeHtml(t.image)}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>` : ""}
    <div class="gm-card-head">
      <span class="gm-portrait shipyard-icon" aria-hidden="true">${groupIcon(t.group)}</span>
      <div class="gm-card-title">
        <h3>${escapeHtml(t.name)}</h3>
        <span class="muted">${escapeHtml([t.de, t.alt].filter(Boolean).join(" · ") || t.group)}</span>
      </div>
      <span class="gm-count" data-owned hidden></span>
    </div>
    <p class="shipyard-summary">${escapeHtml(t.summary)}</p>
    <div class="ship-stats shipyard-stats">
      ${stat("Hull", t.hull)}${stat("Armor", t.armor)}${stat("Speed", `${t.maxSpeed} m/s`)}
      ${stat("Handling", t.handling)}${stat("Turn", `${t.turnRate}°`)}${stat("Man.", t.maneuverability)}
      ${stat("Broadside", t.broadside)}${stat("Chasers", t.chasers)}
      ${stat("Crew", t.crew || "—")}${stat("Cargo", t.cargo || "—")}
    </div>
    ${t.traits.length ? `<p class="shipyard-traits">${traitsHtml(t.traits, traits)}</p>` : ""}
    <p class="shipyard-price">💰 ${t.price.toLocaleString("en")} Dbl. <span class="muted">· ${escapeHtml(t.group)}</span></p>
    <details class="gm-sub"${aboutOpen ? " open" : ""}>
      <summary>About this ship</summary>
      <div class="gm-sub-body">
        <p>${escapeHtml(t.description)}</p>
        ${t.benefits ? `<p><strong>Benefits:</strong> ${escapeHtml(t.benefits)}</p>` : ""}
        ${t.flaws ? `<p><strong>Flaws:</strong> ${escapeHtml(t.flaws)}</p>` : ""}
      </div>
    </details>
    ${actionsHtml}`;
}

// Search text for a type (name, German name, group, texts, traits).
export const shipTypeText = (t) =>
  [t.name, t.de, t.alt, t.group, t.summary, t.description, t.benefits, t.flaws, ...(t.traits || [])].join(" ").toLowerCase();

// A grid of type cards with a search box and group chips, used by both
// pages. `els`: { grid, filter, chips }. `makeCard(type)` returns the card
// element. Returns { setTypes(catalog) }.
export function createShipTypeBrowser(els, { makeCard }) {
  let group = "all";
  let entries = [];

  function apply() {
    const q = els.filter.value.trim().toLowerCase();
    entries.forEach(({ el, type, text }) => {
      el.hidden = !((group === "all" || type.group === group || type.alwaysShow) && (!q || type.alwaysShow || text.includes(q)));
    });
    els.chips.querySelectorAll("[data-group]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.group === group)));
  }

  els.filter.addEventListener("input", apply);
  els.filter.addEventListener("keydown", (e) => { if (e.key === "Escape") { els.filter.value = ""; apply(); } });
  els.chips.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-group]");
    if (!chip) return;
    group = chip.dataset.group;
    apply();
  });

  return {
    setTypes(types) {
      els.grid.innerHTML = "";
      entries = types.map(type => {
        const el = makeCard(type);
        els.grid.appendChild(el);
        return { el, type, text: shipTypeText(type) };
      });
      const groups = [...new Set(types.filter(t => !t.alwaysShow).map(t => t.group))];
      els.chips.innerHTML = [["all", "All"], ...groups.map(g => [g, `${groupIcon(g)} ${g}`])].map(([key, label]) =>
        `<button type="button" class="small hold-chip" data-group="${escapeHtml(key)}" aria-pressed="${key === group}">${escapeHtml(label)}</button>`).join("");
      apply();
    }
  };
}
