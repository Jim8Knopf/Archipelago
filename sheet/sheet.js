import {
  doc, getDoc, setDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db, getCampaignId } from "../js/firebase-init.js";
import { escapeHtml, flash, clamp, toRoman, slugify } from "../js/format.js";
import * as R from "../js/rules-calc.js";

const params = new URLSearchParams(window.location.search);
const loaderCard = document.getElementById("loader-card");
const sheetCard = document.getElementById("sheet-card");
const loaderStatus = document.getElementById("loader-status");
const sheetStatus = document.getElementById("sheet-status");

let currentData = null;
let charRef = null;

// The single source of truth for which mode we're in. Every render()
// function reads this directly (rather than checking body.dataset.mode
// mid-template) so a mode switch is just "set this, then render() again".
let currentMode = "view";

const getMaxMana = (d) => R.manaPoolFromPoints(d.manaPoints, d.categories);
const catsOfType = (categories, type) => (categories || []).filter(c => c.type === type);

// ============================================================
// One DOM, two modes.
//
// Every field on the sheet is rendered exactly once. What changes between
// View and Edit is:
//   - Fields tagged [data-edit-control="true"] (raw point inputs, add/remove
//     buttons, the raw quantity/worn controls, ...) are hidden entirely in
//     View mode via CSS — see css/style.css.
//   - "Name"-type fields (character name, skill/spell/language/category
//     names, trait name & description) are plain <input>/<textarea>
//     elements that get a `readonly` attribute in View mode instead of a
//     disabled one, so they stay clickable/selectable — clicking one marks
//     that skill "used" for the session (Section 11.2 tracking).
// No section renders a separate read-only copy of itself.
// ============================================================

function usedClass(d, id) {
  return (d.usedSkillIds || []).includes(id) ? "used-skill" : "";
}

// ---- Shared skill/spell/language table row ----
//
// Builds one <tr> that works in both modes from the same markup:
//  - Name is an <input> — editable in Edit mode, `readonly` in View mode
//    (where tapping it marks the skill "used").
//  - Points, and for spells Magnitude, are edit-only inputs — hidden in
//    View mode.
//  - The success-tier values are plain clickable cells, not buttons, same
//    click-to-mark-used behaviour as the name. Pass `castCosts` (same order
//    as `tiers`) for spells so tapping a value also casts at that tier and
//    spends the matching Mana; omit it for every other table.
//  - Pass `magnitude` for spells — shown as a roman-numeral prefix on the
//    name, always visible in both modes, plus its own edit-only number
//    input for changing it.
function skillRowHtml(d, skill, { tiers, castCosts, magnitude, catId }) {
  const ro = currentMode === "view" ? "readonly" : "";
  const clickable = currentMode === "view" ? "skill-name-clickable" : "";
  const used = usedClass(d, skill.id);
  const catAttr = catId ? ` data-cat="${catId}"` : "";

  const magnitudeTag = magnitude != null
    ? `<span class="magnitude-tag" title="Magnitude ${magnitude}">${toRoman(magnitude)}</span>`
    : "";
  const isSpell = magnitude != null;
  const note = isSpell ? (skill.note || "").trim() : "";
  // View mode: a spell with a note gets an (i) button beside its name.
  // Hovering the name or the button shows the note in a floating panel;
  // clicking (i) pins it open. The button sits outside every
  // [data-skill-id] element and has a wide margin, so checking the info
  // never marks the spell "used" or casts it. Edit mode shows the full
  // textarea row instead (see noteRow below).
  const infoBtn = note && currentMode === "view"
    ? `<button type="button" class="spell-info-btn" data-action="spell-info" data-spell-id="${skill.id}"
        aria-label="Spell info" aria-expanded="false" title="Spell info">i</button>`
    : "";
  const nameCell = `
    <td><div class="name-wrap" ${note ? `data-spell-hover="${skill.id}"` : ""}>${magnitudeTag}<input type="text" data-field="name" value="${escapeHtml(skill.name)}"
      ${ro} data-skill-id="${skill.id}" class="${clickable} ${used}">${infoBtn}</div></td>`;
  const pointsCell = `<td data-edit-control="true"><input type="number" data-field="points" value="${skill.points || 0}" min="0"></td>`;
  const magnitudeCell = magnitude != null
    ? `<td data-edit-control="true"><input type="number" data-field="magnitude" value="${magnitude}" min="1" max="8" style="width:3rem;"></td>`
    : "";
  const valueCells = tiers.map((val, i) => {
    const cost = castCosts ? castCosts[i] : null;
    const castAttrs = cost != null ? ` data-action="cast" data-cost="${cost}" title="Costs ${cost} Mana"` : "";
    return `<td class="num ${clickable} ${used}" data-skill-id="${skill.id}"${castAttrs}>${val}</td>`;
  }).join("");
  const removeCell = `<td data-edit-control="true"><button class="small danger" data-action="remove-skill">✕</button></td>`;

  const columnCount = 3 + (isSpell ? 1 : 0) + tiers.length;
  // Spells get a second, edit-only row spanning the table, holding a
  // free-text note (effect, range, duration, component...). It shares the
  // spell's data-id so the category container's change handler saves it
  // onto the same skill object as the name/points/magnitude inputs.
  const noteRow = isSpell
    ? `<tr class="spell-note-row" data-id="${skill.id}"${catAttr} data-edit-control="true">
        <td colspan="${columnCount}"><textarea data-field="note" rows="1"
          placeholder="Spell notes — effect, range, duration, components…">${escapeHtml(skill.note || "")}</textarea></td>
      </tr>`
    : "";

  return `<tr data-id="${skill.id}"${catAttr}>${nameCell}${pointsCell}${magnitudeCell}${valueCells}${removeCell}</tr>${noteRow}`;
}

