'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

export const FirebaseClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebase, setFirebase] = useState<{
    firebaseApp: FirebaseApp;
    firestore: Firestore;
    auth: Auth;
  } | null>(null);

  useEffect(() => {
    const instances = initializeFirebase();
    setFirebase(instances);
  }, []);

  if (!firebase) {
    return null; // Or a loading spinner
  }

  return (
    <FirebaseProvider
      firebaseApp={firebase.firebaseApp}
      firestore={firebase.firestore}
      auth={firebase.auth}
    >
      {children}
    </FirebaseProvider>
  );
};
