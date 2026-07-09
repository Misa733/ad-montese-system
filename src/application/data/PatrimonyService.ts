import { findValue, normalizeText, sheetValueToString, type SheetDraftChange } from "@/application/data/SpreadsheetDataService";
import type { SheetCellValue, SheetRow, SpreadsheetData, WorksheetData } from "@/domain/sheets/types";
import { PATRIMONY_SEED_ASSETS } from "./patrimonySeed";

export type PatrimonyStatus = "Ativo" | "Em manutencao" | "Baixado" | "Transferido" | "Nao localizado";
export type InventoryCheckStatus = "Confirmado" | "Nao localizado" | "Em manutencao" | "Transferido" | "Baixado";

export interface PatrimonyAsset {
  id: string;
  photo?: string;
  code: string;
  description: string;
  shortDescription: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  serialNumber: string;
  internalCode: string;
  value: number;
  currentValue: number;
  supplier: string;
  invoice: string;
  acquisitionDate: string;
  warranty: string;
  congregation: string;
  sector: string;
  area: string;
  location: string;
  responsible: string;
  status: PatrimonyStatus;
  documentation: string;
  lastInventoryAt: string;
  observations: string;
  sourceSheet: string;
  raw: SheetRow;
}

export interface PatrimonyMovement {
  id: string;
  assetCode: string;
  assetDescription: string;
  type: string;
  date: string;
  user: string;
  observation: string;
}

export interface PatrimonyMaintenance {
  id: string;
  assetCode: string;
  problem: string;
  date: string;
  responsible: string;
  supplier: string;
  value: number;
  warranty: string;
  deadline: string;
  status: string;
}

export interface PatrimonyInventory {
  id: string;
  area: string;
  sector: string;
  congregation: string;
  createdAt: string;
  finishedAt?: string;
  checks: Record<string, PatrimonyInventoryCheck>;
}

export interface PatrimonyInventoryCheck {
  status: InventoryCheckStatus;
  user: string;
  date: string;
  time: string;
  observation: string;
  gps?: string;
}

export interface PatrimonyProperty {
  id: string;
  name: string;
  congregation: string;
  area: string;
  sector: string;
  address: string;
  cep: string;
  city: string;
  state: string;
  type: string;
  documentation: string;
  value: number;
  builtArea: string;
  landArea: string;
  sourceSheet: string;
}

const PATRIMONY_SHEETS = new Set(["sede", "ar", "nm", "ia", "mr", "m1", "m2", "m3", "mh", "pa", "pc", "tu", "mi", "ic", "c15"]);
const ADMIN_SHEETS = new Set(["modelo", "geral", "termos"]);
const LOCAL_ASSETS_KEY = "ad-montese.patrimony.assets";
const LOCAL_MOVEMENTS_KEY = "ad-montese.patrimony.movements";
const LOCAL_MAINTENANCE_KEY = "ad-montese.patrimony.maintenance";
const LOCAL_INVENTORIES_KEY = "ad-montese.patrimony.inventories";

export class PatrimonyService {
  constructor(private readonly spreadsheet?: SpreadsheetData) {}

  getAssets() {
    return dedupeAssets([...this.getImportedAssets(), ...PATRIMONY_SEED_ASSETS, ...readLocalList<PatrimonyAsset>(LOCAL_ASSETS_KEY)]);
  }

  getMovements(assets = this.getAssets()) {
    const imported = assets.map<PatrimonyMovement>((asset) => ({
      id: `mov_${asset.id}_importado`,
      assetCode: asset.code,
      assetDescription: asset.description,
      type: "Importado",
      date: this.dateOrToday(asset.acquisitionDate),
      user: "Google Sheets",
      observation: `Registro importado da aba ${asset.sourceSheet}.`,
    }));
    return [...readLocalList<PatrimonyMovement>(LOCAL_MOVEMENTS_KEY), ...imported];
  }

  getMaintenances() {
    return readLocalList<PatrimonyMaintenance>(LOCAL_MAINTENANCE_KEY);
  }

  getInventories() {
    return readLocalList<PatrimonyInventory>(LOCAL_INVENTORIES_KEY);
  }

  getProperties(assets = this.getAssets()) {
    const fromAssets = assets
      .filter((asset) => ["imovel", "templo", "terreno", "casa pastoral"].some((term) => normalizeText(asset.category).includes(term) || normalizeText(asset.description).includes(term)))
      .map<PatrimonyProperty>((asset) => ({
        id: `property_${asset.id}`,
        name: asset.description,
        congregation: asset.congregation,
        area: asset.area,
        sector: asset.sector,
        address: asset.location,
        cep: "",
        city: "Fortaleza",
        state: "CE",
        type: asset.status === "Ativo" ? "Proprio" : asset.status,
        documentation: asset.documentation,
        value: asset.currentValue || asset.value,
        builtArea: "",
        landArea: "",
        sourceSheet: asset.sourceSheet,
      }));

    return fromAssets;
  }