// Marks a skill "used" when its name or any of its value cells is tapped —
// wired once per container, gated to View mode so it never fires while
// someone is simply clicking into the (editable) name field in Edit mode.
function wireUsedToggle(containerId) {
  const el = document.getElementById(containerId);
  if (!el || el.dataset.usedWired) return;
  el.addEventListener("click", (e) => {
    if (currentMode !== "view") return;
    const cell = e.target.closest("[data-skill-id]");
    if (!cell || !currentData) return;
    const id = cell.dataset.skillId;
    const used = currentData.usedSkillIds || [];
    if (used.includes(id)) return;
    cell.classList.add("used-skill");
    saveField({ usedSkillIds: [...used, id] });
  });
  el.dataset.usedWired = "1";
}
["skills-container", "languages-container", "weapons-container", "magic-container"].forEach(wireUsedToggle);

// ---- View / Edit mode ----

function setMode(mode) {
  currentMode = mode;
  document.body.dataset.mode = mode;
  document.getElementById("view-mode-btn").classList.toggle("active", mode === "view");
  document.getElementById("edit-mode-btn").classList.toggle("active", mode === "edit");
  // Every render() call bakes the current mode's `readonly`/table-column
  // markup into the templates, so switching modes just re-renders.
  if (currentData) render();
}
document.getElementById("view-mode-btn").addEventListener("click", () => setMode("view"));
document.getElementById("edit-mode-btn").addEventListener("click", () => setMode("edit"));
setMode("view");

// ---- Loader form ----

document.getElementById("campaign-input").value = params.get("campaign") || "default-campaign";
if (params.get("char")) {
  document.getElementById("loader-card").style.display = "none";
}

document.getElementById("open-btn").addEventListener("click", async () => {
  const campaign = document.getElementById("campaign-input").value.trim() || "default-campaign";
  const name = document.getElementById("char-name-input").value.trim();
  if (!name) { flash(loaderStatus, "Enter a character name first."); return; }

  const charId = slugify(name);
  try {
    const ref = doc(db, "campaigns", campaign, "characters", charId);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      const create = confirm(`No character named "${name}" exists yet in "${campaign}". Create a new one?`);
      if (!create) return;
      await setDoc(ref, R.defaultCharacter(name));
    }
    const url = new URL(window.location.href);
    url.searchParams.set("campaign", campaign);
    url.searchParams.set("char", charId);
    window.location.href = url.toString();
  } catch (err) {
    console.error(err);
    flash(loaderStatus, "Couldn't reach the database — check firebase-config.js and firestore.rules.");
  }
});

// ---- Main sheet ----

function initSheet() {
  const campaign = getCampaignId();
  const charId = params.get("char");
  if (!charId) return;

  charRef = doc(db, "campaigns", campaign, "characters", charId);
  document.getElementById("char-id-display").textContent = `${campaign} / ${charId}`;

  onSnapshot(charRef, (snap) => {
    if (!snap.exists()) {
      loaderCard.style.display = "";
      sheetCard.style.display = "none";
      flash(loaderStatus, "That character doesn't exist yet in this campaign.");
      return;
    }
    const raw = snap.data();
    currentData = normalize(raw);
    loaderCard.style.display = "none";
    sheetCard.style.display = "contents";
    render();
    // normalize() only migrates in memory. Write the skill-group migration
    // back once, so the stale flat list can't linger in Firestore and get
    // counted a second time by pointsSpent() on the GM dashboard.
    if ((raw.basicSkills || []).length > 0) {
      saveField({ basicSkills: [], categories: currentData.categories });
    }
  }, (err) => {
    console.error(err);
    flash(loaderStatus, "Connection error — check firestore.rules allows access.");
  });
}

// Fills in missing fields from older/partial docs, and migrates legacy shapes:
// - flat `basicSkills` array -> a "skill" type category (skill group)
// - "language" type categories -> flat `languages` array
// - a Basic Skill literally named "Evasion" -> `evasionPoints`
// - old flat `armor` number -> `armorCustom`
// - inventory items without a `type` -> type "item"
function normalize(d) {
  const def = R.defaultCharacter(d.name);
  const rawCategories = d.categories || [];
  const categories = rawCategories.filter(c => c.type !== "language");
  const legacyLangSkills = rawCategories
    .filter(c => c.type === "language")
    .flatMap(c => c.skills || []);

  const rawBasicSkills = d.basicSkills || [];
  const legacyEvasionSkill = rawBasicSkills.find(s => (s.name || "").trim().toLowerCase() === "evasion");
  const basicSkills = rawBasicSkills.filter(s => s !== legacyEvasionSkill);
  const evasionPoints = d.evasionPoints ?? (legacyEvasionSkill ? legacyEvasionSkill.points : 0);

  const inventory = (d.inventory || []).map(item => item.type ? item : { ...item, type: "item" });

  // Basic Skills are groups now (type "skill" categories). Any flat list
  // left on an older document is folded into a group here, and `basicSkills`
  // is emptied so the same skills can't be counted or shown twice. The
  // emptied list is written back on the next save of that field.
  const withSkillGroups = R.migrateBasicSkills(basicSkills, categories);

  return {
    ...def,
    ...d,
    basicInfo: { ...def.basicInfo, ...(d.basicInfo || {}) },
    basicSkills: [],
    categories: withSkillGroups,
    languages: d.languages && d.languages.length ? d.languages : legacyLangSkills,
    traits: d.traits || [],
    inventory,
    armorCustom: d.armorCustom ?? d.armor ?? 0,
    evasionPoints,
    resiliencePoints: d.resiliencePoints ?? 0,
    imageUrl: d.imageUrl || "",
    manaPoints: d.manaPoints ?? 0,
    usedSkillIds: d.usedSkillIds || []
  };
}

