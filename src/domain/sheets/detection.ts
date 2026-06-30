import type { DetectedDataType, DetectedField, SheetCellValue, SheetRow } from "./types";

const FIELD_PATTERNS: Array<[DetectedField, RegExp]> = [
  ["name", /\b(nome|identifica[cç][aã]o|membro|dizimista|respons[aá]vel)\b/i],
  ["phone", /\b(telefone|celular|whats|whatsapp|fone)\b/i],
  ["cpf", /\b(cpf|documento)\b/i],
  ["role", /\b(cargo|fun[cç][aã]o|ministro|obreiro)\b/i],
  ["congregation", /\b(congrega[cç][aã]o|igreja|setor|[aá]rea)\b/i],
  ["gender", /\b(sexo|g[eê]nero)\b/i],
  ["birthDate", /\b(nascimento|data nasc|dt nasc|anivers[aá]rio)\b/i],
  ["baptismDate", /\b(batismo|batizado)\b/i],
  ["maritalStatus", /\b(estado civil|civil)\b/i],
  ["amount", /\b(valor|receita|despesa|saldo|total)\b/i],
  ["paymentMethod", /\b(forma|pagamento|m[eé]todo)\b/i],
  ["date", /\b(data|emiss[aã]o|lan[cç]amento|dia|m[eê]s|ano)\b/i],
  ["category", /\b(tipo|categoria|situa[cç][aã]o)\b/i],
];

export function normalizeHeader(header: string, index: number): string {
  const compact = header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return compact || `coluna_${index + 1}`;
}

export function detectField(header: string): DetectedField {
  return FIELD_PATTERNS.find(([, pattern]) => pattern.test(header))?.[0] ?? "unknown";
}

export function detectDataType(values: SheetCellValue[]): DetectedDataType {
  const meaningful = values.filter((value) => value !== null && value !== "");
  if (!meaningful.length) return "empty";

  const stringValues = meaningful.map(String);
  const dateCount = stringValues.filter((value) => !Number.isNaN(Date.parse(value))).length;
  const numberCount = stringValues.filter((value) => value.replace(",", ".").match(/^-?\d+(\.\d+)?$/)).length;
  const currencyCount = stringValues.filter((value) => /(^R\$|^\$|valor|,|\.\d{2}$)/i.test(value)).length;
  const booleanCount = stringValues.filter((value) => /^(sim|n[aã]o|true|false|yes|no)$/i.test(value)).length;

  if (dateCount / meaningful.length > 0.7) return "date";
  if (currencyCount / meaningful.length > 0.7) return "currency";
  if (numberCount / meaningful.length > 0.7) return "number";
  if (booleanCount / meaningful.length > 0.7) return "boolean";
  return "string";
}

export function hashRow(row: SheetRow): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(row))));
}
