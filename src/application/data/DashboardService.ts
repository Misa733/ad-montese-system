import type { SpreadsheetData } from "@/domain/sheets/types";
import { SpreadsheetDataService } from "./SpreadsheetDataService";
import { FilterService, type GlobalFilters } from "./FilterService";
import { isOfferingType, isTitheType, type FinancialMovement } from "./TreasuryService";
import type { TitheContribution, TithePayer } from "./TitheService";
import type { OrganizationNode } from "./OrganizationService";

export class DashboardService {
  private readonly filterService = new FilterService();
  private readonly spreadsheetService: SpreadsheetDataService;

  constructor(
    spreadsheet: SpreadsheetData | undefined,
    private readonly movements: FinancialMovement[],
    private readonly tithePayers: TithePayer[],
    private readonly contributions: TitheContribution[],
    private readonly congregations: OrganizationNode[],
  ) {
    this.spreadsheetService = new SpreadsheetDataService(spreadsheet);
  }

  build(filters: GlobalFilters) {
    const movements = this.filterService.filterMovements(this.movements, filters).filter((item) => item.status === "Confirmado");
    const payers = this.filterService.filterTithePayers(this.tithePayers, filters);
    const contributions = this.filterService.filterContributions(this.contributions, filters);
    const revenues = movements.filter((item) => (item.amount ?? 0) > 0);
    const expenses = movements.filter((item) => (item.amount ?? 0) < 0);
    const revenueTotal = sum(revenues.map((item) => item.amount));
    const expenseTotal = Math.abs(sum(expenses.map((item) => item.amount)));

    return {
      cards: {
        revenueTotal,
        expenseTotal,
        balance: revenueTotal - expenseTotal,
        titheTotal: sum(contributions.map((item) => item.amount)) || sum(revenues.filter((item) => isTitheType(item.type)).map((item) => item.amount)),
        offeringTotal: sum(revenues.filter((item) => isOfferingType(item.type)).map((item) => item.amount)),
        ordinaryOffering: sum(revenues.filter((item) => /ordin/i.test(item.type)).map((item) => item.amount)),
        missionaryOffering: sum(revenues.filter((item) => /mission/i.test(item.type)).map((item) => item.amount)),
        specialOffering: sum(revenues.filter((item) => /especial/i.test(item.type)).map((item) => item.amount)),
        pixTotal: sum(revenues.filter((item) => /pix/i.test(item.paymentMethod)).map((item) => item.amount)),
        cashTotal: sum(revenues.filter((item) => /dinheiro|especie|esp[eé]cie/i.test(item.paymentMethod)).map((item) => item.amount)),
        cardTotal: sum(revenues.filter((item) => /cart/i.test(item.paymentMethod)).map((item) => item.amount)),
        movementCount: movements.length,
        receiptCount: movements.filter((item) => item.receiptLink || item.localNumber).length,
        congregationCount: new Set(this.congregations.map((item) => item.name).filter(Boolean)).size,
        sectorCount: new Set(this.congregations.map((item) => item.sector).filter(Boolean)).size,
        areaCount: new Set(this.congregations.map((item) => item.area).filter(Boolean)).size,
        tithePayerCount: payers.length,
        loadedAt: this.spreadsheetService.getSpreadsheet()?.loadedAt ?? "",
      },
      financeSeries: this.byMonth(movements),
      titheSeries: this.byMonth(contributions),
      typeSeries: this.sumBy(revenues, (item) => item.type || "Nao informado"),
      paymentSeries: this.sumBy(revenues, (item) => item.paymentMethod || "Nao informado"),
      congregationSeries: this.sumBy(revenues, (item) => item.congregation || "Nao informado"),
      sectorSeries: this.sumBy(revenues, (item) => item.sector || "Nao informado"),
      areaSeries: this.sumBy(revenues, (item) => item.area || "Nao informado"),
      topCongregations: this.sumBy(revenues, (item) => item.congregation || "Nao informado").slice(0, 10),
      topTithers: this.sumBy(contributions, (item) => item.tithePayerName || "Nao informado").slice(0, 10),
      cashFlowSeries: this.cashFlow(movements),
      annualSeries: this.sumBy(movements, (item) => item.year || item.date.slice(0, 4) || "Sem ano"),
    };
  }

  private byMonth(items: Array<FinancialMovement | TitheContribution>) {
    const grouped = new Map<string, { name: string; receitas: number; despesas: number; dizimos: number }>();
    items.forEach((item) => {
      const name = "date" in item ? item.date.slice(0, 7) || `${item.year}-${item.month}` : item.month;
      const current = grouped.get(name) ?? { name, receitas: 0, despesas: 0, dizimos: 0 };
      const amount = "amount" in item ? item.amount ?? 0 : 0;
      if ("date" in item) {
        if (amount >= 0) current.receitas += amount;
        else current.despesas += Math.abs(amount);
      } else {
        current.dizimos += amount;
      }
      grouped.set(name, current);
    });
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private sumBy<T>(items: T[], getKey: (item: T) => string) {
    const grouped = new Map<string, number>();
    items.forEach((item) => grouped.set(getKey(item), (grouped.get(getKey(item)) ?? 0) + Number((item as { amount?: number | null }).amount ?? 0)));
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  private cashFlow(movements: FinancialMovement[]) {
    let balance = 0;
    return this.byMonth(movements).map((item) => {
      balance += item.receitas - item.despesas;
      return { name: item.name, saldo: balance };
    });
  }
}

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => {
    const numeric = Number(value ?? 0);
    return total + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);
}
