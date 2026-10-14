import { Camera, ClipboardCheck, Search } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import type { InventoryCheckStatus, PatrimonyAsset, PatrimonyInventory } from "@/application/data/PatrimonyService";
import { useRealData } from "@/application/data/useRealData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CameraScannerModal } from "./CameraScannerModal";
import { filterAssets } from "./PatrimonyCatalog";
import { EmptyState, Field, FilterSelect, Metric, unique } from "./shared";

export function InventoryPanel({
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
  const [inventoryYear, setInventoryYear] = useState(String(new Date().getFullYear()));
  const [inventoryResponsible, setInventoryResponsible] = useState("Comissao patrimonial");
  const [activeId, setActiveId] = useState(inventories[0]?.id ?? "");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pendentes");
  const [visibleLimit, setVisibleLimit] = useState(30);
  const activeInventory = inventories.find((inventory) => inventory.id === activeId);
  const originalScope = activeInventory
    ? { area: activeInventory.area || "Todos", sector: activeInventory.sector || "Todos", congregation: activeInventory.congregation || "Todos" }
    : undefined;
  const scopedAssets = filterAssets(assets, { category: "Todos", status: "Todos", congregation: scope.congregation }).filter(
    (asset) => (scope.area === "Todos" || asset.area === scope.area) && (scope.sector === "Todos" || asset.sector === scope.sector),
  );
  const filteredInventoryAssets = scopedAssets.filter((asset) => {
    const checkStatus = activeInventory?.checks[asset.code]?.status ?? "Pendente";
    const query = normalizeLocal(inventorySearch);
    const matchesSearch =
      !query ||
      [asset.description, asset.code, asset.congregation, asset.responsible, asset.internalLocation, asset.category].some((value) => normalizeLocal(value).includes(query));
    const matchesStatus = statusFilter === "Todos" || (statusFilter === "Pendentes" ? checkStatus === "Pendente" : checkStatus === statusFilter);
    return matchesSearch && matchesStatus;
  });
  const visibleInventoryAssets = filteredInventoryAssets.slice(0, visibleLimit);
  const inventoryStats = buildInventoryStats(activeInventory, scopedAssets);
  const isFinished = Boolean(activeInventory?.finishedAt) || activeInventory?.status === "Concluido";

  function createInventory() {
    const scopeAssets = filterAssets(assets, { category: "Todos", status: "Todos", congregation: scope.congregation }).filter(
      (asset) => (scope.area === "Todos" || asset.area === scope.area) && (scope.sector === "Todos" || asset.sector === scope.sector),
    );
    const inventory = service.createInventory({
      ...scope,
      name: `Inventario anual ${inventoryYear} - ${scope.congregation === "Todos" ? scope.sector : scope.congregation}`,
      responsible: inventoryResponsible,
      status: "Em andamento",
      totalItems: scopeAssets.length,
      pendingItems: scopeAssets.length,
      checkedItems: 0,
      notFoundItems: 0,
      completionPercentage: 0,
    });
    setActiveId(inventory.id);
    setStatusFilter("Pendentes");
    setVisibleLimit(30);
    onRefresh();
    toast.success("Inventario iniciado");
  }

  function check(asset: PatrimonyAsset, status: InventoryCheckStatus) {
    if (!activeInventory || isFinished) return;
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
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="grid h-fit gap-4 xl:sticky xl:top-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventario anual</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Field label="Ano" value={inventoryYear} onChange={setInventoryYear} />
                <Field label="Responsavel" value={inventoryResponsible} onChange={setInventoryResponsible} />
                <FilterSelect label="Area" value={scope.area} options={unique(assets.map((asset) => asset.area))} onChange={(value) => setScope({ ...scope, area: value })} />
                <FilterSelect label="Setor" value={scope.sector} options={unique(assets.map((asset) => asset.sector))} onChange={(value) => setScope({ ...scope, sector: value })} />
                <FilterSelect label="Congregacao" value={scope.congregation} options={unique(assets.map((asset) => asset.congregation))} onChange={(value) => setScope({ ...scope, congregation: value })} />
              </div>
              <Button className="w-full" onClick={createInventory}>
                <ClipboardCheck className="h-4 w-4" />
                Abrir inventario
              </Button>
              <p className="text-xs text-muted-foreground">
                Os filtros acima controlam a conferencia exibida agora. Abra um inventario para gravar as marcacoes.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Progresso</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4">
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Concluido" value={`${inventoryStats.percent}%`} />
                <Metric label="Itens" value={inventoryStats.total} />
                <Metric label="Conferidos" value={inventoryStats.checked} />
                <Metric label="Pendentes" value={inventoryStats.pending} />
              </div>
              <InventoryProgressBar percent={inventoryStats.percent} compact />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Inventarios cadastrados</CardTitle>
            </CardHeader>
            <CardContent className="grid max-h-72 gap-2 overflow-y-auto p-3">
              {inventories.map((inventory) => (
                <button
                  key={inventory.id}
                  className={cn("rounded-md border p-3 text-left", activeId === inventory.id ? "border-primary bg-surface" : "border-border")}
                  onClick={() => {
                    setActiveId(inventory.id);
                    setScope({ area: inventory.area || "Todos", sector: inventory.sector || "Todos", congregation: inventory.congregation || "Todos" });
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 break-words text-sm font-medium">{inventory.name ?? `Inventario ${inventory.congregation}`}</span>
                    <Badge>{inventory.status ?? (inventory.finishedAt ? "Concluido" : "Em andamento")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{inventory.responsible ?? "Responsavel nao informado"} | {inventory.completionPercentage ?? 0}%</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <CardTitle>Conferencia do inventario</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeInventory ? `${activeInventory.name ?? "Inventario"} | exibindo ${scope.sector} | ${scope.congregation}` : "Selecione ou abra um inventario para iniciar."}
              </p>
              {originalScope ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Escopo original: {originalScope.area} | {originalScope.sector} | {originalScope.congregation}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setScannerOpen(true)} disabled={!activeInventory || isFinished}>
                <Camera className="h-4 w-4" />
                Escanear
              </Button>
              <Button variant="outline" onClick={() => activeInventory && (service.finishInventory(activeInventory.id), onRefresh())} disabled={!activeInventory || inventoryStats.pending > 0 || isFinished}>
                Finalizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <label className="min-w-0 text-xs font-medium text-muted-foreground">
                Buscar no inventario
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Codigo, nome, local ou responsavel" />
                </div>
              </label>
              <label className="min-w-0 text-xs font-medium text-muted-foreground">
                Status da conferencia
                <Select className="mt-1 w-full" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option>Todos</option>
                  <option>Pendentes</option>
                  <option>Confirmado</option>
                  <option>Nao localizado</option>
                  <option>Em manutencao</option>
                  <option>Transferido</option>
                  <option>Baixado</option>
                </Select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Filtrados" value={filteredInventoryAssets.length} />
              <Metric label="Nao localizados" value={inventoryStats.notFound} />
              <Metric label="Divergencias" value={inventoryStats.divergences} />
            </div>
            {!activeInventory ? <p className="text-sm text-muted-foreground">Crie um inventario para iniciar a conferencia.</p> : null}
            {activeInventory && inventoryStats.pending > 0 ? (
              <p className="rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
                Para finalizar o inventario anual, todos os bens do escopo filtrado precisam ser marcados como confirmado, nao localizado, manutencao, transferido ou baixado.
              </p>
            ) : null}
            <div className="grid gap-3">
              {visibleInventoryAssets.map((asset) => (
                <div key={asset.id} className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{asset.description}</p>
                    <p className="break-words text-sm text-muted-foreground">{asset.code} | {asset.congregation} | {asset.internalLocation || asset.location}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{activeInventory?.checks[asset.code]?.status ?? "Pendente"}</Badge>
                      <Badge>{asset.category}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    {(["Confirmado", "Nao localizado", "Em manutencao", "Transferido", "Baixado"] as InventoryCheckStatus[]).map((status) => (
                      <Button key={status} variant="outline" size="sm" onClick={() => check(asset, status)} disabled={!activeInventory || isFinished}>
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {filteredInventoryAssets.length > visibleInventoryAssets.length ? (
              <Button variant="outline" onClick={() => setVisibleLimit((current) => current + 30)}>
                Mostrar mais {Math.min(30, filteredInventoryAssets.length - visibleInventoryAssets.length)} itens
              </Button>
            ) : null}
            {activeInventory && !filteredInventoryAssets.length ? <EmptyState title="Nenhum item nesse filtro" description="Ajuste a busca, o status ou os filtros de area, setor e congregacao." /> : null}
          </CardContent>
        </Card>
      </div>
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

function InventoryProgressBar({ percent, compact = false }: { percent: number; compact?: boolean }) {
  return (
    <Card className={compact ? "border-0 shadow-none" : undefined}>
      <CardContent className={compact ? "p-0" : "p-4"}>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">Progresso operacional do inventario</span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function buildInventoryStats(inventory: PatrimonyInventory | undefined, assets: PatrimonyAsset[]) {
  const assetCodes = new Set(assets.map((asset) => asset.code));
  const checks = inventory ? Object.entries(inventory.checks).filter(([code]) => assetCodes.has(code)).map(([, check]) => check) : [];
  if (!inventory || !checks.length) {
    const total = inventory?.totalItems || assets.length;
    const checked = inventory?.checkedItems ?? 0;
    const notFound = inventory?.notFoundItems ?? 0;
    const pending = inventory?.pendingItems ?? Math.max(total - checked, 0);
    return {
      total,
      checked,
      pending,
      notFound,
      divergences: notFound,
      percent: inventory?.completionPercentage ?? (total ? Math.round((checked / total) * 100) : 0),
    };
  }

  const total = assets.length;
  const checked = checks.length;
  const notFound = checks.filter((check) => check.status === "Nao localizado").length;
  const divergences = checks.filter((check) => check.status !== "Confirmado").length;
  const pending = Math.max(total - checked, 0);
  return {
    total,
    checked,
    pending,
    notFound,
    divergences,
    percent: total ? Math.round((checked / total) * 100) : 0,
  };
}

function normalizeLocal(value: string | number | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
