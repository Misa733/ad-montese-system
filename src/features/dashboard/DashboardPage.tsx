import { motion } from "framer-motion";
import { Banknote, CalendarDays, Church, CreditCard, Download, FileText, HandCoins, Landmark, Receipt, RefreshCcw, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardService } from "@/application/data/DashboardService";
import { emptyGlobalFilters, type GlobalFilters } from "@/application/data/FilterService";
import { useRealData } from "@/application/data/useRealData";
import { ChartCard } from "@/components/charts/ChartCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function DashboardPage() {
  const { dashboardService, organizationService, movements, tithePayers } = useRealData();
  const [filters, setFilters] = useState<GlobalFilters>(emptyGlobalFilters);
  const model = dashboardService.build(filters);

  const options = useMemo(
    () => ({
      areas: organizationService.getAreas(),
      sectors: organizationService.getSectors(filters.area),
      congregations: organizationService.getCongregationNames(filters.area, filters.sector),
      periods: unique(movements.map((item) => item.date.slice(0, 7)).filter(Boolean)),
      months: unique([...movements.map((item) => item.month), ...model.titheSeries.map((item) => item.name)].filter(Boolean)),
      years: unique(movements.map((item) => item.year || item.date.slice(0, 4)).filter(Boolean)),
      financialTypes: unique(movements.map((item) => item.type)),
      paymentMethods: unique(movements.map((item) => item.paymentMethod)),
      tithePayers: unique(tithePayers.map((item) => item.name)),
    }),
    [filters.area, filters.sector, model.titheSeries, movements, organizationService, tithePayers],
  );

  const cards = [
    { label: "Receita Total", value: formatCurrency(Number(model.cards.revenueTotal ?? 0)), icon: TrendingUp },
    { label: "Despesas Totais", value: formatCurrency(Number(model.cards.expenseTotal ?? 0)), icon: TrendingDown },
    { label: "Saldo", value: formatCurrency(Number(model.cards.balance ?? 0)), icon: Banknote },
    { label: "Total de Dizimos", value: formatCurrency(Number(model.cards.titheTotal ?? 0)), icon: HandCoins },
    { label: "Total de Ofertas", value: formatCurrency(Number(model.cards.offeringTotal ?? 0)), icon: Landmark },
    { label: "Oferta Ordinaria", value: formatCurrency(Number(model.cards.ordinaryOffering ?? 0)), icon: Receipt },
    { label: "Oferta Missionaria", value: formatCurrency(Number(model.cards.missionaryOffering ?? 0)), icon: Receipt },
    { label: "Oferta Especial", value: formatCurrency(Number(model.cards.specialOffering ?? 0)), icon: Receipt },
    { label: "Total por PIX", value: formatCurrency(Number(model.cards.pixTotal ?? 0)), icon: CreditCard },
    { label: "Total por Dinheiro", value: formatCurrency(Number(model.cards.cashTotal ?? 0)), icon: Banknote },
    { label: "Total por Cartao", value: formatCurrency(Number(model.cards.cardTotal ?? 0)), icon: CreditCard },
    { label: "Lancamentos", value: model.cards.movementCount, icon: FileText },
    { label: "Recibos", value: model.cards.receiptCount, icon: Receipt },
    { label: "Congregacoes", value: model.cards.congregationCount, icon: Church },
    { label: "Setores", value: model.cards.sectorCount, icon: CalendarDays },
    { label: "Areas", value: model.cards.areaCount, icon: Landmark },
    { label: "Dizimistas", value: model.cards.tithePayerCount, icon: Users },
    { label: "Ultima sincronizacao", value: formatDateTime(model.cards.loadedAt), icon: RefreshCcw },
  ];

  function setFilter(key: keyof GlobalFilters, value: string) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "area") {
        next.sector = "Todos";
        next.congregation = "Todos";
      }
      if (key === "sector") next.congregation = "Todos";
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Visao executiva"
        title="Dashboard"
        description="Indicadores recalculados automaticamente a partir dos dados reais da planilha."
        actions={
          <>
            <Badge>{movements.length + tithePayers.length} registros reais processados</Badge>
            <Button onClick={() => printDashboardPdf({ filters, cards, model })}>
              <Download className="h-4 w-4" />
              Gerar PDF
            </Button>
          </>
        }
      />

      <Card className="mb-6">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterSelect label="Area" value={filters.area} options={options.areas} onChange={(value) => setFilter("area", value)} />
          <FilterSelect label="Setor" value={filters.sector} options={options.sectors} onChange={(value) => setFilter("sector", value)} />
          <FilterSelect label="Congregacao" value={filters.congregation} options={options.congregations} onChange={(value) => setFilter("congregation", value)} />
          <FilterSelect label="Periodo" value={filters.period} options={options.periods} onChange={(value) => setFilter("period", value)} />
          <FilterSelect label="Mes" value={filters.month} options={options.months} onChange={(value) => setFilter("month", value)} />
          <FilterSelect label="Ano" value={filters.year} options={options.years} onChange={(value) => setFilter("year", value)} />
          <FilterSelect label="Tipo financeiro" value={filters.financialType} options={options.financialTypes} onChange={(value) => setFilter("financialType", value)} />
          <FilterSelect label="Forma" value={filters.paymentMethod} options={options.paymentMethods} onChange={(value) => setFilter("paymentMethod", value)} />
          <FilterSelect label="Dizimista" value={filters.tithePayer} options={options.tithePayers} onChange={(value) => setFilter("tithePayer", value)} />
        </CardContent>
      </Card>

      <div className="grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }, index) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
            <Card className="min-w-0">
              <CardContent className="flex min-w-0 items-center justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 break-words text-xl font-semibold sm:text-2xl">{value}</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-2">
        <FinanceChart title="Receitas x Despesas por mes" data={model.financeSeries} />
        <SimpleBar title="Dizimos por mes" data={model.titheSeries} dataKey="dizimos" />
        <SimpleBar title="Receitas por tipo" data={model.typeSeries} />
        <SimpleBar title="Receitas por forma de pagamento" data={model.paymentSeries} />
        <SimpleBar title="Receitas por congregacao" data={model.congregationSeries} />
        <SimpleBar title="Receitas por setor" data={model.sectorSeries} />
        <SimpleBar title="Receitas por area" data={model.areaSeries} />
        <SimpleBar title="Top congregacoes por arrecadacao" data={model.topCongregations} />
        <SimpleBar title="Top dizimistas" data={model.topTithers} />
        <ChartCard title="Fluxo de caixa">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={model.cashFlowSeries}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="saldo" stroke="#7A0C10" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <SimpleBar title="Evolucao anual" data={model.annualSeries} />
      </div>
    </div>
  );
}