async function saveField(fields) {
  try {
    await updateDoc(charRef, fields);
  } catch (err) {
    console.error(err);
    flash(sheetStatus, "Couldn't save — check your connection.");
  }
}

// ---- Master render ----

function render() {
  const d = currentData;

  renderName(d);
  renderPortrait(d.imageUrl);
  renderBudget(d);
  renderHP(d);
  renderBasicInfo(d.basicInfo);
  renderAttributes(d);
  renderLanguages(d.languages);
  renderCategoryGroup("skills-container", d.categories, "skill");
  renderCategoryGroup("weapons-container", d.categories, "weapon");
  renderMagicStats(d);
  renderMagicCategories(d);
  renderTraits(d.traits);
  renderInventory(d.inventory);

  // Auto-hide sections with nothing in them — View mode only, so Edit mode
  // always shows every section (you need to see an empty one to add its
  // first entry).
  const hideWhenEmpty = (id, isEmpty) => {
    document.getElementById(id).style.display = (currentMode === "view" && isEmpty) ? "none" : "";
  };
  // A skill group with no skills in it is still noise in View mode, so the
  // section hides unless at least one group actually has a skill.
  const skillGroups = catsOfType(d.categories, "skill");
  hideWhenEmpty("skills-section", !skillGroups.some(c => (c.skills || []).length > 0));
  hideWhenEmpty("weapons-section", catsOfType(d.categories, "weapon").length === 0);
  hideWhenEmpty("magic-section", !R.hasMagic(d));
  hideWhenEmpty("traits-section", d.traits.length === 0);
  hideWhenEmpty("inventory-section", d.inventory.length === 0);
  refreshSpellInfo();
}

// ---- Character name ----

function renderName(d) {
  const input = document.getElementById("name-input");
  if (document.activeElement !== input) input.value = d.name || "";
  input.readOnly = currentMode === "view";
}

document.getElementById("name-input").addEventListener("change", (e) => {
  saveField({ name: e.target.value.trim() || "Unnamed" });
});

// ---- Portrait ----

function renderPortrait(url) {
  const img = document.getElementById("portrait-img");
  const placeholder = document.getElementById("portrait-placeholder");
  const input = document.getElementById("image-url-input");
  if (document.activeElement !== input) input.value = url || "";

  if (url) {
    img.src = url;
    img.style.display = "";
    placeholder.style.display = "none";
  } else {
    img.style.display = "none";
    placeholder.style.display = "";
  }
}

document.getElementById("image-url-input").addEventListener("change", (e) => {
  saveField({ imageUrl: e.target.value.trim() });
});

document.getElementById("portrait-img").addEventListener("error", () => {
  document.getElementById("portrait-img").style.display = "none";
  document.getElementById("portrait-placeholder").style.display = "";
});

// ---- Points budget ----

function renderBudget(d) {
  const spent = R.pointsSpent(d);
  const available = R.pointsAvailable(d);
  const remaining = available - spent;
  const pct = available > 0 ? clamp((spent / available) * 100, 0, 100) : 0;

  const fill = document.getElementById("budget-fill");
  fill.style.width = pct + "%";
  fill.classList.toggle("over", spent > available);

  document.getElementById("budget-text").textContent =
    `${spent} spent / ${available} available (${remaining} remaining)`;

  const grantedInput = document.getElementById("points-granted-input");
  if (document.activeElement !== grantedInput) grantedInput.value = d.pointsGranted ?? 800;
  document.getElementById("points-granted-display").textContent = d.pointsGranted ?? 800;
}

document.getElementById("points-granted-input").addEventListener("change", (e) => {
  saveField({ pointsGranted: Math.max(0, parseInt(e.target.value, 10) || 0) });
});

// ---- HP (header) + Rest ----

function renderHP(d) {
  const maxHP = R.hpFromPoints(d.hpPoints);
  renderGauge("hp", d.currentHP ?? 0, maxHP);
}

function renderGauge(stat, current, max) {
  const pct = max > 0 ? clamp((current / max) * 100, 0, 100) : 0;
  const fill = document.getElementById(`${stat}-fill`);
  const gauge = document.getElementById(`${stat}-gauge`);
  fill.style.width = pct + "%";
  gauge.classList.remove("low", "mid");
  if (pct <= 25) gauge.classList.add("low");
  else if (pct <= 60) gauge.classList.add("mid");

  document.getElementById(`${stat}-text`).textContent = `${current} / ${max}`;

  const curInput = document.getElementById(`${stat}-current-input`);
  if (curInput && document.activeElement !== curInput) curInput.value = current;
}

document.getElementById("short-rest-btn").addEventListener("click", () => {
  const maxHP = R.hpFromPoints(currentData.hpPoints);
  const updates = { currentHP: R.shortRestRecover(currentData.currentHP ?? 0, maxHP) };
  if (R.hasMagic(currentData)) {
    updates.currentMana = R.shortRestRecover(currentData.currentMana ?? 0, getMaxMana(currentData));
  }
  saveField(updates);
});

document.getElementById("long-rest-btn").addEventListener("click", () => {
  const maxHP = R.hpFromPoints(currentData.hpPoints);
  const updates = { currentHP: R.longRestRecover(currentData.currentHP ?? 0, maxHP) };
  if (R.hasMagic(currentData)) {
    updates.currentMana = R.longRestRecover(currentData.currentMana ?? 0, getMaxMana(currentData));
  }
  saveField(updates);
});

