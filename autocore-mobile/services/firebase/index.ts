import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: FirebaseAuth.Auth;
let db: Firestore;

export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.length > 0);
}

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase environment variables are missing.');
  }
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  }
  return app ?? getApps()[0]!;
}

export function getFirebaseAuth(): FirebaseAuth.Auth {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    const getReactNativePersistence = (
      FirebaseAuth as typeof FirebaseAuth & {
        getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown;
      }
    ).getReactNativePersistence;

    if (getReactNativePersistence) {
      try {
        auth = FirebaseAuth.initializeAuth(firebaseApp, {
          persistence: getReactNativePersistence(AsyncStorage) as never,
        });
        return auth;
      } catch {
        // initializeAuth throws when Auth was already initialized for this app.
      }
    }

    auth = FirebaseAuth.getAuth(firebaseApp);
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    // Use default Firestore init — persistentLocalCache targets web IndexedDB and can
    // stall listeners on React Native / Expo Go.
    db = getFirestore(getFirebaseApp());
  }
  return db;
}
