// O link da planilha fica salvo nas Configuracoes do sistema (tabela `settings`).
// A chave do Google NAO fica mais no navegador: a leitura passa pela funcao
// /api/sheets, que roda no servidor da Vercel e exige usuario logado.

export function extractSpreadsheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim();
  throw new Error("Link ou ID de planilha invalido.");
}

export function tryExtractSpreadsheetId(input: string): string | undefined {
  try {
    return extractSpreadsheetId(input);
  } catch {
    return undefined;
  }
}
