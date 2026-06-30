import type { SheetRow, SpreadsheetData } from "@/domain/sheets/types";
import { findValue, normalizeText, sheetValueToString, SpreadsheetDataService } from "./SpreadsheetDataService";

export interface FinancialMovement {
  id: string;
  congregation: string;
  sector: string;
  area: string;
  type: string;
  identification: string;
  date: string;
  paymentMethod: string;
  amount: number | null;
  localNumber: string;
  receiptLink: string;
  cancellationReason: string;
  congregationNumber: string;
  movementType: string;
  day: string;
  week: string;
  month: string;
  quarter: string;
  year: string;
  status: "Confirmado" | "Cancelado";
  raw: SheetRow;
}

export class TreasuryService {
  private readonly data: SpreadsheetDataService;

  constructor(spreadsheet?: SpreadsheetData) {
    this.data = new SpreadsheetDataService(spreadsheet);
  }

  getMovements() {
    const db = this.data.getSheet("DB");
    return (db?.rows ?? [])
      .filter((row) => Object.values(row).some((value) => value !== null && value !== ""))
      .map((row, index) => this.parseMovement(row, index));
  }

  private parseMovement(row: SheetRow, index: number): FinancialMovement {
    const movementType = text(row, ["ENTRADA/SAIDA", "ENTRADA SAIDA", "entrada_saida", "movimento"]);
    const cancellationReason = text(row, ["MOTIVO CANCELAMENTO", "motivo_cancelamento"]);
    const rawAmount = findValue(row, ["VALOR", "valor"]);
    const parsedAmount = parseMoney(rawAmount);
    const isExpense = /saida|despesa|debito|d[eé]bito/i.test(`${movementType} ${text(row, ["TIPO", "tipo"])}`);
    const amount = parsedAmount === null ? null : isExpense && parsedAmount > 0 ? -parsedAmount : parsedAmount;
    const id = text(row, ["ID", "id"]) || `db_${index + 1}`;

    return {
      id,
      congregation: text(row, ["CONGREGACAO", "CONGREGAÇÃO", "congregacao"]),
      sector: text(row, ["SETOR", "setor"]),
      area: text(row, ["AREA", "ÁREA", "area"]),
      type: text(row, ["TIPO", "tipo"]),
      identification: text(row, ["IDENTIFICACAO", "IDENTIFICAÇÃO", "identificacao"]),
      date: parseDate(findValue(row, ["DATA", "data"])),
      paymentMethod: text(row, ["FORMA", "forma", "FORMA PAGAMENTO"]),
      amount,
      localNumber: text(row, ["NUMERO LOCAL", "NÚMERO LOCAL", "numero_local"]),
      receiptLink: text(row, ["LINK RECIBO", "link_recibo"]),
      cancellationReason,
      congregationNumber: text(row, ["NUMERO CONGREGACAO", "NÚMERO CONGREGAÇÃO", "numero_congregacao"]),
      movementType,
      day: text(row, ["DIA", "dia"]),
      week: text(row, ["SEMANA", "semana"]),
      month: text(row, ["MES", "MÊS", "mes"]),
      quarter: text(row, ["TRIMESTRE", "trimestre"]),
      year: text(row, ["ANO", "ano"]),
      status: cancellationReason || /cancel/i.test(movementType) ? "Cancelado" : "Confirmado",
      raw: row,
    };
  }
}

export function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const cleaned = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/^R\$/i, "")
    .replace(/[^\d,.-]/g, "");

  if (!cleaned || cleaned === "-" || cleaned === ",") return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    normalized = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDate(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const raw = sheetValueToString(value as never);
  if (!raw) return "";
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function text(row: SheetRow, aliases: string[]) {
  return sheetValueToString(findValue(row, aliases));
}

export function isTitheType(type: string) {
  return /diz|d[ií]z/i.test(normalizeText(type));
}

export function isOfferingType(type: string) {
  return /oferta|ordinaria|ordin[aá]ria|missionaria|mission[aá]ria|especial/i.test(type);
}
