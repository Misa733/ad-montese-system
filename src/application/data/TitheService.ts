import type { SheetCellValue, SheetRow, SpreadsheetData, WorksheetData } from "@/domain/sheets/types";
import { normalizeText, sheetValueToString, SpreadsheetDataService } from "./SpreadsheetDataService";

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

type MonthKey =
  | "janeiro"
  | "fevereiro"
  | "marco"
  | "abril"
  | "maio"
  | "junho"
  | "julho"
  | "agosto"
  | "setembro"
  | "outubro"
  | "novembro"
  | "dezembro";

const MONTH_DEFINITIONS: Array<{ key: MonthKey; label: (typeof MONTHS)[number]; aliases: string[]; number: number }> = [
  { key: "janeiro", label: "Janeiro", aliases: ["janeiro"], number: 1 },
  { key: "fevereiro", label: "Fevereiro", aliases: ["fevereiro"], number: 2 },
  { key: "marco", label: "Março", aliases: ["marco", "março"], number: 3 },
  { key: "abril", label: "Abril", aliases: ["abril"], number: 4 },
  { key: "maio", label: "Maio", aliases: ["maio"], number: 5 },
  { key: "junho", label: "Junho", aliases: ["junho"], number: 6 },
  { key: "julho", label: "Julho", aliases: ["julho"], number: 7 },
  { key: "agosto", label: "Agosto", aliases: ["agosto"], number: 8 },
  { key: "setembro", label: "Setembro", aliases: ["setembro"], number: 9 },
  { key: "outubro", label: "Outubro", aliases: ["outubro"], number: 10 },
  { key: "novembro", label: "Novembro", aliases: ["novembro"], number: 11 },
  { key: "dezembro", label: "Dezembro", aliases: ["dezembro"], number: 12 },
];

export type MonthlyTithes = Record<MonthKey, number>;

export interface TithePayer {
  id: string;
  number: number | null;
  name: string;
  congregation: string;
  sector: string;
  area: string;
  monthlyTithes: MonthlyTithes;
  annualTotal: number;
  calculatedTotal: number;
  contributedMonths: number;
  averageMonthly: number;
  lastContributionMonth: string | null;
  raw: Record<string, unknown>;
}

export interface TitheContribution {
  id: string;
  tithePayerId: string;
  tithePayerName: string;
  month: string;
  monthNumber: number;
  amount: number;
  year: number;
  congregation: string;
  sector: string;
  area: string;
  raw: Record<string, unknown>;
}

