import type { ColumnDef } from "@tanstack/react-table";
import { Download, ExternalLink, Eye, Plus, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FilterService, emptyGlobalFilters, type GlobalFilters } from "@/application/data/FilterService";
import { normalizeText } from "@/application/data/SpreadsheetDataService";
import { MONTHS, type TitheContribution, type TithePayer } from "@/application/data/TitheService";
import type { FinancialMovement } from "@/application/data/TreasuryService";
import { parseMoney } from "@/application/data/TreasuryService";
import { useRealData } from "@/application/data/useRealData";
import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { downloadCsv } from "@/lib/export";
import { cn, formatCurrency } from "@/lib/utils";

export function ModulePage({ moduleName }: { moduleName: string }) {
  const normalized = moduleName.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (normalized.includes("tesouraria")) return <TreasuryPage />;
  if (normalized.includes("dizim")) return <TithesPage />;
  if (normalized.includes("congreg")) return <CongregationsPage />;
  if (normalized.includes("area")) return <StructurePage title="Areas" kind="area" />;
  if (normalized.includes("setor")) return <StructurePage title="Setores" kind="sector" />;
  if (normalized.includes("relat")) return <ReportsPage />;
  return <DataExplorerPage title={moduleName} />;
}

function TreasuryPage() {
  const { movements, spreadsheetService } = useRealData();
  const [filters, setFilters] = useState<GlobalFilters>(emptyGlobalFilters);
  const [selected, setSelected] = useState<FinancialMovement | null>(null);
  const [editing, setEditing] = useState<FinancialMovement | null>(null);
  const rows = new FilterService().filterMovements(movements, filters);
  const total = rows.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  const columns = useMemo<ColumnDef<FinancialMovement>[]>(
    () => [
      { accessorKey: "date", header: "Data" },
      { accessorKey: "congregation", header: "Congregacao" },
      { accessorKey: "sector", header: "Setor" },
      { accessorKey: "area", header: "Area" },
      { accessorKey: "type", header: "Tipo" },
      { accessorKey: "identification", header: "Identificacao" },
      { accessorKey: "paymentMethod", header: "Forma" },
      { accessorKey: "amount", header: "Valor", cell: ({ row }) => formatCurrency(row.original.amount ?? 0) },
      {
        accessorKey: "receiptLink",
        header: "Recibo",
        cell: ({ row }) =>
          row.original.receiptLink ? (
            <a className="inline-flex items-center gap-1 text-primary" href={row.original.receiptLink} target="_blank" rel="noreferrer">
              Abrir <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            row.original.localNumber || "-"
          ),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
      {
        id: "actions",
        header: "Acoes",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSelected(row.original)} aria-label="Ver detalhes">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Controle financeiro"
        title="Tesouraria"
        description="Lancamentos reais vindos da aba DB, com todas as colunas preservadas em raw."
        actions={
          <>
            <Badge>{rows.length} de {movements.length} lancamentos</Badge>
            <Badge>Saldo filtrado {formatCurrency(total)}</Badge>
            <Button variant="outline" onClick={() => downloadCsv("tesouraria-db.csv", rows as unknown as Array<Record<string, unknown>>)}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => setEditing(blankMovement())}>
              <Plus className="h-4 w-4" />
              Nova movimentacao
            </Button>
          </>
        }
      />
      <FilterBar movements={movements} filters={filters} setFilters={setFilters} />
      <DataTable columns={columns} data={rows} searchPlaceholder="Pesquisar lancamentos da DB..." />
      {selected ? <RawModal title="Detalhes da movimentacao" raw={selected.raw} onClose={() => setSelected(null)} /> : null}
      {editing ? (
        <MovementModal
          record={editing}
          onClose={() => setEditing(null)}
          onSave={(record) => {
            spreadsheetService.appendRowToSheet("DB", record.raw);
            setEditing(null);
            toast.success("Movimentacao salva localmente e preparada para sincronizacao");
          }}
        />
      ) : null}
    </div>
  );
}

function TithesPage() {
  const { tithePayers, titheContributions, dashboardService, spreadsheetService } = useRealData();
  const [filters, setFilters] = useState<GlobalFilters>(emptyGlobalFilters);
  const [mobileSearch, setMobileSearch] = useState("");
  const [selected, setSelected] = useState<TithePayer | null>(null);
  const [creating, setCreating] = useState(false);
  const service = new FilterService();
  const filteredPayers = service.filterTithePayers(tithePayers, filters);
  const filteredContributions = service.filterContributions(titheContributions, filters);
  const payers = filterTithePayersBySearch(filteredPayers, mobileSearch);
  const contributions = filterContributionsBySearch(filteredContributions, mobileSearch);
  const model = dashboardService.build(filters);

  const payerColumns = useMemo<ColumnDef<TithePayer>[]>(
    () => [
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "congregation", header: "Congregacao" },
      { accessorKey: "annualTotal", header: "Total anual", cell: ({ row }) => formatCurrency(row.original.annualTotal) },
      { accessorKey: "lastContributionMonth", header: "Ultimo mes" },
      { accessorKey: "contributedMonths", header: "Meses" },
      { accessorKey: "averageMonthly", header: "Media mensal", cell: ({ row }) => formatCurrency(row.original.averageMonthly) },
      {
        id: "actions",
        header: "Ficha",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => setSelected(row.original)} aria-label="Ver ficha">
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  const contributionColumns = useMemo<ColumnDef<(typeof contributions)[number]>[]>(
    () => [
      { accessorKey: "tithePayerName", header: "Dizimista" },
      { accessorKey: "month", header: "Mes" },
      { accessorKey: "year", header: "Ano" },
      { accessorKey: "congregation", header: "Congregacao" },
      { accessorKey: "amount", header: "Valor", cell: ({ row }) => formatCurrency(row.original.amount) },
    ],
    [],
  );

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <PageHeader
        eyebrow="Dizimos"
        title="Dizimistas"
        description="Valores mensais, totais anuais e contribuicoes individuais lidos da aba Dizimistas."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCsv("dizimistas.csv", payers as unknown as Array<Record<string, unknown>>)}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Novo dizimo
            </Button>
          </>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total de dizimos" value={formatCurrency(Number(model.cards.titheTotal ?? 0))} />
        <Metric label="Total do mes" value={formatCurrency(contributions.filter((item) => item.month === filters.month || filters.month === "Todos").reduce((sum, item) => sum + item.amount, 0))} />
        <Metric label="Total do ano" value={formatCurrency(contributions.filter((item) => String(item.year) === filters.year || filters.year === "Todos").reduce((sum, item) => sum + item.amount, 0))} />
        <Metric label="Dizimistas" value={payers.length} />
        <Metric label="Ativos" value={payers.filter((item) => item.contributedMonths > 0).length} />
      </div>
      <TitheFilters filters={filters} setFilters={setFilters} payers={tithePayers} />
      <Card className="mb-6 min-w-0 overflow-hidden lg:hidden">
        <CardContent className="p-4">
          <label className="text-xs font-medium text-muted-foreground">
            Buscar dizimista
            <Input
              className="mt-2"
              value={mobileSearch}
              onChange={(event) => setMobileSearch(event.target.value)}
              placeholder="Digite nome ou congregacao..."
            />
          </label>
        </CardContent>
      </Card>
      <div className="grid min-w-0 max-w-full gap-6 overflow-hidden">
        <div className="min-w-0 max-w-full overflow-hidden">
          <h2 className="mb-3 text-base font-semibold">Dizimistas</h2>
          <div className="min-w-0 max-w-full overflow-hidden lg:hidden">
            <MobileTithePayerCards payers={payers} onSelect={setSelected} />
          </div>
          <div className="hidden lg:block">
            <DataTable columns={payerColumns} data={payers} searchPlaceholder="Pesquisar dizimista..." />
          </div>
        </div>

        <div className="min-w-0 max-w-full overflow-hidden">
          <h2 className="mb-3 text-base font-semibold">Contribuicoes mensais</h2>
          <div className="min-w-0 max-w-full overflow-hidden lg:hidden">
            <MobileContributionCards contributions={contributions} />
          </div>
          <div className="hidden lg:block">
            <DataTable columns={contributionColumns} data={contributions} searchPlaceholder="Pesquisar contribuicoes..." />
          </div>
        </div>
      </div>
      {selected ? <TitheProfile payer={selected} onClose={() => setSelected(null)} /> : null}
      {creating ? (
        <SimpleCreateModal
          title="Novo dizimo"
          fields={["Nome", "Congregacao", "Setor", "Area", "Mes", "Ano", "Valor"]}
          onClose={() => setCreating(false)}
          onSave={(row) => {
            spreadsheetService.appendRowToSheet("Dizimistas", row);
            setCreating(false);
            toast.success("Dizimo salvo localmente e refletido apos a proxima sincronizacao");
          }}
        />
      ) : null}
    </div>
  );
}

