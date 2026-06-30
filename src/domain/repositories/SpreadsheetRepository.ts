import type { SpreadsheetData } from "@/domain/sheets/types";

export interface SpreadsheetRepository {
  loadSpreadsheet(spreadsheetId: string): Promise<SpreadsheetData>;
}