  buildDashboard(assets = this.getAssets(), inventories = this.getInventories(), maintenances = this.getMaintenances()) {
    const active = assets.filter((asset) => asset.status === "Ativo").length;
    const inMaintenance = assets.filter((asset) => asset.status === "Em manutencao").length + maintenances.filter((item) => normalizeText(item.status) !== "concluido").length;
    const disposed = assets.filter((asset) => asset.status === "Baixado").length;
    const withoutCode = assets.filter((asset) => !asset.code).length;
    const withoutDocumentation = assets.filter((asset) => isMissingDocumentation(asset.documentation)).length;
    const pendingInventory = assets.filter((asset) => !asset.lastInventoryAt).length;
    const estimatedValue = assets.reduce((sum, asset) => sum + (asset.currentValue || asset.value || 0), 0);

    return {
      cards: {
        total: assets.length,
        estimatedValue,
        active,
        inMaintenance,
        disposed,
        withoutCode,
        withoutDocumentation,
        pendingInventory,
      },
      byArea: groupNumber(assets, (asset) => asset.area || "Nao informado"),
      bySector: groupNumber(assets, (asset) => asset.sector || "Nao informado"),
      byCongregation: groupNumber(assets, (asset) => asset.congregation || "Nao informado"),
      byCategory: groupNumber(assets, (asset) => asset.category || "Nao informado"),
      byStatus: groupNumber(assets, (asset) => asset.status || "Nao informado"),
      byResponsible: groupNumber(assets, (asset) => asset.responsible || "Nao informado"),
      valueByCongregation: groupCurrency(assets, (asset) => asset.congregation || "Nao informado"),
      latestAssets: [...assets].slice(0, 6),
      inventories,
    };
  }

  createAsset(input: Partial<PatrimonyAsset>) {
    const current = this.getAssets();
    const code = input.code?.trim() || generatePatrimonyCode(current);
    const asset: PatrimonyAsset = {
      id: `pat_${crypto.randomUUID()}`,
      photo: input.photo ?? "",
      code,
      description: input.description?.trim() || "Bem sem descricao",
      shortDescription: input.shortDescription?.trim() || (input.description ?? "Bem").slice(0, 36),
      category: input.category?.trim() || "Geral",
      subcategory: input.subcategory?.trim() || "",
      brand: input.brand?.trim() || "",
      model: input.model?.trim() || "",
      serialNumber: input.serialNumber?.trim() || "",
      internalCode: input.internalCode?.trim() || "",
      value: Number(input.value ?? 0),
      currentValue: Number(input.currentValue ?? input.value ?? 0),
      supplier: input.supplier?.trim() || "",
      invoice: input.invoice?.trim() || "",
      acquisitionDate: input.acquisitionDate || new Date().toISOString().slice(0, 10),
      warranty: input.warranty?.trim() || "",
      congregation: input.congregation?.trim() || "Nao informada",
      sector: input.sector?.trim() || "Setor 02",
      area: input.area?.trim() || "Area patrimonial",
      location: input.location?.trim() || "",
      responsible: input.responsible?.trim() || "",
      status: input.status ?? "Ativo",
      documentation: input.documentation?.trim() || "Sem documentacao",
      lastInventoryAt: input.lastInventoryAt ?? "",
      observations: input.observations?.trim() || "",
      sourceSheet: "Cadastro local",
      raw: input.raw ?? {},
    };
    saveLocalList(LOCAL_ASSETS_KEY, [asset, ...readLocalList<PatrimonyAsset>(LOCAL_ASSETS_KEY)]);
    saveLocalList(LOCAL_MOVEMENTS_KEY, [
      {
        id: `mov_${crypto.randomUUID()}`,
        assetCode: asset.code,
        assetDescription: asset.description,
        type: "Cadastro",
        date: new Date().toISOString().slice(0, 10),
        user: "Sistema",
        observation: "Bem cadastrado pelo modulo patrimonial.",
      },
      ...readLocalList<PatrimonyMovement>(LOCAL_MOVEMENTS_KEY),
    ]);
    return asset;
  }

  createMaintenance(input: Omit<PatrimonyMaintenance, "id">) {
    const maintenance = { ...input, id: `mnt_${crypto.randomUUID()}` };
    saveLocalList(LOCAL_MAINTENANCE_KEY, [maintenance, ...readLocalList<PatrimonyMaintenance>(LOCAL_MAINTENANCE_KEY)]);
    return maintenance;
  }

