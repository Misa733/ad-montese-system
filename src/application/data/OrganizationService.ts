import type { SpreadsheetData } from "@/domain/sheets/types";
import { findValue, sheetValueToString, SpreadsheetDataService } from "./SpreadsheetDataService";
import type { FinancialMovement } from "./TreasuryService";
import type { TithePayer } from "./TitheService";

export interface OrganizationNode {
  id: string;
  name: string;
  area: string;
  sector: string;
  congregation: string;
  number: string;
  totalRaised: number;
  totalTithes: number;
  totalOfferings: number;
  movementCount: number;
  lastMovement: string;
  raw: Record<string, unknown>;
}

export class OrganizationService {
  private readonly data: SpreadsheetDataService;

  constructor(
    spreadsheet: SpreadsheetData | undefined,
    private readonly movements: FinancialMovement[],
    private readonly tithePayers: TithePayer[],
  ) {
    this.data = new SpreadsheetDataService(spreadsheet);
  }

  getCongregations() {
    const fromMovements = this.movements.map((item) => ({
      name: item.congregation,
      sector: item.sector,
      area: item.area,
      number: item.congregationNumber,
      raw: item.raw,
    }));
    const fromPayers = this.tithePayers.map((item) => ({
      name: item.congregation,
      sector: item.sector,
      area: item.area,
      number: "",
      raw: item.raw,
    }));
    const configRows = ["data", "Dados"].flatMap((sheetName) =>
      this.data.getSheetRows(sheetName).map((row) => ({
        name: sheetValueToString(findValue(row, ["CONGREGACAO", "CONGREGAÇÃO", "SEDE", "IGREJA", "NOME"])),
        sector: sheetValueToString(findValue(row, ["SETOR"])),
        area: sheetValueToString(findValue(row, ["AREA", "ÁREA"])),
        number: sheetValueToString(findValue(row, ["NUMERO", "NÚMERO", "CODIGO", "CÓDIGO"])),
        raw: row,
      })),
    );

    const grouped = new Map<string, OrganizationNode>();
    [...fromMovements, ...fromPayers, ...configRows].forEach((item) => {
      if (!item.name) return;
      const key = item.name;
      const related = this.movements.filter((movement) => movement.congregation === item.name);
      const totalRaised = related.reduce((sum, movement) => sum + Math.max(movement.amount ?? 0, 0), 0);
      const totalTithes = related.filter((movement) => /diz|d[ií]z/i.test(movement.type)).reduce((sum, movement) => sum + Math.max(movement.amount ?? 0, 0), 0);
      const totalOfferings = related.filter((movement) => /oferta/i.test(movement.type)).reduce((sum, movement) => sum + Math.max(movement.amount ?? 0, 0), 0);
      const lastMovement = related.map((movement) => movement.date).sort().at(-1) ?? "";
      grouped.set(key, {
        id: key,
        name: item.name,
        area: item.area || grouped.get(key)?.area || "",
        sector: item.sector || grouped.get(key)?.sector || "",
        congregation: item.name,
        number: item.number || grouped.get(key)?.number || "",
        totalRaised,
        totalTithes,
        totalOfferings,
        movementCount: related.length,
        lastMovement,
        raw: item.raw,
      });
    });

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  getAreas() {
    return unique(this.getCongregations().map((item) => item.area));
  }

  getSectors(area = "Todos") {
    return unique(this.getCongregations().filter((item) => area === "Todos" || item.area === area).map((item) => item.sector));
  }

  getCongregationNames(area = "Todos", sector = "Todos") {
    return unique(
      this.getCongregations()
        .filter((item) => area === "Todos" || item.area === area)
        .filter((item) => sector === "Todos" || item.sector === sector)
        .map((item) => item.name),
    );
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
