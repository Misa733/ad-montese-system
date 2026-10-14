import type { ColumnDef } from "@tanstack/react-table";
import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { generateScopedPatrimonyCode, type PatrimonyAsset, type PatrimonyInventory, type PatrimonyMaintenance } from "@/application/data/PatrimonyService";
import { DataTable } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { downloadXlsx } from "@/lib/export";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { filterAssets } from "./PatrimonyCatalog";
import { FilterSelect, Info, escapeHtml, unique } from "./shared";

export function PatrimonyReports({ assets, maintenances, inventories }: { assets: PatrimonyAsset[]; maintenances: PatrimonyMaintenance[]; inventories: PatrimonyInventory[] }) {
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

export function PatrimonySettings({ assets }: { assets: PatrimonyAsset[] }) {
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
          <Info label="Proximo codigo" value={generateScopedPatrimonyCode(assets, { sector: "Setor 02", congregation: "Parque Araturi", category: "Mobiliario" })} />
          <Info label="Modelo por setor" value="ADM-S02-PA-MOB-0001" />
          <Info label="QR Code" value="Abre a ficha completa do patrimonio" />
        </CardContent>
      </Card>
    </div>
  );
}

const reportColumns: ColumnDef<{ grupo: string; registros: number; valor: number }>[] = [
  { accessorKey: "grupo", header: "Grupo" },
  { accessorKey: "registros", header: "Registros" },
  { accessorKey: "valor", header: "Valor", cell: ({ row }) => formatCurrency(row.original.valor) },
];

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
