import axios from "axios";
import { settingsStore } from "@/infrastructure/storage/SettingsStore";
import { describeError, supabase } from "@/infrastructure/supabase/supabaseClient";

interface SheetProperties {
  sheetId: number;
  title: string;
  gridProperties?: {
    rowCount?: number;
    columnCount?: number;
  };
}

export interface GoogleSheetValuesResponse {
  spreadsheetId: string;
  properties: { title: string };
  sheets: Array<{
    properties: SheetProperties;
    values: unknown[][];
  }>;
}

// Linhas por requisicao: mantem cada resposta do servidor bem abaixo do limite da Vercel.
const ROWS_PER_REQUEST = 5000;
const PARALLEL_REQUESTS = 4;

/**
 * Le a planilha pela funcao /api/sheets (servidor), que guarda a credencial do
 * Google e so responde para usuarios logados e aprovados.
 */
export class GoogleSheetsService {
  async getSpreadsheet(): Promise<GoogleSheetValuesResponse> {
    const metadata = await this.request<{ spreadsheetId: string; properties: { title: string }; sheets: Array<{ properties: SheetProperties }> }>({});

    const jobs = metadata.sheets.flatMap((sheet, sheetIndex) => {
      const rowCount = Math.max(sheet.properties.gridProperties?.rowCount ?? ROWS_PER_REQUEST, 1);
      const chunks: Array<{ sheetIndex: number; from: number; to: number }> = [];
      for (let from = 1; from <= rowCount; from += ROWS_PER_REQUEST) {
        chunks.push({ sheetIndex, from, to: Math.min(from + ROWS_PER_REQUEST - 1, rowCount) });
      }
      return chunks;
    });

    const results = new Array<unknown[][]>(jobs.length);
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const index = next;
        next += 1;
        const job = jobs[index];
        const { values } = await this.request<{ values: unknown[][] }>({
          sheet: metadata.sheets[job.sheetIndex].properties.title,
          from: job.from,
          to: job.to,
        });
        results[index] = values;
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL_REQUESTS, jobs.length) }, worker));

    return {
      spreadsheetId: metadata.spreadsheetId,
      properties: metadata.properties,
      sheets: metadata.sheets.map((sheet, sheetIndex) => ({
        properties: sheet.properties,
        values: jobs.flatMap((job, index) => (job.sheetIndex === sheetIndex ? padChunk(results[index], job.to - job.from + 1, job.to === lastRow(sheet.properties)) : [])),
      })),
    };
  }

  private async request<T>(params: Record<string, string | number>): Promise<T> {
    const token = await supabase.getAccessToken();
    try {
      const { data } = await axios.get<T>("/api/sheets", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        // O link so vai na requisicao em desenvolvimento sem banco; com banco o servidor le das Configuracoes.
        params: supabase.configured ? params : { ...params, spreadsheetUrl: settingsStore.get().spreadsheet_url },
      });
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { error?: string } | undefined)?.error;
        if (message) throw new Error(message);
      }
      throw new Error(describeError(error));
    }
  }
}

function lastRow(properties: SheetProperties) {
  return Math.max(properties.gridProperties?.rowCount ?? ROWS_PER_REQUEST, 1);
}

/**
 * O Google omite linhas vazias no fim de cada intervalo. Completa as partes do
 * meio com linhas vazias para a numeracao das linhas continuar igual a da planilha.
 */
function padChunk(values: unknown[][] = [], size: number, isLast: boolean) {
  if (isLast || values.length >= size) return values;
  return [...values, ...Array.from({ length: size - values.length }, () => [] as unknown[])];
}
