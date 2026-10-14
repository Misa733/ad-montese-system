import axios, { type AxiosInstance, isAxiosError } from "axios";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/config/supabase";

/**
 * Cliente enxuto do Supabase (Auth + REST) feito com axios, para nao depender
 * do SDK oficial. Cobre apenas o que o sistema usa: login por email e senha,
 * renovacao de sessao e consultas/gravacoes nas tabelas.
 */

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { id: string; email: string };
}

const SESSION_KEY = "ad-montese.session";

type SessionListener = (session: AuthSession | null) => void;

class SupabaseClient {
  private readonly http: AxiosInstance;
  private session: AuthSession | null = readStoredSession();
  private refreshing: Promise<AuthSession | null> | null = null;
  private readonly listeners = new Set<SessionListener>();

  constructor() {
    this.http = axios.create({
      baseURL: SUPABASE_URL,
      headers: { apikey: SUPABASE_ANON_KEY },
    });
  }

  get configured() {
    return isSupabaseConfigured;
  }

  getSession() {
    return this.session;
  }

  onSessionChange(listener: SessionListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async signIn(email: string, password: string) {
    const { data } = await this.http.post("/auth/v1/token?grant_type=password", { email, password });
    return this.setSession(toSession(data));
  }

  async signUp(email: string, password: string, fullName: string) {
    const { data } = await this.http.post("/auth/v1/signup", {
      email,
      password,
      data: { full_name: fullName },
    });
    // Quando a confirmacao de email esta ligada, o Supabase nao devolve sessao.
    if (data?.access_token) return this.setSession(toSession(data));
    return null;
  }

  async sendPasswordReset(email: string) {
    await this.http.post("/auth/v1/recover", { email, redirect_to: window.location.origin });
  }

  async updatePassword(password: string) {
    const token = await this.getAccessToken();
    if (!token) throw new Error("Sessao expirada. Peca um novo link.");
    await this.http.put("/auth/v1/user", { password }, { headers: { Authorization: `Bearer ${token}` } });
  }

  /**
   * Links enviados por email (confirmacao de cadastro e troca de senha) voltam
   * com a sessao no endereco (#access_token=...). Guarda essa sessao e limpa a URL.
   * Devolve o tipo do link, por exemplo "recovery".
   */
  consumeSessionFromUrl(): string | null {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return null;

    const payload = decodeJwt(accessToken);
    this.setSession({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + Number(params.get("expires_in") ?? 3600) * 1000,
      user: { id: String(payload.sub ?? ""), email: String(payload.email ?? "") },
    });
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    return params.get("type");
  }

  async signOut() {
    const token = this.session?.accessToken;
    this.setSession(null);
    if (!token) return;
    try {
      await this.http.post("/auth/v1/logout", null, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // A sessao local ja foi encerrada; falha no servidor nao muda nada para o usuario.
    }
  }

  /** Devolve um token valido, renovando a sessao se estiver perto de expirar. */
  async getAccessToken(): Promise<string | null> {
    const session = this.session;
    if (!session) return null;
    if (session.expiresAt - Date.now() > 60_000) return session.accessToken;
    const renewed = await this.refresh();
    return renewed?.accessToken ?? null;
  }

  /** Requisicao autenticada na API REST (PostgREST) do Supabase. */
  async rest<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, options: RestOptions = {}): Promise<T> {
    const token = await this.getAccessToken();
    if (!token) throw new Error("Sessao expirada. Entre novamente.");
    try {
      const { data } = await this.http.request<T>({
        method,
        url: `/rest/v1/${path}`,
        data: options.body,
        params: options.params,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.prefer ? { Prefer: options.prefer } : {}),
          ...(options.range ? { Range: options.range, "Range-Unit": "items" } : {}),
        },
      });
      return data;
    } catch (error) {
      throw new Error(describeError(error));
    }
  }

  private async refresh(): Promise<AuthSession | null> {
    if (this.refreshing) return this.refreshing;
    const refreshToken = this.session?.refreshToken;
    if (!refreshToken) return null;

    this.refreshing = this.http
      .post("/auth/v1/token?grant_type=refresh_token", { refresh_token: refreshToken })
      .then(({ data }) => this.setSession(toSession(data)))
      .catch(() => this.setSession(null))
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  private setSession(session: AuthSession | null) {
    this.session = session;
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // Navegador sem armazenamento: a sessao vale ate fechar a aba.
    }
    this.listeners.forEach((listener) => listener(session));
    return session;
  }
}

export interface RestOptions {
  body?: unknown;
  params?: Record<string, string | number>;
  prefer?: string;
  range?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
}

function toSession(data: TokenResponse): AuthSession {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    user: { id: data.user.id, email: data.user.email ?? "" },
  };
}

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function describeError(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data as { msg?: string; message?: string; error_description?: string } | undefined;
    const message = payload?.error_description ?? payload?.msg ?? payload?.message;
    if (message) return translateAuthMessage(message);
    if (error.response?.status === 401) return "Sessao expirada. Entre novamente.";
    if (error.response?.status === 403) return "Seu perfil nao tem permissao para esta acao.";
  }
  return error instanceof Error ? error.message : "Erro inesperado.";
}

function translateAuthMessage(message: string) {
  const known: Record<string, string> = {
    "Invalid login credentials": "Email ou senha incorretos.",
    "Email not confirmed": "Confirme seu email antes de entrar.",
    "User already registered": "Este email ja esta cadastrado.",
  };
  return known[message] ?? message;
}

export const supabase = new SupabaseClient();
