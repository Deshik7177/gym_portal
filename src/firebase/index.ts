'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore,
  Firestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  initializeFirestore
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

export function initializeFirebase() {
  const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  let firestore: Firestore;
  try {
    // Attempt to initialize with persistence
    firestore = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (e) {
    // If already initialized, get the existing instance
    firestore = getFirestore(firebaseApp);
  }

  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
