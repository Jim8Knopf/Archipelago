// ============================================================
// Short / Long Rest (Section 6.1 / 6.2) with a shared cooldown.
//
// Both the player's sheet and the GM dashboard call restCharacter(). The
// cooldown lives on the character document itself (`lastRestAt`, a server
// timestamp), and the check + heal happen inside one Firestore transaction.
// So if the player and the GM both press a rest button a few seconds apart,
// the second transaction sees the first one's `lastRestAt` and does nothing,
// and the character is healed only once. The cooldown covers both rest types:
// a Short Rest straight after a Long Rest is blocked too.
// ============================================================

import {
  doc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db } from "./firebase-init.js";
import * as R from "./rules-calc.js";

export const REST_COOLDOWN_MS = 60 * 1000;

// Milliseconds of cooldown left for a character document's data, 0 if none.
// `lastRestAt` is null for a moment right after a local write (the server
// hasn't stamped it yet). That still counts as "just rested".
export function restCooldownLeft(data) {
  if (!data || !("lastRestAt" in data)) return 0;
  const ts = data.lastRestAt;
  if (ts === null) return REST_COOLDOWN_MS;
  const at = typeof ts?.toMillis === "function" ? ts.toMillis() : Number(ts) || 0;
  return Math.max(0, at + REST_COOLDOWN_MS - Date.now());
}

// Runs a rest ("short" or "long") on one character.
// Resolves to { ok: true } or { ok: false, waitMs } when still on cooldown.
export async function restCharacter(campaign, charId, type) {
  const ref = doc(db, "campaigns", campaign, "characters", charId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Character not found");
    const d = snap.data();

    const waitMs = restCooldownLeft(d);
    if (waitMs > 0) return { ok: false, waitMs };

    const recover = type === "long" ? R.longRestRecover : R.shortRestRecover;
    const updates = {
      currentHP: recover(d.currentHP ?? 0, R.hpFromPoints(d.hpPoints)),
      lastRestAt: serverTimestamp(),
      lastRestType: type
    };
    if (R.hasMagic(d)) {
      const maxMana = Math.floor(R.manaPoolFromPoints(d.manaPoints, d.categories));
      updates.currentMana = recover(d.currentMana ?? 0, maxMana);
    }
    tx.update(ref, updates);
    return { ok: true };
  });
}

// Disables the given buttons and shows a countdown on them while the
// character is on cooldown. Call it after every render with the latest data.
// `original` keeps each button's own label so it can be put back.
export function applyRestCooldown(buttons, data) {
  const left = restCooldownLeft(data);
  buttons.forEach((btn) => {
    if (!btn) return;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    if (left > 0) {
      btn.disabled = true;
      btn.textContent = `${btn.dataset.label} (${Math.ceil(left / 1000)}s)`;
      btn.title = "Rested recently. Shared cooldown with the GM / player.";
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.label;
      btn.title = "";
    }
  });
  return left;
}

export function restMessage(result, type) {
  if (result.ok) return type === "long" ? "Long Rest taken." : "Short Rest taken.";
  return `Already rested. Wait ${Math.ceil(result.waitMs / 1000)}s.`;
}
