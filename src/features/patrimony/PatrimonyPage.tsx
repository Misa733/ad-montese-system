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
import { useMemo, useState } from "react";
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
  const [assetFilter, setAssetFilter] = useState({ congregation: "Todos", category: "Todos", status: "Todos" });
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
    }),
    [assets],
  );

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
            <Badge>{draftChanges.filter((draft) => draft.sheetName === "Patrimonio").length} cadastros em rascunho</Badge>
            <Button variant="outline" onClick={() => downloadXlsx("patrimonio.xlsx", filteredAssets as unknown as Array<Record<string, unknown>>)}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => setTab("form")}>
              <Plus className="h-4 w-4" />
              Novo bem
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
        <PatrimonyBar title="Valor patrimonial" data={dashboard.valueByCongregation} currency />
        <PatrimonyBar title="Bens por responsavel" data={dashboard.byResponsible} />
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
  options: { congregations: string[]; categories: string[]; statuses: string[] };
  filters: { congregation: string; category: string; status: string };
  setFilters: (filters: { congregation: string; category: string; status: string }) => void;
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
      { accessorKey: "status", header: "Situacao", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
      { accessorKey: "currentValue", header: "Valor", cell: ({ row }) => formatCurrency(row.original.currentValue || row.original.value) },
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
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <FilterSelect label="Congregacao" value={filters.congregation} options={options.congregations} onChange={(value) => setFilters({ ...filters, congregation: value })} />
          <FilterSelect label="Categoria" value={filters.category} options={options.categories} onChange={(value) => setFilters({ ...filters, category: value })} />
          <FilterSelect label="Situacao" value={filters.status} options={options.statuses} onChange={(value) => setFilters({ ...filters, status: value })} />
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
            <Info label="Valor atual" value={formatCurrency(asset.currentValue || asset.value)} />
            <Info label="Data aquisicao" value={asset.acquisitionDate || "Nao informada"} />
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
  const activeInventory = inventories.find((inventory) => inventory.id === activeId);
  const scopedAssets = filterAssets(assets, { category: "Todos", status: "Todos", congregation: scope.congregation }).filter(
    (asset) => (scope.area === "Todos" || asset.area === scope.area) && (scope.sector === "Todos" || asset.sector === scope.sector),
  );
  const checked = activeInventory ? Object.keys(activeInventory.checks).length : 0;
  const percent = scopedAssets.length ? Math.round((checked / scopedAssets.length) * 100) : 0;

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
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Concluido" value={`${percent}%`} />
        <Metric label="Conferidos" value={checked} />
        <Metric label="Pendentes" value={Math.max(scopedAssets.length - checked, 0)} />
      </div>
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

const reportColumns: ColumnDef<{ grupo: string; registros: number; valor: number }>[] = [
  { accessorKey: "grupo", header: "Grupo" },
  { accessorKey: "registros", header: "Registros" },
  { accessorKey: "valor", header: "Valor", cell: ({ row }) => formatCurrency(row.original.valor) },
];

function filterAssets(assets: PatrimonyAsset[], filters: { congregation: string; category: string; status: string }) {
  return assets.filter((asset) => {
    if (filters.congregation !== "Todos" && asset.congregation !== filters.congregation) return false;
    if (filters.category !== "Todos" && asset.category !== filters.category) return false;
    if (filters.status !== "Todos" && asset.status !== filters.status) return false;
    return true;
  });
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
