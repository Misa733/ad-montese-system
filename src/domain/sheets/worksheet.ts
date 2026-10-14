import { detectDataType, detectField, normalizeHeader } from "./detection";
import type { SheetCellValue, SheetRow, WorksheetData } from "./types";

/** Converte a matriz bruta de uma aba (linhas x colunas) no formato usado pelo sistema. */
export function matrixToWorksheet(id: string, title: string, matrix: SheetCellValue[][]): WorksheetData {
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

export function normalizeCell(cell: unknown): SheetCellValue {
  if (cell === undefined || cell === null || cell === "") return null;
  if (typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") return cell;
  return String(cell);
}
