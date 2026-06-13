// Client-side Firebase init (read-only realtime listeners for the dashboard).
// 1. Go to Firebase Console > Project Settings > General > Your apps > Web app.
// 2. Copy the firebaseConfig object and paste the values below.
// These values are safe to expose in client code.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};

export const isConfigured = !firebaseConfig.apiKey.startsWith("PASTE_");

let app, db;
if (isConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDocs,
};