function FinanceChart({ title, data }: { title: string; data: Array<{ name: string; receitas: number; despesas: number }> }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Bar dataKey="receitas" fill="#7A0C10" radius={[6, 6, 0, 0]} />
          <Bar dataKey="despesas" fill="#B49B7C" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function SimpleBar({ title, data, dataKey = "value" }: { title: string; data: Array<Record<string, string | number>>; dataKey?: string }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Bar dataKey={dataKey} fill="#A31218" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-medium text-muted-foreground">
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

function printDashboardPdf({ filters, cards, model }: { filters: GlobalFilters; cards: Array<{ label: string; value: string | number }>; model: ReturnType<DashboardService["build"]> }) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const logo = `${window.location.origin}/assets/logo.png`;
  const returnUrl = window.location.href;
  const generatedAt = new Date().toLocaleString("pt-BR");
  const activeFilters = Object.entries(filters)
    .filter(([, value]) => value && value !== "Todos")
    .map(([key, value]) => `${dashboardFilterLabel(key)}: ${value}`)
    .join(" | ") || "Todos os dados";
  const cardRows = cards
    .map((card) => `<tr><td>${escapeDashboardHtml(card.label)}</td><td>${escapeDashboardHtml(card.value)}</td></tr>`)
    .join("");
  const topRows = model.topCongregations
    .slice(0, 10)
    .map((row) => `<tr><td>${escapeDashboardHtml(row.name)}</td><td>${formatCurrency(Number(row.value))}</td></tr>`)
    .join("");
  const titheRows = model.topTithers
    .slice(0, 10)
    .map((row) => `<tr><td>${escapeDashboardHtml(row.name)}</td><td>${formatCurrency(Number(row.value))}</td></tr>`)
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatorio Financeiro Dashboard</title>
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
          h2 { margin: 24px 0 8px; font-size: 16px; color: #7A0C10; }
          p { margin: 4px 0 0; color: #555; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
          th, td { border-bottom: 1px solid #e5e5e5; padding: 8px; text-align: left; }
          th { background: #f4eeee; color: #7A0C10; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
          @media print { body { padding: 18px; } .toolbar { display: none; } .grid { grid-template-columns: 1fr; gap: 8px; } }
        </style>
      </head>
      <body>
        <nav class="toolbar">
          <button type="button" onclick="window.print()">Imprimir</button>
          <a href="${escapeDashboardHtml(returnUrl)}" onclick="if (window.opener) { window.close(); }">Voltar ao sistema</a>
        </nav>
        <header>
          <img src="${logo}" alt="AD Montese" />
          <div>
            <h1>Relatorio Financeiro do Dashboard</h1>
            <p>Filtros: ${escapeDashboardHtml(activeFilters)}</p>
            <p>Gerado em: ${generatedAt}</p>
          </div>
        </header>
        <h2>Indicadores</h2>
        <table><tbody>${cardRows}</tbody></table>
        <section class="grid">
          <div>
            <h2>Top congregacoes</h2>
            <table><thead><tr><th>Congregacao</th><th>Total</th></tr></thead><tbody>${topRows || '<tr><td colspan="2">Sem dados</td></tr>'}</tbody></table>
          </div>
          <div>
            <h2>Top dizimistas</h2>
            <table><thead><tr><th>Dizimista</th><th>Total</th></tr></thead><tbody>${titheRows || '<tr><td colspan="2">Sem dados</td></tr>'}</tbody></table>
          </div>
        </section>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function dashboardFilterLabel(key: string) {
  const labels: Record<string, string> = {
    area: "Area",
    sector: "Setor",
    congregation: "Congregacao",
    period: "Periodo",
    month: "Mes",
    year: "Ano",
    financialType: "Tipo financeiro",
    paymentMethod: "Forma",
    tithePayer: "Dizimista",
  };
  return labels[key] ?? key;
}

function escapeDashboardHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
