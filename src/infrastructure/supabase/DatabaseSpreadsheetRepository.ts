import type { SpreadsheetRepository } from "@/domain/repositories/SpreadsheetRepository";
import type { SheetCellValue, SpreadsheetData } from "@/domain/sheets/types";
import { matrixToWorksheet } from "@/domain/sheets/worksheet";
import { supabase } from "./supabaseClient";

interface SheetTabRow {
  id: string;
  title: string;
  position: number;
  imported_at: string;
}

interface SheetRowRow {
  tab_id: string;
  row_index: number;
  cells: SheetCellValue[];
}

export interface RawTab {
  id: string;
  title: string;
  position: number;
  matrix: SheetCellValue[][];
}

const PAGE_SIZE = 1000;
const INSERT_BATCH = 500;

/**
 * Le a "planilha dentro do banco": as abas importadas ficam nas tabelas
 * sheet_tabs e sheet_rows, no mesmo formato da planilha original. Assim todas
 * as telas funcionam igual, seja lendo do Google ou do banco.
 */
export class DatabaseSpreadsheetRepository implements SpreadsheetRepository {
  async loadSpreadsheet(): Promise<SpreadsheetData> {
    const tabs = await supabase.rest<SheetTabRow[]>("GET", "sheet_tabs", {
      params: { select: "id,title,position,imported_at", order: "position.asc" },
    });

    const rowsByTab = new Map<string, SheetCellValue[][]>();
    tabs.forEach((tab) => rowsByTab.set(tab.id, []));

    let offset = 0;
    for (;;) {
      const rows = await supabase.rest<SheetRowRow[]>("GET", "sheet_rows", {
        params: { select: "tab_id,row_index,cells", order: "tab_id.asc,row_index.asc,id.asc" },
        range: `${offset}-${offset + PAGE_SIZE - 1}`,
      });
      rows.forEach((row) => rowsByTab.get(row.tab_id)?.push(row.cells));
      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return {
      spreadsheetId: "banco-de-dados",
      title: "Banco de dados AD Montese",
      loadedAt: new Date().toISOString(),
      sheets: tabs.map((tab) => matrixToWorksheet(tab.id, tab.title, rowsByTab.get(tab.id) ?? [])),
    };
  }

  /** Substitui todo o conteudo importado pelas abas informadas. */
  async replaceAll(tabs: RawTab[], onProgress?: (done: number, total: number) => void) {
    await supabase.rest("DELETE", "sheet_tabs", { params: { id: "not.is.null" }, prefer: "return=minimal" });

    await supabase.rest("POST", "sheet_tabs", {
      prefer: "return=minimal",
      body: tabs.map((tab) => ({ id: tab.id, title: tab.title, position: tab.position })),
    });

    const rows = tabs.flatMap((tab) =>
      tab.matrix.map((cells, rowIndex) => ({ tab_id: tab.id, row_index: rowIndex, cells, source: "planilha" })),
    );

    for (let start = 0; start < rows.length; start += INSERT_BATCH) {
      await supabase.rest("POST", "sheet_rows", {
        prefer: "return=minimal",
        body: rows.slice(start, start + INSERT_BATCH),
      });
      onProgress?.(Math.min(start + INSERT_BATCH, rows.length), rows.length);
    }

    return { tabs: tabs.length, rows: rows.length };
  }

  /** Acrescenta uma linha lancada pelo sistema no fim de uma aba. */
  async appendRow(tabId: string, rowIndex: number, cells: SheetCellValue[]) {
    await supabase.rest("POST", "sheet_rows", {
      prefer: "return=minimal",
      body: [{ tab_id: tabId, row_index: rowIndex, cells, source: "sistema" }],
    });
  }
}
