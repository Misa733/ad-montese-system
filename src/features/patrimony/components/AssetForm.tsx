import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { generateScopedPatrimonyCode, getCongregationCode, type PatrimonyAsset } from "@/application/data/PatrimonyService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Field, Info } from "./shared";

export function AssetForm({ assets, onSave }: { assets: PatrimonyAsset[]; onSave: (asset: PatrimonyAsset) => void }) {
  const [form, setForm] = useState<Partial<PatrimonyAsset>>({
    status: "Ativo",
    sector: "Setor 02",
    area: "Culto e apoio",
    category: "Mobiliario",
    quantity: 1,
    acquisitionMethod: "Compra",
    conservationState: "Bom",
  });
  const generatedCode = useMemo(() => generateScopedPatrimonyCode(assets, form), [assets, form]);
  const quantity = Math.max(Number(form.quantity ?? 1), 1);
  const unitValue = Number(form.unitValue ?? form.value ?? 0);
  const totalPreview = Number(form.totalValue ?? unitValue * quantity);
  const congregationCode = getCongregationCode(form.congregationCode || form.congregation || "NI");
  const qrPreview = `${window.location.origin}/app/patrimonio?bem=${encodeURIComponent(form.code?.trim() || generatedCode)}`;
  function setField<K extends keyof PatrimonyAsset>(key: K, value: PatrimonyAsset[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    onSave({
      ...form,
      code: form.code?.trim() || generatedCode,
      congregationCode,
      totalValue: totalPreview,
      value: Number(form.value ?? totalPreview),
      currentValue: Number(form.currentValue ?? totalPreview),
      qrCode: form.code?.trim() || generatedCode,
    } as PatrimonyAsset);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Patrimonio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Descricao" value={form.description ?? ""} onChange={(value) => setField("description", value)} />
            <Field label="Categoria" value={form.category ?? ""} onChange={(value) => setField("category", value)} />
            <Field label="Subcategoria" value={form.subcategory ?? ""} onChange={(value) => setField("subcategory", value)} />
            <Field label="Congregacao" value={form.congregation ?? ""} onChange={(value) => setField("congregation", value)} />
            <Field label="Setor" value={form.sector ?? ""} onChange={(value) => setField("sector", value)} />
            <Field label="Area" value={form.area ?? ""} onChange={(value) => setField("area", value)} />
            <Field label="Localizacao" value={form.location ?? ""} onChange={(value) => setField("location", value)} />
            <Field label="Local interno" value={form.internalLocation ?? ""} onChange={(value) => setField("internalLocation", value)} />
            <Field label="Responsavel" value={form.responsible ?? ""} onChange={(value) => setField("responsible", value)} />
            <Field label="Quantidade" type="number" value={String(form.quantity ?? 1)} onChange={(value) => setField("quantity", Number(value))} />
            <Field label="Valor unitario" type="number" value={String(form.unitValue ?? "")} onChange={(value) => setField("unitValue", Number(value))} />
            <Field label="Valor total" type="number" value={String(form.totalValue ?? (totalPreview || ""))} onChange={(value) => setField("totalValue", Number(value))} />
            <Field label="Marca" value={form.brand ?? ""} onChange={(value) => setField("brand", value)} />
            <Field label="Modelo" value={form.model ?? ""} onChange={(value) => setField("model", value)} />
            <Field label="Numero de Serie" value={form.serialNumber ?? ""} onChange={(value) => setField("serialNumber", value)} />
            <Field label="Codigo interno" value={form.internalCode ?? ""} onChange={(value) => setField("internalCode", value)} />
            <Field label="Fornecedor" value={form.supplier ?? ""} onChange={(value) => setField("supplier", value)} />
            <Field label="Nota Fiscal" value={form.invoice ?? ""} onChange={(value) => setField("invoice", value)} />
            <Field label="Data aquisicao" type="date" value={form.acquisitionDate ?? ""} onChange={(value) => setField("acquisitionDate", value)} />
            <Field label="Garantia" value={form.warranty ?? ""} onChange={(value) => setField("warranty", value)} />
            <Field label="Forma aquisicao" value={form.acquisitionMethod ?? ""} onChange={(value) => setField("acquisitionMethod", value)} />
            <Field label="Estado conservacao" value={form.conservationState ?? ""} onChange={(value) => setField("conservationState", value)} />
            <label className="text-xs font-medium text-muted-foreground">
              Situacao
              <Select className="mt-1 w-full" value={form.status ?? "Ativo"} onChange={(event) => setField("status", event.target.value as PatrimonyAsset["status"])}>
                <option>Ativo</option>
                <option>Em manutencao</option>
                <option>Baixado</option>
                <option>Transferido</option>
                <option>Nao localizado</option>
              </Select>
            </label>
            <Field label="Documentos / Anexos" value={form.documentation ?? ""} onChange={(value) => setField("documentation", value)} />
            <Field label="Foto / URL" value={form.photo ?? ""} onChange={(value) => setField("photo", value)} />
          </div>
          <label className="text-xs font-medium text-muted-foreground">
            Observacoes
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.observations ?? ""}
              onChange={(event) => setField("observations", event.target.value)}
            />
          </label>
          <div className="flex justify-end">
            <Button onClick={save}>
              <Plus className="h-4 w-4" />
              Salvar patrimonio
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Tombamento gerado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Info label="Codigo patrimonial" value={form.code?.trim() || generatedCode} />
          <Info label="Sigla congregacao" value={congregationCode} />
          <Info label="Valor total" value={formatCurrency(totalPreview)} />
          <div className="rounded-md border border-border bg-white p-4">
            <img className="mx-auto h-36 w-36" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrPreview)}`} alt="QR Code do patrimonio" />
          </div>
          <Field label="Codigo manual opcional" value={form.code ?? ""} onChange={(value) => setField("code", value)} />
          <p className="text-sm text-muted-foreground">
            Ao salvar, o bem aparece no catalogo, na ficha completa, nos relatorios e fica pronto para etiqueta com QR Code.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
