import type { SpreadsheetRepository } from "@/domain/repositories/SpreadsheetRepository";
import { detectDataType, detectField, normalizeHeader } from "@/domain/sheets/detection";
import type { SheetCellValue, SheetRow, SpreadsheetData, WorksheetData } from "@/domain/sheets/types";
import { GoogleSheetsService } from "./GoogleSheetsService";

export class GoogleSheetsRepository implements SpreadsheetRepository {
  constructor(private readonly service: GoogleSheetsService) {}

 async loadSpreadsheet(spreadsheetId: string): Promise<SpreadsheetData> {
  const payload = await this.service.getSpreadsheet(spreadsheetId);

  return {
    spreadsheetId: payload.spreadsheetId,
    title: payload.properties.title,
    loadedAt: new Date().toISOString(),
    sheets: payload.sheets.map((sheet) => {
      const matrix = sheet.values.map((row) =>
        row.map((cell) => {
          if (cell === undefined || cell === null || cell === "") return null;
          return cell as SheetCellValue;
        }),
      );

      return this.toWorksheet(
        String(sheet.properties.sheetId),
        sheet.properties.title,
        matrix,
      );
    }),
  };
}

  private toWorksheet(id: string, title: string, matrix: SheetCellValue[][]): WorksheetData {
    const headerIndex = matrix.findIndex((row) => row.filter(Boolean).length >= 2);
    const rawHeaders = headerIndex >= 0 ? matrix[headerIndex] : [];
    const headers = rawHeaders.map((value, index) => String(value ?? `Coluna ${index + 1}`).trim());
    const uniqueKeys = new Map<string, number>();
    const keys = headers.map((header, index) => {
      const base = normalizeHeader(header, index);
      const count = uniqueKeys.get(base) ?? 0;
      uniqueKeys.set(base, count + 1);
      return count ? `${base}_${count + 1}` : base;
    });

    const rows: SheetRow[] = matrix.slice(headerIndex + 1).map((row) => {
      return keys.reduce<SheetRow>((acc, key, index) => {
        acc[key] = row[index] ?? null;
        return acc;
      }, {});
    });

    return {
      id,
      title,
      headers,
      rows,
      recordCount: rows.filter((row) => Object.values(row).some(Boolean)).length,
      columns: keys.map((key, index) => {
        const sampleValues = rows.slice(0, 20).map((row) => row[key]);
        return {
          key,
          label: headers[index],
          index,
          sampleValues,
          type: detectDataType(sampleValues),
          detectedField: detectField(headers[index]),
        };
      }),
    };
  }
}
