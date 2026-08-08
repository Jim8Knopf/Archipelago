import {
  collection, addDoc, deleteDoc, doc, updateDoc, writeBatch, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db, getCampaignId } from "../js/firebase-init.js";
import { escapeHtml, flash as flashEl, toRoman } from "../js/format.js";
import * as R from "../js/rules-calc.js";

const campaignInput = document.getElementById("campaign-input");
const charList = document.getElementById("char-list");
const gmStatus = document.getElementById("gm-status");

let campaign = getCampaignId();
campaignInput.value = campaign;

// Kept in sync on every snapshot so the +/- buttons always have the latest
// values to compute deltas from, without needing a separate read per click.
let charsById = {};

// Thin wrapper so call sites keep the short flash(msg) form — the shared
// helper needs to know *which* element to write into, since gm.js only
// ever flashes messages into #gm-status.
function flash(msg) {
  flashEl(gmStatus, msg);
}

// Switching campaign ID updates the URL (so the choice is bookmarkable/shareable)
// and re-subscribes to that campaign's characters.
campaignInput.addEventListener("change", () => {
  const val = campaignInput.value.trim() || "default-campaign";
  const url = new URL(window.location.href);
  url.searchParams.set("campaign", val);
  window.location.href = url.toString();
});

document.getElementById("add-char-btn").addEventListener("click", async () => {
  const name = document.getElementById("new-char-name").value.trim();
  const maxHP = Math.max(0, parseInt(document.getElementById("new-char-hp").value, 10) || 0);
  if (!name) { flash("Give the character a name first."); return; }

  try {
    const base = R.defaultCharacter(name);
    // Convert the quick "Max HP" input into invested points so the full
    // sheet's derived formula stays consistent — find the smallest point
    // investment that yields at least the requested max. (Mana now depends
    // on Mana Modifier points × Magic category bonus, so it's set up on the
    // sheet itself once the character has a magic category — not here.)
    let hpPoints = 0;
    while (R.hpFromPoints(hpPoints) < maxHP) hpPoints++;
    await addDoc(collection(db, "campaigns", campaign, "characters"), {
      ...base, hpPoints, currentHP: R.hpFromPoints(hpPoints)
    });
    document.getElementById("new-char-name").value = "";
    flash(`Created "${name}" — link is on their card below.`);
  } catch (err) {
    console.error(err);
    flash("Couldn't reach the database — check firebase-config.js and firestore.rules.");
  }
});

function shareUrl(charId) {
  const url = new URL(window.location.origin + window.location.pathname.replace(/gm\/?$/, "sheet/"));
  url.searchParams.set("campaign", campaign);
  url.searchParams.set("char", charId);
  return url.toString();
}

function gaugeClass(current, max) {
  if (max <= 0) return "";
  const pct = (current / max) * 100;
  if (pct <= 25) return "low";
  if (pct <= 60) return "mid";
  return "";
}

function vitalControlsHtml(id, stat, deltas) {
  return `
    <div class="stat-controls">
      ${deltas.map(d => `<button class="small" data-action="adjust" data-id="${id}" data-stat="${stat}" data-delta="${d}">${d > 0 ? "+" : "−"}${Math.abs(d)}</button>`).join("")}
    </div>
  `;
}

