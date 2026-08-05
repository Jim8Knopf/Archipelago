import {
  collectionGroup, doc, deleteDoc, onSnapshot, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db } from "../js/firebase-init.js";
import * as R from "../js/rules-calc.js";

const content = document.getElementById("admin-content");
const statusEl = document.getElementById("admin-status");

function flash(msg) {
  statusEl.textContent = msg;
  setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ""; }, 2500);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function sheetUrl(campaignId, charId) {
  const url = new URL(window.location.origin + window.location.pathname.replace(/admin\/?$/, "sheet/"));
  url.searchParams.set("campaign", campaignId);
  url.searchParams.set("char", charId);
  return url.toString();
}

function gmUrl(campaignId) {
  const url = new URL(window.location.origin + window.location.pathname.replace(/admin\/?$/, "gm/"));
  url.searchParams.set("campaign", campaignId);
  return url.toString();
}

function render(byCampaign) {
  const campaignIds = Object.keys(byCampaign).sort();

  if (campaignIds.length === 0) {
    content.innerHTML = `<p class="empty-state">No campaigns found yet — create a character from the Character Sheet page to get started.</p>`;
    return;
  }

  content.innerHTML = campaignIds.map(campaignId => {
    const chars = byCampaign[campaignId];
    const rows = chars.map(({ id, data }) => {
      const maxHP = R.hpFromPoints(data.hpPoints);
      return `
        <div class="admin-char-row" data-campaign="${escapeHtml(campaignId)}" data-char="${id}">
          <span>${escapeHtml(data.name || "Unnamed")} <span class="muted">— HP ${data.currentHP ?? 0}/${maxHP}${R.hasMagic(data) ? `, Mana ${data.currentMana ?? 0}/${data.maxMana ?? 0}` : ""}</span></span>
          <span class="links">
            <a href="${sheetUrl(campaignId, id)}" target="_blank">Open sheet</a>
            <a href="#" data-action="delete-char">Delete</a>
          </span>
        </div>
      `;
    }).join("");

    return `
      <div class="campaign-block" data-campaign="${escapeHtml(campaignId)}">
        <div class="row spread">
          <h3>${escapeHtml(campaignId)} <span class="muted">(${chars.length} character${chars.length === 1 ? "" : "s"})</span></h3>
          <span class="row">
            <a href="${gmUrl(campaignId)}" target="_blank"><button class="small">GM Dashboard</button></a>
            <button class="small danger" data-action="delete-campaign" data-campaign="${escapeHtml(campaignId)}">Delete all in campaign</button>
          </span>
        </div>
        ${rows}
      </div>
    `;
  }).join("");
}

content.addEventListener("click", async (e) => {
  const deleteCharLink = e.target.closest("a[data-action='delete-char']");
  if (deleteCharLink) {
    e.preventDefault();
    const row = deleteCharLink.closest("[data-campaign][data-char]");
    const campaignId = row.dataset.campaign;
    const charId = row.dataset.char;
    if (!confirm("Delete this character for good?")) return;
    try {
      await deleteDoc(doc(db, "campaigns", campaignId, "characters", charId));
      flash("Character deleted.");
    } catch (err) {
      console.error(err);
      flash("Couldn't delete — check firestore.rules.");
    }
    return;
  }

  const deleteCampaignBtn = e.target.closest("button[data-action='delete-campaign']");
  if (deleteCampaignBtn) {
    const campaignId = deleteCampaignBtn.dataset.campaign;
    const rows = content.querySelectorAll(`.admin-char-row[data-campaign="${CSS.escape(campaignId)}"]`);
    const charIds = Array.from(rows).map(r => r.dataset.char);
    if (charIds.length === 0) return;
    if (!confirm(`Delete all ${charIds.length} character(s) in campaign "${campaignId}"? This can't be undone.`)) return;
    try {
      const batch = writeBatch(db);
      charIds.forEach(charId => batch.delete(doc(db, "campaigns", campaignId, "characters", charId)));
      await batch.commit();
      flash(`Deleted all characters in "${campaignId}".`);
    } catch (err) {
      console.error(err);
      flash("Couldn't delete — check firestore.rules.");
    }
  }
});

// collectionGroup finds every "characters" subcollection across every
// campaign in the project — this is what makes a true cross-campaign
// admin view possible without knowing campaign IDs in advance.
onSnapshot(collectionGroup(db, "characters"), (snap) => {
  const byCampaign = {};
  snap.docs.forEach(d => {
    const campaignId = d.ref.parent.parent.id;
    if (!byCampaign[campaignId]) byCampaign[campaignId] = [];
    byCampaign[campaignId].push({ id: d.id, data: d.data() });
  });
  render(byCampaign);
}, (err) => {
  console.error(err);
  flash("Connection error — check firebase-config.js and firestore.rules.");
  content.innerHTML = `<p class="empty-state">Couldn't load campaigns.</p>`;
});
