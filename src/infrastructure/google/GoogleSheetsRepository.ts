import type { SpreadsheetRepository } from "@/domain/repositories/SpreadsheetRepository";
import type { SpreadsheetData } from "@/domain/sheets/types";
import { matrixToWorksheet, normalizeCell } from "@/domain/sheets/worksheet";
import { GoogleSheetsService } from "./GoogleSheetsService";

export class GoogleSheetsRepository implements SpreadsheetRepository {
  constructor(private readonly service: GoogleSheetsService) {}

  async loadSpreadsheet(): Promise<SpreadsheetData> {
    const payload = await this.service.getSpreadsheet();

    return {
      spreadsheetId: payload.spreadsheetId,
      title: payload.properties.title,
      loadedAt: new Date().toISOString(),
      sheets: payload.sheets.map((sheet) =>
        matrixToWorksheet(
          String(sheet.properties.sheetId),
          sheet.properties.title,
          sheet.values.map((row) => row.map(normalizeCell)),
        ),
      ),
    };
  }

  /** Matriz bruta de cada aba, usada na importacao para o banco. */
  async loadRawTabs() {
    const payload = await this.service.getSpreadsheet();
    return {
      spreadsheetId: payload.spreadsheetId,
      title: payload.properties.title,
      tabs: payload.sheets.map((sheet, position) => ({
        id: String(sheet.properties.sheetId),
        title: sheet.properties.title,
        position,
        matrix: sheet.values.map((row) => row.map(normalizeCell)),
      })),
    };
  }
}