// Shared +/- and manual-entry wiring for both HP and Mana — one set of
// controls each, used in both modes (the raw number field just becomes
// less prominent in View mode via its own data-edit-control if desired;
// here it stays available since adjusting a live resource isn't a
// "character build" action).
document.querySelectorAll("button[data-stat]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const stat = btn.dataset.stat;
    const delta = parseInt(btn.dataset.delta, 10);
    const curField = stat === "hp" ? "currentHP" : "currentMana";
    const max = stat === "hp" ? R.hpFromPoints(currentData.hpPoints) : getMaxMana(currentData);
    const newVal = clamp((currentData[curField] ?? 0) + delta, 0, max);
    saveField({ [curField]: newVal });
  });
});

["hp", "mana"].forEach((stat) => {
  const curField = stat === "hp" ? "currentHP" : "currentMana";
  const input = document.getElementById(`${stat}-current-input`);
  if (!input) return;
  input.addEventListener("change", (e) => {
    const max = stat === "hp" ? R.hpFromPoints(currentData.hpPoints) : getMaxMana(currentData);
    const val = clamp(parseInt(e.target.value, 10) || 0, 0, max);
    saveField({ [curField]: val });
  });
});

// Casting — Eff./Hard/Extreme cells in the Magic table carry
// data-action="cast" (wired in skillRowHtml). Delegated on the stable
// #magic-section wrapper since #magic-container's contents are rebuilt
// every render. Gated to View mode so tapping a value while editing a
// character never accidentally spends Mana.
document.getElementById("magic-section").addEventListener("click", (e) => {
  if (currentMode !== "view") return;
  const castEl = e.target.closest('[data-action="cast"]');
  if (!castEl) return;
  const cost = parseInt(castEl.dataset.cost, 10);
  const current = currentData.currentMana ?? 0;
  if (cost > current) {
    flash(sheetStatus, `Not enough Mana — this costs ${cost}, you have ${current}.`);
    return;
  }
  saveField({ currentMana: current - cost });
});

// ---- Spell info panel ----
//
// One floating panel on <body>, not inside the table: the Magic tables live
// in .table-scroll (overflow-x: auto), which would clip a popup drawn
// inside them. Hovering a spell's name shows its note; the (i) button pins
// the panel open (for touch screens, and to read long notes) until it's
// clicked again, Esc is pressed, or the click lands somewhere else.
const spellInfoPanel = document.createElement("div");
spellInfoPanel.className = "spell-info-panel";
spellInfoPanel.setAttribute("role", "tooltip");
spellInfoPanel.hidden = true;
document.body.appendChild(spellInfoPanel);
let pinnedSpellId = null;

function findSpell(id) {
  for (const cat of catsOfType(currentData?.categories, "magic")) {
    const s = (cat.skills || []).find(sk => sk.id === id);
    if (s) return s;
  }
  return null;
}

function showSpellInfo(id, anchor) {
  const spell = findSpell(id);
  const note = (spell?.note || "").trim();
  if (!spell || !note) { hideSpellInfo(true); return; }
  const magnitude = R.magnitudeOf(spell);
  spellInfoPanel.innerHTML = `
    <div class="spell-info-title"><span class="magnitude-tag">${toRoman(magnitude)}</span>${escapeHtml(spell.name)}</div>
    <div class="spell-info-body">${escapeHtml(note)}</div>`;
  spellInfoPanel.hidden = false;

  // Below the anchor if it fits, otherwise above; clamped to the viewport.
  const r = anchor.getBoundingClientRect();
  const p = spellInfoPanel.getBoundingClientRect();
  const gap = 8;
  let top = r.bottom + gap;
  if (top + p.height > window.innerHeight - gap) top = Math.max(gap, r.top - p.height - gap);
  const left = Math.min(Math.max(gap, r.left), window.innerWidth - p.width - gap);
  spellInfoPanel.style.top = `${top}px`;
  spellInfoPanel.style.left = `${left}px`;
}

function hideSpellInfo(force = false) {
  if (pinnedSpellId && !force) return;
  pinnedSpellId = null;
  spellInfoPanel.hidden = true;
  document.querySelectorAll('.spell-info-btn[aria-expanded="true"]').forEach(b => b.setAttribute("aria-expanded", "false"));
}

// Called after every render: the table was rebuilt, so re-anchor a pinned
// panel to the new (i) button, or drop it if the spell/note is gone.
function refreshSpellInfo() {
  if (!pinnedSpellId) { hideSpellInfo(true); return; }
  const btn = document.querySelector(`.spell-info-btn[data-spell-id="${pinnedSpellId}"]`);
  if (!btn) { hideSpellInfo(true); return; }
  btn.setAttribute("aria-expanded", "true");
  showSpellInfo(pinnedSpellId, btn);
}

const magicSectionEl = document.getElementById("magic-section");
magicSectionEl.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="spell-info"]');
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.spellId;
  if (pinnedSpellId === id) { hideSpellInfo(true); return; }
  hideSpellInfo(true);
  pinnedSpellId = id;
  btn.setAttribute("aria-expanded", "true");
  showSpellInfo(id, btn);
});
magicSectionEl.addEventListener("mouseover", (e) => {
  if (pinnedSpellId) return;
  const wrap = e.target.closest("[data-spell-hover]");
  if (wrap && currentMode === "view") showSpellInfo(wrap.dataset.spellHover, wrap);
});
magicSectionEl.addEventListener("mouseout", (e) => {
  const wrap = e.target.closest("[data-spell-hover]");
  if (wrap && !wrap.contains(e.relatedTarget)) hideSpellInfo();
});
document.addEventListener("click", (e) => {
  if (pinnedSpellId && !e.target.closest('[data-action="spell-info"]') && !spellInfoPanel.contains(e.target)) hideSpellInfo(true);
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideSpellInfo(true); });
window.addEventListener("scroll", () => {
  if (pinnedSpellId) refreshSpellInfo(); else hideSpellInfo();
}, { passive: true, capture: true });

