import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Cloud, DatabaseZap, Eye, Link2, RefreshCcw, Save, Settings2, X } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { importService, integrationStateRepository } from "@/application/import/container";
import { useSpreadsheet } from "@/application/import/useSpreadsheet";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { MinistryModule, WorksheetData } from "@/domain/sheets/types";
import { formatDateTime } from "@/lib/utils";

const moduleLabels: Record<MinistryModule, string> = {
  members: "Membros",
  secretariat: "Secretaria",
  treasury: "Tesouraria",
  assets: "Patrimônio",
  events: "Eventos",
};

export function IntegrationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useSpreadsheet();
  const [state, setState] = useState(() => integrationStateRepository.getState());
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(state.spreadsheetUrl);
  const [preview, setPreview] = useState<WorksheetData | null>(null);
  const [raw, setRaw] = useState<WorksheetData | null>(null);

  const totals = useMemo(
    () => ({
      sheets: data?.sheets.length ?? 0,
      records: data?.sheets.reduce((sum, sheet) => sum + sheet.recordCount, 0) ?? 0,
    }),
    [data],
  );

  const syncMutation = useMutation({
    mutationFn: async () => {
      const spreadsheet = data ?? (await importService.loadCurrentSpreadsheet());
      return importService.sync(spreadsheet);
    },
    onSuccess: (diff) => {
      setState(integrationStateRepository.getState());
      queryClient.invalidateQueries({ queryKey: ["spreadsheet"] });
      toast.success(`Sincronização: ${diff.newRecords} novos, ${diff.changedRecords} alterados`);
    },
  });

  function saveUrl() {
    try {
      const next = integrationStateRepository.saveSpreadsheetUrl(spreadsheetUrl);
      setState(next);
      queryClient.invalidateQueries({ queryKey: ["spreadsheet"] });
      toast.success("Link da planilha atualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o link");
    }
  }

  function saveMapping(sheet: WorksheetData, module: MinistryModule) {
    const mapping = importService.buildMapping(sheet, module);
    const next = integrationStateRepository.saveMapping(mapping);
    setState(next);
    toast.success(`Aba ${sheet.title} vinculada a ${moduleLabels[module]}`);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Dados externos"
        title="Integrações"
        description="Central de conexão com Google Sheets, mapeamento de abas e sincronização incremental."
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
              Recarregar
            </Button>
            <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending || !data}>
              <DatabaseZap className="h-4 w-4" />
              Sincronizar agora
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Status da conexão" value={isError ? "Falha" : "Conectado"} icon={isError ? Link2 : CheckCircle2} />
        <MetricCard label="Última sincronização" value={formatDateTime(state.lastSyncAt)} icon={RefreshCcw} />
        <MetricCard label="Quantidade de abas" value={totals.sheets} icon={Cloud} />
        <MetricCard label="Quantidade de registros" value={totals.records} icon={DatabaseZap} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Planilha conectada</CardTitle>
          <CardDescription>O ID é extraído automaticamente do link e fica centralizado na configuração da integração.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input value={spreadsheetUrl} onChange={(event) => setSpreadsheetUrl(event.target.value)} />
            <Button variant="outline" onClick={saveUrl}>
              <Save className="h-4 w-4" />
              Alterar link
            </Button>
            <Button variant="secondary" onClick={() => toast.success("Fluxo OAuth preparado para conexão Google")}>
              <Cloud className="h-4 w-4" />
              Conectar Google
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Spreadsheet ID atual: {state.spreadsheetId}</p>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4">
        {isLoading ? (
          <Skeleton className="h-56" />
        ) : (
          data?.sheets.map((sheet) => {
            const mapping = state.mappings.find((item) => item.sheetId === sheet.id);
            const inferred = importService.inferModule(sheet);
            return (
              <Card key={sheet.id}>
                <CardHeader>
                  <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <CardTitle>{sheet.title}</CardTitle>
                      <CardDescription>
                        {sheet.columns.length} colunas detectadas, {sheet.recordCount} registros, tipo: {sheetKind(sheet.title)}
                      </CardDescription>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <Select
                        className="min-w-0"
                        defaultValue={mapping?.module ?? inferred}
                        onChange={(event) => saveMapping(sheet, event.target.value as MinistryModule)}
                      >
                        {Object.entries(moduleLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <Badge>{sheetKind(sheet.title)}</Badge>
                    {sheet.columns.slice(0, 12).map((column) => (
                      <Badge key={column.key}>
                        {column.label}: {fieldLabel(column.detectedField)} / {column.type}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreview(sheet)}>
                      <Eye className="h-4 w-4" />
                      Ver previa
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRaw(sheet)}>
                      <DatabaseZap className="h-4 w-4" />
                      Abrir raw
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      {preview ? <SheetModal title={`Previa de ${preview.title}`} sheet={preview} mode="preview" onClose={() => setPreview(null)} /> : null}
      {raw ? <SheetModal title={`Raw de ${raw.title}`} sheet={raw} mode="raw" onClose={() => setRaw(null)} /> : null}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Cloud }) {
  return (
    <Card className="min-w-0">
      <CardContent className="flex min-w-0 items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 break-words text-xl font-semibold">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    name: "Nome",
    phone: "Telefone",
    cpf: "CPF",
    role: "Cargo",
    congregation: "Congregação",
    gender: "Sexo",
    birthDate: "Nascimento",
    baptismDate: "Batismo",
    maritalStatus: "Estado civil",
    amount: "Valor",
    paymentMethod: "Forma",
    date: "Data",
    category: "Categoria",
    unknown: "Outro",
  };
  return labels[field] ?? "Outro";
}

function sheetKind(title: string) {
  const normalized = title.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (normalized === "db") return "Tesouraria";
  if (normalized === "dizimistas") return "Dizimos";
  if (normalized === "atualizacao") return "Listas auxiliares";
  if (normalized === "data") return "Configuracoes";
  if (normalized === "dados") return "Configuracoes da unidade";
  if (normalized === "fluxo") return "Relatorio financeiro";
  if (normalized === "historico") return "Historico financeiro";
  if (normalized === "relatorio") return "Relatorio financeiro";
  if (normalized === "recibo") return "Recibos";
  if (normalized === "lancar") return "Formulario financeiro";
  if (normalized === "cancelar") return "Cancelamentos";
  if (normalized === "ajuda") return "Documentacao";
  return "Dados da planilha";
}

function SheetModal({ title, sheet, mode, onClose }: { title: string; sheet: WorksheetData; mode: "preview" | "raw"; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <Card className="max-h-[92vh] w-full max-w-5xl overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="max-w-full overflow-auto rounded-md bg-muted p-3 text-xs sm:p-4">
            {JSON.stringify(mode === "preview" ? sheet.rows.slice(0, 10) : sheet, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
