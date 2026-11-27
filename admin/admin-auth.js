// ============================================================
// Admin password gate: hashing helpers.
//
// Pure functions (WebCrypto only, no DOM or Firebase), so the same code can
// be checked against the deploy workflow's `sha256sum` in Node.
//
// HONEST LIMITS: this gate only keeps the admin UI out of casual view. The
// hash ships with the site, the comparison runs in the visitor's browser,
// and the Firestore rules allow every read and write without it. Anyone
// who wants to can skip the gate or talk to the database directly. It is
// not access control.
// ============================================================

// Fixed, app-specific prefix hashed in front of the password, so a plain
// rainbow-table lookup of the bare hash finds nothing. deploy.yml uses the
// same string — change both together.
export const ADMIN_SALT = "archipelago-admin:";

// Prefix for the per-tab unlock token (see sessionToken()).
const SESSION_SALT = "archipelago-admin-session:";

export const SESSION_KEY = "archipelago-admin-unlocked";

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

export function hashPassword(password) {
  return sha256Hex(ADMIN_SALT + password);
}

// False while js/admin-config.js still holds the committed placeholder
// (local dev, or the ADMIN_PASSWORD secret was never set).
export function isConfigured(hash) {
  return typeof hash === "string" && /^[0-9a-f]{64}$/.test(hash);
}

// What goes into sessionStorage after a correct password: derived from the
// configured hash, never the password itself. Changing the password (and so
// the hash) invalidates every stored token. Like the hash, it can be worked
// out from public data, so it's a convenience, not a secret.
export function sessionToken(hash) {
  return sha256Hex(SESSION_SALT + hash);
}
