import { DEFAULT_SPREADSHEET_ID, DEFAULT_SPREADSHEET_URL, extractSpreadsheetId } from "@/config/spreadsheet";
import type { IntegrationRepository } from "@/domain/repositories/IntegrationRepository";
import type { IntegrationState, SheetModuleMapping, SyncSnapshot } from "@/domain/sheets/types";

const STORAGE_KEY = "ad-montese.integration-state";

const initialState: IntegrationState = {
  spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
  spreadsheetId: DEFAULT_SPREADSHEET_ID,
  mappings: [],
};

export class LocalIntegrationRepository implements IntegrationRepository {
  getState(): IntegrationState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;

    try {
      return { ...initialState, ...JSON.parse(raw) };
    } catch {
      return initialState;
    }
  }

  saveSpreadsheetUrl(url: string): IntegrationState {
    const next = { ...this.getState(), spreadsheetUrl: url, spreadsheetId: extractSpreadsheetId(url) };
    this.persist(next);
    return next;
  }

  saveMapping(mapping: SheetModuleMapping): IntegrationState {
    const current = this.getState();
    const mappings = [...current.mappings.filter((item) => item.sheetId !== mapping.sheetId), mapping];
    const next = { ...current, mappings };
    this.persist(next);
    return next;
  }

  saveSnapshot(snapshot: SyncSnapshot): IntegrationState {
    const next = { ...this.getState(), snapshot, lastSyncAt: snapshot.syncedAt };
    this.persist(next);
    return next;
  }

  private persist(state: IntegrationState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
