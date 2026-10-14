import type { SpreadsheetRepository } from "@/domain/repositories/SpreadsheetRepository";
import { hashRow } from "@/domain/sheets/detection";
import type { MinistryModule, SheetModuleMapping, SpreadsheetData, SyncDiff, SyncSnapshot } from "@/domain/sheets/types";
import type { GoogleSheetsRepository } from "@/infrastructure/google/GoogleSheetsRepository";
import type { DatabaseSpreadsheetRepository } from "@/infrastructure/supabase/DatabaseSpreadsheetRepository";
import { settingsStore } from "@/infrastructure/storage/SettingsStore";

const moduleRules: Array<[MinistryModule, RegExp]> = [
  ["treasury", /valor|receita|despesa|d[ií]zimo|oferta|forma|recibo/i],
  ["members", /nome|membro|cpf|telefone|sexo|nascimento|dizimista/i],
  ["secretariat", /batismo|casamento|transfer[eê]ncia|documento/i],
  ["assets", /patrim[oô]nio|bem|categoria|situa[cç][aã]o|valor/i],
  ["events", /evento|culto|agenda|data/i],
];

// O comparativo da ultima sincronizacao e so informativo e fica neste navegador.
const SNAPSHOT_KEY = "ad-montese.sync-snapshot";

export class ImportService {
  constructor(
    private readonly googleRepository: GoogleSheetsRepository,
    private readonly databaseRepository: DatabaseSpreadsheetRepository,
  ) {}

  private get activeRepository(): SpreadsheetRepository {
    return settingsStore.get().data_source === "database" ? this.databaseRepository : this.googleRepository;
  }

  async loadCurrentSpreadsheet(): Promise<SpreadsheetData> {
    return this.activeRepository.loadSpreadsheet();
  }

  /**
   * Copia todas as abas da planilha do Google para o banco. Depois disso o
   * administrador pode trocar a fonte de dados para "banco" e a planilha vira
   * apenas um arquivo historico.
   */
  async importGoogleIntoDatabase(onProgress?: (done: number, total: number) => void) {
    const raw = await this.googleRepository.loadRawTabs();
    const result = await this.databaseRepository.replaceAll(raw.tabs, onProgress);
    await settingsStore.update({ last_import_at: new Date().toISOString() });
    return result;
  }

  getMappings(): SheetModuleMapping[] {
    return settingsStore.get().sheet_mappings;
  }

  async saveMapping(mapping: SheetModuleMapping) {
    const mappings = [...this.getMappings().filter((item) => item.sheetId !== mapping.sheetId), mapping];
    await settingsStore.update({ sheet_mappings: mappings });
  }

  getLastSyncAt() {
    return readSnapshot()?.syncedAt;
  }

  inferModule(sheet: SpreadsheetData["sheets"][number]): MinistryModule {
    const title = sheet.title.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    if (["db", "fluxo", "historico", "relatorio", "recibo", "lancar", "cancelar", "dizimistas"].includes(title)) {
      return "treasury";
    }
    if (["atualizacao", "data", "dados", "ajuda"].includes(title)) {
      return "secretariat";
    }
    const signature = `${sheet.title} ${sheet.headers.join(" ")}`;
    return moduleRules.find(([, rule]) => rule.test(signature))?.[0] ?? "members";
  }

  buildMapping(sheet: SpreadsheetData["sheets"][number], module?: MinistryModule): SheetModuleMapping {
    return {
      sheetId: sheet.id,
      module: module ?? this.inferModule(sheet),
      fieldMap: Object.fromEntries(sheet.columns.map((column) => [column.key, column.detectedField])),
      updatedAt: new Date().toISOString(),
    };
  }

  sync(spreadsheet: SpreadsheetData): SyncDiff {
    const previous = readSnapshot();
    const nextHashes: SyncSnapshot["sheetHashes"] = {};
    let newRecords = 0;
    let changedRecords = 0;
    let unchangedRecords = 0;

    spreadsheet.sheets.forEach((sheet) => {
      nextHashes[sheet.id] = {};
      sheet.rows.forEach((row, index) => {
        const recordId = String(row.id ?? row["n"] ?? row.numero ?? index);
        const rowHash = hashRow(row);
        nextHashes[sheet.id][recordId] = rowHash;

        const oldHash = previous?.sheetHashes[sheet.id]?.[recordId];
        if (!oldHash) newRecords += 1;
        else if (oldHash !== rowHash) changedRecords += 1;
        else unchangedRecords += 1;
      });
    });

    writeSnapshot({
      spreadsheetId: spreadsheet.spreadsheetId,
      sheetHashes: nextHashes,
      syncedAt: new Date().toISOString(),
    });

    return { newRecords, changedRecords, unchangedRecords, failures: [] };
  }
}

function readSnapshot(): SyncSnapshot | undefined {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as SyncSnapshot) : undefined;
  } catch {
    return undefined;
  }
}

function writeSnapshot(snapshot: SyncSnapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Comparativo e opcional; sem espaco no navegador, so nao fica guardado.
  }
}
