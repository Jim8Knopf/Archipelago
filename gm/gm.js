import {
  collection, addDoc, deleteDoc, doc, updateDoc, writeBatch, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db, getCampaignId } from "../js/firebase-init.js";
import { escapeHtml, flash as flashEl, toRoman, portraitUrl } from "../js/format.js";
import * as R from "../js/rules-calc.js";
import { restCharacter, restCooldownLeft, restedLocally } from "../js/rest.js";
import { trackWrite, watchConnection, mountSyncStatus } from "../js/sync-status.js";
import { confirmDialog } from "../js/confirm.js";
import { getDefaultCampaign, setDefaultCampaign } from "../js/defaults.js";
import { initShipPanel } from "./gm-ship.js";

// ============================================================
// GM dashboard.
//
// Rendering is keyed per character: every snapshot updates only the cards
// whose data actually changed, and HP/Mana changes are patched into the
// existing card instead of rebuilding it. So a player editing their sheet
// never collapses the foldouts you have open, never moves the page, and
// never swaps a ± button out from under your cursor.
// ============================================================

const campaignInput = document.getElementById("campaign-input");
const charList = document.getElementById("char-list");
const gmStatus = document.getElementById("gm-status");
const benchEl = document.getElementById("bench");
const partyHeading = document.getElementById("party-heading");
const checkInput = document.getElementById("check-input");
const checkSkills = document.getElementById("check-skills");
const checkResults = document.getElementById("check-results");
const spellbookEl = document.getElementById("spellbook");
const spellbookFilter = document.getElementById("spellbook-filter");
const playerLinksEl = document.getElementById("player-links");

// Save/offline marker in the sticky toolbar, between the skill check and
// the party actions, so it stays in view while scrolling the cards.
const partyActionsEl = document.querySelector(".gm-party-actions");
mountSyncStatus(partyActionsEl.parentElement, partyActionsEl);

let campaign = getCampaignId();
campaignInput.value = campaign;

// Star after the campaign name, next to the party heading: makes this the campaign a bare gm/ link
// (or the app's GM shortcut) opens on this device (js/defaults.js).
const defaultCampaignBtn = document.getElementById("default-campaign-btn");
document.getElementById("campaign-name").textContent = campaign;
function paintDefaultCampaign() {
  const on = getDefaultCampaign() === campaign;
  defaultCampaignBtn.textContent = on ? "★" : "☆";
  defaultCampaignBtn.title = on
    ? "Your default campaign: the GM Dashboard opens it on this device. Click to unset."
    : "Make this your default campaign: the GM Dashboard opens it on this device.";
  defaultCampaignBtn.setAttribute("aria-label", defaultCampaignBtn.title);
  defaultCampaignBtn.setAttribute("aria-pressed", String(on));
}
defaultCampaignBtn.addEventListener("click", () => {
  setDefaultCampaign(getDefaultCampaign() === campaign ? null : campaign);
  paintDefaultCampaign();
});
paintDefaultCampaign();

// Latest data per character, kept in sync on every snapshot so the buttons
// always have current values to compute from without an extra read.
let charsById = {};

// id -> { el, data, staticSig, vitalsSig } for each card on screen.
const cards = new Map();

// Which foldouts are open, as "charId:section". Survives card rebuilds.
const openSections = new Set();

function flash(msg) {
  flashEl(gmStatus, msg);
}

// The ship panel above the party (gm/gm-ship.js).
initShipPanel({ campaign, flash });

// ---- "Not playing today" — a per-browser GM view setting ----

const BENCH_KEY = `gm-benched:${campaign}`;