export function parseBrazilianCurrency(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/^R\$/i, "")
    .replace(/[^\d,.-]/g, "");

  if (!cleaned || cleaned === "-" || cleaned === "," || cleaned === ".") return 0;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    normalized = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseDizimistasSheet(sheet: WorksheetData | undefined, year = new Date().getFullYear()) {
  if (!sheet) return { tithePayers: [] as TithePayer[], contributions: [] as TitheContribution[] };

  const matrix = buildMatrix(sheet);
  const headerIndex = matrix.findIndex(isDizimistasHeader);
  if (headerIndex < 0) return { tithePayers: [] as TithePayer[], contributions: [] as TitheContribution[] };

  const headers = matrix[headerIndex].map((cell) => sheetValueToString(cell));
  const nameIndex = findHeaderIndex(headers, ["nome completo"]);
  const numberIndex = findHeaderIndex(headers, ["n", "nº", "numero", "número"]);
  const totalIndex = findHeaderIndex(headers, ["total"]);
  const yearIndex = findHeaderIndex(headers, ["ano"]);
  const monthIndexes = new Map<MonthKey, number>();

  MONTH_DEFINITIONS.forEach((month) => {
    const index = findHeaderIndex(headers, month.aliases);
    if (index >= 0) monthIndexes.set(month.key, index);
  });

  const tithePayers: TithePayer[] = [];
  const contributions: TitheContribution[] = [];

  matrix.slice(headerIndex + 1).forEach((cells, rowIndex) => {
    const name = sheetValueToString(cells[nameIndex]);
    if (!name) return;

    const raw = buildRaw(headers, cells, sheet.rows[headerIndex + rowIndex] ?? {});
    const number = parseOptionalNumber(cells[numberIndex]);
    const monthlyTithes = emptyMonthlyTithes();

    MONTH_DEFINITIONS.forEach((month) => {
      const index = monthIndexes.get(month.key);
      monthlyTithes[month.key] = index === undefined ? 0 : parseBrazilianCurrency(cells[index]);
    });

    const paidMonths = MONTH_DEFINITIONS.filter((month) => monthlyTithes[month.key] > 0);
    const calculatedTotal = MONTH_DEFINITIONS.reduce((sum, month) => sum + monthlyTithes[month.key], 0);
    const hasSheetTotal = totalIndex >= 0 && sheetValueToString(cells[totalIndex]) !== "";
    const totalFromSheet = hasSheetTotal ? parseBrazilianCurrency(cells[totalIndex]) : 0;
    const annualTotal = hasSheetTotal ? totalFromSheet : calculatedTotal;
    const contributionYear = parseOptionalNumber(cells[yearIndex]) ?? year;
    const id = number !== null ? `diz_${number}` : `diz_${slug(name)}_${headerIndex + rowIndex + 1}`;

    const payer: TithePayer = {
      id,
      number,
      name,
      congregation: sheetValueToString(raw.CONGREGACAO ?? raw["CONGREGAÇÃO"] ?? raw.Congregacao ?? raw.Congregação),
      sector: sheetValueToString(raw.SETOR ?? raw.Setor),
      area: sheetValueToString(raw.AREA ?? raw["ÁREA"] ?? raw.Area),
      monthlyTithes,
      annualTotal,
      calculatedTotal,
      contributedMonths: paidMonths.length,
      averageMonthly: paidMonths.length ? calculatedTotal / paidMonths.length : 0,
      lastContributionMonth: paidMonths.at(-1)?.label ?? null,
      raw,
    };

    tithePayers.push(payer);

    paidMonths.forEach((month) => {
      contributions.push({
        id: `${id}_${month.key}`,
        tithePayerId: id,
        tithePayerName: name,
        month: month.label,
        monthNumber: month.number,
        amount: monthlyTithes[month.key],
        year: contributionYear,
        congregation: payer.congregation,
        sector: payer.sector,
        area: payer.area,
        raw,
      });
    });
  });

  return { tithePayers, contributions };
}

export class TitheService {
  private readonly data: SpreadsheetDataService;

  constructor(spreadsheet?: SpreadsheetData) {
    this.data = new SpreadsheetDataService(spreadsheet);
  }

  getTithePayers() {
    return parseDizimistasSheet(this.data.getSheet("Dizimistas")).tithePayers;
  }

  getContributions() {
    return parseDizimistasSheet(this.data.getSheet("Dizimistas")).contributions;
  }
}

function buildMatrix(sheet: WorksheetData): SheetCellValue[][] {
  const keys = sheet.columns.map((column) => column.key);
  return [
    sheet.headers,
    ...sheet.rows.map((row) => keys.map((key) => row[key] ?? null)),
  ];
}

function isDizimistasHeader(row: SheetCellValue[]) {
  const normalized = row.map(normalizeText);
  const hasName = normalized.some((cell) => cell === "nome completo");
  const monthCount = MONTH_DEFINITIONS.filter((month) => normalized.some((cell) => month.aliases.map(normalizeText).includes(cell))).length;
  return hasName && monthCount >= 3;
}

function buildHeaderMap(headers: string[]) {
  return new Map(headers.map((header, index) => [normalizeText(header), index]));
}

function findHeaderIndex(headers: string[], aliases: string[]) {
  const map = buildHeaderMap(headers);
  for (const alias of aliases) {
    const found = map.get(normalizeText(alias));
    if (found !== undefined) return found;
  }
  return -1;
}

function buildRaw(headers: string[], cells: SheetCellValue[], originalRow: SheetRow) {
  const parsed = Object.fromEntries(headers.map((header, index) => [header || `Coluna ${index + 1}`, cells[index] ?? null]));
  return { ...originalRow, ...parsed };
}

function emptyMonthlyTithes(): MonthlyTithes {
  return {
    janeiro: 0,
    fevereiro: 0,
    marco: 0,
    abril: 0,
    maio: 0,
    junho: 0,
    julho: 0,
    agosto: 0,
    setembro: 0,
    outubro: 0,
    novembro: 0,
    dezembro: 0,
  };
}

function parseOptionalNumber(value: unknown) {
  const parsed = Number(sheetValueToString(value as SheetCellValue).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function slug(value: string) {
  return normalizeText(value).replace(/\s+/g, "_");
}
