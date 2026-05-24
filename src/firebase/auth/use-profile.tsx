'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useUser } from './use-user';
import { useFirestore } from '../provider';
import { useDoc } from '../firestore/use-doc';

export interface UserProfile {
  email: string;
  role: 'admin' | 'staff';
  name: string;
}

/**
 * Core RBAC Hook
 * Fetches the user's role from Firestore based on their Auth UID.
 */
export function useProfile() {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

  const profileRef = useMemo(() => {
    if (!db || !user) return null;
    // The UID from Firebase Auth is used as the document ID in the 'users' collection
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc<UserProfile>(profileRef);

  return {
    profile,
    isAdmin: profile?.role === 'admin',
    isStaff: profile?.role === 'staff',
    loading: userLoading || profileLoading,
    // Helper to check if the user is authenticated but missing a role profile
    isMissingProfile: !userLoading && user && !profileLoading && !profile
  };
}