function CongregationsPage() {
  const { congregations, spreadsheetService } = useRealData();
  const [creating, setCreating] = useState(false);
  const columns = useMemo<ColumnDef<(typeof congregations)[number]>[]>(
    () => [
      { accessorKey: "name", header: "Congregacao" },
      { accessorKey: "sector", header: "Setor" },
      { accessorKey: "area", header: "Area" },
      { accessorKey: "number", header: "Numero" },
      { accessorKey: "totalRaised", header: "Total arrecadado", cell: ({ row }) => formatCurrency(row.original.totalRaised) },
      { accessorKey: "totalTithes", header: "Dizimos", cell: ({ row }) => formatCurrency(row.original.totalTithes) },
      { accessorKey: "totalOfferings", header: "Ofertas", cell: ({ row }) => formatCurrency(row.original.totalOfferings) },
      { accessorKey: "movementCount", header: "Lancamentos" },
      { accessorKey: "lastMovement", header: "Ultima movimentacao" },
    ],
    [],
  );
  return (
    <div>
      <PageHeader
        eyebrow="Estrutura ministerial"
        title="Congregacoes"
        description="Congregacoes extraidas de DB, data, Dados e Dizimistas."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Nova congregacao</Button>}
      />
      <DataTable columns={columns} data={congregations} searchPlaceholder="Pesquisar congregacao, setor ou area..." />
      {creating ? <SimpleCreateModal title="Nova congregacao" fields={["Nome", "Setor", "Area", "Numero"]} onClose={() => setCreating(false)} onSave={(row) => { spreadsheetService.appendRowToSheet("Dados", row); setCreating(false); toast.success("Congregacao salva localmente"); }} /> : null}
    </div>
  );
}

