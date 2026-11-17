'use client';

// PREVIEW SESSION. Authentication is an open decision (Clerk candidate,
// Firebase alternative; see docs/decisions.md). Until a provider is chosen,
// this keeps a session in the browser so the sign-in, account and sign-out
// flows can be designed. It verifies nothing and protects nothing: real
// access control must be enforced on the server, per workspace.

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface SessionUser {
  name: string;
  email: string;
  workspace: string;
  timezone: string;
}

type SessionState =
  | {status: 'loading'}
  | {status: 'signed-out'}
  | {status: 'signed-in'; user: SessionUser};

interface SessionContextValue {
  session: SessionState;
  signIn: (email: string) => void;
  signOut: () => void;
  updateUser: (patch: Partial<SessionUser>) => void;
}

const STORAGE_KEY = 'dottext.preview-session.v1';
const DEFAULT_TIMEZONE = 'America/New_York';

const SessionContext = createContext<SessionContextValue | null>(null);

function readStored(): SessionUser | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw == null ? null : (JSON.parse(raw) as SessionUser);
  } catch {
    return null;
  }
}

function writeStored(user: SessionUser | null) {
  try {
    if (user == null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  } catch {
    // Storage can be unavailable (private mode, embedded contexts). The
    // session then lasts for this page view only.
  }
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part[0]!.toUpperCase() + part.slice(1))
    .join(' ');
}

export function SessionProvider({children}: {children: ReactNode}) {
  const [session, setSession] = useState<SessionState>({status: 'loading'});

  useEffect(() => {
    const user = readStored();
    setSession(user == null ? {status: 'signed-out'} : {status: 'signed-in', user});
  }, []);

  const signIn = useCallback((email: string) => {
    const user: SessionUser = {
      name: nameFromEmail(email) || 'Analyst',
      email,
      workspace: 'Pilot workspace',
      timezone: DEFAULT_TIMEZONE,
    };
    writeStored(user);
    setSession({status: 'signed-in', user});
  }, []);

  const signOut = useCallback(() => {
    writeStored(null);
    setSession({status: 'signed-out'});
  }, []);

  const updateUser = useCallback((patch: Partial<SessionUser>) => {
    setSession(current => {
      if (current.status !== 'signed-in') {
        return current;
      }
      const user = {...current.user, ...patch};
      writeStored(user);
      return {status: 'signed-in', user};
    });
  }, []);

  const value = useMemo(
    () => ({session, signIn, signOut, updateUser}),
    [session, signIn, signOut, updateUser],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (value == null) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}
