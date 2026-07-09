import type { ColumnDef } from "@tanstack/react-table";
import {
  BadgeCheck,
  Boxes,
  Camera,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Home,
  Plus,
  Printer,
  QrCode,
  Search,
  Settings,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  generatePatrimonyCode,
  getAssetQrUrl,
  type InventoryCheckStatus,
  type PatrimonyAsset,
  type PatrimonyInventory,
  type PatrimonyMaintenance,
} from "@/application/data/PatrimonyService";
import { useRealData } from "@/application/data/useRealData";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { downloadXlsx } from "@/lib/export";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

type PatrimonyTab = "dashboard" | "catalog" | "form" | "profile" | "inventory" | "movements" | "maintenance" | "properties" | "reports" | "settings";
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

type AssetFilters = {
  area: string;
  sector: string;
  congregation: string;
  category: string;
  status: string;
  conservationState: string;
  responsible: string;
  documentation: string;
};

const tabs: Array<{ id: PatrimonyTab; label: string; icon: typeof Boxes }> = [
  { id: "dashboard", label: "Dashboard", icon: Boxes },
  { id: "catalog", label: "Catalogo", icon: Search },
  { id: "form", label: "Cadastro", icon: Plus },
  { id: "profile", label: "Ficha", icon: Eye },
  { id: "inventory", label: "Inventario", icon: ClipboardCheck },
  { id: "movements", label: "Movimentacoes", icon: BadgeCheck },
  { id: "maintenance", label: "Manutencoes", icon: Wrench },
  { id: "properties", label: "Imoveis", icon: Home },
  { id: "reports", label: "Relatorios", icon: FileText },
  { id: "settings", label: "Configuracoes", icon: Settings },
];

export function PatrimonyPage() {
  const { patrimonyService, spreadsheetService, draftChanges } = useRealData();
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<PatrimonyTab>("dashboard");
  const [selectedAsset, setSelectedAsset] = useState<PatrimonyAsset | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [assetFilter, setAssetFilter] = useState({
    area: "Todos",
    sector: "Todos",
    congregation: "Todos",
    category: "Todos",
    status: "Todos",
    conservationState: "Todos",
    responsible: "Todos",
    documentation: "Todos",
  });
  const assets = useMemo(() => patrimonyService.getAssets(), [patrimonyService, revision]);
  const movements = useMemo(() => patrimonyService.getMovements(assets), [assets, patrimonyService, revision]);
  const maintenances = useMemo(() => patrimonyService.getMaintenances(), [patrimonyService, revision]);
  const inventories = useMemo(() => patrimonyService.getInventories(), [patrimonyService, revision]);
  const properties = useMemo(() => patrimonyService.getProperties(assets), [assets, patrimonyService, revision]);
  const dashboard = useMemo(() => patrimonyService.buildDashboard(assets, inventories, maintenances), [assets, inventories, maintenances, patrimonyService]);
  const filteredAssets = filterAssets(assets, assetFilter);
  const options = useMemo(
    () => ({
      congregations: unique(assets.map((asset) => asset.congregation)),
      categories: unique(assets.map((asset) => asset.category)),
      statuses: unique(assets.map((asset) => asset.status)),
      areas: unique(assets.map((asset) => asset.area)),
      sectors: unique(assets.map((asset) => asset.sector)),
      conservationStates: unique(assets.map((asset) => asset.conservationState)),
      responsibles: unique(assets.map((asset) => asset.responsible)),
    }),
    [assets],
  );

  useEffect(() => {
    const assetCode = new URLSearchParams(window.location.search).get("bem");
    if (!assetCode || !assets.length) return;

    const asset = findAssetByCodeOrText(assets, assetCode);
    if (!asset) return;

    setSelectedAsset(asset);
    setTab("profile");
  }, [assets]);

  function refresh() {
    setRevision((current) => current + 1);
  }

  function saveAsset(asset: PatrimonyAsset) {
    const created = patrimonyService.createAsset(asset);
    spreadsheetService.appendRowToSheet("Patrimonio", patrimonyService.toSheetRow(created));
    setSelectedAsset(created);
    setTab("profile");
    refresh();
    toast.success("Patrimonio cadastrado localmente");
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <PageHeader
        eyebrow="ERP Ministerial"
        title="Gestao Patrimonial"
        description="Controle profissional de bens, inventario, tombamento, QR Code, etiquetas, manutencoes, imoveis e relatorios."
        actions={
          <>
            <Badge>{assets.length} bens importados</Badge>
            <Badge>Planilha + seed demo</Badge>
            <Badge>{draftChanges.filter((draft) => draft.sheetName === "Patrimonio").length} cadastros em rascunho</Badge>
            <Button variant="outline" onClick={() => downloadXlsx("patrimonio.xlsx", filteredAssets as unknown as Array<Record<string, unknown>>)}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => setTab("form")}>
              <Plus className="h-4 w-4" />
              Novo bem
            </Button>
            <Button variant="outline" onClick={() => setScannerOpen(true)}>
              <Camera className="h-4 w-4" />
              Escanear patrimonio
            </Button>
          </>
        }
      />

      <Card className="mb-6 min-w-0 overflow-hidden">
        <CardContent className="flex gap-2 overflow-x-auto p-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
                tab === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
              )}
              onClick={() => setTab(id)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </CardContent>
      </Card>

      {tab === "dashboard" ? <PatrimonyDashboard dashboard={dashboard} assets={assets} /> : null}
      {tab === "catalog" ? (
        <PatrimonyCatalog
          assets={filteredAssets}
          options={options}
          filters={assetFilter}
          setFilters={setAssetFilter}
          onSelect={(asset) => {
            setSelectedAsset(asset);
            setTab("profile");
          }}
        />
      ) : null}
      {tab === "form" ? <AssetForm assets={assets} onSave={saveAsset} /> : null}
      {tab === "profile" ? <AssetProfile asset={selectedAsset ?? assets[0]} onPrintLabel={printAssetLabel} /> : null}
      {tab === "inventory" ? <InventoryPanel assets={assets} inventories={inventories} service={patrimonyService} onRefresh={refresh} /> : null}
      {tab === "movements" ? <MovementsPanel movements={movements} /> : null}
      {tab === "maintenance" ? <MaintenancePanel assets={assets} maintenances={maintenances} service={patrimonyService} onRefresh={refresh} /> : null}
      {tab === "properties" ? <PropertiesPanel properties={properties} /> : null}
      {tab === "reports" ? <PatrimonyReports assets={assets} maintenances={maintenances} inventories={inventories} /> : null}
      {tab === "settings" ? <PatrimonySettings assets={assets} /> : null}
      {scannerOpen ? <CameraScannerModal assets={assets} onClose={() => setScannerOpen(false)} /> : null}
    </div>
  );
}

