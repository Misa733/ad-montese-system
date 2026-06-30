import type { FinancialMovement } from "./TreasuryService";
import type { TitheContribution, TithePayer } from "./TitheService";

export interface GlobalFilters {
  area: string;
  sector: string;
  congregation: string;
  period: string;
  month: string;
  year: string;
  financialType: string;
  paymentMethod: string;
  tithePayer: string;
  search: string;
}

export const emptyGlobalFilters: GlobalFilters = {
  area: "Todos",
  sector: "Todos",
  congregation: "Todos",
  period: "Todos",
  month: "Todos",
  year: "Todos",
  financialType: "Todos",
  paymentMethod: "Todos",
  tithePayer: "Todos",
  search: "",
};

export class FilterService {
  filterMovements(movements: FinancialMovement[], filters: Partial<GlobalFilters>) {
    return movements.filter((item) => {
      if (!matches(filters.area, item.area)) return false;
      if (!matches(filters.sector, item.sector)) return false;
      if (!matches(filters.congregation, item.congregation)) return false;
      if (!matches(filters.financialType, item.type)) return false;
      if (!matches(filters.paymentMethod, item.paymentMethod)) return false;
      if (filters.period && filters.period !== "Todos" && !item.date.startsWith(filters.period)) return false;
      if (filters.month && filters.month !== "Todos" && item.month && item.month !== filters.month) return false;
      if (filters.year && filters.year !== "Todos" && item.year && item.year !== filters.year) return false;
      if (filters.search && !JSON.stringify(item.raw).toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }

  filterTithePayers(payers: TithePayer[], filters: Partial<GlobalFilters>) {
    return payers.filter((item) => {
      if (!matches(filters.area, item.area)) return false;
      if (!matches(filters.sector, item.sector)) return false;
      if (!matches(filters.congregation, item.congregation)) return false;
      if (!matches(filters.tithePayer, item.name)) return false;
      if (filters.search && !JSON.stringify(item.raw).toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }

  filterContributions(contributions: TitheContribution[], filters: Partial<GlobalFilters>) {
    return contributions.filter((item) => {
      if (!matches(filters.area, item.area)) return false;
      if (!matches(filters.sector, item.sector)) return false;
      if (!matches(filters.congregation, item.congregation)) return false;
      if (!matches(filters.month, item.month)) return false;
      if (!matches(filters.year, item.year)) return false;
      if (!matches(filters.tithePayer, item.tithePayerName)) return false;
      return true;
    });
  }
}

function matches(filter: string | undefined, value: string | number) {
  return !filter || filter === "Todos" || String(value) === filter;
}
