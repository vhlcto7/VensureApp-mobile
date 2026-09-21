import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { setUnauthorizedHandler } from '../api/client';
import {
  getAccessToken,
  getCustomerUser,
  saveAccessToken,
  saveCustomerUser,
} from '../services/secure-storage';
import type { CustomerAuthSession, CustomerAuthUser } from '../types';
import { clearCustomerSessionState } from './clear-customer-session';
import { clearPendingOtp } from './otp-challenge';
import { clearSignupDraft } from './signup-draft';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  session: CustomerAuthSession | null;
  signIn: (session: CustomerAuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  updateSessionUser: (patch: Partial<CustomerAuthUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<CustomerAuthSession | null>(null);

  const signOut = useCallback(async () => {
    await clearCustomerSessionState();
    setSession(null);
    setStatus('signedOut');
  }, []);

  const updateSessionUser = useCallback(async (patch: Partial<CustomerAuthUser>) => {
    setSession((current) => {
      if (!current) return current;
      const user = { ...current.user, ...patch };
      void saveCustomerUser(user);
      return { ...current, user };
    });
  }, []);

  const signIn = useCallback(async (nextSession: CustomerAuthSession) => {
    await saveAccessToken(nextSession.accessToken);
    await saveCustomerUser(nextSession.user);
    clearPendingOtp();
    clearSignupDraft();
    setSession(nextSession);
    setStatus('signedIn');
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const [accessToken, user] = await Promise.all([
        getAccessToken(),
        getCustomerUser(),
      ]);

      if (cancelled) {
        return;
      }

      if (accessToken && user) {
        setSession({ accessToken, user });
        setStatus('signedIn');
        return;
      }

      await clearCustomerSessionState();

      if (cancelled) {
        return;
      }

      setSession(null);
      setStatus('signedOut');
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });

    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(
    () => ({ status, session, signIn, signOut, updateSessionUser }),
    [session, signIn, signOut, status, updateSessionUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return value;
}
