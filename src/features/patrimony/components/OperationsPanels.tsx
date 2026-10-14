import type { ColumnDef } from "@tanstack/react-table";
import { Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { PatrimonyAsset, PatrimonyMaintenance } from "@/application/data/PatrimonyService";
import { useRealData } from "@/application/data/useRealData";
import { DataTable } from "@/components/data/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Field } from "./shared";

export function MovementsPanel({ movements }: { movements: Array<{ id: string; assetCode: string; assetDescription: string; type: string; date: string; user: string; observation: string }> }) {
  const columns = useMemo<ColumnDef<(typeof movements)[number]>[]>(
    () => [
      { accessorKey: "date", header: "Data" },
      { accessorKey: "assetCode", header: "Codigo" },
      { accessorKey: "assetDescription", header: "Bem" },
      { accessorKey: "type", header: "Tipo" },
      { accessorKey: "user", header: "Usuario" },
      { accessorKey: "observation", header: "Observacao" },
    ],
    [],
  );
  return <DataTable columns={columns} data={movements} searchPlaceholder="Pesquisar historico..." />;
}

export function MaintenancePanel({
  assets,
  maintenances,
  service,
  onRefresh,
}: {
  assets: PatrimonyAsset[];
  maintenances: PatrimonyMaintenance[];
  service: ReturnType<typeof useRealData>["patrimonyService"];
  onRefresh: () => void;
}) {
  const [form, setForm] = useState<Omit<PatrimonyMaintenance, "id">>({
    assetCode: assets[0]?.code ?? "",
    problem: "",
    date: new Date().toISOString().slice(0, 10),
    responsible: "",
    supplier: "",
    value: 0,
    warranty: "",
    deadline: "",
    status: "Aberta",
  });
  const columns = useMemo<ColumnDef<PatrimonyMaintenance>[]>(
    () => [
      { accessorKey: "date", header: "Data" },
      { accessorKey: "assetCode", header: "Patrimonio" },
      { accessorKey: "problem", header: "Problema" },
      { accessorKey: "responsible", header: "Responsavel" },
      { accessorKey: "supplier", header: "Fornecedor" },
      { accessorKey: "value", header: "Valor", cell: ({ row }) => formatCurrency(row.original.value) },
      { accessorKey: "deadline", header: "Prazo" },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
    ],
    [],
  );
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Nova manutencao</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-medium text-muted-foreground">
            Patrimonio
            <Select className="mt-1 w-full" value={form.assetCode} onChange={(event) => setForm({ ...form, assetCode: event.target.value })}>
              {assets.map((asset) => (
                <option key={asset.code} value={asset.code}>{asset.code} - {asset.description}</option>
              ))}
            </Select>
          </label>
          <Field label="Problema" value={form.problem} onChange={(value) => setForm({ ...form, problem: value })} />
          <Field label="Data" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
          <Field label="Responsavel" value={form.responsible} onChange={(value) => setForm({ ...form, responsible: value })} />
          <Field label="Fornecedor" value={form.supplier} onChange={(value) => setForm({ ...form, supplier: value })} />
          <Field label="Valor" type="number" value={String(form.value)} onChange={(value) => setForm({ ...form, value: Number(value) })} />
          <Field label="Garantia" value={form.warranty} onChange={(value) => setForm({ ...form, warranty: value })} />
          <Field label="Prazo" type="date" value={form.deadline} onChange={(value) => setForm({ ...form, deadline: value })} />
          <Button className="self-end" onClick={() => (service.createMaintenance(form), onRefresh(), toast.success("Manutencao cadastrada"))}>
            <Wrench className="h-4 w-4" />
            Salvar
          </Button>
        </CardContent>
      </Card>
      <DataTable columns={columns} data={maintenances} searchPlaceholder="Pesquisar manutencoes..." />
    </div>
  );
}

export function PropertiesPanel({ properties }: { properties: ReturnType<ReturnType<typeof useRealData>["patrimonyService"]["getProperties"]> }) {
  const columns = useMemo<ColumnDef<(typeof properties)[number]>[]>(
    () => [
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "congregation", header: "Congregacao" },
      { accessorKey: "area", header: "Area" },
      { accessorKey: "sector", header: "Setor" },
      { accessorKey: "address", header: "Endereco" },
      { accessorKey: "type", header: "Tipo" },
      { accessorKey: "documentation", header: "Documentacao" },
      { accessorKey: "value", header: "Valor", cell: ({ row }) => formatCurrency(row.original.value) },
    ],
    [],
  );
  return <DataTable columns={columns} data={properties} searchPlaceholder="Pesquisar imoveis..." />;
}
