// Shared Firebase bootstrap. Both sheet/sheet.js and gm/gm.js import from here
// so there's only one place that initializes the app and Firestore.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from "../js/firebase-config.js";

function validateFirebaseConfig(config) {
  const requiredKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId"
  ];

  const invalidKeys = requiredKeys.filter(key => {
    const value = config[key];
    return !value || typeof value !== "string" || !value.trim() || value.includes("${{") || value.includes("}});
  });

  if (invalidKeys.length > 0) {
    throw new Error(
      `Firebase config is not set correctly. Edit js/firebase-config.js and paste your Firebase web app settings from the Firebase console. Invalid fields: ${invalidKeys.join(", ")}`
    );
  }
}

validateFirebaseConfig(firebaseConfig);
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Reads ?campaign=xxx from the URL, falling back to a default so the
// prototype works immediately without anyone typing a campaign ID.
export function getCampaignId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("campaign") || "default-campaign";
}
