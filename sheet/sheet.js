import {
  doc, getDoc, setDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db, getCampaignId } from "../js/firebase-init.js";
import * as R from "../js/rules-calc.js";

const params = new URLSearchParams(window.location.search);
const loaderCard = document.getElementById("loader-card");
const sheetCard = document.getElementById("sheet-card");
const loaderStatus = document.getElementById("loader-status");
const sheetStatus = document.getElementById("sheet-status");

let currentData = null;
let charRef = null;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "char-" + Math.random().toString(36).slice(2, 7);
}

function flash(el, msg) {
  el.textContent = msg;
  setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, 2500);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---- "Used this session" toggle ----
// In-memory only, keyed by skill id — resets when the tab/browser session
// ends. Click a skill/weapon/spell/language name in View mode to fatten it,
// as a reminder for post-session improvement rolls (Section 11.2).

const usedThisSession = new Set();

function usedClass(id) {
  return usedThisSession.has(id) ? "used-skill" : "";
}

function wireUsedToggle(containerId) {
  const el = document.getElementById(containerId);
  if (!el || el.dataset.usedWired) return;
  el.addEventListener("click", (e) => {
    const cell = e.target.closest("[data-skill-id]");
    if (!cell) return;
    const id = cell.dataset.skillId;
    if (usedThisSession.has(id)) usedThisSession.delete(id); else usedThisSession.add(id);
    cell.classList.toggle("used-skill");
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
setMode("view"); // default — a shared link opens to the read-only view

// ---- Loader form: one name field. Opens the character if it exists,
// otherwise asks to create it. ----

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

  // onSnapshot keeps this live — any change from this tab, another player's
  // tab, or the GM dashboard appears here within a second or two, no reload.
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

// Fills in any fields missing from older/partial docs. Also migrates any
// legacy "language" type categories into the flat `languages` array.
function normalize(d) {
  const def = R.defaultCharacter(d.name);
  const rawCategories = d.categories || [];
  const categories = rawCategories.filter(c => c.type !== "language");
  const legacyLangSkills = rawCategories
    .filter(c => c.type === "language")
    .flatMap(c => c.skills || []);

  return {
    ...def,
    ...d,
    basicInfo: { ...def.basicInfo, ...(d.basicInfo || {}) },
    basicSkills: d.basicSkills || def.basicSkills,
    categories,
    languages: d.languages && d.languages.length ? d.languages : legacyLangSkills,
    traits: d.traits || [],
    inventory: d.inventory || [],
    armor: d.armor ?? 0,
    imageUrl: d.imageUrl || ""
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
  renderVitals(d);
  renderBasicInfo(d.basicInfo);
  renderAttributes(d);
  renderLanguages(d.languages);
  renderBasicSkills(d.basicSkills);
  renderCategoryGroup("weapons-container", d.categories, "weapon");
  renderCategoryGroup("magic-container", d.categories, "magic");
  renderTraits(d.traits);
  renderInventory(d.inventory);

  renderViewBasicInfo(d);
  renderViewAttributes(d);
  renderViewLanguages(d.languages);
  renderViewBasicSkills(d.basicSkills);
  renderViewCategoryGroup("view-weapons", d.categories, "weapon");
  renderViewMagicVitals(d);
  renderViewMagic(d);
  renderViewTraits(d.traits);
  renderViewInventory(d.inventory);

  const magicPresent = R.hasMagic(d);
  document.getElementById("view-magic-section").style.display = magicPresent ? "" : "none";
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

// ---- Vitals: HP + Rest — always visible & editable in both View and Edit ----

function renderVitals(d) {
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
    updates.currentMana = R.shortRestRecover(currentData.currentMana ?? 0, currentData.maxMana ?? 0);
  }
  saveField(updates);
});

document.getElementById("long-rest-btn").addEventListener("click", () => {
  const maxHP = R.hpFromPoints(currentData.hpPoints);
  const updates = { currentHP: R.longRestRecover(currentData.currentHP ?? 0, maxHP) };
  if (R.hasMagic(currentData)) {
    updates.currentMana = R.longRestRecover(currentData.currentMana ?? 0, currentData.maxMana ?? 0);
  }
  saveField(updates);
});

document.querySelectorAll("button[data-stat]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const stat = btn.dataset.stat;
    const delta = parseInt(btn.dataset.delta, 10);
    const curField = stat === "hp" ? "currentHP" : "currentMana";
    const max = stat === "hp" ? R.hpFromPoints(currentData.hpPoints) : (currentData.maxMana ?? 0);
    const newVal = clamp((currentData[curField] ?? 0) + delta, 0, max);
    saveField({ [curField]: newVal });
  });
});

