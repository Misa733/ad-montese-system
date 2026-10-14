function readEnv(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export const SUPABASE_URL = readEnv(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, "");

// Chave publica (anon). E feita para ficar no navegador: quem protege os dados
// sao as politicas de seguranca (RLS) do banco, nao o segredo desta chave.
export const SUPABASE_ANON_KEY = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
