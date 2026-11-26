// ============================================================
// Sync status marker: "Saving…", "Saved", "Couldn't save", "Offline".
//
// Every Firestore write on the sheet and the GM dashboard goes through
// trackWrite(). It counts writes still waiting for the server, so when
// saves overlap, "Saved" only shows once the last one is through.
//
// Firestore's write promises resolve only when the server acknowledges the
// write. Offline they just stay pending (the SDK queues the write and sends
// it on reconnect), so pending writes alone would leave "Saving…" stuck.
// "Offline" therefore wins over "Saving…" and comes from two sources:
// - navigator.onLine plus the online/offline events (the device has no
//   network at all), and
// - snapshot metadata from watchConnection(): `fromCache` turns true when
//   the SDK loses its connection to Firestore even though the device still
//   has a network (dead Wi-Fi, server unreachable).
// When the connection comes back, the queued writes are acknowledged, the
// counter drains and the marker moves on to "Saved".
// ============================================================

import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const LABELS = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save",
  offline: "Offline"
};

// A write that is acknowledged faster than this never shows "Saving…",
// so quick saves go straight to "Saved" instead of flickering.
const SAVING_DELAY_MS = 300;
// How long "Saved" / "Couldn't save" stay before fading back to idle.
const SAVED_MS = 2000;
const ERROR_MS = 4000;

let el = null;
let pending = 0;
let burstFailed = false;   // did any write since the counter last hit 0 fail?
let settled = null;        // "saved" | "error" while that message is showing
let showSaving = false;    // pending long enough to show "Saving…"
let serverReachable = true;
let savingTimer = null;
let settledTimer = null;

function currentState() {
  if (!navigator.onLine || !serverReachable) return "offline";
  if (pending > 0) return showSaving ? "saving" : (settled || "idle");
  return settled || "idle";
}

function render() {
  if (!el) return;
  const state = currentState();
  if (el.dataset.state === state) return;
  el.dataset.state = state;
  // Idle keeps the last text so it can fade out; it's hidden from screen
  // readers by visibility, and nothing new is announced.
  if (state !== "idle") el.textContent = LABELS[state];
  el.title = state === "offline" && pending > 0
    ? "Offline — your changes will be saved when the connection is back."
    : "";
}

function settle(result) {
  settled = result;
  clearTimeout(settledTimer);
  settledTimer = setTimeout(() => {
    settled = null;
    render();
  }, result === "error" ? ERROR_MS : SAVED_MS);
}

// Wraps a Firestore write promise (updateDoc, setDoc, addDoc, deleteDoc,
// batch.commit(), a transaction, ...). Returns the same promise, so callers
// keep their own try/catch and error messages.
export function trackWrite(promise) {
  if (pending === 0) {
    burstFailed = false;
    clearTimeout(savingTimer);
    savingTimer = setTimeout(() => {
      showSaving = true;
      render();
    }, SAVING_DELAY_MS);
  }
  pending++;
  render();

  promise.then(
    () => {},
    () => { burstFailed = true; }
  ).finally(() => {
    pending--;
    if (pending === 0) {
      clearTimeout(savingTimer);
      showSaving = false;
      settle(burstFailed ? "error" : "saved");
    }
    render();
  });
  return promise;
}

// Listens to a document or query with metadata changes, only to learn
// whether the SDK is talking to the server. The SDK shares one server
// listen per query, so this costs no extra reads next to the page's own
// onSnapshot on the same ref. The very first snapshot often comes from
// the cache before the server answers, so `fromCache` only counts as
// offline once the server has been reached at least once.
export function watchConnection(refOrQuery) {
  let seenServer = false;
  onSnapshot(refOrQuery, { includeMetadataChanges: true }, (snap) => {
    if (!snap.metadata.fromCache) seenServer = true;
    serverReachable = !seenServer || !snap.metadata.fromCache;
    render();
  }, () => {
    // The page's own listener reports errors; nothing to add here.
  });
}

// Creates the marker inside `container` (appended, or before `before`).
export function mountSyncStatus(container, before = null) {
  if (!container) return;
  el = document.createElement("span");
  el.className = "sync-status";
  el.setAttribute("aria-live", "polite");
  el.dataset.state = "";
  container.insertBefore(el, before);
  render();
}

window.addEventListener("online", render);
window.addEventListener("offline", render);
