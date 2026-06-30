import type { IntegrationRepository } from "@/domain/repositories/IntegrationRepository";
import type { SpreadsheetRepository } from "@/domain/repositories/SpreadsheetRepository";
import { hashRow } from "@/domain/sheets/detection";
import type { MinistryModule, SheetModuleMapping, SpreadsheetData, SyncDiff, SyncSnapshot } from "@/domain/sheets/types";

const moduleRules: Array<[MinistryModule, RegExp]> = [
  ["treasury", /valor|receita|despesa|d[ií]zimo|oferta|forma|recibo/i],
  ["members", /nome|membro|cpf|telefone|sexo|nascimento|dizimista/i],
  ["secretariat", /batismo|casamento|transfer[eê]ncia|documento/i],
  ["assets", /patrim[oô]nio|bem|categoria|situa[cç][aã]o|valor/i],
  ["events", /evento|culto|agenda|data/i],
];

export class ImportService {
  constructor(
    private readonly spreadsheetRepository: SpreadsheetRepository,
    private readonly integrationRepository: IntegrationRepository,
  ) {}

  async loadCurrentSpreadsheet(): Promise<SpreadsheetData> {
    const state = this.integrationRepository.getState();
    return this.spreadsheetRepository.loadSpreadsheet(state.spreadsheetId);
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
    const previous = this.integrationRepository.getState().snapshot;
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

    this.integrationRepository.saveSnapshot({
      spreadsheetId: spreadsheet.spreadsheetId,
      sheetHashes: nextHashes,
      syncedAt: new Date().toISOString(),
    });

    return { newRecords, changedRecords, unchangedRecords, failures: [] };
  }
}
