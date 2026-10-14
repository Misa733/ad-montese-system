import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { normalizeText } from "@/application/data/SpreadsheetDataService";
import { MONTHS, type TitheContribution } from "@/application/data/TitheService";
import type { FinancialMovement } from "@/application/data/TreasuryService";
import { useRealData } from "@/application/data/useRealData";
import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { downloadXlsx } from "@/lib/export";
import { formatCurrency } from "@/lib/utils";
import { Field, Metric, escapeHtml } from "../modules/shared";

export function ReportsPage() {
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
            <Button variant="outline" onClick={() => downloadXlsx("relatorios.xlsx", rows as unknown as Array<Record<string, unknown>>)}>
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

export function formatDateLabel(date: string) {
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
