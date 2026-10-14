import type { ColumnDef } from "@tanstack/react-table";
import { Download, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { useRealData } from "@/application/data/useRealData";
import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { downloadXlsx } from "@/lib/export";
import { RawModal } from "../modules/shared";

export function DataExplorerPage({ title = "Dados da Planilha" }: { title?: string }) {
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
      <PageHeader eyebrow="Explorador" title={title} description="Todas as abas ficam pesquisaveis, ordenaveis e exportaveis para nenhuma informacao ficar escondida." actions={<Button variant="outline" onClick={() => downloadXlsx(`${sheet?.title ?? "dados"}.xlsx`, (sheet?.rows ?? []) as Array<Record<string, unknown>>)}><Download className="h-4 w-4" />Exportar</Button>} />
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
