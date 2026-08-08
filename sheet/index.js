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

const getMaxMana = (d) => R.manaPoolFromPoints(d.manaPoints, d.categories);

// ---- "Used this session" — one-way toggle, stored in Firestore so a GM
// reset can reach every device. Clicking an already-used skill is a no-op. ----

function usedClass(d, id) {
  return (d.usedSkillIds || []).includes(id) ? "used-skill" : "";
}

// ---- Shared view-mode row builder ----
//
// Every read-only table (Basic Skills, Languages, Weapons, Magic) renders
// the same shape: a name cell, then one cell per success tier. All of them
// share one click behaviour too — tapping *any* cell in the row (name or
// value) marks that skill "used" for the session, styled identically as
// plain clickable text rather than a button.
//
// Spells layer one extra behaviour on top: tapping a value cell also casts
// at that success tier and spends the matching Mana. Pass `castCosts`
// (same length/order as `tiers`) to enable that; omit it for every other
// table.
function skillRowHtml(d, skill, nameHtml, tiers, castCosts) {
  const used = usedClass(d, skill.id);
  const nameCell = `<td class="skill-name-clickable ${used}" data-skill-id="${skill.id}">${nameHtml}</td>`;
  const valueCells = tiers.map((value, i) => {
    const cost = castCosts ? castCosts[i] : null;
    const castAttrs = cost != null
      ? ` data-action="cast" data-cost="${cost}" title="Costs ${cost} Mana"`
      : "";
    return `<td class="skill-name-clickable ${used}" data-skill-id="${skill.id}"${castAttrs}>${value}</td>`;
  }).join("");
  return `<tr>${nameCell}${valueCells}</tr>`;
}