  createInventory(input: Pick<PatrimonyInventory, "area" | "sector" | "congregation">) {
    const inventory: PatrimonyInventory = {
      ...input,
      id: `inv_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      checks: {},
    };
    saveLocalList(LOCAL_INVENTORIES_KEY, [inventory, ...this.getInventories()]);
    return inventory;
  }

  updateInventoryCheck(inventoryId: string, assetCode: string, check: PatrimonyInventoryCheck) {
    const inventories = this.getInventories().map((inventory) =>
      inventory.id === inventoryId ? { ...inventory, checks: { ...inventory.checks, [assetCode]: check } } : inventory,
    );
    saveLocalList(LOCAL_INVENTORIES_KEY, inventories);
  }

  finishInventory(inventoryId: string) {
    const inventories = this.getInventories().map((inventory) =>
      inventory.id === inventoryId ? { ...inventory, finishedAt: new Date().toISOString() } : inventory,
    );
    saveLocalList(LOCAL_INVENTORIES_KEY, inventories);
  }

  toSheetRow(asset: PatrimonyAsset): SheetRow {
    return {
      Codigo: asset.code,
      Descricao: asset.description,
      Categoria: asset.category,
      Subcategoria: asset.subcategory,
      Marca: asset.brand,
      Modelo: asset.model,
      NumeroSerie: asset.serialNumber,
      Valor: asset.value,
      ValorAtual: asset.currentValue,
      Fornecedor: asset.supplier,
      NotaFiscal: asset.invoice,
      DataAquisicao: asset.acquisitionDate,
      Garantia: asset.warranty,
      Congregacao: asset.congregation,
      Setor: asset.sector,
      Area: asset.area,
      Localizacao: asset.location,
      Responsavel: asset.responsible,
      Situacao: asset.status,
      Documentacao: asset.documentation,
      Observacoes: asset.observations,
    };
  }

  private getImportedAssets() {
    const sheets = this.spreadsheet?.sheets ?? [];
    return sheets.flatMap((sheet) => (isPatrimonySheet(sheet.title) ? this.parseSheet(sheet) : []));
  }

  private parseSheet(sheet: WorksheetData) {
    const congregation = sheet.title;
    return sheet.rows
      .map((row, index) => this.mapRow(sheet, row, index, congregation))
      .filter((asset): asset is PatrimonyAsset => Boolean(asset));
  }

  private mapRow(sheet: WorksheetData, row: SheetRow, index: number, congregation: string): PatrimonyAsset | null {
    const values = Object.values(row).map(sheetValueToString);
    const meaningful = values.filter((value) => value && value !== "#REF!");
    if (!meaningful.length) return null;

    const explicitDescription = sheetValueToString(findValue(row, ["descricao", "descrição", "bem", "patrimonio", "patrimônio", "item", "imovel", "imóvel"]));
    const first = meaningful[0] ?? "";
    const categorySeed = explicitDescription || first;
    const categoryNorm = normalizeText(categorySeed);
    const hasAssetStatus = meaningful.some((value) => /pr[óo]prio|alugado|cedido|doado|baixado|manuten/i.test(value));
    const isSummaryRow = ["templos", "terrenos"].includes(normalizeText(first));
    const looksLikeAsset =
      (Boolean(explicitDescription) && hasAssetStatus) ||
      ["templo", "terreno", "casa pastoral", "moveis", "móveis", "som", "instrumento", "equipamento", "utensilio"].some((term) => categoryNorm.includes(normalizeText(term))) ||
      meaningful.some((value) => normalizeText(value).includes("documento existente"));

    if (!looksLikeAsset || !hasAssetStatus || isSummaryRow || ADMIN_SHEETS.has(normalizeText(sheet.title))) return null;

    const statusText = sheetValueToString(findValue(row, ["situacao", "situação", "status", "tipo"])) || meaningful.find((value) => /proprio|alugado|cedido|doado|baixado|manut/i.test(value)) || "Ativo";
    const documentation = sheetValueToString(findValue(row, ["documentacao", "documentação", "documento"])) || meaningful.find((value) => /contrato|escritura|declara|documenta|nota/i.test(value)) || "Sem documentacao";
    const rawCode = sheetValueToString(findValue(row, ["codigo", "código", "patrimonio", "patrimônio", "tombamento"]));
    const code = rawCode.match(/[A-Z]{2,5}-?\d{2,}/i) ? rawCode : `ADM-02-${congregation.toUpperCase()}-${String(index + 1).padStart(6, "0")}`;
    const description = explicitDescription || buildDescription(categorySeed, congregation, index);
    const value = parsePatrimonyMoney(findValue(row, ["valor", "valor atual", "estimado", "avaliacao", "avaliação"]));

    return {
      id: `${sheet.id}_${index}_${normalizeText(description)}`,
      code,
      description,
      shortDescription: description.slice(0, 42),
      category: inferCategory(description),
      subcategory: "",
      brand: sheetValueToString(findValue(row, ["marca"])),
      model: sheetValueToString(findValue(row, ["modelo"])),
      serialNumber: sheetValueToString(findValue(row, ["serie", "série", "numero de serie", "número de série"])),
      internalCode: rawCode,
      value,
      currentValue: value,
      supplier: sheetValueToString(findValue(row, ["fornecedor"])),
      invoice: sheetValueToString(findValue(row, ["nota fiscal", "nf"])),
      acquisitionDate: sheetValueToString(findValue(row, ["data aquisicao", "data aquisição", "aquisicao", "aquisição"])),
      warranty: sheetValueToString(findValue(row, ["garantia"])),
      congregation,
      sector: "Setor 02",
      area: "Patrimonio",
      location: sheetValueToString(findValue(row, ["localizacao", "localização", "endereco", "endereço", "local"])) || congregation,
      responsible: sheetValueToString(findValue(row, ["responsavel", "responsável", "dirigente"])) || "Dirigente local",
      status: normalizeStatus(statusText),
      documentation,
      lastInventoryAt: "",
      observations: "",
      sourceSheet: sheet.title,
      raw: row,
    };
  }

  private dateOrToday(value: string) {
    return value || new Date().toISOString().slice(0, 10);
  }
}

export function saveAssetLocally(asset: PatrimonyAsset) {
  saveLocalList(LOCAL_ASSETS_KEY, [asset, ...readLocalList<PatrimonyAsset>(LOCAL_ASSETS_KEY)]);
}

export function getPatrimonyDraftSummary(drafts: SheetDraftChange[]) {
  return drafts.filter((draft) => normalizeText(draft.sheetName).includes("patrimonio")).length;
}

export function isPatrimonySheet(title: string) {
  return PATRIMONY_SHEETS.has(normalizeText(title));
}

export function generatePatrimonyCode(assets: PatrimonyAsset[], prefix = "PAT") {
  const max = assets.reduce((highest, asset) => {
    const match = asset.code.match(/(\d{1,})$/);
    return Math.max(highest, match ? Number(match[1]) : 0);
  }, 0);
  return `${prefix}-${String(max + 1).padStart(6, "0")}`;
}

export function getAssetQrUrl(asset: PatrimonyAsset) {
  const path = `/app/patrimonio?bem=${encodeURIComponent(asset.code)}`;
  return `${window.location.origin}${path}`;
}

function dedupeAssets(assets: PatrimonyAsset[]) {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    const key = normalizeText(asset.code || `${asset.description}-${asset.congregation}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeStatus(value: string): PatrimonyStatus {
  const normalized = normalizeText(value);
  if (normalized.includes("manut")) return "Em manutencao";
  if (normalized.includes("baix")) return "Baixado";
  if (normalized.includes("transfer")) return "Transferido";
  if (normalized.includes("nao localizado")) return "Nao localizado";
  return "Ativo";
}

function inferCategory(value: string) {
  const normalized = normalizeText(value);
  if (normalized.includes("templo") || normalized.includes("terreno") || normalized.includes("casa pastoral")) return "Imovel";
  if (normalized.includes("som") || normalized.includes("microfone") || normalized.includes("caixa")) return "Audio";
  if (normalized.includes("instrumento")) return "Instrumentos";
  if (normalized.includes("mesa") || normalized.includes("cadeira") || normalized.includes("banco")) return "Moveis";
  return "Geral";
}

function buildDescription(seed: string, congregation: string, index: number) {
  const text = seed && seed !== "Documento Existente:" ? seed : "Bem patrimonial";
  return `${text} - ${congregation} #${index + 1}`;
}

function parsePatrimonyMoney(value: unknown) {
  const text = sheetValueToString(value as SheetCellValue | undefined);
  if (!text) return 0;
  const normalized = text.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isMissingDocumentation(value: string) {
  const normalized = normalizeText(value);
  return !normalized || normalized.includes("sem documentacao") || normalized === "-";
}

function groupNumber(assets: PatrimonyAsset[], getKey: (asset: PatrimonyAsset) => string) {
  const grouped = new Map<string, number>();
  assets.forEach((asset) => grouped.set(getKey(asset), (grouped.get(getKey(asset)) ?? 0) + 1));
  return Array.from(grouped.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

function groupCurrency(assets: PatrimonyAsset[], getKey: (asset: PatrimonyAsset) => string) {
  const grouped = new Map<string, number>();
  assets.forEach((asset) => grouped.set(getKey(asset), (grouped.get(getKey(asset)) ?? 0) + (asset.currentValue || asset.value || 0)));
  return Array.from(grouped.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

function readLocalList<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function saveLocalList<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
}
