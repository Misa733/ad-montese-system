import { BadgeCheck, Boxes, Camera, ClipboardCheck, Download, Eye, FileText, Home, Plus, Search, Settings, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { PatrimonyAsset } from "@/application/data/PatrimonyService";
import { useRealData } from "@/application/data/useRealData";
import { useRecordsVersion, useSettings } from "@/application/data/useStores";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadXlsx } from "@/lib/export";
import { cn } from "@/lib/utils";
import { AssetForm } from "./components/AssetForm";
import { AssetProfile } from "./components/AssetProfile";
import { CameraScannerModal, findAssetByCodeOrText } from "./components/CameraScannerModal";
import { InventoryPanel } from "./components/InventoryPanel";
import { MaintenancePanel, MovementsPanel, PropertiesPanel } from "./components/OperationsPanels";
import { PatrimonyCatalog, filterAssets } from "./components/PatrimonyCatalog";
import { PatrimonyDashboard } from "./components/PatrimonyDashboard";
import { PatrimonyReports, PatrimonySettings } from "./components/PatrimonyReports";
import { printAssetLabel } from "./components/labels";
import { unique } from "./components/shared";

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
  const recordsVersion = useRecordsVersion();
  const { demo_mode: demoMode } = useSettings();
  const [localRevision, setRevision] = useState(0);
  // Recalcula quando um cadastro muda (aqui ou no banco) ou quando o modo demonstracao e alternado.
  const revision = `${recordsVersion}-${localRevision}-${demoMode}`;
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
    toast.success("Patrimonio cadastrado");
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
            {demoMode ? <Badge>Modo demonstracao ligado</Badge> : null}
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

      <PatrimonyProcessFlow activeTab={tab} onNavigate={setTab} />

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

function PatrimonyProcessFlow({ activeTab, onNavigate }: { activeTab: PatrimonyTab; onNavigate: (tab: PatrimonyTab) => void }) {
  const steps: Array<{ number: string; title: string; description: string; tab: PatrimonyTab }> = [
    { number: "1", title: "Diagnosticar", description: "Veja totais, riscos, valores e setores no dashboard.", tab: "dashboard" },
    { number: "2", title: "Localizar", description: "Use busca e filtros para achar o bem por codigo, setor ou responsavel.", tab: "catalog" },
    { number: "3", title: "Abrir ficha", description: "Clique no item para ver QR Code, tombamento e detalhes completos.", tab: "profile" },
    { number: "4", title: "Etiquetar", description: "Imprima a etiqueta com QR Code para colar no patrimonio.", tab: "profile" },
    { number: "5", title: "Conferir", description: "Escaneie pelo celular ou marque o item no inventario.", tab: "inventory" },
    { number: "6", title: "Tratar", description: "Registre manutencoes, baixas, transferencias e historico.", tab: "maintenance" },
    { number: "7", title: "Prestar contas", description: "Gere relatorios para administradores e ministerio.", tab: "reports" },
  ];

  return (
    <Card className="mb-6 min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Fluxo pratico da gestao patrimonial</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {steps.map((step) => (
          <button
            key={step.number}
            className={cn(
              "min-w-0 rounded-md border p-3 text-left transition-colors",
              activeTab === step.tab ? "border-primary bg-surface text-foreground" : "border-border bg-card hover:bg-muted",
            )}
            onClick={() => onNavigate(step.tab)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">{step.number}</span>
            <span className="mt-3 block font-semibold">{step.title}</span>
            <span className="mt-1 block text-sm leading-5 text-muted-foreground">{step.description}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
