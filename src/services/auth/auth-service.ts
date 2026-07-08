import { AuthError, Session } from '@supabase/supabase-js';

import { AuthUser } from '../../types';
import { hasSupabaseConfig } from '../../config/env';
import { getSupabaseClient } from '../supabase/client';

export type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

/** Dev-only counter to detect duplicate signup requests from one tap. */
let signupCounter = 0;
let signupInFlight: Promise<unknown> | null = null;

export function getSignupDebugCounter() {
  return signupCounter;
}

export function isSignupInFlight() {
  return signupInFlight !== null;
}

function logAuthError(scope: string, error: AuthError) {
  console.error(`${scope} ERROR`, {
    status: error.status,
    code: error.code ?? error.name,
    message: error.message,
  });
}

export class AuthService {
  isEnabled() {
    return hasSupabaseConfig();
  }

  async getSession(): Promise<Session | null> {
    if (!this.isEnabled()) return null;
    const { data } = await getSupabaseClient().auth.getSession();
    return data.session;
  }

  async getAuthUser(): Promise<AuthUser | null> {
    const session = await this.getSession();
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email ?? '',
      displayName:
        (session.user.user_metadata?.display_name as string | undefined) ??
        session.user.email?.split('@')[0] ??
        'Friend',
    };
  }

  async signUp(input: SignUpInput) {
    if (signupInFlight) {
      console.warn('[Auth] SIGNUP BLOCKED — request already in flight, reusing existing promise');
      return signupInFlight;
    }

    signupCounter += 1;
    const requestNumber = signupCounter;
    const email = input.email.trim();

    console.log('Signup request #', requestNumber);
    console.log('SIGNUP START', { email, timestamp: Date.now() });

    const client = getSupabaseClient();

    signupInFlight = (async () => {
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password: input.password,
          options: {
            data: { display_name: input.displayName.trim() },
          },
        });

        if (error) {
          logAuthError('SIGNUP', error);
          throw error;
        }

        console.log('SIGNUP SUCCESS', {
          requestNumber,
          userId: data.user?.id ?? null,
          session: Boolean(data.session),
        });
        return data;
      } catch (error) {
        if (error instanceof AuthError) {
          logAuthError('SIGNUP', error);
        } else {
          console.error('SIGNUP ERROR', error);
        }
        throw error;
      } finally {
        signupInFlight = null;
      }
    })();

    return signupInFlight;
  }

  async signIn(input: SignInInput) {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });
    if (error) {
      logAuthError('SIGNIN', error);
      throw error;
    }
    return data;
  }

  async signOut() {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string) {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim());
    if (error) {
      logAuthError('RESET_PASSWORD', error);
      throw error;
    }
  }

  onAuthStateChange(callback: (session: Session | null) => void) {
    if (!this.isEnabled()) return { unsubscribe: () => undefined };
    const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return data.subscription;
  }
}

export const authService = new AuthService();