// ---- Basic info ----

const BASIC_INFO_FIELDS = [
  ["age", "Age"], ["race", "Race"], ["birthplace", "Birthplace"], ["job", "Job"],
  ["height", "Height"], ["weight", "Weight"], ["gender", "Gender"], ["fightingStyle", "Fighting style"]
];

function renderBasicInfo(info) {
  const grid = document.getElementById("basic-info-grid");

  // Rebuilding (which bakes in the mode-dependent `readonly` attribute)
  // only needs to happen when the mode actually changed; otherwise we just
  // patch values in place so focus/typing elsewhere isn't disturbed.
  if (grid.dataset.mode !== currentMode) {
    const ro = currentMode === "view" ? "readonly" : "";
    grid.innerHTML = BASIC_INFO_FIELDS.map(([key, label]) => `
      <div class="field">
        <label>${label}</label>
        <input type="text" data-field="${key}" value="${escapeHtml(info[key] || "")}" ${ro}>
      </div>
    `).join("");
    grid.dataset.mode = currentMode;
    if (!grid.dataset.wired) {
      grid.addEventListener("change", (e) => {
        const input = e.target.closest("input[data-field]");
        if (!input) return;
        saveField({ [`basicInfo.${input.dataset.field}`]: input.value.trim() });
      });
      grid.dataset.wired = "1";
    }
  } else {
    BASIC_INFO_FIELDS.forEach(([key]) => {
      const input = grid.querySelector(`input[data-field="${key}"]`);
      if (input && document.activeElement !== input) input.value = info[key] || "";
    });
  }
}

// ---- Attributes: HP points/Max (+cost to next), Movement (+cost to next), Armor, Evasion ----

function renderAttributes(d) {
  const maxHP = R.hpFromPoints(d.hpPoints);
  const movement = R.movementFromPoints(d.movementPoints);

  const hpPointsInput = document.getElementById("hp-points-input");
  if (document.activeElement !== hpPointsInput) hpPointsInput.value = d.hpPoints || 0;
  document.getElementById("hp-max-derived").textContent = maxHP;
  document.getElementById("hp-next-cost").textContent = `(+1 costs ${R.pointsToNextHP(d.hpPoints)} more points)`;

  const movePointsInput = document.getElementById("move-points-input");
  if (document.activeElement !== movePointsInput) movePointsInput.value = d.movementPoints || 0;
  document.getElementById("move-derived").textContent = movement;
  document.getElementById("move-next-cost").textContent = `(+1 costs ${R.pointsToNextMovement(d.movementPoints)} more points)`;

  const armorCustomInput = document.getElementById("armor-custom-input");
  if (document.activeElement !== armorCustomInput) armorCustomInput.value = d.armorCustom ?? 0;
  document.getElementById("armor-derived").textContent = R.totalArmor(d);

  const evasionPointsInput = document.getElementById("evasion-points-input");
  if (document.activeElement !== evasionPointsInput) evasionPointsInput.value = d.evasionPoints ?? 0;
  const evasion = R.evasionTotal(d.evasionPoints, movement);
  const evLadder = R.ladder(evasion);
  document.getElementById("evasion-derived").textContent = evasion;
  document.getElementById("evasion-ladder").textContent =
    ` (Half: ${evLadder.hard} · One-fifth: ${evLadder.extreme})`;

  // Section 5.5: Resilience is never rolled — only its modifier matters.
  const resiliencePointsInput = document.getElementById("resilience-points-input");
  if (document.activeElement !== resiliencePointsInput) resiliencePointsInput.value = d.resiliencePoints ?? 0;
  document.getElementById("resilience-derived").textContent = `−${R.resilienceModifier(d.resiliencePoints)}`;
}

document.getElementById("hp-points-input").addEventListener("change", (e) => {
  const newPoints = Math.max(0, parseInt(e.target.value, 10) || 0);
  const newMax = R.hpFromPoints(newPoints);
  const updates = { hpPoints: newPoints };
  if ((currentData.currentHP ?? 0) > newMax) updates.currentHP = newMax;
  saveField(updates);
});

document.getElementById("move-points-input").addEventListener("change", (e) => {
  saveField({ movementPoints: Math.max(0, parseInt(e.target.value, 10) || 0) });
});

document.getElementById("armor-custom-input").addEventListener("change", (e) => {
  saveField({ armorCustom: Math.max(0, parseInt(e.target.value, 10) || 0) });
});

document.getElementById("evasion-points-input").addEventListener("change", (e) => {
  saveField({ evasionPoints: Math.max(0, parseInt(e.target.value, 10) || 0) });
});

document.getElementById("resilience-points-input").addEventListener("change", (e) => {
  saveField({ resiliencePoints: Math.max(0, parseInt(e.target.value, 10) || 0) });
});

document.getElementById("mana-points-input").addEventListener("change", (e) => {
  const newPoints = Math.max(0, parseInt(e.target.value, 10) || 0);
  const updates = { manaPoints: newPoints };
  const newMax = R.manaPoolFromPoints(newPoints, currentData.categories);
  if ((currentData.currentMana ?? 0) > newMax) updates.currentMana = newMax;
  saveField(updates);
});

