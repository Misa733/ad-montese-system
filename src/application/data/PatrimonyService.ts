import { findValue, normalizeText, sheetValueToString, type SheetDraftChange } from "@/application/data/SpreadsheetDataService";
import type { SheetCellValue, SheetRow, SpreadsheetData, WorksheetData } from "@/domain/sheets/types";
import { PATRIMONY_SEED_ASSETS, PATRIMONY_SEED_INVENTORIES, PATRIMONY_SEED_MAINTENANCES, PATRIMONY_SEED_MOVEMENTS, PATRIMONY_SEED_PROPERTIES } from "./patrimonySeed";

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
  quantity: number;
  unitValue: number;
  totalValue: number;
  internalCode: string;
  value: number;
  currentValue: number;
  acquisitionMethod: string;
  supplier: string;
  invoice: string;
  acquisitionDate: string;
  warranty: string;
  congregation: string;
  congregationCode: string;
  sector: string;
  area: string;
  location: string;
  internalLocation: string;
  responsible: string;
  status: PatrimonyStatus;
  conservationState: string;
  documentation: string;
  documents: string[];
  photos: string[];
  lastInventoryAt: string;
  nextInventoryAt: string;
  observations: string;
  sourceSheet: string;
  qrCode: string;
  isDemo?: boolean;
  raw: SheetRow;
}

export interface PatrimonyMovement {
  id: string;
  assetCode: string;
  assetDescription: string;
  type: string;
  date: string;
  user: string;
  origin?: string;
  destination?: string;
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
  finalValue?: number;
  completedAt?: string;
  observations?: string;
}

