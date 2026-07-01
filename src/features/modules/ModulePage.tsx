import type { ColumnDef } from "@tanstack/react-table";
import { Download, ExternalLink, Eye, Plus, Receipt, Save, X } from "lucide-react";
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
  const [localPayers, setLocalPayers] = useState<TithePayer[]>(() => readLocalTithePayers());
  const [localContributions, setLocalContributions] = useState<TitheContribution[]>(() => readLocalTitheContributions());
  const [selected, setSelected] = useState<TithePayer | null>(null);
  const [receiptContribution, setReceiptContribution] = useState<TitheContribution | null>(null);
  const [creatingPayer, setCreatingPayer] = useState(false);
  const [creatingContribution, setCreatingContribution] = useState(false);
  const service = new FilterService();
  const allPayers = useMemo(() => applyLocalTitheChanges(tithePayers, localPayers, localContributions), [tithePayers, localPayers, localContributions]);
  const allContributions = useMemo(() => [...titheContributions, ...localContributions], [titheContributions, localContributions]);
  const filteredPayers = service.filterTithePayers(allPayers, filters);
  const filteredContributions = service.filterContributions(allContributions, filters);
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
      {
        id: "receipt",
        header: "Recibo",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => setReceiptContribution(row.original)} aria-label="Gerar recibo">
            <Receipt className="h-4 w-4" />
          </Button>
        ),
      },
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
            <Button variant="outline" onClick={() => setCreatingPayer(true)}>
              <Plus className="h-4 w-4" />
              Novo dizimista
            </Button>
            <Button onClick={() => setCreatingContribution(true)}>
              <Plus className="h-4 w-4" />
              Lançar dizimo
            </Button>
          </>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total de dizimos" value={formatCurrency(contributions.reduce((sum, item) => sum + item.amount, 0) || Number(model.cards.titheTotal ?? 0))} />
        <Metric label="Total do mes" value={formatCurrency(contributions.filter((item) => item.month === filters.month || filters.month === "Todos").reduce((sum, item) => sum + item.amount, 0))} />
        <Metric label="Total do ano" value={formatCurrency(contributions.filter((item) => String(item.year) === filters.year || filters.year === "Todos").reduce((sum, item) => sum + item.amount, 0))} />
        <Metric label="Dizimistas" value={payers.length} />
        <Metric label="Ativos" value={payers.filter((item) => item.contributedMonths > 0).length} />
      </div>
      <TitheFilters filters={filters} setFilters={setFilters} payers={allPayers} />
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
            <MobileTithePayerCards payers={payers} onSelect={setSelected} onReceipt={setReceiptContribution} />
          </div>
          <div className="hidden lg:block">
            <DataTable columns={payerColumns} data={payers} searchPlaceholder="Pesquisar dizimista..." />
          </div>
        </div>

        <div className="min-w-0 max-w-full overflow-hidden">
          <h2 className="mb-3 text-base font-semibold">Contribuicoes mensais</h2>
          <div className="min-w-0 max-w-full overflow-hidden lg:hidden">
            <MobileContributionCards contributions={contributions} onReceipt={setReceiptContribution} />
          </div>
          <div className="hidden lg:block">
            <DataTable columns={contributionColumns} data={contributions} searchPlaceholder="Pesquisar contribuicoes..." />
          </div>
        </div>
      </div>
      {selected ? <TitheProfile payer={selected} onClose={() => setSelected(null)} /> : null}
      {receiptContribution ? <ReceiptModal contribution={receiptContribution} onClose={() => setReceiptContribution(null)} /> : null}
      {creatingPayer ? <NewTithePayerModal onClose={() => setCreatingPayer(false)} onSave={(payer, row) => {
        const next = [payer, ...localPayers];
        setLocalPayers(next);
        saveLocalTithePayers(next);
        spreadsheetService.appendRowToSheet("Dizimistas", row);
        setCreatingPayer(false);
        toast.success("Dizimista cadastrado localmente");
      }} /> : null}
      {creatingContribution ? <TitheContributionModal payers={allPayers} onClose={() => setCreatingContribution(false)} onSave={(contribution, row) => {
        const next = [contribution, ...localContributions];
        setLocalContributions(next);
        saveLocalTitheContributions(next);
        spreadsheetService.appendRowToSheet("Dizimistas", row);
        setCreatingContribution(false);
        toast.success("Dizimo lançado localmente");
      }} /> : null}
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
  const { movements, titheContributions } = useRealData();
  const today = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("month");
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [startDate, setStartDate] = useState(`${today.getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const reportFilters = { periodType, month, year, startDate, endDate };
  const filteredMovements = filterReportMovements(movements, reportFilters);
  const filteredContributions = filterReportContributions(titheContributions, reportFilters);
  const rows = buildReportRows(filteredMovements, filteredContributions);
  const totals = buildReportTotals(filteredMovements, filteredContributions);
  const periodLabel = getReportPeriodLabel(reportFilters);
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
      <PageHeader
        eyebrow="Relatorios"
        title="Relatorios"
        description="Relatorios calculados com DB, Fluxo, Historico, Relatorio e Dizimistas."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCsv("relatorios.csv", rows as unknown as Array<Record<string, unknown>>)}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => printReportPdf({ periodLabel, rows, totals })}>
              <Download className="h-4 w-4" />
              Gerar PDF
            </Button>
          </>
        }
      />
      <Card className="mb-6 min-w-0 overflow-hidden">
        <CardContent className="grid min-w-0 grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            Tipo
            <Select className="mt-1 w-full" value={periodType} onChange={(event) => setPeriodType(event.target.value as ReportPeriodType)}>
              <option value="month">Mes</option>
              <option value="year">Ano inteiro</option>
              <option value="period">Periodo</option>
            </Select>
          </label>
          {periodType === "month" ? (
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              Mes
              <Select className="mt-1 w-full" value={month} onChange={(event) => setMonth(event.target.value)}>
                {MONTHS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {periodType !== "period" ? (
            <Field label="Ano" value={year} onChange={setYear} />
          ) : (
            <>
              <Field label="Inicio" type="date" value={startDate} onChange={setStartDate} />
              <Field label="Fim" type="date" value={endDate} onChange={setEndDate} />
            </>
          )}
        </CardContent>
      </Card>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Periodo" value={periodLabel} />
        <Metric label="Receitas" value={formatCurrency(totals.revenue)} />
        <Metric label="Despesas" value={formatCurrency(Math.abs(totals.expenses))} />
        <Metric label="Saldo" value={formatCurrency(totals.balance)} />
      </div>
      <DataTable columns={columns} data={rows} searchPlaceholder="Pesquisar relatorios..." />
    </div>
  );
}

type ReportPeriodType = "month" | "year" | "period";

interface ReportFilters {
  periodType: ReportPeriodType;
  month: string;
  year: string;
  startDate: string;
  endDate: string;
}

interface ReportRow {
  report: string;
  group: string;
  records: number;
  total: number;
}

function filterReportMovements(movements: FinancialMovement[], filters: ReportFilters) {
  return movements.filter((movement) => {
    if (filters.periodType === "month") return movementDateMonth(movement) === filters.month && movementDateYear(movement) === filters.year;
    if (filters.periodType === "year") return movementDateYear(movement) === filters.year;
    return isDateInRange(movement.date, filters.startDate, filters.endDate);
  });
}

function filterReportContributions(contributions: TitheContribution[], filters: ReportFilters) {
  return contributions.filter((contribution) => {
    if (filters.periodType === "month") return String(contribution.monthNumber) === filters.month && String(contribution.year) === filters.year;
    if (filters.periodType === "year") return String(contribution.year) === filters.year;
    const contributionDate = `${contribution.year}-${String(contribution.monthNumber).padStart(2, "0")}-01`;
    return isDateInRange(contributionDate, filters.startDate, filters.endDate);
  });
}

function buildReportRows(movements: FinancialMovement[], contributions: TitheContribution[]): ReportRow[] {
  return [
    ...groupReport("Financeiro geral", movements, () => "Todos"),
    ...groupReport("Por congregacao", movements, (item) => item.congregation || "Nao informado"),
    ...groupReport("Por setor", movements, (item) => item.sector || "Nao informado"),
    ...groupReport("Por area", movements, (item) => item.area || "Nao informado"),
    ...groupReport("Por tipo", movements, (item) => item.type || "Nao informado"),
    ...groupReport("Por forma de pagamento", movements, (item) => item.paymentMethod || "Nao informado"),
    ...groupReport("Cancelamentos", movements.filter((item) => item.status === "Cancelado"), (item) => item.cancellationReason || "Cancelado"),
    ...groupContributionsReport(contributions),
  ];
}

function groupReport(report: string, rows: FinancialMovement[], getKey: (item: FinancialMovement) => string): ReportRow[] {
  const grouped = new Map<string, { records: number; total: number }>();
  rows.forEach((item) => {
    const key = getKey(item);
    const current = grouped.get(key) ?? { records: 0, total: 0 };
    current.records += 1;
    current.total += item.amount ?? 0;
    grouped.set(key, current);
  });
  return Array.from(grouped.entries()).map(([group, value]) => ({ report, group, ...value }));
}

function groupContributionsReport(contributions: TitheContribution[]): ReportRow[] {
  const grouped = new Map<string, { records: number; total: number }>();
  contributions.forEach((item) => {
    const current = grouped.get(item.month) ?? { records: 0, total: 0 };
    current.records += 1;
    current.total += item.amount;
    grouped.set(item.month, current);
  });
  return Array.from(grouped.entries()).map(([group, value]) => ({ report: "Dizimos mensais", group, ...value }));
}

function buildReportTotals(movements: FinancialMovement[], contributions: TitheContribution[]) {
  const revenue = movements.filter((item) => (item.amount ?? 0) > 0).reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const expenses = movements.filter((item) => (item.amount ?? 0) < 0).reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const titheTotal = contributions.reduce((sum, item) => sum + item.amount, 0);
  return { revenue, expenses, balance: revenue + expenses, titheTotal, records: movements.length + contributions.length };
}

function movementDateMonth(movement: FinancialMovement) {
  if (movement.date.match(/^\d{4}-\d{2}-\d{2}/)) return String(Number(movement.date.slice(5, 7)));
  return String(MONTHS.findIndex((month) => normalizeText(month) === normalizeText(movement.month)) + 1);
}

function movementDateYear(movement: FinancialMovement) {
  if (movement.date.match(/^\d{4}-\d{2}-\d{2}/)) return movement.date.slice(0, 4);
  return movement.year;
}

function isDateInRange(date: string, startDate: string, endDate: string) {
  if (!date || !date.match(/^\d{4}-\d{2}-\d{2}/)) return false;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function getReportPeriodLabel(filters: ReportFilters) {
  if (filters.periodType === "month") return `${MONTHS[Number(filters.month) - 1] ?? "Mes"} de ${filters.year}`;
  if (filters.periodType === "year") return `Ano de ${filters.year}`;
  return `${formatDateLabel(filters.startDate)} a ${formatDateLabel(filters.endDate)}`;
}

function formatDateLabel(date: string) {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function printReportPdf({ periodLabel, rows, totals }: { periodLabel: string; rows: ReportRow[]; totals: ReturnType<typeof buildReportTotals> }) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    toast.error("Nao foi possivel abrir a janela de impressao.");
    return;
  }

  const logo = `${window.location.origin}/assets/logo.png`;
  const returnUrl = window.location.href;
  const generatedAt = new Date().toLocaleString("pt-BR");
  const tableRows = rows
    .map(
      (row) => `<tr><td>${escapeHtml(row.report)}</td><td>${escapeHtml(row.group)}</td><td>${row.records}</td><td>${formatCurrency(row.total)}</td></tr>`,
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatorio AD Montese</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; color: #1c1c1c; font-family: Arial, sans-serif; }
          .toolbar {
            position: sticky;
            top: 0;
            z-index: 2;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin: -28px -28px 22px;
            padding: 10px;
            background: #f4f4f4;
            border-bottom: 1px solid #d8d8d8;
          }
          .toolbar button,
          .toolbar a {
            display: inline-flex;
            min-height: 42px;
            align-items: center;
            justify-content: center;
            border: 1px solid #7A0C10;
            border-radius: 8px;
            background: #7A0C10;
            color: #fff;
            font: 700 14px Arial, sans-serif;
            text-decoration: none;
          }
          .toolbar a { background: #fff; color: #7A0C10; }
          header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #7A0C10; padding-bottom: 16px; }
          img { width: 72px; height: 72px; object-fit: contain; }
          h1 { margin: 0; font-size: 22px; }
          p { margin: 4px 0 0; color: #555; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 22px 0; }
          .box { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
          .label { color: #666; font-size: 11px; text-transform: uppercase; }
          .value { margin-top: 6px; font-size: 16px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border-bottom: 1px solid #e5e5e5; padding: 8px; text-align: left; }
          th { background: #f4eeee; color: #7A0C10; }
          @media print { body { padding: 18px; } .toolbar { display: none; } .summary { grid-template-columns: repeat(2, 1fr); } }
        </style>
      </head>
      <body>
        <nav class="toolbar">
          <button type="button" onclick="window.print()">Imprimir</button>
          <a href="${escapeHtml(returnUrl)}" onclick="if (window.opener) { window.close(); }">Voltar ao sistema</a>
        </nav>
        <header>
          <img src="${logo}" alt="AD Montese" />
          <div>
            <h1>Relatorio Administrativo - AD Montese</h1>
            <p>Periodo: ${escapeHtml(periodLabel)}</p>
            <p>Gerado em: ${generatedAt}</p>
          </div>
        </header>
        <section class="summary">
          <div class="box"><div class="label">Receitas</div><div class="value">${formatCurrency(totals.revenue)}</div></div>
          <div class="box"><div class="label">Despesas</div><div class="value">${formatCurrency(Math.abs(totals.expenses))}</div></div>
          <div class="box"><div class="label">Saldo</div><div class="value">${formatCurrency(totals.balance)}</div></div>
          <div class="box"><div class="label">Dizimos</div><div class="value">${formatCurrency(totals.titheTotal)}</div></div>
        </section>
        <table>
          <thead><tr><th>Relatorio</th><th>Grupo</th><th>Registros</th><th>Total</th></tr></thead>
          <tbody>${tableRows || '<tr><td colspan="4">Nenhum dado encontrado para o periodo.</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function buildReceiptNumber(contribution: TitheContribution) {
  const rawNumber = contribution.raw["N"] ?? contribution.raw["Nº"] ?? contribution.raw["NÂº"] ?? contribution.raw.numero ?? contribution.raw.Numero;
  const base = sheetValueToReceiptText(rawNumber) || contribution.id.replace(/\D/g, "").slice(-4);
  return base || String(Date.now()).slice(-5);
}

function printReceipt(draft: ReceiptDraft) {
  const printWindow = window.open("", "_blank", "width=420,height=640");
  if (!printWindow) {
    toast.error("Nao foi possivel abrir a janela de impressao.");
    return;
  }

  const logo = `${window.location.origin}/assets/logo.png`;
  const returnUrl = window.location.href;
  const emittedAt = new Date().toLocaleString("pt-BR");
  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Recibo de Doacao</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #000; font-family: Arial, sans-serif; font-size: 12px; }
          .toolbar {
            position: sticky;
            top: 0;
            z-index: 2;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 10px;
            background: #f4f4f4;
            border-bottom: 1px solid #d8d8d8;
          }
          .toolbar button,
          .toolbar a {
            display: inline-flex;
            min-height: 42px;
            align-items: center;
            justify-content: center;
            border: 1px solid #7A0C10;
            border-radius: 8px;
            background: #7A0C10;
            color: #fff;
            font: 700 14px Arial, sans-serif;
            text-decoration: none;
          }
          .toolbar a { background: #fff; color: #7A0C10; }
          .receipt { width: 72mm; margin: 0 auto; }
          .logo { display: block; width: 30mm; max-height: 18mm; object-fit: contain; margin: 0 auto 2mm; }
          h1 { margin: 0 0 3mm; text-align: center; font-size: 16px; font-weight: 800; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          td { border: 1px solid #000; padding: 2mm 1.5mm; vertical-align: top; font-size: 12px; font-weight: 700; }
          td:first-child { width: 25mm; }
          .value { word-break: break-word; }
          .signature { margin: 18mm 0 5mm; text-align: center; }
          .line { border-top: 1px solid #000; margin: 0 8mm 3mm; }
          .agent { font-weight: 700; }
          .emitted { text-align: center; font-size: 10px; }
          .cut { margin-top: 4mm; border-top: 1px dashed #000; }
          @media screen { body { background: #eee; } .receipt { background: #fff; padding: 4mm; margin-top: 12px; } }
          @media print { .toolbar { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <nav class="toolbar">
          <button type="button" onclick="window.print()">Imprimir</button>
          <a href="${escapeHtml(returnUrl)}" onclick="if (window.opener) { window.close(); }">Voltar ao sistema</a>
        </nav>
        <main class="receipt">
          <img class="logo" src="${logo}" alt="AD Montese" />
          <h1>Recibo de Doacao</h1>
          <table>
            <tr><td>No Local:</td><td class="value">${escapeHtml(draft.localNumber)}</td></tr>
            <tr><td>Tipo:</td><td class="value">${escapeHtml(draft.type)}</td></tr>
            <tr><td>Nome:</td><td class="value">${escapeHtml(draft.name)}</td></tr>
            <tr><td>Data:</td><td class="value">${escapeHtml(formatDateLabel(draft.date))}</td></tr>
            <tr><td>Forma:</td><td class="value">${escapeHtml(draft.paymentMethod)}</td></tr>
            <tr><td>Valor R$:</td><td class="value">${escapeHtml(draft.amount)}</td></tr>
            <tr><td>Igreja:</td><td class="value">${escapeHtml(draft.church)}</td></tr>
          </table>
          <section class="signature">
            <div class="line"></div>
            <div class="agent">Agente Recebedor</div>
          </section>
          <p class="emitted">Emitido em: ${emittedAt}</p>
          <div class="cut"></div>
        </main>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function sheetValueToReceiptText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

const LOCAL_TITHE_PAYERS_KEY = "ad-montese.local-tithe-payers";
const LOCAL_TITHE_CONTRIBUTIONS_KEY = "ad-montese.local-tithe-contributions";

function readLocalTithePayers() {
  return readLocalArray<TithePayer>(LOCAL_TITHE_PAYERS_KEY);
}

function saveLocalTithePayers(payers: TithePayer[]) {
  localStorage.setItem(LOCAL_TITHE_PAYERS_KEY, JSON.stringify(payers));
}

function readLocalTitheContributions() {
  return readLocalArray<TitheContribution>(LOCAL_TITHE_CONTRIBUTIONS_KEY);
}

function saveLocalTitheContributions(contributions: TitheContribution[]) {
  localStorage.setItem(LOCAL_TITHE_CONTRIBUTIONS_KEY, JSON.stringify(contributions));
}

function readLocalArray<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function applyLocalTitheChanges(basePayers: TithePayer[], localPayers: TithePayer[], localContributions: TitheContribution[]) {
  const payerMap = new Map<string, TithePayer>();
  [...basePayers, ...localPayers].forEach((payer) => payerMap.set(payer.id, clonePayer(payer)));

  localContributions.forEach((contribution) => {
    const payer = payerMap.get(contribution.tithePayerId);
    if (!payer) return;

    const month = getTitheMonthByNumber(contribution.monthNumber);
    if (!month) return;

    payer.monthlyTithes[month.key] = (payer.monthlyTithes[month.key] ?? 0) + contribution.amount;
    recalculatePayerTotals(payer);
  });

  return Array.from(payerMap.values());
}

function clonePayer(payer: TithePayer): TithePayer {
  return { ...payer, monthlyTithes: { ...payer.monthlyTithes }, raw: { ...payer.raw } };
}

function recalculatePayerTotals(payer: TithePayer) {
  const paidMonths = getPaidMonths(payer);
  payer.calculatedTotal = TITHE_MONTHS.reduce((sum, month) => sum + (payer.monthlyTithes[month.key] ?? 0), 0);
  payer.annualTotal = payer.calculatedTotal;
  payer.contributedMonths = paidMonths.length;
  payer.averageMonthly = paidMonths.length ? payer.calculatedTotal / paidMonths.length : 0;
  payer.lastContributionMonth = paidMonths.at(-1)?.label ?? null;
}

function getTitheMonthByNumber(monthNumber: number) {
  return TITHE_MONTHS[monthNumber - 1];
}

function getTitheMonthByLabel(label: string) {
  const normalized = normalizeText(label);
  return TITHE_MONTHS.find((month) => normalizeText(month.label) === normalized || normalizeText(month.short) === normalized);
}

function emptyTitheMonths(): TithePayer["monthlyTithes"] {
  return {
    janeiro: 0,
    fevereiro: 0,
    marco: 0,
    abril: 0,
    maio: 0,
    junho: 0,
    julho: 0,
    agosto: 0,
    setembro: 0,
    outubro: 0,
    novembro: 0,
    dezembro: 0,
  };
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

function NewTithePayerModal({ onClose, onSave }: { onClose: () => void; onSave: (payer: TithePayer, row: Record<string, string>) => void }) {
  const [draft, setDraft] = useState({
    name: "",
    congregation: "",
    sector: "",
    area: "",
    year: String(new Date().getFullYear()),
  });

  const set = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  function save() {
    if (!draft.name.trim()) {
      toast.error("Informe o nome do dizimista");
      return;
    }

    const row = {
      "Nome Completo": draft.name.trim(),
      CONGREGACAO: draft.congregation.trim(),
      SETOR: draft.sector.trim(),
      AREA: draft.area.trim(),
      ano: draft.year.trim(),
    };
    const payer: TithePayer = {
      id: `local_payer_${crypto.randomUUID()}`,
      number: null,
      name: row["Nome Completo"],
      congregation: row.CONGREGACAO,
      sector: row.SETOR,
      area: row.AREA,
      monthlyTithes: emptyTitheMonths(),
      annualTotal: 0,
      calculatedTotal: 0,
      contributedMonths: 0,
      averageMonthly: 0,
      lastContributionMonth: null,
      raw: row,
    };

    onSave(payer, row);
  }

  return (
    <Modal title="Novo dizimista" onClose={onClose} onSave={save}>
      <Field label="Nome" value={draft.name} onChange={(value) => set("name", value)} />
      <Field label="Congregacao" value={draft.congregation} onChange={(value) => set("congregation", value)} />
      <Field label="Setor" value={draft.sector} onChange={(value) => set("sector", value)} />
      <Field label="Area" value={draft.area} onChange={(value) => set("area", value)} />
      <Field label="Ano" value={draft.year} onChange={(value) => set("year", value)} />
    </Modal>
  );
}

function TitheContributionModal({ payers, onClose, onSave }: { payers: TithePayer[]; onClose: () => void; onSave: (contribution: TitheContribution, row: Record<string, string>) => void }) {
  const [draft, setDraft] = useState({
    payerId: payers[0]?.id ?? "",
    month: "Julho",
    year: String(new Date().getFullYear()),
    amount: "",
  });

  const set = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const payer = payers.find((item) => item.id === draft.payerId);

  function save() {
    if (!payer) {
      toast.error("Selecione um dizimista");
      return;
    }

    const month = getTitheMonthByLabel(draft.month);
    const amount = parseMoney(draft.amount);
    const year = Number(draft.year);
    if (!month) {
      toast.error("Selecione o mes");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Informe um valor valido");
      return;
    }
    if (!Number.isFinite(year)) {
      toast.error("Informe o ano");
      return;
    }

    const row = {
      "Nome Completo": payer.name,
      CONGREGACAO: payer.congregation,
      SETOR: payer.sector,
      AREA: payer.area,
      ano: String(year),
      [month.label]: draft.amount,
    };
    const contribution: TitheContribution = {
      id: `local_contribution_${crypto.randomUUID()}`,
      tithePayerId: payer.id,
      tithePayerName: payer.name,
      month: month.label,
      monthNumber: TITHE_MONTHS.findIndex((item) => item.key === month.key) + 1,
      amount,
      year,
      congregation: payer.congregation,
      sector: payer.sector,
      area: payer.area,
      raw: row,
    };

    onSave(contribution, row);
  }

  return (
    <Modal title="Lancar dizimo mensal" onClose={onClose} onSave={save}>
      <label className="min-w-0 text-sm font-medium">
        Dizimista
        <Select className="mt-2 w-full" value={draft.payerId} onChange={(event) => set("payerId", event.target.value)}>
          {payers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="min-w-0 text-sm font-medium">
        Mes
        <Select className="mt-2 w-full" value={draft.month} onChange={(event) => set("month", event.target.value)}>
          {TITHE_MONTHS.map((month) => (
            <option key={month.key} value={month.label}>
              {month.label}
            </option>
          ))}
        </Select>
      </label>
      <Field label="Ano" value={draft.year} onChange={(value) => set("year", value)} />
      <Field label="Valor R$" value={draft.amount} onChange={(value) => set("amount", value)} />
    </Modal>
  );
}

function MobileTithePayerCards({ payers, onSelect, onReceipt }: { payers: TithePayer[]; onSelect: (payer: TithePayer) => void; onReceipt: (contribution: TitheContribution) => void }) {
  if (!payers.length) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">Nenhum dizimista encontrado com os filtros atuais.</CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-hidden">
      {payers.map((payer) => {
        const receipt = latestContributionFromPayer(payer);
        return (
          <Card key={payer.id} className="w-full min-w-0 max-w-full overflow-hidden">
            <CardContent className="p-4">
              <div className="flex min-w-0 flex-col gap-3 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold leading-5">{payer.name}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{payer.congregation || "Congregacao nao informada"}</p>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 min-[390px]:flex">
                  <Button variant="outline" size="sm" onClick={() => onSelect(payer)}>
                    <Eye className="h-4 w-4" />
                    Ver
                  </Button>
                  <Button variant="secondary" size="sm" disabled={!receipt} onClick={() => receipt && onReceipt(receipt)}>
                    <Receipt className="h-4 w-4" />
                    Recibo
                  </Button>
                </div>
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
        );
      })}
    </div>
  );
}

function MobileContributionCards({ contributions, onReceipt }: { contributions: TitheContribution[]; onReceipt: (contribution: TitheContribution) => void }) {
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
            <Button variant="outline" className="mt-4 w-full" onClick={() => onReceipt(contribution)}>
              <Receipt className="h-4 w-4" />
              Gerar recibo
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function latestContributionFromPayer(payer: TithePayer): TitheContribution | null {
  const paidMonths = getPaidMonths(payer);
  const latest = paidMonths.at(-1);
  if (!latest) return null;

  const year = Number(sheetValueToReceiptText(payer.raw.ano ?? payer.raw.Ano)) || new Date().getFullYear();
  return {
    id: `${payer.id}_${latest.key}`,
    tithePayerId: payer.id,
    tithePayerName: payer.name,
    month: latest.label,
    monthNumber: TITHE_MONTHS.findIndex((month) => month.key === latest.key) + 1,
    amount: latest.amount,
    year,
    congregation: payer.congregation,
    sector: payer.sector,
    area: payer.area,
    raw: payer.raw,
  };
}

interface ReceiptDraft {
  localNumber: string;
  type: string;
  name: string;
  date: string;
  paymentMethod: string;
  amount: string;
  church: string;
}

function ReceiptModal({ contribution, onClose }: { contribution: TitheContribution; onClose: () => void }) {
  const [draft, setDraft] = useState<ReceiptDraft>(() => ({
    localNumber: buildReceiptNumber(contribution),
    type: "Dizimo",
    name: contribution.tithePayerName,
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "Dinheiro",
    amount: formatCurrency(contribution.amount).replace("R$", "").trim(),
    church: contribution.congregation || "Sede Montese",
  }));

  const set = (key: keyof ReceiptDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <h2 className="break-words text-lg font-semibold">Recibo de dizimo</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5">
          <Field label="No Local" value={draft.localNumber} onChange={(value) => set("localNumber", value)} />
          <Field label="Tipo" value={draft.type} onChange={(value) => set("type", value)} />
          <Field label="Nome" value={draft.name} onChange={(value) => set("name", value)} />
          <Field label="Data" type="date" value={draft.date} onChange={(value) => set("date", value)} />
          <Field label="Forma" value={draft.paymentMethod} onChange={(value) => set("paymentMethod", value)} />
          <Field label="Valor R$" value={draft.amount} onChange={(value) => set("amount", value)} />
          <label className="min-w-0 text-sm font-medium sm:col-span-2">
            Igreja
            <Input className="mt-2 min-w-0" value={draft.church} onChange={(event) => set("church", event.target.value)} />
          </label>
        </div>
        <div className="grid gap-2 border-t border-border p-4 sm:flex sm:flex-row sm:justify-end sm:p-5">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button className="w-full sm:w-auto" onClick={() => printReceipt(draft)}>
            <Receipt className="h-4 w-4" />
            Imprimir recibo
          </Button>
        </div>
      </div>
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
    <label className="min-w-0 text-sm font-medium">
      {label}
      <Input className="mt-2 min-w-0 max-w-full" type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
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