function loadBenched() {
  try {
    const raw = localStorage.getItem(BENCH_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

const benched = loadBenched();

function saveBenched() {
  try { localStorage.setItem(BENCH_KEY, JSON.stringify([...benched])); } catch { /* view-only setting */ }
}

const byText = (a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base" });

function sortedIds() {
  return Object.keys(charsById).sort((a, b) => byText(charsById[a].name, charsById[b].name) || byText(a, b));
}

function presentIds() {
  return sortedIds().filter(id => !benched.has(id));
}

function benchedIds() {
  return sortedIds().filter(id => benched.has(id));
}

function presentDocs() {
  return presentIds().map(id => ({ id, data: charsById[id] }));
}

// ---- Campaign + adding characters ----

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
    // sheet's derived formula stays consistent — the smallest investment
    // that yields at least the requested max. Mana is set up on the sheet.
    let hpPoints = 0;
    while (R.hpFromPoints(hpPoints) < maxHP) hpPoints++;
    await trackWrite(addDoc(collection(db, "campaigns", campaign, "characters"), {
      ...base, hpPoints, currentHP: R.hpFromPoints(hpPoints)
    }));
    document.getElementById("new-char-name").value = "";
    flash(`Created "${name}" — their player link is under Player links.`);
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

// ---- Derived data ----

function maxHPOf(d) { return R.hpFromPoints(d.hpPoints); }
function maxManaOf(d) { return R.manaPoolFromPoints(d.manaPoints, d.categories); }

function gaugeClass(current, max) {
  if (max <= 0) return "";
  const pct = (current / max) * 100;
  if (pct <= 25) return "low";
  if (pct <= 60) return "mid";
  return "";
}

// Every rollable thing a character has — skill groups, weapons, magic and
// languages — flattened, with its effective value and ladder.
function skillEntries(data) {
  const cats = R.ensureSkillGroups(R.migrateBasicSkills(data.basicSkills, data.categories));
  const out = [];
  ["skill", "weapon", "magic"].forEach(type => {
    R.categoriesOfType(cats, type).forEach(cat => {
      const bonus = R.groupBonus(cat); // 0 for Basic Skills in "No group"
      (cat.skills || []).forEach(s => {
        const eff = R.categorySkillEffective(s, bonus);
        out.push({ id: s.id, name: s.name || "", group: cat.name || "", type, bonus, eff, ladder: R.ladder(eff), skill: s });
      });
    });
  });
  const langBonus = R.categoryBonus(data.languages);
  (data.languages || []).forEach(s => {
    const eff = R.categorySkillEffective(s, langBonus);
    out.push({ id: s.id, name: s.name || "", group: "Languages", type: "language", bonus: langBonus, eff, ladder: R.ladder(eff), skill: s });
  });
  return out;
}

// The parts of a character that only change the HP/Mana gauges. Changes to
// these are patched into the existing card; anything else rebuilds it.
const VITAL_FIELDS = ["currentHP", "currentMana", "lastRestAt", "lastRestType"];

function staticSig(data) {
  const rest = { ...data };
  VITAL_FIELDS.forEach(f => delete rest[f]);
  return JSON.stringify(rest);
}

function vitalsSig(data) {
  return `${data.currentHP ?? 0}|${data.currentMana ?? 0}`;
}

// ---- Card HTML ----

function portraitHtml(imageUrl) {
  const src = portraitUrl(imageUrl);
  return `
    <span class="gm-portrait">
      ${src ? `<img src="${escapeHtml(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
      <span class="gm-portrait-placeholder"${src ? ' style="display:none;"' : ""}>⚓</span>
    </span>
  `;
}

function vitalHtml(id, stat, label, deltas) {
  return `
    <div class="gm-vital" data-vital="${stat}">
      <div class="gauge-label"><span>${label}</span><span data-vital-text></span></div>
      <div class="gauge"><div class="fill"></div></div>
      <div class="gm-vital-controls">
        ${deltas.map(d => `<button class="small" data-action="adjust" data-id="${id}" data-stat="${stat}" data-delta="${d}">${d > 0 ? "+" : "−"}${Math.abs(d)}</button>`).join("")}
      </div>
    </div>
  `;
}

// A foldout inside a card. Open state is remembered per character+section.
function subFold(id, section, summary, body) {
  const open = openSections.has(`${id}:${section}`) ? " open" : "";
  return `
    <details class="gm-sub" data-section="${section}"${open}>
      <summary>${summary}</summary>
      <div class="gm-sub-body">${body}</div>
    </details>
  `;
}

function cardHtml(id, data) {
  const movement = R.movementFromPoints(data.movementPoints);
  const evasion = R.evasionTotal(data.evasionPoints, movement);
  const resilienceMod = R.resilienceModifier(data.resiliencePoints);
  const showMana = R.hasMagic(data);
  const used = new Set(data.usedSkillIds || []);
  const entries = skillEntries(data);
  const nonMagic = entries.filter(e => e.type !== "magic");
  const spells = entries.filter(e => e.type === "magic");
  const inv = data.inventory || [];
  const usedCount = used.size;
  const menuOpen = openSections.has(`${id}:menu`) ? " open" : "";

  const skillsSummary = `Skills <span class="gm-count">${nonMagic.length}</span>${usedCount ? ` <span class="gm-used-badge" title="Marked used this session">${usedCount} used</span>` : ""}`;
  const invSummary = `Inventory <span class="gm-count">${inv.length}</span>`;

  return `
    <div class="gm-card-head">
      ${portraitHtml(data.imageUrl)}
      <div class="gm-card-title">
        <h3>${escapeHtml(data.name || "Unnamed")}</h3>
        <span class="gm-stats">
          <span title="Movement">Mov <b>${movement}</b></span>
          <span title="Armor">Arm <b>${R.totalArmor(data)}</b></span>
          <span title="Evasion">Eva <b>${evasion}</b></span>
          <span title="Resilience">Res <b>−${resilienceMod}</b></span>
        </span>
      </div>
      <details class="gm-menu" data-section="menu"${menuOpen}>
        <summary aria-label="More actions for ${escapeHtml(data.name || "this character")}">⋯</summary>
        <div class="gm-menu-panel">
          <button class="small brass" data-action="rest" data-rest="short" data-id="${id}">Short Rest</button>
          <button class="small brass" data-action="rest" data-rest="long" data-id="${id}">Long Rest</button>
          <button class="small" data-action="reset-used" data-id="${id}" ${usedCount === 0 ? "disabled" : ""}>Reset used skills${usedCount ? ` (${usedCount})` : ""}</button>
          <button class="small" data-action="bench" data-id="${id}">Not playing today</button>
          <button class="small" data-action="copy" data-id="${id}">Copy player link</button>
          <button class="small danger" data-action="delete" data-id="${id}">Remove character</button>
        </div>
      </details>
    </div>

    ${vitalHtml(id, "hp", "HP", [-5, -1, 1, 5])}
    ${showMana ? vitalHtml(id, "mana", "Mana", [-10, -1, 1, 10]) : ""}

    ${subFold(id, "skills", skillsSummary, skillsBodyHtml(nonMagic, used))}
    ${spells.length ? subFold(id, "spells", `Spells <span class="gm-count">${spells.length}</span>`, spellsBodyHtml(spells, used)) : ""}
    ${subFold(id, "inventory", invSummary, inventoryBodyHtml(data))}
    ${subFold(id, "details", "Details & traits", detailsBodyHtml(data))}
  `;
}

const TYPE_LABEL = { skill: "", weapon: "Weapon", language: "", magic: "Magic" };

function groupBy(entries) {
  const groups = [];
  entries.forEach(e => {
    const key = `${e.type}:${e.group}`;
    let g = groups.find(x => x.key === key);
    if (!g) { g = { key, type: e.type, group: e.group, bonus: e.bonus, items: [] }; groups.push(g); }
    g.items.push(e);
  });
  return groups;
}

function ladderTable(groups, nameCell) {
  return `
    <table class="gm-mini-table">
      <thead><tr><th>Skill</th><th class="num">Eff.</th><th class="num">Hard</th><th class="num">Extr.</th></tr></thead>
      ${groups.map(g => `
        <tbody>
          <tr class="gm-group-row"><th colspan="4">${escapeHtml(g.group)}${TYPE_LABEL[g.type] ? ` <span class="muted">· ${TYPE_LABEL[g.type]}</span>` : ""} <span class="muted">+${g.bonus}</span></th></tr>
          ${g.items.map(e => `
            <tr>
              <td>${nameCell(e)}</td>
              <td class="num"><b>${e.eff}</b></td>
              <td class="num">${e.ladder.hard}</td>
              <td class="num">${e.ladder.extreme}</td>
            </tr>`).join("")}
        </tbody>`).join("")}
    </table>
  `;
}

function skillsBodyHtml(entries, used) {
  if (!entries.length) return `<p class="muted">No skills yet.</p>`;
  return ladderTable(groupBy(entries), e =>
    `<span class="${used.has(e.id) ? "used-skill" : ""}">${escapeHtml(e.name)}</span>`
  );
}

function spellsBodyHtml(entries, used) {
  return ladderTable(groupBy(entries), e => {
    const magnitude = R.magnitudeOf(e.skill);
    const cost = R.castingCost(magnitude);
    return `<span class="magnitude-tag" title="Magnitude ${magnitude}">${toRoman(magnitude)}</span><span class="${used.has(e.id) ? "used-skill" : ""}">${escapeHtml(e.name)}</span>
      <span class="muted gm-cost" title="Mana cost: normal / hard / extreme">${cost.normal}/${cost.hard}/${cost.extreme} MP</span>${spellNoteHtml(e.skill)}`;
  });
}

function spellNoteHtml(spell) {
  const note = (spell.note || "").trim();
  return note ? `<div class="spell-note">${escapeHtml(note)}</div>` : "";
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

// Inventory, then potions and bottle counts (Section 9.1) for characters who
// carry bottles or potions at all. Potions are inventory items of type
// "potion"; they're listed on their own, under the bottle counts.
function inventoryBodyHtml(data) {
  const inv = (data.inventory || []).filter(i => i.type !== "potion");
  const potions = R.potionsOf(data);
  const b = R.bottleCounts(data);
  const hasPotions = b.max > 0 || potions.length > 0;
  const invHtml = inv.length
    ? `<ul class="inventory-list">${inv.map(inventoryLineHtml).join("")}</ul>`
    : hasPotions ? "" : `<p class="muted">Inventory empty.</p>`;
  if (!hasPotions) return invHtml;
  return `
    ${invHtml}
    <p class="muted gm-sub-label">Potions — bottles: ${b.full} full · ${b.empty} empty · ${b.broken} broken (of ${b.max})</p>
    ${potions.length ? `<ul class="inventory-list">${potions.map(p => {
      const magnitude = R.magnitudeOf(p);
      return `
      <li><span class="magnitude-tag" title="Magnitude ${magnitude}">${toRoman(magnitude)}</span><span class="item-name">${escapeHtml(p.name)}</span> <span class="item-qty">×${p.qty}</span></li>`;
    }).join("")}
    </ul>` : ""}
  `;
}

function detailsBodyHtml(data) {
  const info = data.basicInfo || {};
  const infoRows = ["age", "race", "birthplace", "job", "height", "weight", "gender", "fightingStyle"]
    .filter(k => info[k])
    .map(k => `<tr><th>${k}</th><td>${escapeHtml(info[k])}</td></tr>`).join("");
  const traitRows = (data.traits || []).map(t =>
    `<tr><td>${escapeHtml(t.name)}</td><td>${t.type}</td><td>${t.tier} (${R.tierValue(t.tier)})</td><td>${escapeHtml(t.description || "")}</td></tr>`
  ).join("");
  return `
    <p class="muted">Points ${R.pointsSpent(data)} / ${R.pointsAvailable(data)}</p>
    ${infoRows ? `<table class="gm-mini-table gm-info-table">${infoRows}</table>` : ""}
    ${traitRows ? `<p class="muted gm-sub-label"><strong>Traits</strong></p>
      <div class="table-scroll"><table class="gm-mini-table"><thead><tr><th>Name</th><th>Type</th><th>Tier</th><th>Notes</th></tr></thead><tbody>${traitRows}</tbody></table></div>` : ""}
    ${!infoRows && !traitRows ? `<p class="muted">No basic info or traits filled in.</p>` : ""}
  `;
}

// Writes current HP/Mana into an existing card's gauges, in place.
function patchVitals(el, data) {
  [["hp", data.currentHP ?? 0, maxHPOf(data)], ["mana", data.currentMana ?? 0, maxManaOf(data)]].forEach(([stat, cur, max]) => {
    const v = el.querySelector(`[data-vital="${stat}"]`);
    if (!v) return;
    v.querySelector("[data-vital-text]").textContent = `${cur} / ${max}`;
    const gauge = v.querySelector(".gauge");
    gauge.className = `gauge ${gaugeClass(cur, max)}`;
    gauge.querySelector(".fill").style.width = `${max > 0 ? Math.min(100, (cur / max) * 100) : 0}%`;
  });
}

// Briefly marks a gauge that changed, so you notice "Mira just lost 4 HP"
// without scanning every card.
function pulseChanged(el, prev, data) {
  [["hp", "currentHP"], ["mana", "currentMana"]].forEach(([stat, field]) => {
    const before = prev[field] ?? 0;
    const after = data[field] ?? 0;
    if (before === after) return;
    const v = el.querySelector(`[data-vital="${stat}"]`);
    if (!v) return;
    v.classList.remove("pulse-down", "pulse-up");
    void v.offsetWidth; // restart the animation
    v.classList.add(after < before ? "pulse-down" : "pulse-up");
  });
}

// ---- Rendering ----

function renderParty() {
  const ids = presentIds();
  const keep = new Set(ids);

  for (const [id, entry] of cards) {
    if (!keep.has(id)) { entry.el.remove(); cards.delete(id); }
  }

  const empty = charList.querySelector(".empty-state");
  if (empty) empty.remove();

  ids.forEach((id, index) => {
    const data = charsById[id];
    const sSig = staticSig(data);
    const vSig = vitalsSig(data);
    let entry = cards.get(id);

    if (!entry) {
      const el = document.createElement("div");
      el.className = "card gm-card";
      el.dataset.id = id;
      el.innerHTML = cardHtml(id, data);
      patchVitals(el, data);
      entry = { el, data, staticSig: sSig, vitalsSig: vSig };
      cards.set(id, entry);
    } else {
      const prev = entry.data;
      if (entry.staticSig !== sSig) {
        entry.el.innerHTML = cardHtml(id, data);
        patchVitals(entry.el, data);
      } else if (entry.vitalsSig !== vSig) {
        patchVitals(entry.el, data);
      }
      pulseChanged(entry.el, prev, data);
      Object.assign(entry, { data, staticSig: sSig, vitalsSig: vSig });
    }

    // Only move a card when it is out of place, so untouched cards stay put.
    if (charList.children[index] !== entry.el) {
      charList.insertBefore(entry.el, charList.children[index] || null);
    }
  });

  if (ids.length === 0) {
    const msg = Object.keys(charsById).length === 0
      ? "No characters in this campaign yet — add one under Manage campaign."
      : "Nobody is at the table — bring someone back from “Not playing today” above.";
    charList.insertAdjacentHTML("beforeend", `<div class="card empty-state">${msg}</div>`);
  }

  partyHeading.textContent = `At the table (${ids.length})`;
}

function renderBench() {
  const ids = benchedIds();
  benchEl.innerHTML = ids.length ? `
    <span class="muted">Not playing today:</span>
    ${ids.map(id => `<button class="small gm-bench-chip" data-action="unbench" data-id="${id}" title="Bring back to the table">${escapeHtml(charsById[id].name || "Unnamed")} ↩</button>`).join("")}
  ` : "";
}

let playerLinksSig = "";
function renderPlayerLinks() {
  const ids = sortedIds();
  const sig = ids.map(id => `${id}:${charsById[id].name}`).join("|");
  if (sig === playerLinksSig) return;
  playerLinksSig = sig;
  playerLinksEl.innerHTML = ids.length ? `<ul class="inventory-list gm-links">${ids.map(id => `
    <li>
      <span class="item-name">${escapeHtml(charsById[id].name || "Unnamed")}</span>
      <span class="char-link">${escapeHtml(shareUrl(id))}</span>
      <button class="small" data-action="copy" data-id="${id}">Copy</button>
    </li>`).join("")}</ul>` : `<p class="muted">No characters yet.</p>`;
}

// ---- Skill check lookup ----
//
// Type a skill name in the toolbar and every character at the table is
// listed with their Normal / Hard / Extreme values for it, best first.
// Characters without it are listed as untrained (only a 00 succeeds).

function renderCheckOptions() {
  const names = new Set();
  presentIds().forEach(id => skillEntries(charsById[id]).forEach(e => e.name && names.add(e.name)));
  const html = [...names].sort(byText).map(n => `<option value="${escapeHtml(n)}"></option>`).join("");
  if (checkSkills.innerHTML !== html) checkSkills.innerHTML = html;
}

function renderCheck() {
  const q = checkInput.value.trim().toLowerCase();
  if (!q) { checkResults.hidden = true; checkResults.innerHTML = ""; return; }

  const trained = [];
  const untrained = [];
  presentIds().forEach(id => {
    const data = charsById[id];
    const all = skillEntries(data);
    const exact = all.filter(e => e.name.toLowerCase() === q);
    const hits = exact.length ? exact : all.filter(e => e.name.toLowerCase().includes(q));
    if (hits.length) {
      hits.sort((a, b) => b.eff - a.eff);
      trained.push({ data, hits });
    } else {
      untrained.push(data);
    }
  });
  trained.sort((a, b) => b.hits[0].eff - a.hits[0].eff);

  const used = (data, e) => (data.usedSkillIds || []).includes(e.id);
  checkResults.hidden = false;
  checkResults.innerHTML = `
    <div class="gm-check-head">
      <span>Check: <b>${escapeHtml(checkInput.value.trim())}</b></span>
      <button class="small" data-action="clear-check" aria-label="Close skill check">✕</button>
    </div>
    <table class="gm-mini-table gm-check-table">
      <thead><tr><th>Character</th><th>Skill</th><th class="num">Eff.</th><th class="num">Hard</th><th class="num">Extr.</th></tr></thead>
      <tbody>
        ${trained.map(({ data, hits }) => hits.map((e, i) => `
          <tr${i === 0 ? ' class="gm-check-first"' : ""}>
            <td>${i === 0 ? escapeHtml(data.name || "Unnamed") : ""}</td>
            <td><span class="${used(data, e) ? "used-skill" : ""}">${escapeHtml(e.name)}</span> <span class="muted gm-check-group">${escapeHtml(e.group)}</span></td>
            <td class="num"><b>${e.eff}</b></td>
            <td class="num">${e.ladder.hard}</td>
            <td class="num">${e.ladder.extreme}</td>
          </tr>`).join("")).join("")}
        ${untrained.map(data => `
          <tr class="gm-check-first gm-untrained">
            <td>${escapeHtml(data.name || "Unnamed")}</td>
            <td colspan="4" class="muted">untrained — only a 00 succeeds</td>
          </tr>`).join("")}
      </tbody>
    </table>
  `;
}

checkInput.addEventListener("input", renderCheck);
checkInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { checkInput.value = ""; renderCheck(); }
});
checkResults.addEventListener("click", (e) => {
  if (e.target.closest('[data-action="clear-check"]')) {
    checkInput.value = "";
    renderCheck();
    checkInput.focus();
  }
});

// ---- Spellbook: every spell of everyone at the table in one table ----

function collectSpells(docs) {
  const rows = [];
  docs.forEach(({ data }) => {
    skillEntries(data).filter(e => e.type === "magic").forEach(e => {
      const magnitude = R.magnitudeOf(e.skill);
      rows.push({
        character: data.name || "Unnamed",
        category: e.group,
        spell: e.skill,
        magnitude,
        eff: e.eff,
        ladder: e.ladder,
        cost: R.castingCost(magnitude)
      });
    });
  });
  return rows.sort((a, b) =>
    byText(a.character, b.character) || byText(a.category, b.category) || byText(a.spell.name, b.spell.name)
  );
}

let spellbookSig = "";
function renderSpellbook() {
  const all = collectSpells(presentDocs());
  const q = spellbookFilter.value.trim().toLowerCase();
  const sig = JSON.stringify([q, all]);
  if (sig === spellbookSig) return;
  spellbookSig = sig;

  if (all.length === 0) {
    spellbookEl.innerHTML = `<p class="empty-state">Nobody at the table knows any spells yet.</p>`;
    return;
  }
  const rows = q
    ? all.filter(r => [r.character, r.category, r.spell.name, r.spell.note].some(t => (t || "").toLowerCase().includes(q)))
    : all;
  if (rows.length === 0) {
    spellbookEl.innerHTML = `<p class="empty-state">No spells match “${escapeHtml(q)}”.</p>`;
    return;
  }
  spellbookEl.innerHTML = `
    <div class="table-scroll">
      <table class="spellbook-table">
        <thead><tr><th>Character</th><th>Spell</th><th>Category</th><th class="num">Eff.</th><th class="num">Hard</th><th class="num">Extreme</th><th class="num" title="Mana cost: normal / hard / extreme">Mana</th></tr></thead>
        <tbody>${rows.map(r => `
          <tr>
            <td>${escapeHtml(r.character)}</td>
            <td><span class="magnitude-tag" title="Magnitude ${r.magnitude}">${toRoman(r.magnitude)}</span>${escapeHtml(r.spell.name || "")}${spellNoteHtml(r.spell)}</td>
            <td>${escapeHtml(r.category)}</td>
            <td class="num">${r.eff}</td>
            <td class="num">${r.ladder.hard}</td>
            <td class="num">${r.ladder.extreme}</td>
            <td class="num">${r.cost.normal} / ${r.cost.hard} / ${r.cost.extreme}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <p class="muted" style="margin-top:.4rem;">${rows.length} of ${all.length} spell${all.length === 1 ? "" : "s"}</p>
  `;
}

spellbookFilter.addEventListener("input", renderSpellbook);

function renderAll() {
  renderParty();
  renderBench();
  renderPlayerLinks();
  renderCheckOptions();
  renderCheck();
  renderSpellbook();
}

// ---- Interaction ----

// Remember which foldouts are open. "toggle" doesn't bubble, but it does
// pass through ancestors in the capture phase.
charList.addEventListener("toggle", (e) => {
  const det = e.target;
  if (!(det instanceof HTMLDetailsElement) || !det.dataset.section) return;
  const card = det.closest(".gm-card");
  if (!card) return;
  const key = `${card.dataset.id}:${det.dataset.section}`;
  if (det.open) openSections.add(key); else openSections.delete(key);
}, true);

function closeMenus(except) {
  charList.querySelectorAll("details.gm-menu[open]").forEach(m => { if (m !== except) m.open = false; });
}

// Clicking anywhere outside an open ⋯ menu closes it.
document.addEventListener("click", (e) => {
  closeMenus(e.target.closest("details.gm-menu"));
});

// Broken portrait URLs fall back to the anchor placeholder.
charList.addEventListener("error", (e) => {
  if (e.target.tagName !== "IMG") return;
  e.target.style.display = "none";
  const ph = e.target.nextElementSibling;
  if (ph) ph.style.display = "";
}, true);

async function handleAction(btn) {
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (btn.closest("details.gm-menu")) closeMenus();

  if (action === "copy") {
    navigator.clipboard.writeText(shareUrl(id));
    flash("Link copied.");
    return;
  }

  if (action === "bench" || action === "unbench") {
    if (action === "bench") benched.add(id); else benched.delete(id);
    saveBenched();
    renderAll();
    const name = charsById[id]?.name || "Unnamed";
    flash(action === "bench" ? `${name} isn't playing today.` : `${name} is back at the table.`);
    return;
  }

  if (action === "delete") {
    if (!await confirmDialog({
      message: `Remove ${charsById[id]?.name || "this character"} for good?`,
      confirmLabel: "Remove",
      danger: true
    })) return;
    try {
      await trackWrite(deleteDoc(doc(db, "campaigns", campaign, "characters", id)));
      benched.delete(id);
      saveBenched();
      flash("Character removed.");
    } catch (err) {
      console.error(err);
      flash("Couldn't delete — check firestore.rules.");
    }
    return;
  }

  const data = charsById[id];
  if (!data) return;

  // Live HP/Mana adjustment — writes straight to Firestore, so it appears on
  // the player's sheet within a second or two via their own listener.
  if (action === "adjust") {
    const stat = btn.dataset.stat;
    const delta = parseInt(btn.dataset.delta, 10);
    const curField = stat === "hp" ? "currentHP" : "currentMana";
    const max = stat === "hp" ? maxHPOf(data) : maxManaOf(data);
    const newVal = Math.max(0, Math.min(max, (data[curField] ?? 0) + delta));
    if (newVal === (data[curField] ?? 0)) return;
    try {
      await trackWrite(updateDoc(doc(db, "campaigns", campaign, "characters", id), { [curField]: newVal }));
    } catch (err) {
      console.error(err);
      flash("Couldn't save — check firestore.rules.");
    }
    return;
  }

  if (action === "rest") {
    restCharacters([id], btn.dataset.rest);
    return;
  }

  if (action === "reset-used") {
    try {
      await trackWrite(updateDoc(doc(db, "campaigns", campaign, "characters", id), { usedSkillIds: [] }));
      flash("Used-skill markers reset.");
    } catch (err) {
      console.error(err);
      flash("Couldn't reset — check firestore.rules.");
    }
  }
}

[charList, benchEl, playerLinksEl].forEach(el => el.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (btn) handleAction(btn);
}));

// New Island resets everyone in the campaign, including characters who
// aren't playing today.
document.getElementById("new-island-btn").addEventListener("click", async () => {
  const ids = Object.keys(charsById);
  if (ids.length === 0) { flash("No characters in this campaign yet."); return; }
  if (!await confirmDialog({
    message: `Start a new island? This fully restores HP and Mana, repairs broken potion bottles, and clears used-skill markers, for all ${ids.length} character(s) in "${campaign}" — including anyone not playing today.`,
    confirmLabel: "Start new island",
    danger: true
  })) return;

  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      const data = charsById[id];
      batch.update(doc(db, "campaigns", campaign, "characters", id), {
        currentHP: maxHPOf(data),
        currentMana: maxManaOf(data),
        bottlesBroken: 0,
        usedSkillIds: []
      });
    });
    await trackWrite(batch.commit());
    flash("New island — everyone fully restored.");
  } catch (err) {
    console.error(err);
    flash("Couldn't reach the database — check firestore.rules.");
  }
});

// Rests one or more characters. Same transaction + cooldown as the player's
// sheet (js/rest.js), so a rest pressed here and on the sheet a few seconds
// apart heals only once. The heal is drawn immediately from the local copy;
// the cooldown is a silent background guard, never shown on screen.
async function restCharacters(ids, type) {
  const label = type === "long" ? "Long Rest" : "Short Rest";
  const fresh = ids.filter(id => charsById[id] && restCooldownLeft(charsById[id]) === 0);
  const skippedLocally = ids.length - fresh.length;

  fresh.forEach(id => { charsById[id] = restedLocally(charsById[id], type); });
  if (fresh.length) renderAll();

  const results = await Promise.allSettled(fresh.map(id => trackWrite(restCharacter(campaign, id, type))));
  const failed = results.filter(r => r.status === "rejected");
  failed.forEach(r => console.error(r.reason));
  const skipped = skippedLocally + results.filter(r => r.status === "fulfilled" && r.value === false).length;

  const name = ids.length === 1 ? `${charsById[ids[0]]?.name || "Unnamed"}: ` : "";
  if (failed.length) flash(`${name}${label} failed for ${failed.length} — check firestore.rules.`);
  else if (ids.length === 1) flash(`${name}${skipped ? "already rested just now." : label + " taken."}`);
  else flash(`${label}: ${ids.length - skipped} rested${skipped ? `, ${skipped} already rested just now` : ""}.`);
}

// Party rests only cover the characters at the table today.
document.querySelectorAll("button[data-party-rest]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const ids = presentIds();
    if (ids.length === 0) { flash("Nobody is at the table."); return; }
    restCharacters(ids, btn.dataset.partyRest);
  });
});

// Connection marker: watches the same query for metadata changes only.
watchConnection(collection(db, "campaigns", campaign, "characters"));

// Live sync — updates the dashboard whenever anyone changes a character.
onSnapshot(collection(db, "campaigns", campaign, "characters"), (snap) => {
  charsById = {};
  snap.docs.forEach(d => {
    const data = d.data();
    // Older documents may hold a fractional currentMana (Max Mana wasn't rounded down).
    if (data.currentMana != null) data.currentMana = Math.floor(data.currentMana);
    charsById[d.id] = data;
  });
  renderAll();
}, (err) => {
  console.error(err);
  flash("Connection error — check firebase-config.js and firestore.rules.");
});
