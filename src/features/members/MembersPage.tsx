import type { ColumnDef } from "@tanstack/react-table";
import { Download, Eye, Plus, Save, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRealData } from "@/application/data/useRealData";
import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/export";

interface RealMember {
  id: string;
  name: string;
  congregation: string;
  sector: string;
  area: string;
  origin: string;
  raw: Record<string, unknown>;
}

export function MembersPage() {
  const { tithePayers, spreadsheetService } = useRealData();
  const [selected, setSelected] = useState<RealMember | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = useMemo<RealMember[]>(
    () =>
      tithePayers.map((payer) => ({
        id: payer.id,
        name: payer.name,
        congregation: payer.congregation,
        sector: payer.sector,
        area: payer.area,
        origin: "Dizimistas",
        raw: payer.raw,
      })),
    [tithePayers],
  );

  const columns = useMemo<ColumnDef<RealMember>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nome",
        cell: ({ row }) => (
          <button className="flex items-center gap-3 text-left" onClick={() => setSelected(row.original)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.origin}</p>
            </div>
          </button>
        ),
      },
      { accessorKey: "congregation", header: "Congregacao" },
      { accessorKey: "sector", header: "Setor" },
      { accessorKey: "area", header: "Area" },
      {
        id: "actions",
        header: "Detalhes",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => setSelected(row.original)} aria-label="Ver raw">
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Cadastro ministerial"
        title="Membros"
        description="Pessoas identificadas nos dados reais da planilha, com raw completo preservado."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCsv("membros-reais.csv", rows as unknown as Array<Record<string, unknown>>)}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Novo membro
            </Button>
          </>
        }
      />
      <DataTable columns={columns} data={rows} searchPlaceholder="Pesquisar por nome, congregacao, area ou setor..." />
      {selected ? <RawModal title={`Ficha de ${selected.name}`} raw={selected.raw} onClose={() => setSelected(null)} /> : null}
      {creating ? (
        <CreateMemberModal
          onClose={() => setCreating(false)}
          onSave={(row) => {
            spreadsheetService.appendRowToSheet("Dizimistas", row);
            setCreating(false);
            toast.success("Membro salvo localmente e preparado para sincronizacao");
          }}
        />
      ) : null}
    </div>
  );
}

function CreateMemberModal({ onClose, onSave }: { onClose: () => void; onSave: (row: Record<string, string>) => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const fields = ["Nome", "Congregacao", "Setor", "Area", "Telefone", "Observacoes"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Novo membro</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field} className="text-sm font-medium">
              {field}
              <Input className="mt-2" value={draft[field] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} />
            </label>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end sm:p-5">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => (draft.Nome ? onSave(draft) : toast.error("Informe o nome"))}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
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
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="max-w-full overflow-auto rounded-md bg-muted p-3 text-xs sm:p-4">{JSON.stringify(raw, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
