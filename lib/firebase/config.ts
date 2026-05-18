import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import type { Firestore } from "firebase/firestore";
import type { Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// Lazy getters — safe on server (will not execute), initialise on first use in browser
let _db: Firestore | null = null;
let _auth: Auth | null = null;

export function getDb(): Firestore {
  if (!_db) {
    const { getFirestore } = require("firebase/firestore");
    _db = getFirestore(getFirebaseApp());
  }
  return _db!;
}

export function getAuthInstance(): Auth {
  if (!_auth) {
    const { getAuth } = require("firebase/auth");
    _auth = getAuth(getFirebaseApp());
  }
  return _auth!;
}

// These direct exports are retained for compatibility.
// They use the lazy getter so SSR-imported modules that never call them
// won't trigger Firebase initialization.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop];
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getAuthInstance() as any)[prop];
  },
});

export default {
  get app() {
    return getFirebaseApp();
  },
};