function wireUsedToggle(containerId) {
  const el = document.getElementById(containerId);
  if (!el || el.dataset.usedWired) return;
  el.addEventListener("click", (e) => {
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
["view-basic-skills", "view-weapons", "view-magic", "view-languages"].forEach(wireUsedToggle);

// ---- View / Edit mode ----

function setMode(mode) {
  document.body.dataset.mode = mode;
  document.getElementById("view-mode-btn").classList.toggle("active", mode === "view");
  document.getElementById("edit-mode-btn").classList.toggle("active", mode === "edit");
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
    currentData = normalize(snap.data());
    loaderCard.style.display = "none";
    sheetCard.style.display = "contents";
    render();
  }, (err) => {
    console.error(err);
    flash(loaderStatus, "Connection error — check firestore.rules allows access.");
  });
}

// Fills in missing fields from older/partial docs, and migrates legacy shapes:
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

  const rawBasicSkills = d.basicSkills || def.basicSkills;
  const legacyEvasionSkill = rawBasicSkills.find(s => (s.name || "").trim().toLowerCase() === "evasion");
  const basicSkills = rawBasicSkills.filter(s => s !== legacyEvasionSkill);
  const evasionPoints = d.evasionPoints ?? (legacyEvasionSkill ? legacyEvasionSkill.points : 0);

  const inventory = (d.inventory || []).map(item => item.type ? item : { ...item, type: "item" });

  return {
    ...def,
    ...d,
    basicInfo: { ...def.basicInfo, ...(d.basicInfo || {}) },
    basicSkills,
    categories,
    languages: d.languages && d.languages.length ? d.languages : legacyLangSkills,
    traits: d.traits || [],
    inventory,
    armorCustom: d.armorCustom ?? d.armor ?? 0,
    evasionPoints,
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

const catsOfType = (categories, type) => (categories || []).filter(c => c.type === type);

// ---- Master render ----

function render() {
  const d = currentData;

  const nameInput = document.getElementById("name-input");
  if (document.activeElement !== nameInput) nameInput.value = d.name || "";
  document.getElementById("name-display").textContent = d.name || "Unnamed";

  renderPortrait(d.imageUrl);
  renderBudget(d);
  renderHP(d);
  renderBasicInfo(d.basicInfo);
  renderAttributes(d);
  renderLanguages(d.languages);
  renderBasicSkills(d.basicSkills);
  renderCategoryGroup("weapons-container", d.categories, "weapon");
  renderMagicStats(d);
  renderMagicCategories(d);
  renderTraits(d.traits);
  renderInventoryEdit(d.inventory);

  renderViewBasicInfo(d);
  renderViewAttributes(d);
  renderViewLanguages(d);
  renderViewBasicSkills(d);
  renderViewCategoryGroup("view-weapons", d);
  renderViewMagicVitals(d);
  renderViewMagic(d);
  renderViewTraits(d);
  renderViewInventory(d);

  document.getElementById("view-magic-section").style.display = R.hasMagic(d) ? "" : "none";
  document.getElementById("view-weapons-section").style.display = catsOfType(d.categories, "weapon").length ? "" : "none";
  document.getElementById("view-traits-section").style.display = d.traits.length ? "" : "none";
  document.getElementById("view-inventory-section").style.display = d.inventory.length ? "" : "none";
}

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

// View-mode Mana quick-adjust and inline spell casting (event delegation on
// the stable #view-magic-section, since its content is rebuilt every render).
document.getElementById("view-magic-section").addEventListener("click", (e) => {
  const adjustBtn = e.target.closest('button[data-action="view-mana-adjust"]');
  if (adjustBtn) {
    const delta = parseInt(adjustBtn.dataset.delta, 10);
    const max = getMaxMana(currentData);
    const newVal = clamp((currentData.currentMana ?? 0) + delta, 0, max);
    saveField({ currentMana: newVal });
    return;
  }
  const castEl = e.target.closest('[data-action="cast"]');
  if (castEl) {
    const cost = parseInt(castEl.dataset.cost, 10);
    const current = currentData.currentMana ?? 0;
    if (cost > current) {
      flash(sheetStatus, `Not enough Mana — this costs ${cost}, you have ${current}.`);
      return;
    }
    saveField({ currentMana: current - cost });
  }
});

// Name field
document.getElementById("name-input").addEventListener("change", (e) => {
  saveField({ name: e.target.value.trim() || "Unnamed" });
});

// ---- Basic info ----

const BASIC_INFO_FIELDS = [
  ["age", "Age"], ["race", "Race"], ["birthplace", "Birthplace"], ["job", "Job"],
  ["height", "Height"], ["weight", "Weight"], ["gender", "Gender"], ["fightingStyle", "Fighting style"]
];

function renderBasicInfo(info) {
  const grid = document.getElementById("basic-info-grid");
  if (grid.dataset.built) {
    BASIC_INFO_FIELDS.forEach(([key]) => {
      const input = grid.querySelector(`input[data-field="${key}"]`);
      if (input && document.activeElement !== input) input.value = info[key] || "";
    });
    return;
  }
  grid.innerHTML = BASIC_INFO_FIELDS.map(([key, label]) => `
    <div class="field">
      <label>${label}</label>
      <input type="text" data-field="${key}" value="${escapeHtml(info[key] || "")}">
    </div>
  `).join("");
  grid.dataset.built = "1";
  grid.addEventListener("change", (e) => {
    const input = e.target.closest("input[data-field]");
    if (!input) return;
    saveField({ [`basicInfo.${input.dataset.field}`]: input.value.trim() });
  });
}

function renderViewBasicInfo(d) {
  const info = d.basicInfo;
  const rows = BASIC_INFO_FIELDS
    .filter(([key]) => info[key])
    .map(([key, label]) => `<tr><th>${label}</th><td>${escapeHtml(info[key])}</td></tr>`)
    .join("");
  document.getElementById("view-basic-info").innerHTML =
    rows ? `<table>${rows}</table>` : `<p class="empty-state">No basic info filled in yet.</p>`;
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
}

function renderViewAttributes(d) {
  const maxHP = R.hpFromPoints(d.hpPoints);
  const movement = R.movementFromPoints(d.movementPoints);
  const evasion = R.evasionTotal(d.evasionPoints, movement);
  const evLadder = R.ladder(evasion);

  document.getElementById("view-attributes").innerHTML = `
    <p class="stat-line">Max HP: <strong>${maxHP}</strong> <span class="muted">(current HP is tracked in the header)</span></p>
    <p class="stat-line">Movement: <strong>${movement}</strong> m/s</p>
    <p class="stat-line">Armor: <strong>${R.totalArmor(d)}</strong></p>
    <p class="stat-line">Evasion — Normal: <strong>${evasion}</strong>
      <span class="muted">(Half: ${evLadder.hard} · One-fifth: ${evLadder.extreme})</span>
    </p>
    <p class="muted">Armor and Evasion are either/or per hit (Section 4.1).</p>
  `;
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
  document.getElementById("mana-formula-note").textContent = ` (= ${d.manaPoints || 0} points × +${bonusTotal} magic bonus)`;
  renderGauge("mana", d.currentMana ?? 0, maxMana);
}

// ---- Languages ----

function renderLanguages(languages) {
  const container = document.getElementById("languages-container");
  const bonus = R.categoryBonus(languages);

  const rows = (languages || []).map(s => {
    const eff = R.categorySkillEffective(s, bonus);
    const l = R.ladder(eff);
    return `
      <tr data-id="${s.id}">
        <td><input type="text" data-field="name" value="${escapeHtml(s.name)}"></td>
        <td><input type="number" data-field="points" value="${s.points || 0}" min="0"></td>
        <td class="num">${eff}</td>
        <td class="num">${l.hard}</td>
        <td class="num">${l.extreme}</td>
        <td><button class="small danger" data-action="remove">✕</button></td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="cat-bonus">Transfer bonus: +${bonus}</div>
    <div class="table-scroll">
      <table class="skill-table">
        <thead><tr><th>Language</th><th>Points</th><th>Effective</th><th>Hard</th><th>Extreme</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="empty-state">No languages yet.</td></tr>`}</tbody>
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
      const btn = e.target.closest("button[data-action='remove']");
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

function renderViewLanguages(d) {
  const languages = d.languages;
  const el = document.getElementById("view-languages");
  if (!languages || languages.length === 0) {
    el.innerHTML = `<p class="empty-state">No languages yet.</p>`;
    return;
  }
  const bonus = R.categoryBonus(languages);
  const rows = languages.map(s => {
    const eff = R.categorySkillEffective(s, bonus);
    const l = R.ladder(eff);
    return skillRowHtml(d, s, escapeHtml(s.name), [eff, l.hard, l.extreme]);
  }).join("");
  el.innerHTML = `
    <p class="muted" style="margin-bottom:0.15rem;">Transfer bonus: +${bonus}</p>
    <table><thead><tr><th>Language</th><th>Eff.</th><th>Hard</th><th>Extreme</th></tr></thead><tbody>${rows}</tbody></table>
  `;
}

// ---- Basic skills ----

function renderBasicSkills(skills) {
  const tbody = document.getElementById("basic-skills-body");
  tbody.innerHTML = skills.map(s => {
    const l = R.ladder(s.points);
    return `
      <tr data-id="${s.id}">
        <td><input type="text" data-field="name" value="${escapeHtml(s.name)}"></td>
        <td><input type="number" data-field="points" value="${s.points || 0}" min="0"></td>
        <td class="num">${l.normal}</td>
        <td class="num">${l.hard}</td>
        <td class="num">${l.extreme}</td>
        <td><button class="small danger" data-action="remove">✕</button></td>
      </tr>
    `;
  }).join("");
}

document.getElementById("basic-skills-body").addEventListener("change", (e) => {
  const input = e.target.closest("input[data-field]");
  if (!input) return;
  const tr = input.closest("tr");
  const id = tr.dataset.id;
  const skills = currentData.basicSkills.map(s => s.id === id
    ? { ...s, [input.dataset.field]: input.dataset.field === "points" ? (parseFloat(input.value) || 0) : input.value }
    : s
  );
  saveField({ basicSkills: skills });
});

document.getElementById("basic-skills-body").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action='remove']");
  if (!btn) return;
  const id = btn.closest("tr").dataset.id;
  saveField({ basicSkills: currentData.basicSkills.filter(s => s.id !== id) });
});

document.getElementById("add-basic-skill-btn").addEventListener("click", () => {
  saveField({ basicSkills: [...currentData.basicSkills, { id: R.makeId(), name: "New Skill", points: 0 }] });
});

function renderViewBasicSkills(d) {
  const skills = d.basicSkills;
  if (!skills.length) {
    document.getElementById("view-basic-skills").innerHTML = `<p class="empty-state">No basic skills yet.</p>`;
    return;
  }
  const rows = skills.map(s => {
    const l = R.ladder(s.points);
    return skillRowHtml(d, s, escapeHtml(s.name), [l.normal, l.hard, l.extreme]);
  }).join("");
  document.getElementById("view-basic-skills").innerHTML = `
    <table><thead><tr><th>Skill</th><th>Normal</th><th>Hard</th><th>Extreme</th></tr></thead><tbody>${rows}</tbody></table>
  `;
}

// ---- Weapons: multiple named categories ----

function renderCategoryGroup(containerId, allCategories, type) {
  const container = document.getElementById(containerId);
  const categories = catsOfType(allCategories, type);

  if (categories.length === 0) {
    container.innerHTML = `<p class="empty-state">No categories yet.</p>`;
  } else {
    container.innerHTML = categories.map(cat => {
      const bonus = R.categoryBonus(cat.skills);
      const skillRows = (cat.skills || []).map(s => {
        const eff = R.categorySkillEffective(s, bonus);
        const l = R.ladder(eff);
        return `
          <tr data-cat="${cat.id}" data-id="${s.id}">
            <td><input type="text" data-field="name" value="${escapeHtml(s.name)}"></td>
            <td><input type="number" data-field="points" value="${s.points || 0}" min="0"></td>
            <td class="num">${eff}</td>
            <td class="num">${l.hard}</td>
            <td class="num">${l.extreme}</td>
            <td><button class="small danger" data-action="remove-skill">✕</button></td>
          </tr>
        `;
      }).join("");

      return `
        <div class="category-card" data-cat="${cat.id}">
          <div class="cat-header">
            <input type="text" data-field="name" placeholder="Category name" value="${escapeHtml(cat.name)}">
            <button class="small danger" data-action="remove-category">✕ Category</button>
          </div>
          <div class="cat-bonus">Transfer bonus: +${bonus}</div>
          <div class="table-scroll">
            <table class="skill-table">
              <thead><tr><th>Skill</th><th>Points</th><th>Effective</th><th>Hard</th><th>Extreme</th><th></th></tr></thead>
              <tbody>${skillRows}</tbody>
            </table>
          </div>
          <button class="small brass" data-action="add-skill">+ Add skill to this category</button>
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
    container.innerHTML = `<p class="empty-state">No categories yet.</p>`;
  } else {
    container.innerHTML = categories.map(cat => {
      const bonus = R.categoryBonus(cat.skills);
      const skillRows = (cat.skills || []).map(s => {
        const eff = R.categorySkillEffective(s, bonus);
        const l = R.ladder(eff);
        const magnitude = R.magnitudeOf(s);
        return `
          <tr data-cat="${cat.id}" data-id="${s.id}">
            <td><input type="text" data-field="name" value="${escapeHtml(s.name)}"></td>
            <td><input type="number" data-field="points" value="${s.points || 0}" min="0"></td>
            <td><input type="number" data-field="magnitude" value="${magnitude}" min="1" max="8" style="width:3rem;"></td>
            <td class="num">${eff}</td>
            <td class="num">${l.hard}</td>
            <td class="num">${l.extreme}</td>
            <td><button class="small danger" data-action="remove-skill">✕</button></td>
          </tr>
        `;
      }).join("");

      return `
        <div class="category-card" data-cat="${cat.id}">
          <div class="cat-header">
            <input type="text" data-field="name" placeholder="Category name" value="${escapeHtml(cat.name)}">
            <button class="small danger" data-action="remove-category">✕ Category</button>
          </div>
          <div class="cat-bonus">Transfer bonus: +${bonus}</div>
          <div class="table-scroll">
            <table class="skill-table">
              <thead><tr><th>Spell</th><th>Points</th><th>Magnitude</th><th>Effective</th><th>Hard</th><th>Extreme</th><th></th></tr></thead>
              <tbody>${skillRows}</tbody>
            </table>
          </div>
          <button class="small brass" data-action="add-skill">+ Add spell to this category</button>
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
    const input = e.target.closest("input[data-field]");
    if (!input) return;
    const catId = input.closest("[data-cat]").dataset.cat;
    const row = input.closest("tr");

    const updatedList = currentData[dataKey].map(cat => {
      if (cat.id !== catId) return cat;
      if (row) {
        const skillId = row.dataset.id;
        return {
          ...cat,
          skills: cat.skills.map(s => s.id === skillId
            ? { ...s, [input.dataset.field]: input.dataset.field === "name" ? input.value : (parseFloat(input.value) || 0) }
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

document.getElementById("add-weapon-category-btn").addEventListener("click", () => {
  saveField({ categories: [...currentData.categories, { id: R.makeId(), name: "New Weapon Category", type: "weapon", skills: [] }] });
});
document.getElementById("add-magic-category-btn").addEventListener("click", () => {
  saveField({ categories: [...currentData.categories, { id: R.makeId(), name: "New Magic Category", type: "magic", skills: [] }] });
});

function renderViewCategoryGroup(containerId, d) {
  const categories = catsOfType(d.categories, "weapon");
  const el = document.getElementById(containerId);
  if (categories.length === 0) { el.innerHTML = ""; return; }
  el.innerHTML = categories.map(cat => {
    const bonus = R.categoryBonus(cat.skills);
    const rows = (cat.skills || []).map(s => {
      const eff = R.categorySkillEffective(s, bonus);
      const l = R.ladder(eff);
      return skillRowHtml(d, s, escapeHtml(s.name), [eff, l.hard, l.extreme]);
    }).join("");
    return `
      <p class="muted" style="margin-bottom:0.15rem;"><strong>${escapeHtml(cat.name)}</strong> — bonus +${bonus}</p>
      <table><thead><tr><th>Skill</th><th>Eff.</th><th>Hard</th><th>Extreme</th></tr></thead><tbody>${rows}</tbody></table>
    `;
  }).join("");
}

function renderViewMagicVitals(d) {
  const maxMana = getMaxMana(d);
  const currentMana = d.currentMana ?? 0;
  const pct = maxMana > 0 ? clamp((currentMana / maxMana) * 100, 0, 100) : 0;
  const gaugeClass = pct <= 25 ? "low" : pct <= 60 ? "mid" : "";
  document.getElementById("view-magic-vitals").innerHTML = `
    <div class="gauge-label"><span>Current Mana</span><span>${currentMana} / ${maxMana}</span></div>
    <div class="gauge ${gaugeClass}"><div class="fill" style="width:${pct}%"></div></div>
    <div class="stat-controls">
      <button class="small" data-action="view-mana-adjust" data-delta="-10">−10</button>
      <button class="small" data-action="view-mana-adjust" data-delta="-1">−1</button>
      <button class="small" data-action="view-mana-adjust" data-delta="1">+1</button>
      <button class="small" data-action="view-mana-adjust" data-delta="10">+10</button>
    </div>
  `;
}

// Eff./Hard/Extreme are the cast values themselves — plain clickable text,
// same as every other skill table, not buttons. Tapping one casts at that
// success tier and spends the matching Mana cost (Section 5.3), or shows a
// warning if you can't afford it (nothing is deducted in that case).
// Magnitude is shown as a roman-numeral prefix in front of the spell's name
// (Section 5.2) rather than its own column.
function renderViewMagic(d) {
  const categories = catsOfType(d.categories, "magic");
  if (categories.length === 0) {
    document.getElementById("view-magic").innerHTML = `<p class="empty-state">No spells yet.</p>`;
    return;
  }
  document.getElementById("view-magic").innerHTML = categories.map(cat => {
    const bonus = R.categoryBonus(cat.skills);
    const rows = (cat.skills || []).map(s => {
      const eff = R.categorySkillEffective(s, bonus);
      const l = R.ladder(eff);
      const magnitude = R.magnitudeOf(s);
      const cost = R.castingCost(magnitude);
      const nameHtml = `<span class="magnitude-tag" title="Magnitude ${magnitude}">${toRoman(magnitude)}</span>${escapeHtml(s.name)}`;
      return skillRowHtml(d, s, nameHtml, [eff, l.hard, l.extreme], [cost.normal, cost.hard, cost.extreme]);
    }).join("");
    return `
      <p class="muted" style="margin-bottom:0.15rem;"><strong>${escapeHtml(cat.name)}</strong> — bonus +${bonus}</p>
      <table>
        <thead><tr><th>Spell</th><th>Eff.</th><th>Hard</th><th>Extreme</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }).join("");
}

// ---- Traits ----

function renderTraits(traits) {
  const container = document.getElementById("traits-container");
  if (traits.length === 0) {
    container.innerHTML = `<p class="empty-state">No traits yet.</p>`;
    return;
  }
  container.innerHTML = traits.map(t => `
    <div class="trait-card ${t.type}" data-id="${t.id}">
      <div class="trait-header">
        <input type="text" data-field="name" placeholder="Trait name" value="${escapeHtml(t.name)}">
        <select data-field="type">
          <option value="advantage" ${t.type === "advantage" ? "selected" : ""}>Advantage</option>
          <option value="flaw" ${t.type === "flaw" ? "selected" : ""}>Flaw</option>
        </select>
        <select data-field="tier">
          <option value="minor" ${t.tier === "minor" ? "selected" : ""}>Minor (15)</option>
          <option value="moderate" ${t.tier === "moderate" ? "selected" : ""}>Moderate (30)</option>
          <option value="major" ${t.tier === "major" ? "selected" : ""}>Major (50)</option>
        </select>
        <button class="small danger" data-action="remove-trait">✕</button>
      </div>
      <textarea data-field="description" placeholder="Description / compel notes">${escapeHtml(t.description)}</textarea>
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

function renderViewTraits(d) {
  const traits = d.traits;
  if (!traits.length) {
    document.getElementById("view-traits").innerHTML = "";
    return;
  }
  const rows = traits.map(t =>
    `<tr><td>${escapeHtml(t.name)}</td><td>${t.type}</td><td>${t.tier} (${R.tierValue(t.tier)})</td><td>${escapeHtml(t.description || "")}</td></tr>`
  ).join("");
  document.getElementById("view-traits").innerHTML = `
    <table><thead><tr><th>Name</th><th>Type</th><th>Tier</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
  `;
}

// ---- Inventory: three typed lists (item / armor / weapon) ----

function renderInventoryEdit(inventory) {
  renderInventoryItemList(inventory);
  renderInventoryArmorList(inventory);
  renderInventoryWeaponList(inventory);
}

function renderInventoryItemList(inventory) {
  const items = inventory.filter(i => i.type === "item");
  const list = document.getElementById("inventory-item-list");
  if (items.length === 0) {
    list.innerHTML = `<li class="empty-state" style="border:none;">No items yet.</li>`;
    return;
  }
  list.innerHTML = items.map(item => `
    <li data-id="${item.id}">
      <span class="item-name">${escapeHtml(item.name)}</span>
      <button class="small" data-action="qty-dec">−</button>
      <span class="item-qty">${item.qty}</span>
      <button class="small" data-action="qty-inc">+</button>
      <button class="small danger" data-action="remove">✕</button>
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

function renderInventoryArmorList(inventory) {
  const items = inventory.filter(i => i.type === "armor");
  const list = document.getElementById("inventory-armor-list");
  if (items.length === 0) {
    list.innerHTML = `<li class="empty-state" style="border:none;">No armor yet.</li>`;
    return;
  }
  list.innerHTML = items.map(item => `
    <li data-id="${item.id}">
      <span class="item-name">${escapeHtml(item.name)}</span>
      <span class="muted">Value ${item.armorValue ?? 0}</span>
      <label class="row" style="gap:0.3rem;">
        <input type="checkbox" data-action="toggle-worn" ${item.worn ? "checked" : ""}> Worn
      </label>
      <button class="small danger" data-action="remove">✕</button>
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

function renderInventoryWeaponList(inventory) {
  const items = inventory.filter(i => i.type === "weapon");
  const list = document.getElementById("inventory-weapon-list");
  if (items.length === 0) {
    list.innerHTML = `<li class="empty-state" style="border:none;">No weapons yet.</li>`;
    return;
  }
  list.innerHTML = items.map(item => `
    <li data-id="${item.id}">
      <span class="item-name">${escapeHtml(item.name)}</span>
      <span class="muted">${escapeHtml(item.woundDice || "")}</span>
      <button class="small danger" data-action="remove">✕</button>
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

function renderViewInventory(d) {
  const inventory = d.inventory;
  if (!inventory.length) {
    document.getElementById("view-inventory").innerHTML = "";
    return;
  }
  const items = inventory.filter(i => i.type === "item");
  const armor = inventory.filter(i => i.type === "armor");
  const weapons = inventory.filter(i => i.type === "weapon");

  const itemRows = items.map(i => `<tr><td>${escapeHtml(i.name)}</td><td>×${i.qty}</td></tr>`).join("");
  const armorRows = armor.map(i => `<tr><td>${escapeHtml(i.name)}</td><td>${i.armorValue ?? 0}</td><td>${i.worn ? "Worn" : "—"}</td></tr>`).join("");
  const weaponRows = weapons.map(i => `<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.woundDice || "")}</td></tr>`).join("");

  document.getElementById("view-inventory").innerHTML = `
    ${itemRows ? `<table><tbody>${itemRows}</tbody></table>` : ""}
    ${armorRows ? `<p class="muted" style="margin-bottom:0.15rem;"><strong>Armor</strong></p>
      <table><thead><tr><th>Name</th><th>Value</th><th>Worn</th></tr></thead><tbody>${armorRows}</tbody></table>` : ""}
    ${weaponRows ? `<p class="muted" style="margin-bottom:0.15rem;"><strong>Weapons</strong></p>
      <table><thead><tr><th>Name</th><th>Wound dice</th></tr></thead><tbody>${weaponRows}</tbody></table>` : ""}
  `;
}

initSheet();