function renderMagicStats(d) {
  const manaPointsInput = document.getElementById("mana-points-input");
  if (document.activeElement !== manaPointsInput) manaPointsInput.value = d.manaPoints || 0;
  const maxMana = getMaxMana(d);
  document.getElementById("mana-max-derived").textContent = maxMana;
  const bonusTotal = R.magicBonusTotal(d.categories);
  document.getElementById("mana-formula-note").textContent = ` (= ${d.manaPoints || 0} points × +${bonusTotal} magic bonus ÷ 2)`;
  renderGauge("mana", d.currentMana ?? 0, maxMana);
}

// ---- Languages (single shared pool, no sub-categories — Section 3.2) ----

function renderLanguages(languages) {
  const container = document.getElementById("languages-container");
  const bonus = R.categoryBonus(languages);

  const rows = (languages || []).map(s => {
    const eff = R.categorySkillEffective(s, bonus);
    const l = R.ladder(eff);
    return skillRowHtml(currentData, s, { tiers: [eff, l.hard, l.extreme] });
  }).join("");

  const emptyRow = currentMode === "edit"
    ? `<tr><td colspan="6" class="empty-state">No languages yet.</td></tr>`
    : "";

  container.innerHTML = `
    <div class="cat-bonus">Transfer bonus: +${bonus}</div>
    <div class="table-scroll">
      <table class="skill-table">
        <thead><tr><th>Language</th><th data-edit-control="true">Points</th><th>Effective</th><th>Hard</th><th>Extreme</th><th data-edit-control="true"></th></tr></thead>
        <tbody>${rows || emptyRow}</tbody>
      </table>
    </div>
  `;

  if (!container.dataset.wired) {
    container.addEventListener("change", (e) => {
      const input = e.target.closest("input[data-field]");
      if (!input) return;
      const id = input.closest("tr").dataset.id;
      const languages = currentData.languages.map(s => s.id === id
        ? { ...s, [input.dataset.field]: input.dataset.field === "points" ? (parseFloat(input.value) || 0) : input.value }
        : s
      );
      saveField({ languages });
    });
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action='remove-skill']");
      if (!btn) return;
      const id = btn.closest("tr").dataset.id;
      saveField({ languages: currentData.languages.filter(s => s.id !== id) });
    });
    container.dataset.wired = "1";
  }
}

document.getElementById("add-language-btn").addEventListener("click", () => {
  saveField({ languages: [...currentData.languages, { id: R.makeId(), name: "New Language", points: 0 }] });
});

// ---- Skills & Weapons: multiple named categories ----
//
// Skill groups and weapon categories render identically — the only
// difference is the wording on the header row and the "add" button, so both
// go through this one function rather than a near-duplicate copy each.
const CATEGORY_LABELS = {
  skill: { group: "Group name", member: "Skill", add: "+ Add skill to this group", removeGroup: "✕ Group", empty: "No skill groups yet." },
  weapon: { group: "Category name", member: "Skill", add: "+ Add skill to this category", removeGroup: "✕ Category", empty: "No categories yet." }
};

function renderCategoryGroup(containerId, allCategories, type) {
  const container = document.getElementById(containerId);
  const categories = catsOfType(allCategories, type);
  const labels = CATEGORY_LABELS[type];

  if (categories.length === 0) {
    container.innerHTML = currentMode === "edit" ? `<p class="empty-state">${labels.empty}</p>` : "";
  } else {
    const ro = currentMode === "view" ? "readonly" : "";
    container.innerHTML = categories.map(cat => {
      const bonus = R.categoryBonus(cat.skills);
      const skillRows = (cat.skills || []).map(s => {
        const eff = R.categorySkillEffective(s, bonus);
        const l = R.ladder(eff);
        return skillRowHtml(currentData, s, { tiers: [eff, l.hard, l.extreme], catId: cat.id });
      }).join("");

      return `
        <div class="category-card" data-cat="${cat.id}">
          <div class="cat-header">
            <input type="text" data-field="name" placeholder="${labels.group}" value="${escapeHtml(cat.name)}" ${ro}>
            <button class="small danger" data-action="remove-category" data-edit-control="true">${labels.removeGroup}</button>
          </div>
          <div class="cat-bonus">Transfer bonus: +${bonus}</div>
          <div class="table-scroll">
            <table class="skill-table">
              <thead><tr><th>${labels.member}</th><th data-edit-control="true">Points</th><th>Effective</th><th>Hard</th><th>Extreme</th><th data-edit-control="true"></th></tr></thead>
              <tbody>${skillRows}</tbody>
            </table>
          </div>
          <button class="small brass" data-action="add-skill" data-edit-control="true">${labels.add}</button>
        </div>
      `;
    }).join("");
  }

  if (!container.dataset.wired) {
    wireCategoryContainer(container, "categories");
    container.dataset.wired = "1";
  }
}

// ---- Magic: same category structure, plus a Magnitude field per spell ----

function renderMagicCategories(d) {
  const container = document.getElementById("magic-container");
  const categories = catsOfType(d.categories, "magic");

  if (categories.length === 0) {
    container.innerHTML = currentMode === "edit" ? `<p class="empty-state">No categories yet.</p>` : "";
  } else {
    const ro = currentMode === "view" ? "readonly" : "";
    container.innerHTML = categories.map(cat => {
      const bonus = R.categoryBonus(cat.skills);
      const skillRows = (cat.skills || []).map(s => {
        const eff = R.categorySkillEffective(s, bonus);
        const l = R.ladder(eff);
        const magnitude = R.magnitudeOf(s);
        const cost = R.castingCost(magnitude);
        return skillRowHtml(d, s, {
          tiers: [eff, l.hard, l.extreme],
          castCosts: [cost.normal, cost.hard, cost.extreme],
          magnitude,
          catId: cat.id
        });
      }).join("");

      return `
        <div class="category-card" data-cat="${cat.id}">
          <div class="cat-header">
            <input type="text" data-field="name" placeholder="Category name" value="${escapeHtml(cat.name)}" ${ro}>
            <button class="small danger" data-action="remove-category" data-edit-control="true">✕ Category</button>
          </div>
          <div class="cat-bonus">Transfer bonus: +${bonus}</div>
          <div class="table-scroll">
            <table class="skill-table">
              <thead><tr><th>Spell</th><th data-edit-control="true">Points</th><th data-edit-control="true">Magnitude</th><th>Effective</th><th>Hard</th><th>Extreme</th><th data-edit-control="true"></th></tr></thead>
              <tbody>${skillRows}</tbody>
            </table>
          </div>
          <button class="small brass" data-action="add-skill" data-edit-control="true">+ Add spell to this category</button>
        </div>
      `;
    }).join("");
  }

  if (!container.dataset.wired) {
    wireCategoryContainer(container, "categories");
    container.dataset.wired = "1";
  }
}

