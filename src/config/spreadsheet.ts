const FALLBACK_SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1UbasMX3L7dgSsIaMcMorZVYDnuay6lJ8sc69_6sIOSE/edit?usp=sharing";
const FALLBACK_GOOGLE_SHEETS_API_KEY = "AIzaSyCMm7L73UTLVQlb9mZaU4S_0WDEzqnHNow";

function readEnv(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export const DEFAULT_SPREADSHEET_URL = readEnv(import.meta.env.VITE_DEFAULT_SPREADSHEET_URL) ?? FALLBACK_SPREADSHEET_URL;

export const GOOGLE_SHEETS_API_KEY = readEnv(import.meta.env.VITE_GOOGLE_SHEETS_API_KEY) ?? FALLBACK_GOOGLE_SHEETS_API_KEY;
export const GOOGLE_OAUTH_ACCESS_TOKEN = readEnv(import.meta.env.VITE_GOOGLE_OAUTH_ACCESS_TOKEN);

export function extractSpreadsheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim();
  throw new Error("Link ou ID de planilha invalido.");
}

export const DEFAULT_SPREADSHEET_ID = extractSpreadsheetId(DEFAULT_SPREADSHEET_URL);
