import type { SpreadsheetData } from "@/domain/sheets/types";

export interface SpreadsheetRepository {
  loadSpreadsheet(): Promise<SpreadsheetData>;
}
