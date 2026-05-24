
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  initializeFirestore,
  enableNetwork
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase with local persistence.
 */
export function initializeFirebase() {
  const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  let firestore;
  try {
    firestore = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (e) {
    firestore = getFirestore(firebaseApp);
  }

  // Ensure network is enabled to trigger cloud sync
  enableNetwork(firestore).catch(() => {});

  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './auth/use-profile';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