function wireCategoryContainer(container, dataKey) {
  container.addEventListener("change", (e) => {
    const input = e.target.closest("input[data-field], textarea[data-field]");
    if (!input) return;
    const catId = input.closest("[data-cat]").dataset.cat;
    const row = input.closest("tr");
    const TEXT_FIELDS = ["name", "note"];

    const updatedList = currentData[dataKey].map(cat => {
      if (cat.id !== catId) return cat;
      if (row) {
        const skillId = row.dataset.id;
        return {
          ...cat,
          skills: cat.skills.map(s => s.id === skillId
            ? { ...s, [input.dataset.field]: TEXT_FIELDS.includes(input.dataset.field) ? input.value : (parseFloat(input.value) || 0) }
            : s
          )
        };
      }
      return { ...cat, [input.dataset.field]: input.value };
    });
    saveField({ [dataKey]: updatedList });
  });

  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const catId = btn.closest("[data-cat]").dataset.cat;

    if (btn.dataset.action === "remove-category") {
      saveField({ [dataKey]: currentData[dataKey].filter(c => c.id !== catId) });
    }
    if (btn.dataset.action === "add-skill") {
      const updatedList = currentData[dataKey].map(cat => cat.id === catId
        ? { ...cat, skills: [...(cat.skills || []), { id: R.makeId(), name: "New Skill", points: 0, magnitude: 1 }] }
        : cat
      );
      saveField({ [dataKey]: updatedList });
    }
    if (btn.dataset.action === "remove-skill") {
      const skillId = btn.closest("tr").dataset.id;
      const updatedList = currentData[dataKey].map(cat => cat.id === catId
        ? { ...cat, skills: cat.skills.filter(s => s.id !== skillId) }
        : cat
      );
      saveField({ [dataKey]: updatedList });
    }
  });
}

document.getElementById("add-skill-group-btn").addEventListener("click", () => {
  saveField({ categories: [...currentData.categories, { id: R.makeId(), name: "New Skill Group", type: "skill", skills: [] }] });
});
document.getElementById("add-weapon-category-btn").addEventListener("click", () => {
  saveField({ categories: [...currentData.categories, { id: R.makeId(), name: "New Weapon Category", type: "weapon", skills: [] }] });
});
document.getElementById("add-magic-category-btn").addEventListener("click", () => {
  saveField({ categories: [...currentData.categories, { id: R.makeId(), name: "New Magic Category", type: "magic", skills: [] }] });
});

// ---- Traits ----

function renderTraits(traits) {
  const container = document.getElementById("traits-container");
  if (traits.length === 0) {
    container.innerHTML = currentMode === "edit" ? `<p class="empty-state">No traits yet.</p>` : "";
    return;
  }
  const ro = currentMode === "view" ? "readonly" : "";
  const disabled = currentMode === "view" ? "disabled" : "";
  container.innerHTML = traits.map(t => `
    <div class="trait-card ${t.type}" data-id="${t.id}">
      <div class="trait-header">
        <input type="text" data-field="name" placeholder="Trait name" value="${escapeHtml(t.name)}" ${ro}>
        <select data-field="type" ${disabled}>
          <option value="advantage" ${t.type === "advantage" ? "selected" : ""}>Advantage</option>
          <option value="flaw" ${t.type === "flaw" ? "selected" : ""}>Flaw</option>
        </select>
        <select data-field="tier" ${disabled}>
          <option value="minor" ${t.tier === "minor" ? "selected" : ""}>Minor (15)</option>
          <option value="moderate" ${t.tier === "moderate" ? "selected" : ""}>Moderate (30)</option>
          <option value="major" ${t.tier === "major" ? "selected" : ""}>Major (50)</option>
        </select>
        <button class="small danger" data-action="remove-trait" data-edit-control="true">✕</button>
      </div>
      <textarea data-field="description" ${ro} placeholder="Description / compel notes">${escapeHtml(t.description)}</textarea>
    </div>
  `).join("");
}

document.getElementById("traits-container").addEventListener("change", (e) => {
  const field = e.target.closest("[data-field]");
  if (!field) return;
  const id = field.closest("[data-id]").dataset.id;
  const traits = currentData.traits.map(t => t.id === id ? { ...t, [field.dataset.field]: field.value } : t);
  saveField({ traits });
});

document.getElementById("traits-container").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action='remove-trait']");
  if (!btn) return;
  const id = btn.closest("[data-id]").dataset.id;
  saveField({ traits: currentData.traits.filter(t => t.id !== id) });
});

document.getElementById("add-trait-btn").addEventListener("click", () => {
  saveField({
    traits: [...currentData.traits, { id: R.makeId(), name: "New Trait", type: "advantage", tier: "minor", description: "" }]
  });
});

