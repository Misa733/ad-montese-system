import axios, { type AxiosInstance } from "axios";
import { GOOGLE_OAUTH_ACCESS_TOKEN, GOOGLE_SHEETS_API_KEY } from "@/config/spreadsheet";

export interface GoogleSheetValuesResponse {
  spreadsheetId: string;
  properties: { title: string };
  sheets: Array<{
    properties: {
      sheetId: number;
      title: string;
      gridProperties?: {
        rowCount?: number;
        columnCount?: number;
      };
    };
    values: unknown[][];
  }>;
}

interface MetadataResponse {
  spreadsheetId: string;
  properties: { title: string };
  sheets: Array<{
    properties: {
      sheetId: number;
      title: string;
      gridProperties?: {
        rowCount?: number;
        columnCount?: number;
      };
    };
  }>;
}

interface BatchGetResponse {
  valueRanges: Array<{
    range: string;
    values?: unknown[][];
  }>;
}

function quoteSheetName(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

export class GoogleSheetsService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "https://sheets.googleapis.com/v4/spreadsheets",
      headers: GOOGLE_OAUTH_ACCESS_TOKEN
        ? { Authorization: `Bearer ${GOOGLE_OAUTH_ACCESS_TOKEN}` }
        : undefined,
    });
  }

  private getAuthParams() {
    return GOOGLE_SHEETS_API_KEY ? { key: GOOGLE_SHEETS_API_KEY } : {};
  }

  async getSpreadsheet(spreadsheetId: string): Promise<GoogleSheetValuesResponse> {
    const metadata = await this.getMetadata(spreadsheetId);

    const ranges = metadata.sheets.map((sheet) => {
      const title = sheet.properties.title;
      return `${quoteSheetName(title)}`;
    });

    const { data } = await this.client.get<BatchGetResponse>(
      `/${spreadsheetId}/values:batchGet`,
      {
        params: {
          ...this.getAuthParams(),
          ranges,
          majorDimension: "ROWS",
          valueRenderOption: "FORMATTED_VALUE",
          dateTimeRenderOption: "FORMATTED_STRING",
        },
        paramsSerializer: {
          indexes: null,
        },
      },
    );

    return {
      spreadsheetId: metadata.spreadsheetId,
      properties: metadata.properties,
      sheets: metadata.sheets.map((sheet, index) => ({
        properties: sheet.properties,
        values: data.valueRanges[index]?.values ?? [],
      })),
    };
  }

  private async getMetadata(spreadsheetId: string): Promise<MetadataResponse> {
    const { data } = await this.client.get<MetadataResponse>(`/${spreadsheetId}`, {
      params: {
        ...this.getAuthParams(),
        includeGridData: false,
        fields:
          "spreadsheetId,properties.title,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))",
      },
    });

    return data;
  }
}