function StructurePage({ title, kind }: { title: string; kind: "area" | "sector" }) {
  const { organizationService, spreadsheetService } = useRealData();
  const rows = kind === "area" ? organizationService.getAreas().map((name) => ({ name })) : organizationService.getSectors().map((name) => ({ name }));
  const [creating, setCreating] = useState(false);
  const columns = useMemo<ColumnDef<{ name: string }>[]>(() => [{ accessorKey: "name", header: "Nome" }], []);
  return (
    <div>
      <PageHeader eyebrow="Estrutura ministerial" title={title} description="Lista real derivada da hierarquia Area -> Setor -> Congregacao." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Novo registro</Button>} />
      <DataTable columns={columns} data={rows} searchPlaceholder={`Pesquisar ${title.toLowerCase()}...`} />
      {creating ? <SimpleCreateModal title={`Novo ${title}`} fields={kind === "area" ? ["Nome"] : ["Nome", "Area"]} onClose={() => setCreating(false)} onSave={(row) => { spreadsheetService.appendRowToSheet("data", row); setCreating(false); toast.success("Registro salvo localmente"); }} /> : null}
    </div>
  );
}

function ReportsPage() {
  const { reportsService } = useRealData();
  const rows = reportsService.getReports();
  const columns = useMemo<ColumnDef<(typeof rows)[number]>[]>(
    () => [
      { accessorKey: "report", header: "Relatorio" },
      { accessorKey: "group", header: "Grupo" },
      { accessorKey: "records", header: "Registros" },
      { accessorKey: "total", header: "Total", cell: ({ row }) => formatCurrency(row.original.total) },
    ],
    [],
  );
  return (
    <div>
      <PageHeader eyebrow="Relatorios" title="Relatorios" description="Relatorios calculados com DB, Fluxo, Historico, Relatorio e Dizimistas." actions={<Button variant="outline" onClick={() => downloadCsv("relatorios.csv", rows as unknown as Array<Record<string, unknown>>)}><Download className="h-4 w-4" />Exportar</Button>} />
      <DataTable columns={columns} data={rows} searchPlaceholder="Pesquisar relatorios..." />
    </div>
  );
}

