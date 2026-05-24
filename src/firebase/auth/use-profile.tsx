
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

export function useProfile() {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

  const profileRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, loading: profileLoading } = useDoc<UserProfile>(profileRef);

  return {
    profile,
    isAdmin: profile?.role === 'admin',
    isStaff: profile?.role === 'staff',
    loading: userLoading || profileLoading,
  };
}
