import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRealData } from "@/application/data/useRealData";
import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { SimpleCreateModal } from "../modules/shared";

export function CongregationsPage() {
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
      {creating ? <SimpleCreateModal title="Nova congregacao" fields={["Nome", "Setor", "Area", "Numero"]} onClose={() => setCreating(false)} onSave={(row) => { spreadsheetService.appendRowToSheet("Dados", row); setCreating(false); toast.success("Congregacao salva"); }} /> : null}
    </div>
  );
}

export function StructurePage({ title, kind }: { title: string; kind: "area" | "sector" }) {
  const { organizationService, spreadsheetService } = useRealData();
  const rows = kind === "area" ? organizationService.getAreas().map((name) => ({ name })) : organizationService.getSectors().map((name) => ({ name }));
  const [creating, setCreating] = useState(false);
  const columns = useMemo<ColumnDef<{ name: string }>[]>(() => [{ accessorKey: "name", header: "Nome" }], []);
  return (
    <div>
      <PageHeader eyebrow="Estrutura ministerial" title={title} description="Lista real derivada da hierarquia Area -> Setor -> Congregacao." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Novo registro</Button>} />
      <DataTable columns={columns} data={rows} searchPlaceholder={`Pesquisar ${title.toLowerCase()}...`} />
      {creating ? <SimpleCreateModal title={`Novo ${title}`} fields={kind === "area" ? ["Nome"] : ["Nome", "Area"]} onClose={() => setCreating(false)} onSave={(row) => { spreadsheetService.appendRowToSheet("data", row); setCreating(false); toast.success("Registro salvo"); }} /> : null}
    </div>
  );
}
