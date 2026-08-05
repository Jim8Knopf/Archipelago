// ============================================================
// Firebase project config.
// Get these values from: Firebase Console → Project Settings →
// General → "Your apps" → Web app → SDK setup and configuration.
//
// These values are NOT secret — they identify your project to
// Firebase, they don't grant access on their own. Access control
// happens in firestore.rules instead. Safe to commit this file
// to a public GitHub repo.
// ============================================================

export const firebaseConfig = {
  apiKey: "${{ secrets.FIREBASE_API_KEY }}",
  authDomain: "${{ secrets.FIREBASE_AUTH_DOMAIN }}",
  projectId: "${{ secrets.FIREBASE_PROJECT_ID }}",
  storageBucket: "${{ secrets.FIREBASE_STORAGE_BUCKET }}",
  messagingSenderId: "${{ secrets.FIREBASE_SENDER_ID }}",
  appId: "${{ secrets.FIREBASE_APP_ID }}"
};