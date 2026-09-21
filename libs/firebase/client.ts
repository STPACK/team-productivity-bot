import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_FIREBASE_MEASUREMENT_ID,
};

const requiredConfig = [
  ["NEXT_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["NEXT_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
  ["NEXT_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
  ["NEXT_FIREBASE_APP_ID", firebaseConfig.appId],
] as const;

export async function getFirebaseClientAuth() {
  const missingKeys = requiredConfig
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length) {
    throw new Error(`Missing Firebase config: ${missingKeys.join(", ")}`);
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);

  await setPersistence(auth, inMemoryPersistence);

  return auth;
}