// ---- Inventory: three typed lists (item / armor / weapon) ----

function renderInventory(inventory) {
  renderInventoryItems(inventory);
  renderInventoryArmor(inventory);
  renderInventoryWeapons(inventory);
}

function renderInventoryItems(inventory) {
  const items = inventory.filter(i => i.type === "item");
  const list = document.getElementById("inventory-item-list");
  if (items.length === 0) {
    list.innerHTML = currentMode === "edit" ? `<li class="empty-state" style="border:none;">No items yet.</li>` : "";
    return;
  }
  list.innerHTML = items.map(item => `
    <li data-id="${item.id}">
      <span class="item-name">${escapeHtml(item.name)}</span>
      <span class="item-qty">×${item.qty}</span>
      <span class="row" data-edit-control="true" style="gap:0.3rem;display:inline-flex;">
        <button class="small" data-action="qty-dec">−</button>
        <button class="small" data-action="qty-inc">+</button>
        <button class="small danger" data-action="remove">✕</button>
      </span>
    </li>
  `).join("");
}

document.getElementById("add-item-btn").addEventListener("click", () => {
  const nameInput = document.getElementById("item-name-input");
  const qtyInput = document.getElementById("item-qty-input");
  const name = nameInput.value.trim();
  const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
  if (!name) return;
  saveField({ inventory: [...currentData.inventory, { id: R.makeId(), type: "item", name, qty }] });
  nameInput.value = "";
  qtyInput.value = "1";
  nameInput.focus();
});

document.getElementById("inventory-item-list").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.closest("li").dataset.id;
  const inventory = currentData.inventory.map(i => {
    if (i.id !== id) return i;
    if (btn.dataset.action === "qty-inc") return { ...i, qty: i.qty + 1 };
    if (btn.dataset.action === "qty-dec") return { ...i, qty: Math.max(1, i.qty - 1) };
    return i;
  });
  if (btn.dataset.action === "remove") {
    saveField({ inventory: currentData.inventory.filter(i => i.id !== id) });
  } else {
    saveField({ inventory });
  }
});

function renderInventoryArmor(inventory) {
  const items = inventory.filter(i => i.type === "armor");
  const list = document.getElementById("inventory-armor-list");
  if (items.length === 0) {
    list.innerHTML = currentMode === "edit" ? `<li class="empty-state" style="border:none;">No armor yet.</li>` : "";
    return;
  }
  // The "Worn" checkbox itself doubles as the View-mode display — disabled
  // (not hidden) so its checked state still reads clearly, just can't be
  // toggled outside Edit mode.
  const disabled = currentMode === "view" ? "disabled" : "";
  list.innerHTML = items.map(item => `
    <li data-id="${item.id}">
      <span class="item-name">${escapeHtml(item.name)}</span>
      <span class="muted">Value ${item.armorValue ?? 0}</span>
      <label class="row" style="gap:0.3rem;">
        <input type="checkbox" data-action="toggle-worn" ${item.worn ? "checked" : ""} ${disabled}> Worn
      </label>
      <span data-edit-control="true"><button class="small danger" data-action="remove">✕</button></span>
    </li>
  `).join("");
}

document.getElementById("add-armor-btn").addEventListener("click", () => {
  const nameInput = document.getElementById("armor-name-input");
  const valueInput = document.getElementById("armor-value-input");
  const name = nameInput.value.trim();
  const armorValue = Math.max(0, parseInt(valueInput.value, 10) || 0);
  if (!name) return;
  saveField({ inventory: [...currentData.inventory, { id: R.makeId(), type: "armor", name, armorValue, worn: false }] });
  nameInput.value = "";
  valueInput.value = "1";
  nameInput.focus();
});

document.getElementById("inventory-armor-list").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action='remove']");
  if (!btn) return;
  const id = btn.closest("li").dataset.id;
  saveField({ inventory: currentData.inventory.filter(i => i.id !== id) });
});

document.getElementById("inventory-armor-list").addEventListener("change", (e) => {
  const checkbox = e.target.closest('input[data-action="toggle-worn"]');
  if (!checkbox) return;
  const id = checkbox.closest("li").dataset.id;
  const inventory = currentData.inventory.map(i => i.id === id ? { ...i, worn: checkbox.checked } : i);
  saveField({ inventory });
});

function renderInventoryWeapons(inventory) {
  const items = inventory.filter(i => i.type === "weapon");
  const list = document.getElementById("inventory-weapon-list");
  if (items.length === 0) {
    list.innerHTML = currentMode === "edit" ? `<li class="empty-state" style="border:none;">No weapons yet.</li>` : "";
    return;
  }
  list.innerHTML = items.map(item => `
    <li data-id="${item.id}">
      <span class="item-name">${escapeHtml(item.name)}</span>
      <span class="muted">${escapeHtml(item.woundDice || "")}</span>
      <span data-edit-control="true"><button class="small danger" data-action="remove">✕</button></span>
    </li>
  `).join("");
}

document.getElementById("add-weapon-item-btn").addEventListener("click", () => {
  const nameInput = document.getElementById("weapon-name-input");
  const diceInput = document.getElementById("weapon-dice-input");
  const name = nameInput.value.trim();
  const woundDice = diceInput.value.trim();
  if (!name) return;
  saveField({ inventory: [...currentData.inventory, { id: R.makeId(), type: "weapon", name, woundDice }] });
  nameInput.value = "";
  diceInput.value = "";
  nameInput.focus();
});

document.getElementById("inventory-weapon-list").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action='remove']");
  if (!btn) return;
  const id = btn.closest("li").dataset.id;
  saveField({ inventory: currentData.inventory.filter(i => i.id !== id) });
});

initSheet();
