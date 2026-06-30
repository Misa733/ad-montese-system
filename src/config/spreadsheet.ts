export const DEFAULT_SPREADSHEET_URL =
  import.meta.env.VITE_DEFAULT_SPREADSHEET_URL ??
  "https://docs.google.com/spreadsheets/d/1UbasMX3L7dgSsIaMcMorZVYDnuay6lJ8sc69_6sIOSE/edit?usp=sharing";

export const GOOGLE_SHEETS_API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY as string | undefined;
export const GOOGLE_OAUTH_ACCESS_TOKEN = import.meta.env.VITE_GOOGLE_OAUTH_ACCESS_TOKEN as string | undefined;

export function extractSpreadsheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim();
  throw new Error("Link ou ID de planilha inválido.");
}

export const DEFAULT_SPREADSHEET_ID = extractSpreadsheetId(DEFAULT_SPREADSHEET_URL);