function DataExplorerPage({ title = "Dados da Planilha" }: { title?: string }) {
  const { sheets } = useRealData();
  const [sheetTitle, setSheetTitle] = useState(sheets[0]?.title ?? "");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const sheet = sheets.find((item) => item.title === sheetTitle) ?? sheets[0];
  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () => [
      ...(sheet?.columns ?? []).map((column) => ({
        accessorKey: column.key,
        header: column.label,
        cell: ({ row }: { row: { original: Record<string, unknown> } }) => String(row.original[column.key] ?? ""),
      })),
      {
        id: "actions",
        header: "Detalhes",
        cell: ({ row }: { row: { original: Record<string, unknown> } }) => <Button variant="ghost" size="icon" onClick={() => setSelected(row.original)} aria-label="Ver raw"><Eye className="h-4 w-4" /></Button>,
      },
    ],
    [sheet],
  );
  return (
    <div>
      <PageHeader eyebrow="Explorador" title={title} description="Todas as abas ficam pesquisaveis, ordenaveis e exportaveis para nenhuma informacao ficar escondida." actions={<Button variant="outline" onClick={() => downloadCsv(`${sheet?.title ?? "dados"}.csv`, (sheet?.rows ?? []) as Array<Record<string, unknown>>)}><Download className="h-4 w-4" />Exportar</Button>} />
      <Card className="mb-6">
        <CardContent className="p-4">
          <Select value={sheet?.title ?? ""} onChange={(event) => setSheetTitle(event.target.value)}>
            {sheets.map((item) => <option key={item.id}>{item.title}</option>)}
          </Select>
        </CardContent>
      </Card>
      <DataTable columns={columns} data={(sheet?.rows ?? []) as Array<Record<string, unknown>>} searchPlaceholder="Pesquisar em todas as colunas..." />
      {selected ? <RawModal title="Raw da linha" raw={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function FilterBar({ movements, filters, setFilters }: { movements: FinancialMovement[]; filters: GlobalFilters; setFilters: React.Dispatch<React.SetStateAction<GlobalFilters>> }) {
  const options = {
    areas: unique(movements.map((item) => item.area)),
    sectors: unique(movements.filter((item) => filters.area === "Todos" || item.area === filters.area).map((item) => item.sector)),
    congregations: unique(movements.filter((item) => filters.sector === "Todos" || item.sector === filters.sector).map((item) => item.congregation)),
    years: unique(movements.map((item) => item.year || item.date.slice(0, 4))),
    types: unique(movements.map((item) => item.type)),
    methods: unique(movements.map((item) => item.paymentMethod)),
  };
  return (
    <Card className="mb-6">
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Filter label="Area" value={filters.area} options={options.areas} onChange={(area) => setFilters((current) => ({ ...current, area, sector: "Todos", congregation: "Todos" }))} />
        <Filter label="Setor" value={filters.sector} options={options.sectors} onChange={(sector) => setFilters((current) => ({ ...current, sector, congregation: "Todos" }))} />
        <Filter label="Congregacao" value={filters.congregation} options={options.congregations} onChange={(congregation) => setFilters((current) => ({ ...current, congregation }))} />
        <Filter label="Ano" value={filters.year} options={options.years} onChange={(year) => setFilters((current) => ({ ...current, year }))} />
        <Filter label="Tipo" value={filters.financialType} options={options.types} onChange={(financialType) => setFilters((current) => ({ ...current, financialType }))} />
        <Filter label="Forma" value={filters.paymentMethod} options={options.methods} onChange={(paymentMethod) => setFilters((current) => ({ ...current, paymentMethod }))} />
      </CardContent>
    </Card>
  );
}

function filterTithePayersBySearch(payers: TithePayer[], search: string) {
  const term = normalizeText(search);
  if (!term) return payers;

  return payers.filter((payer) =>
    [payer.name, payer.congregation, payer.sector, payer.area].some((value) => normalizeText(value).includes(term)),
  );
}

function filterContributionsBySearch(contributions: TitheContribution[], search: string) {
  const term = normalizeText(search);
  if (!term) return contributions;

  return contributions.filter((contribution) =>
    [contribution.tithePayerName, contribution.congregation, contribution.month, String(contribution.year)].some((value) =>
      normalizeText(value).includes(term),
    ),
  );
}

function TitheFilters({ filters, setFilters, payers }: { filters: GlobalFilters; setFilters: React.Dispatch<React.SetStateAction<GlobalFilters>>; payers: TithePayer[] }) {
  return (
    <Card className="mb-6">
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Filter label="Mes" value={filters.month} options={[...MONTHS]} onChange={(month) => setFilters((current) => ({ ...current, month }))} />
        <Filter label="Ano" value={filters.year} options={unique(payers.map((item) => String(item.raw.ano ?? "")))} onChange={(year) => setFilters((current) => ({ ...current, year }))} />
        <Filter label="Congregacao" value={filters.congregation} options={unique(payers.map((item) => item.congregation))} onChange={(congregation) => setFilters((current) => ({ ...current, congregation }))} />
        <Filter label="Setor" value={filters.sector} options={unique(payers.map((item) => item.sector))} onChange={(sector) => setFilters((current) => ({ ...current, sector }))} />
        <Filter label="Area" value={filters.area} options={unique(payers.map((item) => item.area))} onChange={(area) => setFilters((current) => ({ ...current, area }))} />
        <Filter label="Nome" value={filters.tithePayer} options={unique(payers.map((item) => item.name))} onChange={(tithePayer) => setFilters((current) => ({ ...current, tithePayer }))} />
      </CardContent>
    </Card>
  );
}

const TITHE_MONTHS: Array<{ key: keyof TithePayer["monthlyTithes"]; label: string; short: string }> = [
  { key: "janeiro", label: "Janeiro", short: "Jan" },
  { key: "fevereiro", label: "Fevereiro", short: "Fev" },
  { key: "marco", label: "Marco", short: "Mar" },
  { key: "abril", label: "Abril", short: "Abr" },
  { key: "maio", label: "Maio", short: "Mai" },
  { key: "junho", label: "Junho", short: "Jun" },
  { key: "julho", label: "Julho", short: "Jul" },
  { key: "agosto", label: "Agosto", short: "Ago" },
  { key: "setembro", label: "Setembro", short: "Set" },
  { key: "outubro", label: "Outubro", short: "Out" },
  { key: "novembro", label: "Novembro", short: "Nov" },
  { key: "dezembro", label: "Dezembro", short: "Dez" },
];

function MobileTithePayerCards({ payers, onSelect }: { payers: TithePayer[]; onSelect: (payer: TithePayer) => void }) {
  if (!payers.length) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">Nenhum dizimista encontrado com os filtros atuais.</CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-hidden">
      {payers.map((payer) => (
        <Card key={payer.id} className="w-full min-w-0 max-w-full overflow-hidden">
          <CardContent className="p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold leading-5">{payer.name}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{payer.congregation || "Congregacao nao informada"}</p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => onSelect(payer)}>
                <Eye className="h-4 w-4" />
                Ver
              </Button>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2">
              <MobileInfo label="Total anual" value={formatCurrency(payer.annualTotal)} strong />
              <MobileInfo label="Ultimo mes" value={payer.lastContributionMonth ?? "Sem contribuicao"} />
              <MobileInfo label="Meses" value={payer.contributedMonths} />
              <MobileInfo label="Media mensal" value={formatCurrency(payer.averageMonthly)} strong />
            </div>

            <div className="mt-4 border-t border-border pt-3">
              <p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">Meses com contribuicao</p>
              <div className="mt-2 flex max-w-full flex-wrap gap-2">
                {getPaidMonths(payer).length ? (
                  getPaidMonths(payer).map((month) => (
                    <div key={month.key} className="min-w-0 flex-1 basis-[86px] rounded-md border border-border bg-surface px-3 py-2">
                      <p className="text-xs font-semibold text-primary">{month.short}</p>
                      <p className="mt-1 whitespace-nowrap text-xs font-semibold">{formatCurrency(month.amount)}</p>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Sem valores mensais pagos.</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MobileContributionCards({ contributions }: { contributions: TitheContribution[] }) {
  if (!contributions.length) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">Nenhuma contribuicao encontrada com os filtros atuais.</CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-hidden">
      {contributions.map((contribution) => (
        <Card key={contribution.id} className="w-full min-w-0 max-w-full overflow-hidden">
          <CardContent className="p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold leading-5">{contribution.tithePayerName}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{contribution.congregation || "Congregacao nao informada"}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-primary">{formatCurrency(contribution.amount)}</p>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2">
              <MobileInfo label="Mes" value={contribution.month} />
              <MobileInfo label="Ano" value={contribution.year} />
              <MobileInfo label="Valor" value={formatCurrency(contribution.amount)} strong />
              <MobileInfo label="Congregacao" value={contribution.congregation || "Nao informada"} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MobileInfo({ label, value, strong = false }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-border bg-background/45 p-3">
      <p className="break-words text-[11px] font-medium uppercase leading-4 tracking-normal text-muted-foreground">{label}</p>
      <p className={cn("mt-1 break-words text-sm", strong ? "font-semibold text-foreground" : "font-medium")}>{value}</p>
    </div>
  );
}

function TitheProfile({ payer, onClose }: { payer: TithePayer; onClose: () => void }) {
  const paidMonths = getPaidMonths(payer);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="break-words">{payer.name}</CardTitle>
            <p className="mt-1 break-words text-sm text-muted-foreground">{payer.congregation || "Congregacao nao informada"}</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 lg:grid-cols-4">
            <MobileInfo label="Total anual" value={formatCurrency(payer.annualTotal)} strong />
            <MobileInfo label="Soma dos meses" value={formatCurrency(payer.calculatedTotal)} strong />
            <MobileInfo label="Ultimo mes" value={payer.lastContributionMonth ?? "Sem contribuicao"} />
            <MobileInfo label="Media mensal" value={formatCurrency(payer.averageMonthly)} strong />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Valores mes a mes</h3>
              <Badge>{paidMonths.length} meses pagos</Badge>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {TITHE_MONTHS.map((month) => {
                const amount = payer.monthlyTithes[month.key] ?? 0;
                const paid = amount > 0;
                return (
                  <div key={month.key} className={cn("rounded-md border p-3", paid ? "border-primary/35 bg-surface" : "border-border bg-background/45")}>
                    <p className={cn("text-xs font-semibold", paid ? "text-primary" : "text-muted-foreground")}>{month.label}</p>
                    <p className="mt-1 whitespace-nowrap text-sm font-semibold">{formatCurrency(amount)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <details className="rounded-md border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Dados completos da linha</summary>
            <pre className="max-h-72 overflow-auto border-t border-border bg-muted p-3 text-xs">{JSON.stringify(payer.raw, null, 2)}</pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

function getPaidMonths(payer: TithePayer) {
  return TITHE_MONTHS.map((month) => ({ ...month, amount: payer.monthlyTithes[month.key] ?? 0 })).filter((month) => month.amount > 0);
}

function MovementModal({ record, onClose, onSave }: { record: FinancialMovement; onClose: () => void; onSave: (record: FinancialMovement) => void }) {
  const [draft, setDraft] = useState(record);
  const set = (key: keyof FinancialMovement, value: string | number | null) => setDraft((current) => ({ ...current, [key]: value, raw: { ...current.raw, [key]: value } }));
  return (
    <Modal title="Nova movimentacao" onClose={onClose} onSave={() => onSave(draft)}>
      <Field label="Congregacao" value={draft.congregation} onChange={(value) => set("congregation", value)} />
      <Field label="Setor" value={draft.sector} onChange={(value) => set("sector", value)} />
      <Field label="Area" value={draft.area} onChange={(value) => set("area", value)} />
      <Field label="Tipo" value={draft.type} onChange={(value) => set("type", value)} />
      <Field label="Identificacao" value={draft.identification} onChange={(value) => set("identification", value)} />
      <Field label="Data" type="date" value={draft.date} onChange={(value) => set("date", value)} />
      <Field label="Forma" value={draft.paymentMethod} onChange={(value) => set("paymentMethod", value)} />
      <Field label="Valor" value={String(draft.amount ?? "")} onChange={(value) => set("amount", parseMoney(value))} />
    </Modal>
  );
}

function SimpleCreateModal({ title, fields, onClose, onSave }: { title: string; fields: string[]; onClose: () => void; onSave: (row: Record<string, string>) => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  return (
    <Modal title={title} onClose={onClose} onSave={() => onSave(draft)}>
      {fields.map((field) => <Field key={field} label={field} value={draft[field]} onChange={(value) => setDraft((current) => ({ ...current, [field]: value }))} />)}
    </Modal>
  );
}

function Modal({ title, children, onClose, onSave }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <h2 className="break-words text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">{children}</div>
        <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end sm:p-5">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave}><Save className="h-4 w-4" />Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function RawModal({ title, raw, onClose }: { title: string; raw: Record<string, unknown>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <pre className="max-w-full overflow-auto rounded-md bg-muted p-3 text-xs sm:p-4">{JSON.stringify(raw, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="min-w-0">
      <CardContent className="min-w-0 p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 break-words text-xl font-semibold sm:text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-medium text-muted-foreground">
      {label}
      <Select className="mt-1 w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        <option>Todos</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </Select>
    </label>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value?: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <Input className="mt-2" type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function blankMovement(): FinancialMovement {
  return {
    id: `local_${crypto.randomUUID()}`,
    congregation: "",
    sector: "",
    area: "",
    type: "Dizimos",
    identification: "",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "Dinheiro",
    amount: null,
    localNumber: "",
    receiptLink: "",
    cancellationReason: "",
    congregationNumber: "",
    movementType: "ENTRADA",
    day: "",
    week: "",
    month: "",
    quarter: "",
    year: String(new Date().getFullYear()),
    status: "Confirmado",
    raw: {},
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
