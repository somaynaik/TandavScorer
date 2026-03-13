import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User, AuthError } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_scorer: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isScorer: boolean;
  isAuthenticated: boolean;
}

export interface SignUpPayload {
  email: string;
  password: string;
  username: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  error: AuthError | Error | null;
}

// ─── useAuth ──────────────────────────────────────────────────────────────────

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAdmin: false,
    isScorer: false,
    isAuthenticated: false,
  });

  // ── Fetch profile row for a given user id ──────────────────────────────────
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[useAuth] fetchProfile error:", error.message);
        return null;
      }
      return data as Profile;
    },
    []
  );

  // ── Sync state from a session ──────────────────────────────────────────────
  const syncFromSession = useCallback(
    async (session: Session | null) => {
      if (!session?.user) {
        setState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAdmin: false,
          isScorer: false,
          isAuthenticated: false,
        });
        return;
      }

      const profile = await fetchProfile(session.user.id);

      setState({
        user: session.user,
        session,
        profile,
        isLoading: false,
        isAdmin: profile?.is_admin ?? false,
        isScorer: profile?.is_scorer ?? false,
        isAuthenticated: true,
      });
    },
    [fetchProfile]
  );

  // ── Bootstrap on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) syncFromSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) syncFromSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncFromSession]);

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const signUp = useCallback(
    async ({ email, password, username }: SignUpPayload): Promise<AuthResult> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return { error };
      }

      // Profile is auto-created by the DB trigger; onAuthStateChange handles state.
      return { error: null };
    },
    []
  );

  // ── Sign In ────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async ({ email, password }: SignInPayload): Promise<AuthResult> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return { error };
      }

      return { error: null };
    },
    []
  );

  // ── Sign In with OAuth ─────────────────────────────────────────────────────
  const signInWithOAuth = useCallback(
    async (provider: "google" | "github"): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/` },
      });
      return { error: error ?? null };
    },
    []
  );

  // ── Sign Out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      setState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAdmin: false,
        isScorer: false,
        isAuthenticated: false,
      });
    }

    return { error: error ?? null };
  }, []);

  // ── Send password reset email ──────────────────────────────────────────────
  const sendPasswordResetEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error ?? null };
    },
    []
  );

  // ── Update password ────────────────────────────────────────────────────────
  const updatePassword = useCallback(
    async (newPassword: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error ?? null };
    },
    []
  );

  // ── Update profile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback(
    async (
      updates: Partial<Pick<Profile, "username" | "avatar_url">>
    ): Promise<AuthResult> => {
      const { user } = state;
      if (!user) return { error: new Error("Not authenticated") };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (!error) {
        const fresh = await fetchProfile(user.id);
        setState((prev) => ({
          ...prev,
          profile: fresh,
          isAdmin: fresh?.is_admin ?? prev.isAdmin,
          isScorer: fresh?.is_scorer ?? prev.isScorer,
        }));
      }

      return { error: error ?? null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.user, fetchProfile]
  );

  // ── Refresh profile ────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async (): Promise<void> => {
    const { user } = state;
    if (!user) return;
    const profile = await fetchProfile(user.id);
    setState((prev) => ({
      ...prev,
      profile,
      isAdmin: profile?.is_admin ?? false,
      isScorer: profile?.is_scorer ?? false,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user, fetchProfile]);

  return {
    ...state,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    updateProfile,
    refreshProfile,
  };
}
