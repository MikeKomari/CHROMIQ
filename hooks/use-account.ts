"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteAccount as apiDeleteAccount,
  fetchAccount,
  signIn as apiSignIn,
  signOut as apiSignOut,
  signUp as apiSignUp,
  type SyncUser,
} from "@/lib/sync";

export type AccountStatus = "loading" | "anonymous" | "signed-in" | "unavailable";

/**
 * Account state for optional cloud sync.
 *
 * Signing in is never required: the workspace runs from localStorage by
 * default, and `status` is "unavailable" on deployments with no database, so
 * the UI can hide the account controls entirely rather than offering something
 * that cannot work.
 */
export function useAccount() {
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [user, setUser] = useState<SyncUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAccount().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        // A failed probe is indistinguishable from a deployment without
        // accounts, and treating it as "unavailable" keeps local work usable.
        setStatus("unavailable");
        return;
      }
      if (!result.data.accountsEnabled) {
        setStatus("unavailable");
        return;
      }
      setUser(result.data.user);
      setStatus(result.data.user ? "signed-in" : "anonymous");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(
    async (action: () => Promise<Awaited<ReturnType<typeof apiSignIn>>>) => {
      setBusy(true);
      setError(null);
      const result = await action();
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setUser(result.data.user);
      setStatus("signed-in");
      return true;
    },
    [],
  );

  const signIn = useCallback(
    (email: string, password: string) => run(() => apiSignIn(email, password)),
    [run],
  );

  const signUp = useCallback(
    (email: string, password: string) => run(() => apiSignUp(email, password)),
    [run],
  );

  const signOut = useCallback(async () => {
    setBusy(true);
    await apiSignOut();
    setBusy(false);
    setUser(null);
    setStatus("anonymous");
    setError(null);
  }, []);

  /**
   * Deletes the account and everything synced to it. Work held only in this
   * browser is left alone: it was never ours to delete, and someone closing an
   * account rarely means to throw away the system open in front of them.
   */
  const deleteAccount = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await apiDeleteAccount();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setUser(null);
    setStatus("anonymous");
    return true;
  }, []);

  return {
    status,
    user,
    error,
    busy,
    signIn,
    signUp,
    signOut,
    deleteAccount,
    clearError: () => setError(null),
  };
}