["hp", "mana"].forEach((stat) => {
  const curField = stat === "hp" ? "currentHP" : "currentMana";
  const input = document.getElementById(`${stat}-current-input`);
  if (!input) return;
  input.addEventListener("change", (e) => {
    const max = stat === "hp" ? R.hpFromPoints(currentData.hpPoints) : (currentData.maxMana ?? 0);
    const val = clamp(parseInt(e.target.value, 10) || 0, 0, max);
    saveField({ [curField]: val });
  });
});

// View-mode Mana quick-adjust (buttons only, no free-typed input — the view
// widget is rebuilt on every render, so a persistent input would lose focus).
document.getElementById("view-magic-section").addEventListener("click", (e) => {
  const btn = e.target.closest('button[data-action="view-mana-adjust"]');
  if (!btn) return;
  const delta = parseInt(btn.dataset.delta, 10);
  const max = currentData.maxMana ?? 0;
  const newVal = clamp((currentData.currentMana ?? 0) + delta, 0, max);
  saveField({ currentMana: newVal });
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

// ---- Attributes: HP points/Max, Movement, Armor, Evasion ----
// (current HP lives in the always-visible Vitals card; current Mana in the Magic block)

function renderAttributes(d) {
  const maxHP = R.hpFromPoints(d.hpPoints);
  const movement = R.movementFromPoints(d.movementPoints);

  const hpPointsInput = document.getElementById("hp-points-input");
  if (document.activeElement !== hpPointsInput) hpPointsInput.value = d.hpPoints || 0;
  document.getElementById("hp-max-derived").textContent = maxHP;

  const movePointsInput = document.getElementById("move-points-input");
  if (document.activeElement !== movePointsInput) movePointsInput.value = d.movementPoints || 0;
  document.getElementById("move-derived").textContent = movement;

  const armorInput = document.getElementById("armor-input");
  if (document.activeElement !== armorInput) armorInput.value = d.armor ?? 0;

  const evasion = R.evasionTotal(d.basicSkills, movement);
  const evLadder = R.ladder(evasion);
  document.getElementById("evasion-derived").textContent = evasion;
  document.getElementById("evasion-ladder").textContent =
    ` (Half: ${evLadder.hard} · One-fifth: ${evLadder.extreme})`;
}

function renderViewAttributes(d) {
  const maxHP = R.hpFromPoints(d.hpPoints);
  const movement = R.movementFromPoints(d.movementPoints);
  const evasion = R.evasionTotal(d.basicSkills, movement);
  const evLadder = R.ladder(evasion);

  document.getElementById("view-attributes").innerHTML = `
    <p class="stat-line">HP points invested: <strong>${d.hpPoints ?? 0}</strong> → Max HP <strong>${maxHP}</strong>
      <span class="muted">(current HP tracked above, in Vitals)</span></p>
    <p class="stat-line">Movement points invested: <strong>${d.movementPoints ?? 0}</strong> → <strong>${movement}</strong> m/s</p>
    <p class="stat-line">Armor: <strong>${d.armor ?? 0}</strong></p>
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

document.getElementById("armor-input").addEventListener("change", (e) => {
  saveField({ armor: Math.max(0, parseInt(e.target.value, 10) || 0) });
});

document.getElementById("mana-max-input").addEventListener("change", (e) => {
  const newMax = Math.max(0, parseInt(e.target.value, 10) || 0);
  const updates = { maxMana: newMax };
  if ((currentData.currentMana ?? 0) > newMax) updates.currentMana = newMax;
  saveField(updates);
});

// ---- Languages: one shared pool, no sub-categories (lives at the end of Basic Info & Attributes) ----

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

function renderViewLanguages(languages) {
  const el = document.getElementById("view-languages");
  if (!languages || languages.length === 0) {
    el.innerHTML = `<p class="empty-state">No languages yet.</p>`;
    return;
  }
  const bonus = R.categoryBonus(languages);
  const rows = languages.map(s => {
    const eff = R.categorySkillEffective(s, bonus);
    const l = R.ladder(eff);
    return `<tr><td class="skill-name-clickable ${usedClass(s.id)}" data-skill-id="${s.id}">${escapeHtml(s.name)}</td><td>${eff}</td><td>${l.hard}</td><td>${l.extreme}</td></tr>`;
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

function renderViewBasicSkills(skills) {
  if (!skills.length) {
    document.getElementById("view-basic-skills").innerHTML = `<p class="empty-state">No basic skills yet.</p>`;
    return;
  }
  const rows = skills.map(s => {
    const l = R.ladder(s.points);
    return `<tr><td class="skill-name-clickable ${usedClass(s.id)}" data-skill-id="${s.id}">${escapeHtml(s.name)}</td><td>${l.normal}</td><td>${l.hard}</td><td>${l.extreme}</td></tr>`;
  }).join("");
  document.getElementById("view-basic-skills").innerHTML = `
    <table><thead><tr><th>Skill</th><th>Normal</th><th>Hard</th><th>Extreme</th></tr></thead><tbody>${rows}</tbody></table>
  `;
}

// ---- Category groups: Weapons / Magic (multiple named categories each) ----

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
    wireCategoryContainer(container);
    container.dataset.wired = "1";
  }
}

function wireCategoryContainer(container) {
  container.addEventListener("change", (e) => {
    const input = e.target.closest("input[data-field]");
    if (!input) return;
    const catId = input.closest("[data-cat]").dataset.cat;
    const row = input.closest("tr");

    const categories = currentData.categories.map(cat => {
      if (cat.id !== catId) return cat;
      if (row) {
        const skillId = row.dataset.id;
        return {
          ...cat,
          skills: cat.skills.map(s => s.id === skillId
            ? { ...s, [input.dataset.field]: input.dataset.field === "points" ? (parseFloat(input.value) || 0) : input.value }
            : s
          )
        };
      }
      return { ...cat, [input.dataset.field]: input.value };
    });
    saveField({ categories });
  });

  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const catId = btn.closest("[data-cat]").dataset.cat;

    if (btn.dataset.action === "remove-category") {
      saveField({ categories: currentData.categories.filter(c => c.id !== catId) });
    }
    if (btn.dataset.action === "add-skill") {
      const categories = currentData.categories.map(cat => cat.id === catId
        ? { ...cat, skills: [...(cat.skills || []), { id: R.makeId(), name: "New Skill", points: 0 }] }
        : cat
      );
      saveField({ categories });
    }
    if (btn.dataset.action === "remove-skill") {
      const skillId = btn.closest("tr").dataset.id;
      const categories = currentData.categories.map(cat => cat.id === catId
        ? { ...cat, skills: cat.skills.filter(s => s.id !== skillId) }
        : cat
      );
      saveField({ categories });
    }
  });
}

document.getElementById("add-weapon-category-btn").addEventListener("click", () => {
  saveField({ categories: [...currentData.categories, { id: R.makeId(), name: "New Weapon Category", type: "weapon", skills: [] }] });
});
document.getElementById("add-magic-category-btn").addEventListener("click", () => {
  saveField({ categories: [...currentData.categories, { id: R.makeId(), name: "New Magic Category", type: "magic", skills: [] }] });
});

function categoryGroupHtml(categories) {
  if (categories.length === 0) return `<p class="empty-state">None yet.</p>`;
  return categories.map(cat => {
    const bonus = R.categoryBonus(cat.skills);
    const rows = (cat.skills || []).map(s => {
      const eff = R.categorySkillEffective(s, bonus);
      const l = R.ladder(eff);
      return `<tr><td class="skill-name-clickable ${usedClass(s.id)}" data-skill-id="${s.id}">${escapeHtml(s.name)}</td><td>${eff}</td><td>${l.hard}</td><td>${l.extreme}</td></tr>`;
    }).join("");
    return `
      <p class="muted" style="margin-bottom:0.15rem;"><strong>${escapeHtml(cat.name)}</strong> — bonus +${bonus}</p>
      <table><thead><tr><th>Skill</th><th>Eff.</th><th>Hard</th><th>Extreme</th></tr></thead><tbody>${rows}</tbody></table>
    `;
  }).join("");
}

function renderViewCategoryGroup(containerId, allCategories, type) {
  document.getElementById(containerId).innerHTML = categoryGroupHtml(catsOfType(allCategories, type));
}

function renderViewMagicVitals(d) {
  const maxMana = d.maxMana ?? 0;
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

function renderViewMagic(d) {
  document.getElementById("view-magic").innerHTML = categoryGroupHtml(catsOfType(d.categories, "magic"));
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

function renderViewTraits(traits) {
  if (!traits.length) {
    document.getElementById("view-traits").innerHTML = `<p class="empty-state">No traits yet.</p>`;
    return;
  }
  const rows = traits.map(t =>
    `<tr><td>${escapeHtml(t.name)}</td><td>${t.type}</td><td>${t.tier} (${R.tierValue(t.tier)})</td><td>${escapeHtml(t.description || "")}</td></tr>`
  ).join("");
  document.getElementById("view-traits").innerHTML = `
    <table><thead><tr><th>Name</th><th>Type</th><th>Tier</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
  `;
}

// ---- Inventory ----

function renderInventory(items) {
  const list = document.getElementById("inventory-list");
  if (items.length === 0) {
    list.innerHTML = `<li class="empty-state" style="border:none;">No items yet — the hold is empty.</li>`;
    return;
  }
  list.innerHTML = items.map((item, i) => `
    <li>
      <span class="item-name">${escapeHtml(item.name)}</span>
      <button class="small" data-action="qty-dec" data-i="${i}">−</button>
      <span class="item-qty">${item.qty}</span>
      <button class="small" data-action="qty-inc" data-i="${i}">+</button>
      <button class="small danger" data-action="remove" data-i="${i}">✕</button>
    </li>
  `).join("");
}

document.getElementById("add-item-btn").addEventListener("click", () => {
  const nameInput = document.getElementById("item-name-input");
  const qtyInput = document.getElementById("item-qty-input");
  const name = nameInput.value.trim();
  const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
  if (!name) return;
  saveField({ inventory: [...currentData.inventory, { name, qty }] });
  nameInput.value = "";
  qtyInput.value = "1";
  nameInput.focus();
});

document.getElementById("inventory-list").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const i = parseInt(btn.dataset.i, 10);
  const inventory = [...currentData.inventory];
  if (btn.dataset.action === "qty-inc") inventory[i].qty += 1;
  if (btn.dataset.action === "qty-dec") inventory[i].qty = Math.max(1, inventory[i].qty - 1);
  if (btn.dataset.action === "remove") inventory.splice(i, 1);
  saveField({ inventory });
});

function renderViewInventory(items) {
  if (!items.length) {
    document.getElementById("view-inventory").innerHTML = `<p class="empty-state">The hold is empty.</p>`;
    return;
  }
  const rows = items.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>×${item.qty}</td></tr>`).join("");
  document.getElementById("view-inventory").innerHTML = `<table><tbody>${rows}</tbody></table>`;
}

initSheet();
