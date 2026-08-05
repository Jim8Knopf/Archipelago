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

// ---- Loader form ----

document.getElementById("campaign-input").value = params.get("campaign") || "default-campaign";
document.getElementById("char-input").value = params.get("char") || "";

document.getElementById("open-btn").addEventListener("click", async () => {
  const campaign = document.getElementById("campaign-input").value.trim() || "default-campaign";
  let charId = document.getElementById("char-input").value.trim();
  const newName = document.getElementById("new-name-input").value.trim();

  try {
    if (!charId) {
      charId = slugify(newName || "new-character");
      const ref = doc(db, "campaigns", campaign, "characters", charId);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        charId = charId + "-" + Math.random().toString(36).slice(2, 5);
      }
      await setDoc(doc(db, "campaigns", campaign, "characters", charId), R.defaultCharacter(newName));
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

// Fills in any fields missing from older/partial docs, so this never crashes
// on a character created before a field existed.
function normalize(d) {
  const def = R.defaultCharacter(d.name);
  return {
    ...def,
    ...d,
    basicInfo: { ...def.basicInfo, ...(d.basicInfo || {}) },
    basicSkills: d.basicSkills || def.basicSkills,
    categories: d.categories || [],
    traits: d.traits || [],
    inventory: d.inventory || []
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

  const nameInput = document.getElementById("name-input");
  if (document.activeElement !== nameInput) nameInput.value = d.name || "";

  renderBudget(d);
  renderBasicInfo(d.basicInfo);
  renderAttributes(d);
  renderBasicSkills(d.basicSkills);
  renderCategories(d.categories);
  renderTraits(d.traits);
  renderInventory(d.inventory);
}

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
}

document.getElementById("points-granted-input").addEventListener("change", (e) => {
  saveField({ pointsGranted: Math.max(0, parseInt(e.target.value, 10) || 0) });
});

// ---- Basic info ----

const BASIC_INFO_FIELDS = [
  ["age", "Age"], ["race", "Race"], ["birthplace", "Birthplace"], ["job", "Job"],
  ["height", "Height"], ["weight", "Weight"], ["gender", "Gender"], ["fightingStyle", "Fighting style"]
];

function renderBasicInfo(info) {
  const grid = document.getElementById("basic-info-grid");
  if (grid.dataset.built) {
    // already built once — just refresh values, don't nuke focus
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

// ---- Attributes: HP, Movement, Mana, Evasion ----

function renderAttributes(d) {
  const maxHP = R.hpFromPoints(d.hpPoints);
  const movement = R.movementFromPoints(d.movementPoints);

  const hpPointsInput = document.getElementById("hp-points-input");
  if (document.activeElement !== hpPointsInput) hpPointsInput.value = d.hpPoints || 0;
  document.getElementById("hp-max-derived").textContent = maxHP;

  const movePointsInput = document.getElementById("move-points-input");
  if (document.activeElement !== movePointsInput) movePointsInput.value = d.movementPoints || 0;
  document.getElementById("move-derived").textContent = movement;

  renderGauge("hp", d.currentHP ?? 0, maxHP);

  const manaMaxInput = document.getElementById("mana-max-input");
  if (document.activeElement !== manaMaxInput) manaMaxInput.value = d.maxMana ?? 0;
  renderGauge("mana", d.currentMana ?? 0, d.maxMana ?? 0);

  const evasion = R.evasionTotal(d.basicSkills, movement);
  const evLadder = R.ladder(evasion);
  document.getElementById("evasion-derived").textContent = evasion;
  document.getElementById("evasion-ladder").textContent =
    ` (Hard: ${evLadder.hard} · Extreme: ${evLadder.extreme})`;
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
  if (document.activeElement !== curInput) curInput.value = current;
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

document.getElementById("mana-max-input").addEventListener("change", (e) => {
  const newMax = Math.max(0, parseInt(e.target.value, 10) || 0);
  const updates = { maxMana: newMax };
  if ((currentData.currentMana ?? 0) > newMax) updates.currentMana = newMax;
  saveField(updates);
});

document.getElementById("hp-full-btn").addEventListener("click", () => {
  saveField({ currentHP: R.hpFromPoints(currentData.hpPoints) });
});
document.getElementById("mana-full-btn").addEventListener("click", () => {
  saveField({ currentMana: currentData.maxMana ?? 0 });
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
  document.getElementById(`${stat}-current-input`).addEventListener("change", (e) => {
    const max = stat === "hp" ? R.hpFromPoints(currentData.hpPoints) : (currentData.maxMana ?? 0);
    const val = clamp(parseInt(e.target.value, 10) || 0, 0, max);
    saveField({ [curField]: val });
  });
});

// Name field
document.getElementById("name-input").addEventListener("change", (e) => {
  saveField({ name: e.target.value.trim() || "Unnamed" });
});

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

// ---- Categories (weapons / magic / languages) ----

function renderCategories(categories) {
  const container = document.getElementById("categories-container");
  if (categories.length === 0) {
    container.innerHTML = `<p class="empty-state">No categories yet — add Sword, Fire, Common, etc.</p>`;
    return;
  }
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
          <input type="text" data-field="name" placeholder="Category name (e.g. Sword)" value="${escapeHtml(cat.name)}">
          <select data-field="type">
            <option value="weapon" ${cat.type === "weapon" ? "selected" : ""}>Weapon</option>
            <option value="magic" ${cat.type === "magic" ? "selected" : ""}>Magic</option>
            <option value="language" ${cat.type === "language" ? "selected" : ""}>Language</option>
          </select>
          <button class="small danger" data-action="remove-category">✕ Category</button>
        </div>
        <div class="cat-bonus">Transfer bonus: +${bonus}</div>
        <table class="skill-table">
          <thead><tr><th>Skill</th><th>Points</th><th>Effective</th><th>Hard</th><th>Extreme</th><th></th></tr></thead>
          <tbody>${skillRows}</tbody>
        </table>
        <button class="small brass" data-action="add-skill">+ Add skill to this category</button>
      </div>
    `;
  }).join("");
}

document.getElementById("categories-container").addEventListener("change", (e) => {
  const input = e.target.closest("input[data-field], select[data-field]");
  if (!input) return;
  const catId = input.closest("[data-cat]").dataset.cat;
  const row = input.closest("tr");

  const categories = currentData.categories.map(cat => {
    if (cat.id !== catId) return cat;
    if (row) {
      // editing a skill within the category
      const skillId = row.dataset.id;
      return {
        ...cat,
        skills: cat.skills.map(s => s.id === skillId
          ? { ...s, [input.dataset.field]: input.dataset.field === "points" ? (parseFloat(input.value) || 0) : input.value }
          : s
        )
      };
    }
    // editing the category itself (name/type)
    return { ...cat, [input.dataset.field]: input.value };
  });
  saveField({ categories });
});

document.getElementById("categories-container").addEventListener("click", (e) => {
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

document.getElementById("add-category-btn").addEventListener("click", () => {
  saveField({
    categories: [...currentData.categories, { id: R.makeId(), name: "New Category", type: "weapon", skills: [] }]
  });
});

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

initSheet();
