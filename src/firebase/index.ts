'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  initializeFirestore,
  enableNetwork,
  type Firestore
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

// Singleton instances to prevent lease errors during hot-reloads
let firebaseAppInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

/**
 * Initializes Firebase with local persistence.
 * Uses a singleton pattern to prevent "Failed to obtain primary lease" errors.
 */
export function initializeFirebase() {
  if (!firebaseAppInstance) {
    firebaseAppInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  
  if (!firestoreInstance) {
    try {
      firestoreInstance = initializeFirestore(firebaseAppInstance, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (e) {
      // If firestore was already initialized (e.g. during HMR), grab the existing instance
      firestoreInstance = getFirestore(firebaseAppInstance);
    }

    // Ensure network is enabled to trigger cloud sync
    enableNetwork(firestoreInstance).catch(() => {});
  }

  if (!authInstance) {
    authInstance = getAuth(firebaseAppInstance);
  }

  return { 
    firebaseApp: firebaseAppInstance, 
    firestore: firestoreInstance, 
    auth: authInstance 
  };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './auth/use-profile';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
