import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { recordStore } from "@/infrastructure/storage/RecordStore";
import { settingsStore } from "@/infrastructure/storage/SettingsStore";
import { describeError, supabase } from "@/infrastructure/supabase/supabaseClient";
import { migrateLegacyBrowserData } from "./legacyBrowserData";
import type { UserProfile, UserRole } from "./types";

type AuthStatus = "loading" | "signedOut" | "pending" | "blocked" | "ready" | "error" | "notConfigured";

interface AuthContextValue {
  status: AuthStatus;
  profile: UserProfile | null;
  error: string;
  /** true quando roda sem banco (somente em desenvolvimento). */
  isLocalMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<"signedIn" | "confirmEmail">;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** true quando o usuario chegou pelo link de "esqueci minha senha". */
  passwordRecovery: boolean;
  updatePassword: (password: string) => Promise<void>;
  reload: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

export type Permission = "manageUsers" | "manageSettings" | "editPatrimony" | "editTreasury" | "editRecords";

const PERMISSIONS: Record<Permission, UserRole[]> = {
  manageUsers: ["admin"],
  manageSettings: ["admin"],
  editPatrimony: ["admin", "patrimonio"],
  editTreasury: ["admin", "tesouraria"],
  editRecords: ["admin", "secretaria", "tesouraria", "patrimonio"],
};

const LOCAL_PROFILE: UserProfile = {
  id: "local",
  email: "modo-local@dev",
  full_name: "Modo local (sem banco)",
  role: "admin",
  status: "ativo",
  congregation: null,
};

const isLocalMode = !supabase.configured && import.meta.env.DEV;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [passwordRecovery, setPasswordRecovery] = useState(() => supabase.configured && supabase.consumeSessionFromUrl() === "recovery");

  const load = useCallback(async () => {
    if (!supabase.configured) {
      if (!isLocalMode) {
        setStatus("notConfigured");
        return;
      }
      await Promise.all([settingsStore.hydrate(), recordStore.hydrate()]);
      setProfile(LOCAL_PROFILE);
      setStatus("ready");
      return;
    }

    const session = supabase.getSession();
    if (!session) {
      setProfile(null);
      recordStore.clear();
      setStatus("signedOut");
      return;
    }

    setStatus("loading");
    try {
      const rows = await supabase.rest<UserProfile[]>("GET", "profiles", {
        params: { select: "*", id: `eq.${session.user.id}` },
      });
      const current = rows[0];
      setProfile(current ?? null);
      if (!current || current.status === "pendente") {
        setStatus("pending");
        return;
      }
      if (current.status === "bloqueado") {
        setStatus("blocked");
        return;
      }

      await Promise.all([settingsStore.hydrate(), recordStore.hydrate()]);
      if (current.role !== "leitura") await migrateLegacyBrowserData();
      setStatus("ready");
    } catch (loadError) {
      setError(describeError(loadError));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
    return supabase.onSessionChange((session) => {
      if (!session) {
        queryClient.clear();
        setProfile(null);
        recordStore.clear();
        setStatus("signedOut");
      }
    });
  }, [load, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      profile,
      error,
      isLocalMode,
      async signIn(email, password) {
        await supabase.signIn(email, password).catch((signInError: unknown) => {
          throw new Error(describeError(signInError));
        });
        await load();
      },
      async signUp(email, password, fullName) {
        const session = await supabase.signUp(email, password, fullName).catch((signUpError: unknown) => {
          throw new Error(describeError(signUpError));
        });
        if (!session) return "confirmEmail";
        await load();
        return "signedIn";
      },
      async sendPasswordReset(email) {
        await supabase.sendPasswordReset(email).catch((resetError: unknown) => {
          throw new Error(describeError(resetError));
        });
      },
      async signOut() {
        await recordStore.flush();
        await supabase.signOut();
      },
      reload: load,
      passwordRecovery,
      async updatePassword(password) {
        await supabase.updatePassword(password).catch((updateError: unknown) => {
          throw new Error(describeError(updateError));
        });
        setPasswordRecovery(false);
      },
      can(permission) {
        return Boolean(profile && profile.status === "ativo" && PERMISSIONS[permission].includes(profile.role));
      },
    }),
    [status, profile, error, load, passwordRecovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return context;
}
