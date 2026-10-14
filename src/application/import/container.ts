import { ImportService } from "@/application/import/ImportService";
import { GoogleSheetsRepository } from "@/infrastructure/google/GoogleSheetsRepository";
import { GoogleSheetsService } from "@/infrastructure/google/GoogleSheetsService";
import { DatabaseSpreadsheetRepository } from "@/infrastructure/supabase/DatabaseSpreadsheetRepository";

export const databaseSpreadsheetRepository = new DatabaseSpreadsheetRepository();

export const importService = new ImportService(
  new GoogleSheetsRepository(new GoogleSheetsService()),
  databaseSpreadsheetRepository,
);
