export type SheetCellValue = string | number | boolean | Date | null;

export type SheetRow = Record<string, SheetCellValue>;

export type DetectedDataType = "string" | "number" | "currency" | "date" | "boolean" | "empty";

export type DetectedField =
  | "name"
  | "phone"
  | "cpf"
  | "role"
  | "congregation"
  | "gender"
  | "birthDate"
  | "baptismDate"
  | "maritalStatus"
  | "amount"
  | "paymentMethod"
  | "date"
  | "category"
  | "unknown";

export type MinistryModule = "members" | "secretariat" | "treasury" | "assets" | "events";

export interface ColumnMetadata {
  key: string;
  label: string;
  index: number;
  type: DetectedDataType;
  detectedField: DetectedField;
  sampleValues: SheetCellValue[];
}

export interface WorksheetData {
  id: string;
  title: string;
  headers: string[];
  columns: ColumnMetadata[];
  rows: SheetRow[];
  recordCount: number;
}

export interface SpreadsheetData {
  spreadsheetId: string;
  title: string;
  sheets: WorksheetData[];
  loadedAt: string;
}

export interface SheetModuleMapping {
  sheetId: string;
  module: MinistryModule;
  fieldMap: Record<string, DetectedField>;
  updatedAt: string;
}

export interface SyncDiff {
  newRecords: number;
  changedRecords: number;
  unchangedRecords: number;
  failures: string[];
}

export interface SyncSnapshot {
  spreadsheetId: string;
  sheetHashes: Record<string, Record<string, string>>;
  syncedAt: string;
}

export interface IntegrationState {
  spreadsheetUrl: string;
  spreadsheetId: string;
  lastSyncAt?: string;
  mappings: SheetModuleMapping[];
  snapshot?: SyncSnapshot;
}
