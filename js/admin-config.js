// ============================================================
// Admin page password hash.
//
// The deploy workflow (.github/workflows/deploy.yml) overwrites this file
// with the SHA-256 hash of "archipelago-admin:" + the ADMIN_PASSWORD
// repository secret. Only the hash is ever written here, never the
// password itself.
//
// The committed value below is a placeholder. While it's still in place
// (local dev, or the secret isn't set), the admin page stays locked and
// says that the password isn't configured.
//
// This only hides the admin UI. The hash is public (anyone can read this
// file on the live site), and the Firestore rules don't check it at all —
// see the Admin section of README.md.
// ============================================================

export const ADMIN_PASSWORD_HASH = "${{ ADMIN_PASSWORD_HASH }}";
