import type { ColumnDef } from "@tanstack/react-table";
import { Boxes, Eye } from "lucide-react";
import { useMemo } from "react";
import type { PatrimonyAsset } from "@/application/data/PatrimonyService";
import { DataTable } from "@/components/data/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { FilterSelect, Info, getAssetTotal } from "./shared";

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

export function PatrimonyCatalog({
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
      {
        id: "asset",
        header: "Patrimonio",
        cell: ({ row }) => (
          <div className="flex min-w-[260px] items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface">
              <Boxes className="h-5 w-5 text-primary" />
            </div>
            <button className="min-w-0 text-left underline-offset-4 hover:text-primary hover:underline" onClick={() => onSelect(row.original)}>
              <span className="block break-words font-semibold text-primary">{row.original.code}</span>
              <span className="mt-1 block break-words font-medium text-foreground">{row.original.description}</span>
              <span className="mt-1 block break-words text-xs text-muted-foreground">
                {row.original.brand || "Sem marca"} {row.original.model ? `| ${row.original.model}` : ""}
              </span>
            </button>
          </div>
        ),
      },
      {
        id: "location",
        header: "Localizacao",
        cell: ({ row }) => (
          <div className="min-w-[190px] break-words">
            <p className="font-medium">{row.original.congregation}</p>
            <p className="text-xs text-muted-foreground">{row.original.sector} | {row.original.area}</p>
            <p className="text-xs text-muted-foreground">{row.original.internalLocation}</p>
          </div>
        ),
      },
      {
        id: "category",
        header: "Categoria",
        cell: ({ row }) => (
          <div className="min-w-[130px] break-words">
            <p className="font-medium">{row.original.category}</p>
            <p className="text-xs text-muted-foreground">{row.original.subcategory}</p>
          </div>
        ),
      },
      {
        id: "responsible",
        header: "Responsavel",
        cell: ({ row }) => <span className="block min-w-[150px] break-words">{row.original.responsible}</span>,
      },
      {
        id: "values",
        header: "Qtd / Valor",
        cell: ({ row }) => (
          <div className="min-w-[105px]">
            <p className="font-medium">{row.original.quantity} un.</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(getAssetTotal(row.original))}</p>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="grid min-w-[120px] gap-1">
            <Badge>{row.original.status}</Badge>
            <span className="text-xs text-muted-foreground">{row.original.conservationState}</span>
          </div>
        ),
      },
      {
        id: "inventory",
        header: "Conferencia",
        cell: ({ row }) => <span className="block min-w-[115px] break-words text-sm">{row.original.lastInventoryAt || "Pendente"}</span>,
      },
      {
        id: "actions",
        header: "Acoes",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => onSelect(row.original)} aria-label="Ver ficha">
            <Eye className="h-4 w-4" />
            <span className="hidden xl:inline">Abrir ficha</span>
          </Button>
        ),
      },
    ],
    [onSelect],
  );

  return (
    <div className="grid gap-4">
      <Card className="border-primary/20 bg-surface">
        <CardContent className="flex flex-col gap-2 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Clique em qualquer linha, no codigo ou na descricao para abrir a ficha completa com QR Code, etiqueta, documentos e historico.
          </span>
          <Badge>{assets.length} itens encontrados</Badge>
        </CardContent>
      </Card>
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
        <DataTable columns={columns} data={assets} searchPlaceholder="Pesquisar por codigo, descricao, congregacao, responsavel, marca ou modelo..." onRowClick={onSelect} />
      </div>
    </div>
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

export function filterAssets(assets: PatrimonyAsset[], filters: Partial<AssetFilters>) {
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
