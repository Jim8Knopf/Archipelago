// ============================================================
// Admin page entry point: the password gate.
//
// Nothing about the database is loaded until the password is right: this
// module imports neither Firebase nor the admin UI. Only after a correct
// password (or a valid token from earlier in this tab) does it import
// admin-app.js, which renders the UI and starts the Firestore listeners.
//
// This hides the admin UI from casual visitors. It does NOT secure the
// database — see admin-auth.js and the Admin section of README.md.
// ============================================================

import { ADMIN_PASSWORD_HASH } from "../js/admin-config.js";
import { hashPassword, isConfigured, sessionToken, SESSION_KEY } from "./admin-auth.js";
import { escapeHtml } from "../js/format.js";

const root = document.getElementById("admin-root");

function readToken() {
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}

function writeToken(token) {
  try { sessionStorage.setItem(SESSION_KEY, token); } catch { /* unlocks this page load only */ }
}

function clearToken() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* nothing stored */ }
}

function gateCard(inner) {
  root.innerHTML = `<div class="card admin-gate">${inner}</div>`;
}

function renderNotConfigured() {
  gateCard(`
    <h2>🔒 Admin</h2>
    <p class="admin-gate-error" role="alert">Admin password not configured — add the ADMIN_PASSWORD repository secret.</p>
    <p class="muted">The deploy workflow turns that secret into a hash in <code>js/admin-config.js</code>. Until it's set (and locally, where the placeholder is never replaced), this page stays locked. See the Admin section of the README.</p>
  `);
}

function renderForm(error = "") {
  gateCard(`
    <h2>🔒 Admin</h2>
    <p class="muted">Every campaign and character in this Firebase project. Enter the admin password to continue.</p>
    <form id="admin-gate-form" class="admin-gate-form">
      <div class="field">
        <label for="admin-password">Password</label>
        <input type="password" id="admin-password" autocomplete="current-password" required>
      </div>
      <button type="submit" class="brass">Unlock</button>
      <p class="admin-gate-error" id="admin-gate-error" role="alert">${escapeHtml(error)}</p>
    </form>
  `);
  const form = document.getElementById("admin-gate-form");
  const input = document.getElementById("admin-password");
  input.focus();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    const hash = await hashPassword(input.value);
    if (hash === ADMIN_PASSWORD_HASH) {
      writeToken(await sessionToken(ADMIN_PASSWORD_HASH));
      unlock();
    } else {
      renderForm("Wrong password.");
    }
  });
}

// Lock: forget the token and reload, which also tears down every listener.
function lock() {
  clearToken();
  window.location.reload();
}

async function unlock() {
  root.innerHTML = `<div class="card admin-gate"><p class="muted">Loading…</p></div>`;
  try {
    const app = await import("./admin-app.js");
    app.startAdmin(root, { onLock: lock });
  } catch (err) {
    // Typically js/firebase-config.js still holding its placeholders.
    console.error(err);
    gateCard(`
      <h2>Admin</h2>
      <p class="admin-gate-error" role="alert">Couldn't start the admin page.</p>
      <p class="muted">${escapeHtml(err.message || String(err))}</p>
      <button type="button" id="admin-lock-btn">🔒 Lock</button>
    `);
    document.getElementById("admin-lock-btn").addEventListener("click", lock);
  }
}

async function init() {
  if (!isConfigured(ADMIN_PASSWORD_HASH)) {
    renderNotConfigured();
    return;
  }
  const stored = readToken();
  if (stored && stored === await sessionToken(ADMIN_PASSWORD_HASH)) {
    unlock();
  } else {
    if (stored) clearToken();
    renderForm();
  }
}

init();
