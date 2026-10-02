import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function getFirebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

declare global {
  var __GOMP_EMULATORS__: boolean | undefined;
}

function connectEmulators(auth: Auth, db: Firestore) {
  if (
    process.env.NEXT_PUBLIC_USE_EMULATORS !== "1" ||
    typeof window === "undefined" ||
    globalThis.__GOMP_EMULATORS__
  ) {
    return;
  }
  const authHost = process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  const [firestoreHost, firestorePort] = (
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080"
  ).split(":");
  connectAuthEmulator(auth, `http://${authHost}`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, firestoreHost, Number(firestorePort));
  globalThis.__GOMP_EMULATORS__ = true;
}

export function getClientAuth(): Auth {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  connectEmulators(auth, getFirestore(app));
  return auth;
}

export function getClientDb(): Firestore {
  const app = getFirebaseApp();
  const db = getFirestore(app);
  connectEmulators(getAuth(app), db);
  return db;
}