function renderCharacters(docs) {
  charList.innerHTML = "";
  if (docs.length === 0) {
    charList.innerHTML = `<div class="card empty-state">No characters in this campaign yet — add one above.</div>`;
    return;
  }

  docs.forEach(({ id, data }) => {
    const maxHP = R.hpFromPoints(data.hpPoints);
    const maxMana = R.manaPoolFromPoints(data.manaPoints, data.categories);
    const movement = R.movementFromPoints(data.movementPoints);
    const evasion = R.evasionTotal(data.evasionPoints, movement);
    const hpPct = maxHP > 0 ? Math.min(100, ((data.currentHP ?? 0) / maxHP) * 100) : 0;
    const manaPct = maxMana > 0 ? Math.min(100, ((data.currentMana ?? 0) / maxMana) * 100) : 0;
    const inv = data.inventory || [];
    const spent = R.pointsSpent(data);
    const available = R.pointsAvailable(data);
    const showMana = R.hasMagic(data);
    const usedCount = (data.usedSkillIds || []).length;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="row spread">
        <h3 style="margin:0;">${escapeHtml(data.name || "Unnamed")}</h3>
        <button class="small danger" data-action="delete" data-id="${id}">Remove</button>
      </div>

      <div class="gauge-label"><span>HP</span><span>${data.currentHP ?? 0} / ${maxHP}</span></div>
      <div class="gauge ${gaugeClass(data.currentHP, maxHP)}"><div class="fill" style="width:${hpPct}%"></div></div>
      ${vitalControlsHtml(id, "hp", [-5, -1, 1, 5])}

      ${showMana ? `
        <div class="gauge-label" style="margin-top:0.5rem;"><span>Mana</span><span>${data.currentMana ?? 0} / ${maxMana}</span></div>
        <div class="gauge ${gaugeClass(data.currentMana, maxMana)}"><div class="fill" style="width:${manaPct}%"></div></div>
        ${vitalControlsHtml(id, "mana", [-10, -1, 1, 10])}
      ` : ""}

      <p class="muted" style="margin-top:0.5rem;">
        Movement ${movement} m/s · Armor ${R.totalArmor(data)} · Evasion ${evasion} · Points ${spent}/${available}
      </p>

      ${inv.length ? `
        <p class="muted" style="margin-top:0.5rem;margin-bottom:0.25rem;">Inventory</p>
        <ul class="inventory-list">
          ${inv.map(item => inventoryLineHtml(item)).join("")}
        </ul>
      ` : `<p class="muted" style="margin-top:0.5rem;">Inventory empty.</p>`}

      <details style="margin-top:0.5rem;">
        <summary style="cursor:pointer;color:var(--ink-soft);">Full sheet</summary>
        <div class="readonly-block">${buildFullDetails(data)}</div>
      </details>

      <div class="row spread" style="margin-top:0.75rem;">
        <span class="muted">Used this session: ${usedCount}</span>
        <button class="small" data-action="reset-used" data-id="${id}" ${usedCount === 0 ? "disabled" : ""}>Reset used skills</button>
      </div>

      <p class="muted" style="margin-top:0.75rem;">Player link:</p>
      <div class="row">
        <span class="char-link" style="flex:1;">${shareUrl(id)}</span>
        <button class="small" data-action="copy" data-id="${id}">Copy</button>
      </div>
    `;
    charList.appendChild(card);
  });
}

function buildFullDetails(data) {
  const info = data.basicInfo || {};
  const infoRows = ["age", "race", "birthplace", "job", "height", "weight", "gender", "fightingStyle"]
    .filter(k => info[k])
    .map(k => `<tr><th>${k}</th><td>${escapeHtml(info[k])}</td></tr>`).join("");

  const basicSkillRows = (data.basicSkills || []).map(s => {
    const l = R.ladder(s.points);
    return `<tr><td>${escapeHtml(s.name)}</td><td>${s.points}</td><td>${l.hard}</td><td>${l.extreme}</td></tr>`;
  }).join("");

  const weaponBlocks = (data.categories || []).filter(c => c.type === "weapon").map(cat => categoryBlockHtml(cat)).join("");
  const magicBlocks = (data.categories || []).filter(c => c.type === "magic").map(cat => magicCategoryBlockHtml(cat)).join("");

  const langBonus = R.categoryBonus(data.languages);
  const langRows = (data.languages || []).map(s => {
    const eff = R.categorySkillEffective(s, langBonus);
    const l = R.ladder(eff);
    return `<tr><td>${escapeHtml(s.name)}</td><td>${eff}</td><td>${l.hard}</td><td>${l.extreme}</td></tr>`;
  }).join("");

  const traitRows = (data.traits || []).map(t =>
    `<tr><td>${escapeHtml(t.name)}</td><td>${t.type}</td><td>${t.tier} (${R.tierValue(t.tier)})</td><td>${escapeHtml(t.description || "")}</td></tr>`
  ).join("");

  return `
    ${infoRows ? `<table>${infoRows}</table>` : ""}
    ${basicSkillRows ? `<p class="muted" style="margin-bottom:0.15rem;"><strong>Basic Skills</strong></p>
      <table><thead><tr><th>Skill</th><th>Pts</th><th>Hard</th><th>Extreme</th></tr></thead><tbody>${basicSkillRows}</tbody></table>` : ""}
    ${weaponBlocks ? `<p class="muted" style="margin-bottom:0.15rem;"><strong>Weapons</strong></p>${weaponBlocks}` : ""}
    ${magicBlocks ? `<p class="muted" style="margin-bottom:0.15rem;"><strong>Magic</strong></p>${magicBlocks}` : ""}
    ${langRows ? `<p class="muted" style="margin-bottom:0.15rem;"><strong>Languages</strong> — bonus +${langBonus}</p>
      <table><thead><tr><th>Language</th><th>Eff.</th><th>Hard</th><th>Extreme</th></tr></thead><tbody>${langRows}</tbody></table>` : ""}
    ${traitRows ? `<p class="muted" style="margin-bottom:0.15rem;"><strong>Traits</strong></p>
      <table><thead><tr><th>Name</th><th>Type</th><th>Tier</th><th>Notes</th></tr></thead><tbody>${traitRows}</tbody></table>` : ""}
  `;
}

function categoryBlockHtml(cat) {
  const bonus = R.categoryBonus(cat.skills);
  const rows = (cat.skills || []).map(s => {
    const eff = R.categorySkillEffective(s, bonus);
    const l = R.ladder(eff);
    return `<tr><td>${escapeHtml(s.name)}</td><td>${eff}</td><td>${l.hard}</td><td>${l.extreme}</td></tr>`;
  }).join("");
  return `
    <p class="muted" style="margin-bottom:0.15rem;">${escapeHtml(cat.name)} — bonus +${bonus}</p>
    <table><thead><tr><th>Skill</th><th>Eff.</th><th>Hard</th><th>Extreme</th></tr></thead><tbody>${rows}</tbody></table>
  `;
}

function magicCategoryBlockHtml(cat) {
  const bonus = R.categoryBonus(cat.skills);
  const rows = (cat.skills || []).map(s => {
    const eff = R.categorySkillEffective(s, bonus);
    const l = R.ladder(eff);
    const magnitude = R.magnitudeOf(s);
    const name = `<span class="magnitude-tag" title="Magnitude ${magnitude}">${toRoman(magnitude)}</span>${escapeHtml(s.name)}`;
    return `<tr><td>${name}</td><td>${eff}</td><td>${l.hard}</td><td>${l.extreme}</td></tr>`;
  }).join("");
  return `
    <p class="muted" style="margin-bottom:0.15rem;">${escapeHtml(cat.name)} — bonus +${bonus}</p>
    <table><thead><tr><th>Spell</th><th>Eff.</th><th>Hard</th><th>Extreme</th></tr></thead><tbody>${rows}</tbody></table>
  `;
}

function inventoryLineHtml(item) {
  if (item.type === "armor") {
    return `<li><span class="item-name">${escapeHtml(item.name)}</span><span class="muted">Armor ${item.armorValue ?? 0}${item.worn ? " · Worn" : ""}</span></li>`;
  }
  if (item.type === "weapon") {
    return `<li><span class="item-name">${escapeHtml(item.name)}</span><span class="muted">${escapeHtml(item.woundDice || "")}</span></li>`;
  }
  return `<li><span class="item-name">${escapeHtml(item.name)}</span><span class="item-qty">×${item.qty}</span></li>`;
}

charList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "copy") {
    navigator.clipboard.writeText(shareUrl(id));
    flash("Link copied.");
    return;
  }

  if (action === "delete") {
    if (!confirm("Remove this character for good?")) return;
    try {
      await deleteDoc(doc(db, "campaigns", campaign, "characters", id));
      flash("Character removed.");
    } catch (err) {
      console.error(err);
      flash("Couldn't delete — check firestore.rules.");
    }
    return;
  }

  const data = charsById[id];
  if (!data) return;

  // Live HP/Mana adjustment — writes straight to Firestore, so it appears
  // on the player's sheet within a second or two via their own listener.
  if (action === "adjust") {
    const stat = btn.dataset.stat;
    const delta = parseInt(btn.dataset.delta, 10);
    const curField = stat === "hp" ? "currentHP" : "currentMana";
    const max = stat === "hp" ? R.hpFromPoints(data.hpPoints) : R.manaPoolFromPoints(data.manaPoints, data.categories);
    const newVal = Math.max(0, Math.min(max, (data[curField] ?? 0) + delta));
    await updateDoc(doc(db, "campaigns", campaign, "characters", id), { [curField]: newVal });
  }

  if (action === "reset-used") {
    try {
      await updateDoc(doc(db, "campaigns", campaign, "characters", id), { usedSkillIds: [] });
      flash("Used-skill markers reset.");
    } catch (err) {
      console.error(err);
      flash("Couldn't reset — check firestore.rules.");
    }
  }
});

document.getElementById("new-island-btn").addEventListener("click", async () => {
  const ids = Object.keys(charsById);
  if (ids.length === 0) { flash("No characters in this campaign yet."); return; }
  if (!confirm(`Start a new island? This fully restores HP and Mana, and clears used-skill markers, for all ${ids.length} character(s) in "${campaign}".`)) return;

  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      const data = charsById[id];
      const maxHP = R.hpFromPoints(data.hpPoints);
      const maxMana = R.manaPoolFromPoints(data.manaPoints, data.categories);
      batch.update(doc(db, "campaigns", campaign, "characters", id), {
        currentHP: maxHP,
        currentMana: maxMana,
        usedSkillIds: []
      });
    });
    await batch.commit();
    flash("New island — everyone fully restored.");
  } catch (err) {
    console.error(err);
    flash("Couldn't reach the database — check firestore.rules.");
  }
});

// Live sync — this onSnapshot listener is what makes the dashboard update
// automatically (players' edits, other GM actions) without ever reloading.
onSnapshot(collection(db, "campaigns", campaign, "characters"), (snap) => {
  const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
  charsById = {};
  docs.forEach(({ id, data }) => { charsById[id] = data; });
  renderCharacters(docs);
}, (err) => {
  console.error(err);
  flash("Connection error — check firebase-config.js and firestore.rules.");
});