function PatrimonyDashboard({ dashboard, assets }: { dashboard: ReturnType<ReturnType<typeof useRealData>["patrimonyService"]["buildDashboard"]>; assets: PatrimonyAsset[] }) {
  const cards = [
    { label: "Total de bens", value: dashboard.cards.total, icon: Boxes },
    { label: "Valor estimado", value: formatCurrency(dashboard.cards.estimatedValue), icon: BadgeCheck },
    { label: "Ativos", value: dashboard.cards.active, icon: BadgeCheck },
    { label: "Em manutencao", value: dashboard.cards.inMaintenance, icon: Wrench },
    { label: "Baixados", value: dashboard.cards.disposed, icon: FileText },
    { label: "Sem tombamento", value: dashboard.cards.withoutCode, icon: QrCode },
    { label: "Sem documentacao", value: dashboard.cards.withoutDocumentation, icon: FileText },
    { label: "Inventario pendente", value: dashboard.cards.pendingInventory, icon: ClipboardCheck },
    { label: "Imoveis cadastrados", value: dashboard.cards.properties, icon: Home },
    { label: "Proximas manutencoes", value: dashboard.cards.upcomingMaintenances, icon: Wrench },
  ];
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="min-w-0">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 break-words text-2xl font-semibold">{value}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <PatrimonyBar title="Patrimonio por Area" data={dashboard.byArea} />
        <PatrimonyBar title="Patrimonio por Setor" data={dashboard.bySector} />
        <PatrimonyBar title="Patrimonio por Congregacao" data={dashboard.byCongregation} />
        <PatrimonyBar title="Patrimonio por Categoria" data={dashboard.byCategory} />
        <PatrimonyBar title="Estado dos bens" data={dashboard.byStatus} />
        <PatrimonyBar title="Estado de conservacao" data={dashboard.byConservation} />
        <PatrimonyBar title="Valor patrimonial" data={dashboard.valueByCongregation} currency />
        <PatrimonyBar title="Bens por responsavel" data={dashboard.byResponsible} />
        <PatrimonyBar title="Bens adquiridos por ano" data={dashboard.acquiredByYear} />
        <PatrimonyBar title="Inventarios por status" data={dashboard.inventoriesByStatus} />
        <Card>
          <CardHeader>
            <CardTitle>Ultimos patrimonios cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(dashboard.latestAssets.length ? dashboard.latestAssets : assets.slice(0, 6)).map((asset) => (
              <div key={asset.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{asset.description}</p>
                  <p className="text-sm text-muted-foreground">{asset.code} | {asset.congregation}</p>
                </div>
                <Badge>{asset.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PatrimonyCatalog({
  assets,
  options,
  filters,
  setFilters,
  onSelect,
}: {
  assets: PatrimonyAsset[];
  options: { congregations: string[]; categories: string[]; statuses: string[]; areas: string[]; sectors: string[]; conservationStates: string[]; responsibles: string[] };
  filters: AssetFilters;
  setFilters: (filters: AssetFilters) => void;
  onSelect: (asset: PatrimonyAsset) => void;
}) {
  const columns = useMemo<ColumnDef<PatrimonyAsset>[]>(
    () => [
      { accessorKey: "photo", header: "Foto", cell: () => <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface"><Boxes className="h-5 w-5 text-primary" /></div> },
      { accessorKey: "code", header: "Codigo Patrimonial" },
      { accessorKey: "description", header: "Descricao" },
      { accessorKey: "category", header: "Categoria" },
      { accessorKey: "congregation", header: "Congregacao" },
      { accessorKey: "sector", header: "Setor" },
      { accessorKey: "area", header: "Area" },
      { accessorKey: "responsible", header: "Responsavel" },
      { accessorKey: "quantity", header: "Qtd" },
      { accessorKey: "status", header: "Situacao", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
      { accessorKey: "conservationState", header: "Estado" },
      { accessorKey: "currentValue", header: "Valor total", cell: ({ row }) => formatCurrency(getAssetTotal(row.original)) },
      { accessorKey: "acquisitionDate", header: "Data aquisicao" },
      { accessorKey: "lastInventoryAt", header: "Ultima conferencia", cell: ({ row }) => row.original.lastInventoryAt || "Pendente" },
      {
        id: "actions",
        header: "Acoes",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => onSelect(row.original)} aria-label="Ver ficha">
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onSelect],
  );

  return (
    <div className="grid gap-4">
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Area" value={filters.area} options={options.areas} onChange={(value) => setFilters({ ...filters, area: value })} />
          <FilterSelect label="Setor" value={filters.sector} options={options.sectors} onChange={(value) => setFilters({ ...filters, sector: value })} />
          <FilterSelect label="Congregacao" value={filters.congregation} options={options.congregations} onChange={(value) => setFilters({ ...filters, congregation: value })} />
          <FilterSelect label="Categoria" value={filters.category} options={options.categories} onChange={(value) => setFilters({ ...filters, category: value })} />
          <FilterSelect label="Situacao" value={filters.status} options={options.statuses} onChange={(value) => setFilters({ ...filters, status: value })} />
          <FilterSelect label="Estado" value={filters.conservationState} options={options.conservationStates} onChange={(value) => setFilters({ ...filters, conservationState: value })} />
          <FilterSelect label="Responsavel" value={filters.responsible} options={options.responsibles} onChange={(value) => setFilters({ ...filters, responsible: value })} />
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            Documentacao
            <Select className="mt-1 w-full" value={filters.documentation} onChange={(event) => setFilters({ ...filters, documentation: event.target.value })}>
              <option>Todos</option>
              <option>Com documentacao</option>
              <option>Sem documentacao</option>
            </Select>
          </label>
        </CardContent>
      </Card>
      <div className="lg:hidden">
        <MobileAssetCards assets={assets} onSelect={onSelect} />
      </div>
      <div className="hidden lg:block">
        <DataTable columns={columns} data={assets} searchPlaceholder="Pesquisar patrimonio..." />
      </div>
    </div>
  );
}

function AssetForm({ assets, onSave }: { assets: PatrimonyAsset[]; onSave: (asset: PatrimonyAsset) => void }) {
  const nextCode = generatePatrimonyCode(assets);
  const [form, setForm] = useState<Partial<PatrimonyAsset>>({ code: nextCode, status: "Ativo", sector: "Setor 02", area: "Patrimonio" });
  function setField<K extends keyof PatrimonyAsset>(key: K, value: PatrimonyAsset[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastro de Patrimonio</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Descricao" value={form.description ?? ""} onChange={(value) => setField("description", value)} />
          <Field label="Categoria" value={form.category ?? ""} onChange={(value) => setField("category", value)} />
          <Field label="Subcategoria" value={form.subcategory ?? ""} onChange={(value) => setField("subcategory", value)} />
          <Field label="Patrimonio" value={form.code ?? nextCode} onChange={(value) => setField("code", value)} />
          <Field label="Marca" value={form.brand ?? ""} onChange={(value) => setField("brand", value)} />
          <Field label="Modelo" value={form.model ?? ""} onChange={(value) => setField("model", value)} />
          <Field label="Numero de Serie" value={form.serialNumber ?? ""} onChange={(value) => setField("serialNumber", value)} />
          <Field label="Codigo interno" value={form.internalCode ?? ""} onChange={(value) => setField("internalCode", value)} />
          <Field label="Valor" type="number" value={String(form.value ?? "")} onChange={(value) => setField("value", Number(value))} />
          <Field label="Valor atual" type="number" value={String(form.currentValue ?? "")} onChange={(value) => setField("currentValue", Number(value))} />
          <Field label="Fornecedor" value={form.supplier ?? ""} onChange={(value) => setField("supplier", value)} />
          <Field label="Nota Fiscal" value={form.invoice ?? ""} onChange={(value) => setField("invoice", value)} />
          <Field label="Data aquisicao" type="date" value={form.acquisitionDate ?? ""} onChange={(value) => setField("acquisitionDate", value)} />
          <Field label="Garantia" value={form.warranty ?? ""} onChange={(value) => setField("warranty", value)} />
          <Field label="Congregacao" value={form.congregation ?? ""} onChange={(value) => setField("congregation", value)} />
          <Field label="Setor" value={form.sector ?? ""} onChange={(value) => setField("sector", value)} />
          <Field label="Area" value={form.area ?? ""} onChange={(value) => setField("area", value)} />
          <Field label="Localizacao" value={form.location ?? ""} onChange={(value) => setField("location", value)} />
          <Field label="Responsavel" value={form.responsible ?? ""} onChange={(value) => setField("responsible", value)} />
          <label className="text-xs font-medium text-muted-foreground">
            Situacao
            <Select className="mt-1 w-full" value={form.status ?? "Ativo"} onChange={(event) => setField("status", event.target.value as PatrimonyAsset["status"])}>
              <option>Ativo</option>
              <option>Em manutencao</option>
              <option>Baixado</option>
              <option>Transferido</option>
              <option>Nao localizado</option>
            </Select>
          </label>
          <Field label="Documentos / Anexos" value={form.documentation ?? ""} onChange={(value) => setField("documentation", value)} />
          <Field label="Fotos" value={form.photo ?? ""} onChange={(value) => setField("photo", value)} />
        </div>
        <label className="text-xs font-medium text-muted-foreground">
          Observacoes
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={form.observations ?? ""}
            onChange={(event) => setField("observations", event.target.value)}
          />
        </label>
        <div className="flex justify-end">
          <Button onClick={() => onSave(form as PatrimonyAsset)}>
            <Plus className="h-4 w-4" />
            Salvar patrimonio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetProfile({ asset, onPrintLabel }: { asset?: PatrimonyAsset; onPrintLabel: (asset: PatrimonyAsset) => void }) {
  if (!asset) {
    return <EmptyState title="Nenhum patrimonio selecionado" description="Abra o catalogo e selecione um bem para visualizar a ficha completa." />;
  }
  const qrUrl = getQrImage(asset);
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{asset.description}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{asset.code} | {asset.congregation}</p>
          </div>
          <Badge>{asset.status}</Badge>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Info label="Categoria" value={asset.category} />
            <Info label="Localizacao" value={asset.location || asset.congregation} />
            <Info label="Setor" value={asset.sector} />
            <Info label="Area" value={asset.area} />
            <Info label="Responsavel" value={asset.responsible} />
            <Info label="Quantidade" value={asset.quantity || 1} />
            <Info label="Valor unitario" value={formatCurrency(asset.unitValue || asset.value)} />
            <Info label="Valor total" value={formatCurrency(getAssetTotal(asset))} />
            <Info label="Estado" value={asset.conservationState || "Nao informado"} />
            <Info label="Marca / modelo" value={[asset.brand, asset.model].filter(Boolean).join(" / ") || "Nao informado"} />
            <Info label="Data aquisicao" value={asset.acquisitionDate || "Nao informada"} />
            <Info label="Forma aquisicao" value={asset.acquisitionMethod || "Nao informada"} />
            <Info label="Documentos" value={asset.documentation} />
            <Info label="Ultima conferencia" value={asset.lastInventoryAt || "Pendente"} />
          </div>
          <Info label="Observacoes" value={asset.observations || "Sem observacoes registradas."} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>QR Code e Etiqueta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex justify-center rounded-md border border-border bg-white p-4">
            <img className="h-44 w-44" src={qrUrl} alt={`QR Code ${asset.code}`} />
          </div>
          <div className="grid gap-2">
            <Button onClick={() => onPrintLabel(asset)}>
              <Printer className="h-4 w-4" />
              Imprimir etiqueta
            </Button>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(getAssetQrUrl(asset))}>
              <QrCode className="h-4 w-4" />
              Copiar link do QR Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InventoryPanel({
  assets,
  inventories,
  service,
  onRefresh,
}: {
  assets: PatrimonyAsset[];
  inventories: PatrimonyInventory[];
  service: ReturnType<typeof useRealData>["patrimonyService"];
  onRefresh: () => void;
}) {
  const [scope, setScope] = useState({ area: "Todos", sector: "Todos", congregation: "Todos" });
  const [activeId, setActiveId] = useState(inventories[0]?.id ?? "");
  const [scannerOpen, setScannerOpen] = useState(false);
  const activeInventory = inventories.find((inventory) => inventory.id === activeId);
  const scopedAssets = filterAssets(assets, { category: "Todos", status: "Todos", congregation: scope.congregation }).filter(
    (asset) => (scope.area === "Todos" || asset.area === scope.area) && (scope.sector === "Todos" || asset.sector === scope.sector),
  );
  const checked = activeInventory?.checkedItems ?? (activeInventory ? Object.keys(activeInventory.checks).length : 0);
  const totalItems = activeInventory?.totalItems ?? scopedAssets.length;
  const pendingItems = activeInventory?.pendingItems ?? Math.max(scopedAssets.length - checked, 0);
  const notFoundItems = activeInventory?.notFoundItems ?? 0;
  const percent = activeInventory?.completionPercentage ?? (totalItems ? Math.round((checked / totalItems) * 100) : 0);

  function createInventory() {
    const inventory = service.createInventory(scope);
    setActiveId(inventory.id);
    onRefresh();
    toast.success("Inventario iniciado");
  }

  function check(asset: PatrimonyAsset, status: InventoryCheckStatus) {
    if (!activeInventory) return;
    const now = new Date();
    service.updateInventoryCheck(activeInventory.id, asset.code, {
      status,
      user: "Usuario atual",
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      observation: "",
    });
    onRefresh();
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <FilterSelect label="Area" value={scope.area} options={unique(assets.map((asset) => asset.area))} onChange={(value) => setScope({ ...scope, area: value })} />
          <FilterSelect label="Setor" value={scope.sector} options={unique(assets.map((asset) => asset.sector))} onChange={(value) => setScope({ ...scope, sector: value })} />
          <FilterSelect label="Congregacao" value={scope.congregation} options={unique(assets.map((asset) => asset.congregation))} onChange={(value) => setScope({ ...scope, congregation: value })} />
          <div className="flex items-end gap-2">
            <Button className="w-full" onClick={createInventory}>
              <ClipboardCheck className="h-4 w-4" />
              Novo inventario
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setScannerOpen(true)}>
              <Camera className="h-4 w-4" />
              Escanear
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Concluido" value={`${percent}%`} />
        <Metric label="Conferidos" value={checked} />
        <Metric label="Pendentes" value={pendingItems} />
        <Metric label="Nao localizados" value={notFoundItems} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inventarios cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {inventories.map((inventory) => (
            <button key={inventory.id} className={cn("rounded-md border p-3 text-left", activeId === inventory.id ? "border-primary bg-surface" : "border-border")} onClick={() => setActiveId(inventory.id)}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{inventory.name ?? `Inventario ${inventory.congregation}`}</span>
                <Badge>{inventory.status ?? (inventory.finishedAt ? "Concluido" : "Em andamento")}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{inventory.responsible ?? "Responsavel nao informado"} | {inventory.completionPercentage ?? 0}% concluido</p>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Conferencia</CardTitle>
          <Button variant="outline" onClick={() => activeInventory && (service.finishInventory(activeInventory.id), onRefresh())} disabled={!activeInventory}>
            Finalizar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {!activeInventory ? <p className="text-sm text-muted-foreground">Crie um inventario para iniciar a conferencia.</p> : null}
          {scopedAssets.map((asset) => (
            <div key={asset.id} className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <p className="truncate font-medium">{asset.description}</p>
                <p className="text-sm text-muted-foreground">{asset.code} | {asset.congregation} | {activeInventory?.checks[asset.code]?.status ?? "Pendente"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                {(["Confirmado", "Nao localizado", "Em manutencao", "Transferido", "Baixado"] as InventoryCheckStatus[]).map((status) => (
                  <Button key={status} variant="outline" size="sm" onClick={() => check(asset, status)} disabled={!activeInventory}>
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Camera className="h-5 w-5 text-primary" />
          Leitura por camera preparada: o QR Code abre a ficha do bem e pode ser usado na conferencia do inventario.
        </CardContent>
      </Card>
      {scannerOpen ? <CameraScannerModal assets={assets} onClose={() => setScannerOpen(false)} /> : null}
    </div>
  );
}

function MovementsPanel({ movements }: { movements: Array<{ id: string; assetCode: string; assetDescription: string; type: string; date: string; user: string; observation: string }> }) {
  const columns = useMemo<ColumnDef<(typeof movements)[number]>[]>(
    () => [
      { accessorKey: "date", header: "Data" },
      { accessorKey: "assetCode", header: "Codigo" },
      { accessorKey: "assetDescription", header: "Bem" },
      { accessorKey: "type", header: "Tipo" },
      { accessorKey: "user", header: "Usuario" },
      { accessorKey: "observation", header: "Observacao" },
    ],
    [],
  );
  return <DataTable columns={columns} data={movements} searchPlaceholder="Pesquisar historico..." />;
}

function MaintenancePanel({
  assets,
  maintenances,
  service,
  onRefresh,
}: {
  assets: PatrimonyAsset[];
  maintenances: PatrimonyMaintenance[];
  service: ReturnType<typeof useRealData>["patrimonyService"];
  onRefresh: () => void;
}) {
  const [form, setForm] = useState<Omit<PatrimonyMaintenance, "id">>({
    assetCode: assets[0]?.code ?? "",
    problem: "",
    date: new Date().toISOString().slice(0, 10),
    responsible: "",
    supplier: "",
    value: 0,
    warranty: "",
    deadline: "",
    status: "Aberta",
  });
  const columns = useMemo<ColumnDef<PatrimonyMaintenance>[]>(
    () => [
      { accessorKey: "date", header: "Data" },
      { accessorKey: "assetCode", header: "Patrimonio" },
      { accessorKey: "problem", header: "Problema" },
      { accessorKey: "responsible", header: "Responsavel" },
      { accessorKey: "supplier", header: "Fornecedor" },
      { accessorKey: "value", header: "Valor", cell: ({ row }) => formatCurrency(row.original.value) },
      { accessorKey: "deadline", header: "Prazo" },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
    ],
    [],
  );
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Nova manutencao</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-medium text-muted-foreground">
            Patrimonio
            <Select className="mt-1 w-full" value={form.assetCode} onChange={(event) => setForm({ ...form, assetCode: event.target.value })}>
              {assets.map((asset) => (
                <option key={asset.code} value={asset.code}>{asset.code} - {asset.description}</option>
              ))}
            </Select>
          </label>
          <Field label="Problema" value={form.problem} onChange={(value) => setForm({ ...form, problem: value })} />
          <Field label="Data" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
          <Field label="Responsavel" value={form.responsible} onChange={(value) => setForm({ ...form, responsible: value })} />
          <Field label="Fornecedor" value={form.supplier} onChange={(value) => setForm({ ...form, supplier: value })} />
          <Field label="Valor" type="number" value={String(form.value)} onChange={(value) => setForm({ ...form, value: Number(value) })} />
          <Field label="Garantia" value={form.warranty} onChange={(value) => setForm({ ...form, warranty: value })} />
          <Field label="Prazo" type="date" value={form.deadline} onChange={(value) => setForm({ ...form, deadline: value })} />
          <Button className="self-end" onClick={() => (service.createMaintenance(form), onRefresh(), toast.success("Manutencao cadastrada"))}>
            <Wrench className="h-4 w-4" />
            Salvar
          </Button>
        </CardContent>
      </Card>
      <DataTable columns={columns} data={maintenances} searchPlaceholder="Pesquisar manutencoes..." />
    </div>
  );
}

function PropertiesPanel({ properties }: { properties: ReturnType<ReturnType<typeof useRealData>["patrimonyService"]["getProperties"]> }) {
  const columns = useMemo<ColumnDef<(typeof properties)[number]>[]>(
    () => [
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "congregation", header: "Congregacao" },
      { accessorKey: "area", header: "Area" },
      { accessorKey: "sector", header: "Setor" },
      { accessorKey: "address", header: "Endereco" },
      { accessorKey: "type", header: "Tipo" },
      { accessorKey: "documentation", header: "Documentacao" },
      { accessorKey: "value", header: "Valor", cell: ({ row }) => formatCurrency(row.original.value) },
    ],
    [],
  );
  return <DataTable columns={columns} data={properties} searchPlaceholder="Pesquisar imoveis..." />;
}

function PatrimonyReports({ assets, maintenances, inventories }: { assets: PatrimonyAsset[]; maintenances: PatrimonyMaintenance[]; inventories: PatrimonyInventory[] }) {
  const [report, setReport] = useState("congregation");
  const [status, setStatus] = useState("Todos");
  const rows = buildReportRows(filterAssets(assets, { congregation: "Todos", category: "Todos", status }), report);
  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <label className="text-xs font-medium text-muted-foreground">
            Relatorio
            <Select className="mt-1 w-full" value={report} onChange={(event) => setReport(event.target.value)}>
              <option value="congregation">Patrimonio por Congregacao</option>
              <option value="sector">Patrimonio por Setor</option>
              <option value="area">Patrimonio por Area</option>
              <option value="category">Patrimonio por Categoria</option>
              <option value="missingInventory">Patrimonio sem inventario</option>
              <option value="missingDocument">Patrimonio sem documento</option>
              <option value="maintenance">Patrimonio em manutencao</option>
              <option value="disposed">Patrimonio baixado</option>
              <option value="value">Valor patrimonial</option>
            </Select>
          </label>
          <FilterSelect label="Situacao" value={status} options={unique(assets.map((asset) => asset.status))} onChange={setStatus} />
          <div className="flex items-end gap-2">
            <Button variant="outline" className="w-full" onClick={() => downloadXlsx("relatorio-patrimonial.xlsx", rows)}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button className="w-full" onClick={() => printPatrimonyReport(rows, report, maintenances.length, inventories.length)}>
              <Printer className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>
      <DataTable columns={reportColumns} data={rows} searchPlaceholder="Pesquisar relatorio patrimonial..." />
    </div>
  );
}

function PatrimonySettings({ assets }: { assets: PatrimonyAsset[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Importacao Google Sheets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <p>Abas patrimoniais monitoradas: Sede, Ar, NM, IA, MR, M1, M2, M3, MH, PA, PC, Tu, Mi, Ic e C15.</p>
          <p>Abas administrativas preservadas como referencia: Modelo, Geral e Termos.</p>
          <p>Arquitetura separada em service, parser, mapper e entidade para futura migracao fora do Google Sheets.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tombamento automatico</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Info label="Proximo codigo" value={generatePatrimonyCode(assets)} />
          <Info label="Modelo simples" value="PAT-000001" />
          <Info label="Modelo por congregacao" value="ADM-02-PA-000001" />
        </CardContent>
      </Card>
    </div>
  );
}

function PatrimonyBar({ title, data, currency = false }: { title: string; data: Array<{ name: string; value: number }>; currency?: boolean }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => (currency ? formatCurrency(Number(value)) : Number(value))} />
          <Bar dataKey="value" fill="#7A0C10" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function MobileAssetCards({ assets, onSelect }: { assets: PatrimonyAsset[]; onSelect: (asset: PatrimonyAsset) => void }) {
  return (
    <div className="grid gap-3">
      {assets.map((asset) => (
        <Card key={asset.id} className="min-w-0 overflow-hidden">
          <CardContent className="grid gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-lg font-semibold">{asset.description}</p>
                <p className="text-sm text-muted-foreground">{asset.code}</p>
              </div>
              <Badge>{asset.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Info label="Congregacao" value={asset.congregation} />
              <Info label="Categoria" value={asset.category} />
              <Info label="Valor" value={formatCurrency(asset.currentValue || asset.value)} />
              <Info label="Conferencia" value={asset.lastInventoryAt || "Pendente"} />
            </div>
            <Button variant="outline" onClick={() => onSelect(asset)}>
              <Eye className="h-4 w-4" />
              Abrir ficha
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="min-w-0 text-xs font-medium text-muted-foreground">
      {label}
      <Select className="mt-1 w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        <option>Todos</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </Select>
    </label>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="min-w-0 text-xs font-medium text-muted-foreground">
      {label}
      <Input className="mt-1" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-card p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value || "-"}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function CameraScannerModal({ assets, onClose }: { assets: PatrimonyAsset[]; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PatrimonyAsset | null>(assets[0] ?? null);
  const [resultStatus, setResultStatus] = useState("Solicitando acesso a camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(Boolean(window.BarcodeDetector));

  useEffect(() => {
    let cancelled = false;
    let animationFrame = 0;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setResultStatus("Camera indisponivel neste navegador. Use a busca manual.");
        setScannerSupported(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);

        if (!window.BarcodeDetector) {
          setScannerSupported(false);
          setResultStatus("Camera aberta. Leitura automatica nao suportada; digite o codigo abaixo.");
          return;
        }

        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        setResultStatus("Aponte a camera para o QR Code da etiqueta.");

        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const codes = await detector.detect(videoRef.current);
              const rawValue = codes[0]?.rawValue;
              if (rawValue) {
                const parsedCode = extractAssetCode(rawValue);
                setQuery(parsedCode);
                findAsset(parsedCode, "QR Code lido pela camera");
                return;
              }
            }
          } catch {
            setResultStatus("Nao consegui ler este quadro. Aproxime a etiqueta ou use a busca manual.");
          }
          animationFrame = window.requestAnimationFrame(scan);
        };

        animationFrame = window.requestAnimationFrame(scan);
      } catch {
        setResultStatus("Permissao da camera negada ou indisponivel. Use a busca manual.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function search() {
    findAsset(query, "Patrimonio localizado");
  }

  function findAsset(value: string, successMessage: string) {
    const found = findAssetByCodeOrText(assets, value);
    setSelected(found ?? null);
    setResultStatus(found ? successMessage : "Nao encontrado");
  }

  function mark(status: string) {
    setResultStatus(status);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <Card className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-b-none sm:rounded-lg">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Conferencia por camera</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Use a camera do celular para ler a etiqueta patrimonial ou informe o codigo manualmente.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <FileText className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-72 overflow-hidden rounded-lg border border-border bg-black">
              <video ref={videoRef} className="h-72 w-full object-cover" playsInline muted />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
              </div>
              <div className="absolute bottom-3 left-3 right-3 rounded-md bg-black/65 px-3 py-2 text-xs text-white">
                {cameraReady ? (scannerSupported ? "Camera ativa: procurando QR Code" : "Camera ativa: leitura automatica indisponivel") : "Abrindo camera"}
              </div>
            </div>
            <div className="grid gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                Codigo patrimonial
                <Input className="mt-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex: ADM-S02-MR-SOM-0001" />
              </label>
              <Button onClick={search}>
                <Search className="h-4 w-4" />
                Buscar
              </Button>
              <Badge>{resultStatus}</Badge>
              {selected ? (
                <div className="grid gap-2 rounded-md border border-border p-3">
                  <p className="font-semibold">{selected.description}</p>
                  <p className="text-sm text-muted-foreground">{selected.code} | {selected.congregation} | {selected.internalLocation}</p>
                  <Info label="Responsavel" value={selected.responsible} />
                  <Info label="Estado" value={selected.conservationState} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum patrimonio selecionado.</p>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button onClick={() => mark("Existencia confirmada")} disabled={!selected}>
              <BadgeCheck className="h-4 w-4" />
              Confirmar existencia
            </Button>
            <Button variant="outline" onClick={() => mark("Marcado como nao localizado")} disabled={!selected}>
              Nao localizado
            </Button>
            <Button variant="outline" onClick={() => mark("Enviado para manutencao")} disabled={!selected}>
              <Wrench className="h-4 w-4" />
              Manutencao
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function extractAssetCode(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get("bem") ?? value;
  } catch {
    return value;
  }
}

function findAssetByCodeOrText(assets: PatrimonyAsset[], value: string) {
  const normalized = extractAssetCode(value).trim().toLowerCase();
  if (!normalized) return null;
  return assets.find((asset) => asset.code.toLowerCase() === normalized || asset.code.toLowerCase().includes(normalized) || asset.description.toLowerCase().includes(normalized)) ?? null;
}

const reportColumns: ColumnDef<{ grupo: string; registros: number; valor: number }>[] = [
  { accessorKey: "grupo", header: "Grupo" },
  { accessorKey: "registros", header: "Registros" },
  { accessorKey: "valor", header: "Valor", cell: ({ row }) => formatCurrency(row.original.valor) },
];

function filterAssets(assets: PatrimonyAsset[], filters: Partial<AssetFilters>) {
  return assets.filter((asset) => {
    if (filters.area && filters.area !== "Todos" && asset.area !== filters.area) return false;
    if (filters.sector && filters.sector !== "Todos" && asset.sector !== filters.sector) return false;
    if (filters.congregation && filters.congregation !== "Todos" && asset.congregation !== filters.congregation) return false;
    if (filters.category && filters.category !== "Todos" && asset.category !== filters.category) return false;
    if (filters.status && filters.status !== "Todos" && asset.status !== filters.status) return false;
    if (filters.conservationState && filters.conservationState !== "Todos" && asset.conservationState !== filters.conservationState) return false;
    if (filters.responsible && filters.responsible !== "Todos" && asset.responsible !== filters.responsible) return false;
    if (filters.documentation === "Com documentacao" && (!asset.documents.length || asset.documentation.toLowerCase().includes("sem document"))) return false;
    if (filters.documentation === "Sem documentacao" && asset.documents.length && !asset.documentation.toLowerCase().includes("sem document")) return false;
    return true;
  });
}

function getAssetTotal(asset: PatrimonyAsset) {
  return asset.totalValue || asset.currentValue || asset.value || (asset.unitValue || 0) * Math.max(asset.quantity || 1, 1);
}

function buildReportRows(assets: PatrimonyAsset[], report: string) {
  const rows =
    report === "missingInventory"
      ? assets.filter((asset) => !asset.lastInventoryAt)
      : report === "missingDocument"
        ? assets.filter((asset) => asset.documentation.toLowerCase().includes("sem document"))
        : report === "maintenance"
          ? assets.filter((asset) => asset.status === "Em manutencao")
          : report === "disposed"
            ? assets.filter((asset) => asset.status === "Baixado")
            : assets;
  const key =
    report === "sector" ? "sector" : report === "area" ? "area" : report === "category" ? "category" : report === "value" ? "congregation" : "congregation";
  const grouped = new Map<string, { registros: number; valor: number }>();
  rows.forEach((asset) => {
    const group = String(asset[key as keyof PatrimonyAsset] || "Nao informado");
    const current = grouped.get(group) ?? { registros: 0, valor: 0 };
    current.registros += 1;
    current.valor += asset.currentValue || asset.value || 0;
    grouped.set(group, current);
  });
  return Array.from(grouped.entries()).map(([grupo, value]) => ({ grupo, ...value }));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function getQrImage(asset: PatrimonyAsset) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(getAssetQrUrl(asset))}`;
}

function printAssetLabel(asset: PatrimonyAsset) {
  const printWindow = window.open("", "_blank", "width=420,height=640");
  if (!printWindow) return;
  const logo = `${window.location.origin}/assets/logo.png`;
  const qr = getQrImage(asset);
  const returnUrl = window.location.href;
  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Etiqueta ${escapeHtml(asset.code)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 12px; font-family: Arial, sans-serif; color: #111; }
          .toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
          .toolbar button, .toolbar a { min-height: 40px; border: 1px solid #7A0C10; border-radius: 8px; background: #7A0C10; color: #fff; font: 700 13px Arial; text-decoration: none; display: flex; align-items: center; justify-content: center; }
          .toolbar a { background: #fff; color: #7A0C10; }
          .label { width: 80mm; border: 1px dashed #999; padding: 8px; text-align: center; }
          .logo { width: 54px; height: 54px; object-fit: contain; }
          .qr { width: 112px; height: 112px; margin: 4px auto; display: block; }
          h1 { margin: 4px 0; color: #7A0C10; font-size: 15px; }
          p { margin: 2px 0; font-size: 12px; }
          strong { font-size: 14px; }
          @media print { body { padding: 0; } .toolbar { display: none; } .label { border: 0; } }
        </style>
      </head>
      <body>
        <nav class="toolbar">
          <button onclick="window.print()">Imprimir</button>
          <a href="${escapeHtml(returnUrl)}" onclick="if (window.opener) window.close()">Voltar</a>
        </nav>
        <section class="label">
          <img class="logo" src="${logo}" alt="AD Montese" />
          <h1>AD Montese</h1>
          <img class="qr" src="${qr}" alt="QR Code" />
          <strong>${escapeHtml(asset.code)}</strong>
          <p>${escapeHtml(asset.shortDescription || asset.description)}</p>
        </section>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function printPatrimonyReport(rows: Array<{ grupo: string; registros: number; valor: number }>, report: string, maintenances: number, inventories: number) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  const logo = `${window.location.origin}/assets/logo.png`;
  const generatedAt = formatDateTime(new Date().toISOString());
  const tableRows = rows.map((row) => `<tr><td>${escapeHtml(row.grupo)}</td><td>${row.registros}</td><td>${formatCurrency(row.valor)}</td></tr>`).join("");
  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatorio Patrimonial</title>
        <style>
          body { margin: 0; padding: 28px; font-family: Arial, sans-serif; color: #1c1c1c; }
          .toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: -28px -28px 22px; padding: 10px; background: #f4f4f4; }
          .toolbar button, .toolbar a { min-height: 42px; border: 1px solid #7A0C10; border-radius: 8px; background: #7A0C10; color: #fff; font: 700 14px Arial; text-decoration: none; display: flex; align-items: center; justify-content: center; }
          .toolbar a { background: #fff; color: #7A0C10; }
          header { display: flex; gap: 16px; align-items: center; border-bottom: 2px solid #7A0C10; padding-bottom: 14px; }
          img { width: 70px; height: 70px; object-fit: contain; }
          h1 { margin: 0; font-size: 22px; }
          p { margin: 3px 0; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th, td { border-bottom: 1px solid #e5e5e5; padding: 8px; text-align: left; }
          th { background: #f4eeee; color: #7A0C10; }
          @media print { .toolbar { display: none; } body { padding: 18px; } }
        </style>
      </head>
      <body>
        <nav class="toolbar"><button onclick="window.print()">Imprimir</button><a href="${escapeHtml(window.location.href)}" onclick="if (window.opener) window.close()">Voltar ao sistema</a></nav>
        <header><img src="${logo}" alt="AD Montese" /><div><h1>Relatorio Patrimonial</h1><p>Tipo: ${escapeHtml(report)}</p><p>Gerado em: ${generatedAt}</p><p>Inventarios: ${inventories} | Manutencoes: ${maintenances}</p></div></header>
        <table><thead><tr><th>Grupo</th><th>Registros</th><th>Valor</th></tr></thead><tbody>${tableRows || '<tr><td colspan="3">Sem dados</td></tr>'}</tbody></table>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
