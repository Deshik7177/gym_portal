'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore,
  Firestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  initializeFirestore,
  enableNetwork
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase with local persistence for offline-first gym operation.
 * Ensures the connection to the cloud is active.
 */
export function initializeFirebase() {
  const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  let firestore: Firestore;
  
  // Prevent "Firestore has already been initialized" errors during Next.js Hot Module Replacement
  try {
    firestore = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (e) {
    // If already initialized, just get the existing instance
    firestore = getFirestore(firebaseApp);
  }

  // Ensure network is enabled (cloud sync active)
  enableNetwork(firestore).catch(() => {
    // Fail silently if network is already enabled or unavailable
  });

  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
