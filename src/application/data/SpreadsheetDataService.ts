import type { SheetCellValue, SheetRow, SpreadsheetData, WorksheetData } from "@/domain/sheets/types";

export type SheetDraftOperation = "append" | "update" | "write";

export interface SheetDraftChange {
  id: string;
  sheetName: string;
  operation: SheetDraftOperation;
  row: SheetRow;
  rowId?: string;
  createdAt: string;
}

const DRAFTS_KEY = "ad-montese.sheet-draft-changes";

export class SpreadsheetDataService {
  constructor(private readonly spreadsheet?: SpreadsheetData) {}

  getSpreadsheet() {
    return this.spreadsheet;
  }

  getSheets() {
    return this.spreadsheet?.sheets ?? [];
  }

  getSheet(title: string) {
    const normalized = normalizeText(title);
    return this.getSheets().find((sheet) => normalizeText(sheet.title) === normalized);
  }

  getSheetRows(title: string) {
    return this.getSheet(title)?.rows ?? [];
  }

  getSheetColumns(title: string) {
    return this.getSheet(title)?.columns ?? [];
  }

  getTotalRecords() {
    return this.getSheets().reduce((sum, sheet) => sum + sheet.recordCount, 0);
  }

  getDraftChanges() {
    return readDrafts();
  }

  appendRowToSheet(sheetName: string, row: SheetRow) {
    return saveDraft({ sheetName, operation: "append", row });
  }

  updateRowInSheet(sheetName: string, rowId: string, row: SheetRow) {
    return saveDraft({ sheetName, operation: "update", rowId, row });
  }

  writeToSheet(sheetName: string, row: SheetRow) {
    return saveDraft({ sheetName, operation: "write", row });
  }
}

export function sheetValueToString(value: SheetCellValue | undefined) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function normalizeText(value: unknown) {
  return sheetValueToString(value as SheetCellValue)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findValue(row: SheetRow, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeText);
  const match = Object.keys(row).find((key) => normalizedAliases.includes(normalizeText(key)));
  if (match) return row[match];

  const fuzzy = Object.keys(row).find((key) => {
    const normalizedKey = normalizeText(key);
    return normalizedAliases.some((alias) => normalizedKey.includes(alias) || alias.includes(normalizedKey));
  });
  return fuzzy ? row[fuzzy] : undefined;
}

export function findColumn(sheet: WorksheetData | undefined, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeText);
  return sheet?.columns.find((column) => normalizedAliases.includes(normalizeText(column.label)) || normalizedAliases.includes(normalizeText(column.key)));
}

function readDrafts(): SheetDraftChange[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "[]") as SheetDraftChange[];
  } catch {
    localStorage.removeItem(DRAFTS_KEY);
    return [];
  }
}

function saveDraft(change: Omit<SheetDraftChange, "id" | "createdAt">) {
  const next: SheetDraftChange = {
    ...change,
    id: `draft_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(DRAFTS_KEY, JSON.stringify([next, ...readDrafts()]));
  return next;
}
