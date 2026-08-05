// Shared Firebase bootstrap. Both sheet/sheet.js and gm/gm.js import from here
// so there's only one place that initializes the app and Firestore.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from "../js/firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Reads ?campaign=xxx from the URL, falling back to a default so the
// prototype works immediately without anyone typing a campaign ID.
export function getCampaignId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("campaign") || "default-campaign";
}
