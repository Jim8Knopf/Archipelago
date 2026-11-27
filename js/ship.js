// ============================================================
// Ship writes, shared by the player sheet and the GM dashboard.
//
//   campaigns/{campaignId}/ships/{shipId}       one document per ship
//   campaigns/{campaignId}/settings/main        { activeShipId }
//
// Everybody at the table edits the same hold and chest at once, so every
// change to them runs as a Firestore transaction: it reads the latest
// document, changes that, and retries if someone else got in first. Plain
// "write the whole array from my local copy" would lose or duplicate items
// when two players act in the same second. Moving an item between a
// character and the ship changes both documents in one transaction, so an
// item is never in both places, or in neither.
//
// Transactions need the server: offline they fail (ShipError "offline")
// instead of being queued like ordinary writes.
// ============================================================

import {
  collection, doc, runTransaction, setDoc, updateDoc, deleteDoc, addDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { trackWrite } from "./sync-status.js";
import {
  normalizeShip, normalizeHoldItem, defaultShip, addStacked, takeFrom, toHoldItem,
  addToInventory, takeFromInventory, bottlesAfter
} from "./ship-calc.js";

export const shipsCol = (campaign) => collection(db, "campaigns", campaign, "ships");
export const shipRef = (campaign, shipId) => doc(db, "campaigns", campaign, "ships", shipId);
export const settingsRef = (campaign) => doc(db, "campaigns", campaign, "settings", "main");
const charRef = (campaign, charId) => doc(db, "campaigns", campaign, "characters", charId);

// An error with a message meant for the player.
export class ShipError extends Error {}

// Turns any failure into a message worth showing.
export function shipErrorMessage(err) {
  if (err instanceof ShipError) return err.message;
  if (err?.code === "unavailable" || err?.code === "failed-precondition" || !navigator.onLine) {
    return "The ship's hold needs a connection — try again once you're online.";
  }
  return "Couldn't save — check your connection.";
}

const rawInventory = (char) => (char.inventory || []).map(i => i.type ? i : { ...i, type: "item" });

async function readShip(tx, ref) {
  const snap = await tx.get(ref);
  if (!snap.exists()) throw new ShipError("That ship is gone.");
  return normalizeShip(snap.data());
}

// ---- Ships ----

export function addShip(campaign, name, typeKey) {
  return trackWrite(addDoc(shipsCol(campaign), defaultShip(name, typeKey)));
}

export function updateShip(campaign, shipId, fields) {
  return trackWrite(updateDoc(shipRef(campaign, shipId), fields));
}

export function deleteShip(campaign, shipId) {
  return trackWrite(deleteDoc(shipRef(campaign, shipId)));
}

export function setActiveShip(campaign, shipId) {
  return trackWrite(setDoc(settingsRef(campaign), { activeShipId: shipId || null }, { merge: true }));
}

// ---- Hold and chest ----

// Runs `change(hold, ship)` on the latest hold and saves what it returns.
export function updateHold(campaign, shipId, change) {
  const ref = shipRef(campaign, shipId);
  return trackWrite(runTransaction(db, async (tx) => {
    const ship = await readShip(tx, ref);
    const hold = change(ship.hold, ship);
    tx.update(ref, { hold: hold.map(normalizeHoldItem) });
  }));
}

// Adds (delta > 0) or takes (delta < 0) Doubloons. Resolves to the new amount.
export function changeChest(campaign, shipId, delta) {
  const ref = shipRef(campaign, shipId);
  return trackWrite(runTransaction(db, async (tx) => {
    const ship = await readShip(tx, ref);
    const next = ship.chest + Math.floor(delta);
    if (next < 0) throw new ShipError(`There are only ${ship.chest.toLocaleString()} Dbl. in the chest.`);
    tx.update(ref, { chest: next });
    return next;
  }));
}

// ---- Moving items ----

// From a character's inventory into the hold. Potions take their bottle
// along (Section 9.1). Resolves to how many were moved.
export function depositItem({ campaign, charId, shipId, itemId, qty, byName }) {
  const cRef = charRef(campaign, charId);
  const sRef = shipRef(campaign, shipId);
  return trackWrite(runTransaction(db, async (tx) => {
    const charSnap = await tx.get(cRef);
    const ship = await readShip(tx, sRef);
    if (!charSnap.exists()) throw new ShipError("Character not found.");
    const char = charSnap.data();

    const { list: inventory, taken, entry } = takeFromInventory(rawInventory(char), itemId, qty);
    if (!entry) throw new ShipError("That item isn't in your inventory any more.");

    const charUpdates = { inventory };
    if (entry.type === "potion") charUpdates.bottlesMax = bottlesAfter(char.bottlesMax, -taken);
    tx.update(cRef, charUpdates);
    tx.update(sRef, { hold: addStacked(ship.hold, toHoldItem(entry, byName), taken).map(normalizeHoldItem) });
    return taken;
  }));
}

// From the hold into a character's inventory. A potion brings its bottle.
export function takeItem({ campaign, charId, shipId, itemId, qty }) {
  const cRef = charRef(campaign, charId);
  const sRef = shipRef(campaign, shipId);
  return trackWrite(runTransaction(db, async (tx) => {
    const charSnap = await tx.get(cRef);
    const ship = await readShip(tx, sRef);
    if (!charSnap.exists()) throw new ShipError("Character not found.");
    const char = charSnap.data();

    const { list: hold, taken, entry } = takeFrom(ship.hold, itemId, qty);
    if (!entry) throw new ShipError("Someone already took that.");

    const charUpdates = { inventory: addToInventory(rawInventory(char), entry, taken) };
    if (entry.type === "potion") charUpdates.bottlesMax = bottlesAfter(char.bottlesMax, taken);
    tx.update(cRef, charUpdates);
    tx.update(sRef, { hold });
    return taken;
  }));
}

// From one ship's hold to another's (e.g. emptying a captured ship).
export function moveBetweenShips({ campaign, fromShipId, toShipId, itemId, qty }) {
  const fromRef = shipRef(campaign, fromShipId);
  const toRef = shipRef(campaign, toShipId);
  return trackWrite(runTransaction(db, async (tx) => {
    const from = await readShip(tx, fromRef);
    const to = await readShip(tx, toRef);
    const { list: hold, taken, entry } = takeFrom(from.hold, itemId, qty);
    if (!entry) throw new ShipError("That item isn't in the hold any more.");
    tx.update(fromRef, { hold });
    tx.update(toRef, { hold: addStacked(to.hold, entry, taken).map(normalizeHoldItem) });
    return taken;
  }));
}
