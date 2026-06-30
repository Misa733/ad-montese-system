import type { SpreadsheetData } from "@/domain/sheets/types";
import { SpreadsheetDataService } from "./SpreadsheetDataService";
import { isOfferingType, isTitheType, type FinancialMovement } from "./TreasuryService";
import type { TitheContribution } from "./TitheService";

export interface ReportRow {
  report: string;
  group: string;
  records: number;
  total: number;
}

export class ReportsService {
  private readonly data: SpreadsheetDataService;

  constructor(
    spreadsheet: SpreadsheetData | undefined,
    private readonly movements: FinancialMovement[],
    private readonly contributions: TitheContribution[],
  ) {
    this.data = new SpreadsheetDataService(spreadsheet);
  }

  getReports() {
    return [
      ...this.group("Financeiro geral", this.movements, () => "Todos"),
      ...this.group("Por congregacao", this.movements, (item) => item.congregation || "Nao informado"),
      ...this.group("Por setor", this.movements, (item) => item.sector || "Nao informado"),
      ...this.group("Por area", this.movements, (item) => item.area || "Nao informado"),
      ...this.group("Por mes", this.movements, (item) => item.date.slice(0, 7) || item.month || "Sem data"),
      ...this.group("Por tipo", this.movements, (item) => item.type || "Nao informado"),
      ...this.group("Por forma de pagamento", this.movements, (item) => item.paymentMethod || "Nao informado"),
      ...this.group("Dizimos", this.movements.filter((item) => isTitheType(item.type)), (item) => item.type || "Dizimos"),
      ...this.group("Ofertas", this.movements.filter((item) => isOfferingType(item.type)), (item) => item.type || "Ofertas"),
      ...this.group("Cancelamentos", this.movements.filter((item) => item.status === "Cancelado"), (item) => item.cancellationReason || "Cancelado"),
      ...this.group("Recibos", this.movements.filter((item) => item.receiptLink || item.localNumber), (item) => item.receiptLink ? "Com link" : "Numero local"),
      ...this.groupContributions(),
    ];
  }

  getComplementaryRows() {
    return ["Fluxo", "Historico", "Histórico", "Relatorio", "Relatório"].flatMap((sheetName) => this.data.getSheetRows(sheetName));
  }

  private group(report: string, rows: FinancialMovement[], getKey: (item: FinancialMovement) => string): ReportRow[] {
    const grouped = new Map<string, { records: number; total: number }>();
    rows.forEach((item) => {
      const key = getKey(item);
      const current = grouped.get(key) ?? { records: 0, total: 0 };
      current.records += 1;
      current.total += item.amount ?? 0;
      grouped.set(key, current);
    });
    return Array.from(grouped.entries()).map(([group, value]) => ({ report, group, ...value }));
  }

  private groupContributions(): ReportRow[] {
    const grouped = new Map<string, { records: number; total: number }>();
    this.contributions.forEach((item) => {
      const current = grouped.get(item.month) ?? { records: 0, total: 0 };
      current.records += 1;
      current.total += item.amount;
      grouped.set(item.month, current);
    });
    return Array.from(grouped.entries()).map(([group, value]) => ({ report: "Dizimos mensais", group, ...value }));
  }
}
