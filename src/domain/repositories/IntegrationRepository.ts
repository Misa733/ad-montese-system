import type { IntegrationState, SheetModuleMapping, SyncSnapshot } from "@/domain/sheets/types";

export interface IntegrationRepository {
  getState(): IntegrationState;
  saveSpreadsheetUrl(url: string): IntegrationState;
  saveMapping(mapping: SheetModuleMapping): IntegrationState;
  saveSnapshot(snapshot: SyncSnapshot): IntegrationState;
}
