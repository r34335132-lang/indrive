import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  emptyDocs,
  fetchDriverDocs,
  fetchProfile,
  loginWithPassword,
  logoutSession,
  registerDriver,
  registerPassenger,
  setAllDriverDocsUploaded,
  switchActiveRole,
  updateDriverDoc,
  type RegisterDriverInput,
  type RegisterPassengerInput,
} from '@/lib/api/auth';
import { deleteMyAccount } from '@/lib/api/account';
import { markBlockFeeSatisfied, uploadDriverDocument } from '@/lib/api/driverDocs';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { DriverDocs, DriverDocumentKey, Profile, UserRole } from '@/types';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  /** @deprecated use profile */
  user: Profile | null;
  role: UserRole | null;
  isReady: boolean;
  configured: boolean;
  driverDocs: DriverDocs;
  docsComplete: boolean;
  docsApproved: boolean;
  blockFeeSatisfied: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerAsPassenger: (input: RegisterPassengerInput) => Promise<void>;
  registerAsDriver: (input: RegisterDriverInput) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  toggleDocument: (key: DriverDocumentKey) => Promise<void>;
  uploadDocument: (key: DriverDocumentKey) => Promise<void>;
  setAllDocumentsUploaded: () => Promise<void>;
  satisfyBlockFee: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [driverDocs, setDriverDocs] = useState<DriverDocs>(emptyDocs);
  const [isReady, setIsReady] = useState(false);

  const loadUserData = useCallback(async (userId: string) => {
    const [nextProfile, docs] = await Promise.all([fetchProfile(userId), fetchDriverDocs(userId)]);
    setProfile(nextProfile);
    setDriverDocs(docs);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user) {
          try {
            await loadUserData(data.session.user.id);
          } catch {
            setProfile(null);
          }
        }
        setIsReady(true);
      })
      .catch(() => {
        if (mounted) setIsReady(true);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        try {
          await loadUserData(nextSession.user.id);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
        setDriverDocs(emptyDocs);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const login = useCallback(async (email: string, password: string) => {
    await loginWithPassword(email, password);
  }, []);

  const registerAsPassenger = useCallback(async (input: RegisterPassengerInput) => {
    await registerPassenger(input);
  }, []);

  const registerAsDriver = useCallback(async (input: RegisterDriverInput) => {
    await registerDriver(input);
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setProfile(null);
    setDriverDocs(emptyDocs);
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteMyAccount();
    setSession(null);
    setProfile(null);
    setDriverDocs(emptyDocs);
  }, []);

  const switchRole = useCallback(
    async (role: UserRole) => {
      if (!profile) return;
      if (!profile.roles.includes(role)) {
        throw new Error('No tienes ese rol asignado');
      }
      const next = await switchActiveRole(profile.id, role);
      setProfile(next);
    },
    [profile],
  );

  const toggleDocument = useCallback(
    async (key: DriverDocumentKey) => {
      if (!profile) return;
      const next = await updateDriverDoc(profile.id, { [key]: !driverDocs[key] });
      setDriverDocs(next);
    },
    [driverDocs, profile],
  );

  const uploadDocument = useCallback(
    async (key: DriverDocumentKey) => {
      if (!profile) return;
      const next = await uploadDriverDocument(profile.id, key);
      setDriverDocs(next);
    },
    [profile],
  );

  const setAllDocumentsUploaded = useCallback(async () => {
    if (!profile) return;
    const next = await setAllDriverDocsUploaded(profile.id);
    setDriverDocs(next);
  }, [profile]);

  const satisfyBlockFee = useCallback(async () => {
    if (!profile) return;
    await markBlockFeeSatisfied(profile.id);
    setProfile({ ...profile, blockFeeSatisfied: true });
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    await loadUserData(session.user.id);
  }, [loadUserData, session?.user]);

  const docsComplete = Boolean(driverDocs.complete);
  const docsApproved = driverDocs.reviewStatus === 'approved';
  const blockFeeSatisfied = Boolean(profile?.blockFeeSatisfied);

  const value = useMemo(
    () => ({
      session,
      profile,
      user: profile,
      role: profile?.activeRole ?? null,
      isReady,
      configured: isSupabaseConfigured,
      driverDocs,
      docsComplete,
      docsApproved,
      blockFeeSatisfied,
      login,
      registerAsPassenger,
      registerAsDriver,
      logout,
      deleteAccount,
      switchRole,
      toggleDocument,
      uploadDocument,
      setAllDocumentsUploaded,
      satisfyBlockFee,
      refreshProfile,
    }),
    [
      session,
      profile,
      isReady,
      driverDocs,
      docsComplete,
      docsApproved,
      blockFeeSatisfied,
      login,
      registerAsPassenger,
      registerAsDriver,
      logout,
      deleteAccount,
      switchRole,
      toggleDocument,
      uploadDocument,
      setAllDocumentsUploaded,
      satisfyBlockFee,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
