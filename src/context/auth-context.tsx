import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AuthError, Session } from '@supabase/supabase-js';

import { hasSupabaseConfig } from '../config/env';
import { AuthUser } from '../types';
import { authService, SignInInput, SignUpInput } from '../services/auth/auth-service';

type AuthContextValue = {
  isAuthEnabled: boolean;
  isLoading: boolean;
  session: Session | null;
  authUser: AuthUser | null;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const isAuthEnabled = hasSupabaseConfig();
  const [isLoading, setIsLoading] = useState(isAuthEnabled);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const signUpInFlightRef = useRef(false);

  const refreshAuth = useCallback(async () => {
    if (!isAuthEnabled) {
      setIsLoading(false);
      return;
    }
    const nextSession = await authService.getSession();
    setSession(nextSession);
    setAuthUser(await authService.getAuthUser());
    setIsLoading(false);
  }, [isAuthEnabled]);

  useEffect(() => {
    refreshAuth();
    if (!isAuthEnabled) return;
    const subscription = authService.onAuthStateChange((nextSession) => {
      setSession(nextSession);
      void authService.getAuthUser().then(setAuthUser);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [isAuthEnabled, refreshAuth]);

  const signUp = useCallback(async (input: SignUpInput) => {
    if (signUpInFlightRef.current) {
      console.warn('[AuthContext] signUp ignored — already in flight');
      return;
    }

    signUpInFlightRef.current = true;
    try {
      await authService.signUp(input);
      await refreshAuth();
    } catch (error) {
      if (error instanceof AuthError) {
        console.error('[AuthContext] signUp failed', {
          status: error.status,
          code: error.code ?? error.name,
          message: error.message,
        });
      }
      throw error;
    } finally {
      signUpInFlightRef.current = false;
    }
  }, [refreshAuth]);

  const signIn = useCallback(async (input: SignInInput) => {
    await authService.signIn(input);
    await refreshAuth();
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
    setAuthUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await authService.resetPassword(email);
  }, []);

  const value = useMemo(
    () => ({
      isAuthEnabled,
      isLoading,
      session,
      authUser,
      signUp,
      signIn,
      signOut,
      resetPassword,
    }),
    [isAuthEnabled, isLoading, session, authUser, signUp, signIn, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
