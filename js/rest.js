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
//
// The cooldown is purely a background guard — nothing on screen shows it.
// Callers apply restUpdates() to their local copy right away so the heal
// shows instantly; the transaction then confirms (or the next snapshot
// quietly puts the real values back if it was blocked).
// ============================================================

import {
  doc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db } from "./firebase-init.js";
import * as R from "./rules-calc.js";

export const REST_COOLDOWN_MS = 60 * 1000;

// Milliseconds of cooldown left for a character document's data, 0 if none.
// `lastRestAt` is a Firestore Timestamp, a plain millis number (local
// optimistic copy), or null for a moment right after a local write — null
// still counts as "just rested".
export function restCooldownLeft(data) {
  if (!data || !("lastRestAt" in data)) return 0;
  const ts = data.lastRestAt;
  if (ts === null) return REST_COOLDOWN_MS;
  const at = typeof ts?.toMillis === "function" ? ts.toMillis() : Number(ts) || 0;
  return Math.max(0, at + REST_COOLDOWN_MS - Date.now());
}

// The HP/Mana a rest ("short" or "long") gives this character. Pure, so the
// same numbers are used for the instant local update and the real write.
export function restUpdates(d, type) {
  const recover = type === "long" ? R.longRestRecover : R.shortRestRecover;
  const updates = { currentHP: recover(d.currentHP ?? 0, R.hpFromPoints(d.hpPoints)) };
  if (R.hasMagic(d)) {
    const maxMana = Math.floor(R.manaPoolFromPoints(d.manaPoints, d.categories));
    updates.currentMana = recover(d.currentMana ?? 0, maxMana);
  }
  return updates;
}

// Local copy of a character after resting, for showing the heal immediately.
export function restedLocally(d, type) {
  return { ...d, ...restUpdates(d, type), lastRestAt: Date.now(), lastRestType: type };
}

// Runs a rest on one character. Resolves to true if it healed, false if the
// character was still on cooldown (someone else rested them just before).
export async function restCharacter(campaign, charId, type) {
  const ref = doc(db, "campaigns", campaign, "characters", charId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Character not found");
    const d = snap.data();
    if (restCooldownLeft(d) > 0) return false;
    tx.update(ref, { ...restUpdates(d, type), lastRestAt: serverTimestamp(), lastRestType: type });
    return true;
  });
}
