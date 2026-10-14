import { createSign } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * GET /api/sheets                         -> lista de abas (titulo e tamanho)
 * GET /api/sheets?sheet=Aba&from=1&to=5000 -> linhas de uma aba, em partes
 *
 * Le a planilha configurada no sistema em partes (a Vercel limita cada
 * resposta a ~4,5 MB). Roda no servidor da
 * Vercel para que a credencial do Google nunca chegue ao navegador, e so
 * responde para usuarios logados com acesso aprovado.
 *
 * Variaveis de ambiente (Vercel > Settings > Environment Variables):
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  mesmas do front-end
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL                recomendado: conta de servico com acesso de leitura a planilha
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY          chave privada dessa conta (com \n)
 *   GOOGLE_SHEETS_API_KEY                       alternativa: chave de API (exige planilha aberta por link)
 */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method !== "GET") throw new HttpError(405, "Metodo nao permitido");

    const spreadsheetUrl = await resolveSpreadsheetUrl(req);
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    const auth = await googleAuth();
    const params = new URL(req.url ?? "", "http://localhost").searchParams;
    const sheet = params.get("sheet");

    if (!sheet) {
      send(res, 200, await readMetadata(spreadsheetId, auth));
      return;
    }

    const from = Math.max(1, Number(params.get("from") ?? 1));
    const to = Math.max(from, Number(params.get("to") ?? from + 4999));
    send(res, 200, await readRows(spreadsheetId, auth, sheet, from, to));
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Erro inesperado";
    if (status === 500) console.error("api/sheets", error);
    send(res, status, { error: message });
  }
}

async function resolveSpreadsheetUrl(req: IncomingMessage): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Sem banco so e permitido em desenvolvimento local (vercel dev).
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "development") {
      throw new HttpError(500, "Banco de dados nao configurado no servidor.");
    }
    const url = new URL(req.url ?? "", "http://localhost").searchParams.get("spreadsheetUrl");
    if (!url) throw new HttpError(400, "Nenhuma planilha configurada.");
    return url;
  }

  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Entre no sistema para ver os dados.");

  const user = await supabaseGet<{ id: string }>("/auth/v1/user", token).catch(() => {
    throw new HttpError(401, "Sessao expirada. Entre novamente.");
  });

  const profiles = await supabaseGet<Array<{ status: string }>>(`/rest/v1/profiles?select=status&id=eq.${encodeURIComponent(user.id)}`, token);
  if (profiles[0]?.status !== "ativo") throw new HttpError(403, "Seu acesso ainda nao foi aprovado.");

  const settings = await supabaseGet<Array<{ value: unknown }>>("/rest/v1/settings?select=value&key=eq.spreadsheet_url", token);
  const url = typeof settings[0]?.value === "string" ? settings[0].value : "";
  if (!url) throw new HttpError(400, "Nenhuma planilha configurada. Um administrador precisa informar o link em Configuracoes.");
  return url;
}

async function supabaseGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new HttpError(response.status, `Supabase respondeu ${response.status}`);
  return (await response.json()) as T;
}

function extractSpreadsheetId(input: string) {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim();
  throw new HttpError(400, "Link da planilha invalido.");
}

type GoogleAuth = { header: Record<string, string>; query: Record<string, string> };

let cachedToken: { value: string; expiresAt: number } | null = null;

async function googleAuth(): Promise<GoogleAuth> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (email && privateKey) {
    if (!cachedToken || cachedToken.expiresAt - Date.now() < 60_000) {
      cachedToken = await serviceAccountToken(email, privateKey);
    }
    return { header: { Authorization: `Bearer ${cachedToken.value}` }, query: {} };
  }

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (apiKey) return { header: {}, query: { key: apiKey } };

  throw new HttpError(500, "Credencial do Google nao configurada no servidor.");
}

async function serviceAccountToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey).toString("base64url");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!response.ok) throw new HttpError(502, "O Google recusou a conta de servico. Confira o email e a chave.");
  const data = (await response.json()) as { access_token: string; expires_in: number };
  return { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
}

interface SheetProperties {
  sheetId: number;
  title: string;
  gridProperties?: { rowCount?: number; columnCount?: number };
}

function readMetadata(spreadsheetId: string, auth: GoogleAuth) {
  const params = new URLSearchParams({
    ...auth.query,
    includeGridData: "false",
    fields: "spreadsheetId,properties.title,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))",
  });
  return googleGet<{ spreadsheetId: string; properties: { title: string }; sheets: Array<{ properties: SheetProperties }> }>(
    `${SHEETS_API}/${spreadsheetId}?${params}`,
    auth,
  );
}

async function readRows(spreadsheetId: string, auth: GoogleAuth, sheet: string, from: number, to: number) {
  const range = `'${sheet.replace(/'/g, "''")}'!${from}:${to}`;
  const params = new URLSearchParams({
    ...auth.query,
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  const data = await googleGet<{ values?: unknown[][] }>(`${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?${params}`, auth);
  return { values: data.values ?? [] };
}

async function googleGet<T>(url: string, auth: GoogleAuth): Promise<T> {
  const response = await fetch(url, { headers: auth.header });
  if (response.status === 403 || response.status === 404) {
    throw new HttpError(502, "O Google negou acesso a planilha. Compartilhe a planilha com a conta de servico do sistema.");
  }
  if (!response.ok) throw new HttpError(502, `Google Sheets respondeu ${response.status}`);
  return (await response.json()) as T;
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.end(JSON.stringify(body));
}
