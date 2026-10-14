import type { ColumnDef } from "@tanstack/react-table";
import { Download, ExternalLink, Eye, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FilterService, emptyGlobalFilters, type GlobalFilters } from "@/application/data/FilterService";
import { type FinancialMovement, parseMoney } from "@/application/data/TreasuryService";
import { useRealData } from "@/application/data/useRealData";
import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { downloadXlsx } from "@/lib/export";
import { formatCurrency } from "@/lib/utils";
import { Field, Filter, Modal, RawModal, unique } from "../modules/shared";

export function TreasuryPage() {
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
            <Button variant="outline" onClick={() => downloadXlsx("tesouraria-db.xlsx", rows as unknown as Array<Record<string, unknown>>)}>
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
            toast.success("Movimentacao salva");
          }}
        />
      ) : null}
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
