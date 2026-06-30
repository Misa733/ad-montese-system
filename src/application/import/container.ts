import { GOOGLE_OAUTH_ACCESS_TOKEN, GOOGLE_SHEETS_API_KEY } from "@/config/spreadsheet";
import { ImportService } from "@/application/import/ImportService";
import { GoogleSheetsRepository } from "@/infrastructure/google/GoogleSheetsRepository";
import { GoogleSheetsService } from "@/infrastructure/google/GoogleSheetsService";
import { LocalIntegrationRepository } from "@/infrastructure/storage/LocalIntegrationRepository";

const integrationRepository = new LocalIntegrationRepository();

console.log("GOOGLE_SHEETS_API_KEY carregada?", Boolean(GOOGLE_SHEETS_API_KEY));
console.log("GOOGLE_OAUTH_ACCESS_TOKEN carregado?", Boolean(GOOGLE_OAUTH_ACCESS_TOKEN));

if (!GOOGLE_SHEETS_API_KEY && !GOOGLE_OAUTH_ACCESS_TOKEN) {
  console.warn("Nenhuma credencial do Google Sheets foi encontrada. Configure VITE_GOOGLE_SHEETS_API_KEY na hospedagem.");
}

const spreadsheetRepository = new GoogleSheetsRepository(new GoogleSheetsService());

export const importService = new ImportService(spreadsheetRepository, integrationRepository);
export const integrationStateRepository = integrationRepository;