export interface PatrimonyInventory {
  id: string;
  name?: string;
  area: string;
  sector: string;
  congregation: string;
  responsible?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  status?: string;
  totalItems?: number;
  checkedItems?: number;
  pendingItems?: number;
  notFoundItems?: number;
  completionPercentage?: number;
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
  neighborhood?: string;
  documentationStatus?: string;
  documentType?: string;
  responsible?: string;
  observations?: string;
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
    return this.getMergedAssets();
  }

  getMovements(assets = this.getAssets()) {
    const imported = assets.map<PatrimonyMovement>((asset) => ({
      id: `mov_${asset.id}_importado`,
      assetCode: asset.code,
      assetDescription: asset.description,
      type: asset.isDemo ? "Tombamento" : "Importado",
      date: this.dateOrToday(asset.acquisitionDate),
      user: asset.isDemo ? "Sistema demo" : "Google Sheets",
      origin: asset.isDemo ? "Seed patrimonial" : "Google Sheets",
      destination: asset.location || asset.congregation,
      observation: asset.isDemo ? "Registro demonstrativo para prototipo patrimonial." : `Registro importado da aba ${asset.sourceSheet}.`,
    }));
    return [...readLocalList<PatrimonyMovement>(LOCAL_MOVEMENTS_KEY), ...PATRIMONY_SEED_MOVEMENTS, ...imported];
  }

  getMaintenances() {
    return [...readLocalList<PatrimonyMaintenance>(LOCAL_MAINTENANCE_KEY), ...PATRIMONY_SEED_MAINTENANCES];
  }

  getInventories() {
    return [...readLocalList<PatrimonyInventory>(LOCAL_INVENTORIES_KEY), ...PATRIMONY_SEED_INVENTORIES];
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

    return dedupeProperties([...PATRIMONY_SEED_PROPERTIES, ...fromAssets]);
  }

  buildDashboard(assets = this.getAssets(), inventories = this.getInventories(), maintenances = this.getMaintenances()) {
    const active = assets.filter((asset) => asset.status === "Ativo").length;
    const inMaintenance = assets.filter((asset) => asset.status === "Em manutencao").length + maintenances.filter((item) => normalizeText(item.status) !== "concluido").length;
    const disposed = assets.filter((asset) => asset.status === "Baixado").length;
    const withoutCode = assets.filter((asset) => !asset.code).length;
    const withoutDocumentation = assets.filter((asset) => isMissingDocumentation(asset.documentation)).length;
    const pendingInventory = assets.filter((asset) => !asset.lastInventoryAt).length;
    const estimatedValue = assets.reduce((sum, asset) => sum + getAssetTotal(asset), 0);
    const properties = this.getProperties(assets).length;
    const upcomingMaintenances = maintenances.filter((item) => !["concluida", "cancelada"].includes(normalizeText(item.status))).length;

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
        properties,
        upcomingMaintenances,
      },
      byArea: groupNumber(assets, (asset) => asset.area || "Nao informado"),
      bySector: groupNumber(assets, (asset) => asset.sector || "Nao informado"),
      byCongregation: groupNumber(assets, (asset) => asset.congregation || "Nao informado"),
      byCategory: groupNumber(assets, (asset) => asset.category || "Nao informado"),
      byStatus: groupNumber(assets, (asset) => asset.status || "Nao informado"),
      byConservation: groupNumber(assets, (asset) => asset.conservationState || "Nao informado"),
      byResponsible: groupNumber(assets, (asset) => asset.responsible || "Nao informado"),
      valueByCongregation: groupCurrency(assets, (asset) => asset.congregation || "Nao informado"),
      acquiredByYear: groupNumber(assets, (asset) => asset.acquisitionDate?.slice(0, 4) || "Sem data"),
      inventoriesByStatus: groupInventoryStatus(inventories),
      latestAssets: [...assets].slice(0, 6),
      inventories,
    };
  }

  getMergedAssets() {
    const realAssetsFromSheet = this.getImportedAssets();
    const demoAssetsSeed = PATRIMONY_SEED_ASSETS;
    return dedupeAssets([...realAssetsFromSheet, ...demoAssetsSeed, ...readLocalList<PatrimonyAsset>(LOCAL_ASSETS_KEY)]);
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
      quantity: Number(input.quantity ?? 1),
      unitValue: Number(input.unitValue ?? input.value ?? 0),
      totalValue: Number(input.totalValue ?? input.currentValue ?? input.value ?? 0),
      internalCode: input.internalCode?.trim() || "",
      value: Number(input.value ?? 0),
      currentValue: Number(input.currentValue ?? input.value ?? 0),
      acquisitionMethod: input.acquisitionMethod?.trim() || "Compra",
      supplier: input.supplier?.trim() || "",
      invoice: input.invoice?.trim() || "",
      acquisitionDate: input.acquisitionDate || new Date().toISOString().slice(0, 10),
      warranty: input.warranty?.trim() || "",
      congregation: input.congregation?.trim() || "Nao informada",
      congregationCode: input.congregationCode?.trim() || input.congregation?.trim() || "NI",
      sector: input.sector?.trim() || "Setor 02",
      area: input.area?.trim() || "Area patrimonial",
      location: input.location?.trim() || "",
      internalLocation: input.internalLocation?.trim() || input.location?.trim() || "",
      responsible: input.responsible?.trim() || "",
      status: input.status ?? "Ativo",
      conservationState: input.conservationState?.trim() || "Bom",
      documentation: input.documentation?.trim() || "Sem documentacao",
      documents: input.documents ?? [],
      photos: input.photos ?? [],
      lastInventoryAt: input.lastInventoryAt ?? "",
      nextInventoryAt: input.nextInventoryAt ?? "",
      observations: input.observations?.trim() || "",
      sourceSheet: "Cadastro local",
      qrCode: input.qrCode ?? code,
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

  createInventory(input: Pick<PatrimonyInventory, "area" | "sector" | "congregation"> & Partial<PatrimonyInventory>) {
    const inventory: PatrimonyInventory = {
      ...input,
      id: `inv_${crypto.randomUUID()}`,
      name: input.name ?? `Inventario anual ${new Date().getFullYear()} - ${input.congregation}`,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString().slice(0, 10),
      status: input.status ?? "Em andamento",
      totalItems: input.totalItems ?? 0,
      checkedItems: input.checkedItems ?? 0,
      pendingItems: input.pendingItems ?? input.totalItems ?? 0,
      notFoundItems: input.notFoundItems ?? 0,
      completionPercentage: input.completionPercentage ?? 0,
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
      inventory.id === inventoryId ? { ...inventory, finishedAt: new Date().toISOString(), status: "Concluido", completionPercentage: 100 } : inventory,
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
      Quantidade: asset.quantity,
      ValorUnitario: asset.unitValue,
      ValorTotal: getAssetTotal(asset),
      Valor: asset.value,
      ValorAtual: asset.currentValue,
      FormaAquisicao: asset.acquisitionMethod,
      Fornecedor: asset.supplier,
      NotaFiscal: asset.invoice,
      DataAquisicao: asset.acquisitionDate,
      Garantia: asset.warranty,
      Congregacao: asset.congregation,
      SiglaCongregacao: asset.congregationCode,
      Setor: asset.sector,
      Area: asset.area,
      Localizacao: asset.location,
      LocalizacaoInterna: asset.internalLocation,
      Responsavel: asset.responsible,
      Situacao: asset.status,
      EstadoConservacao: asset.conservationState,
      Documentacao: asset.documentation,
      Documentos: asset.documents.join(", "),
      Fotos: asset.photos.join(", "),
      UltimaConferencia: asset.lastInventoryAt,
      ProximaConferencia: asset.nextInventoryAt,
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
      quantity: 1,
      unitValue: value,
      totalValue: value,
      internalCode: rawCode,
      value,
      currentValue: value,
      acquisitionMethod: "Importado",
      supplier: sheetValueToString(findValue(row, ["fornecedor"])),
      invoice: sheetValueToString(findValue(row, ["nota fiscal", "nf"])),
      acquisitionDate: sheetValueToString(findValue(row, ["data aquisicao", "data aquisição", "aquisicao", "aquisição"])),
      warranty: sheetValueToString(findValue(row, ["garantia"])),
      congregation,
      congregationCode: congregation.toUpperCase(),
      sector: "Setor 02",
      area: "Patrimonio",
      location: sheetValueToString(findValue(row, ["localizacao", "localização", "endereco", "endereço", "local"])) || congregation,
      responsible: sheetValueToString(findValue(row, ["responsavel", "responsável", "dirigente"])) || "Dirigente local",
      internalLocation: "Templo",
      status: normalizeStatus(statusText),
      conservationState: "Bom",
      documentation,
      documents: documentation ? [documentation] : [],
      photos: [],
      lastInventoryAt: "",
      nextInventoryAt: "",
      observations: "",
      sourceSheet: sheet.title,
      qrCode: code,
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

function dedupeProperties(properties: PatrimonyProperty[]) {
  const seen = new Set<string>();
  return properties.filter((property) => {
    const key = normalizeText(`${property.name}-${property.congregation}-${property.address}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getAssetTotal(asset: PatrimonyAsset) {
  return asset.totalValue || asset.currentValue || asset.value || asset.unitValue * Math.max(asset.quantity || 1, 1);
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
  assets.forEach((asset) => grouped.set(getKey(asset), (grouped.get(getKey(asset)) ?? 0) + getAssetTotal(asset)));
  return Array.from(grouped.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

function groupInventoryStatus(inventories: PatrimonyInventory[]) {
  const grouped = new Map<string, number>();
  inventories.forEach((inventory) => {
    const status = inventory.status || (inventory.finishedAt ? "Concluido" : "Em andamento");
    grouped.set(status, (grouped.get(status) ?? 0) + 1);
  });
  return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
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
