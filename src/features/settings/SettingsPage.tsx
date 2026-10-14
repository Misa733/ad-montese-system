import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, FileSpreadsheet, FlaskConical, Save, UploadCloud } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/application/auth/AuthProvider";
import { importService } from "@/application/import/container";
import { useSettings } from "@/application/data/useStores";
import { tryExtractSpreadsheetId } from "@/config/spreadsheet";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { settingsStore, type DataSource } from "@/infrastructure/storage/SettingsStore";
import { cn, formatDateTime } from "@/lib/utils";

export function SettingsPage() {
  const settings = useSettings();
  const { isLocalMode } = useAuth();
  const queryClient = useQueryClient();
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(settings.spreadsheet_url);
  const [progress, setProgress] = useState("");

  async function save(patch: Parameters<typeof settingsStore.update>[0], message: string) {
    try {
      await settingsStore.update(patch);
      await queryClient.invalidateQueries({ queryKey: ["spreadsheet"] });
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar");
    }
  }

  function saveUrl() {
    if (!tryExtractSpreadsheetId(spreadsheetUrl)) {
      toast.error("Cole o link completo da planilha do Google");
      return;
    }
    void save({ spreadsheet_url: spreadsheetUrl.trim() }, "Planilha atualizada");
  }

  const importMutation = useMutation({
    mutationFn: () => importService.importGoogleIntoDatabase((done, total) => setProgress(`${done} de ${total} linhas`)),
    onSuccess: (result) => {
      setProgress("");
      void queryClient.invalidateQueries({ queryKey: ["spreadsheet"] });
      toast.success(`Importadas ${result.tabs} abas e ${result.rows} linhas para o banco`);
    },
    onError: (error) => {
      setProgress("");
      toast.error(error instanceof Error ? error.message : "Falha na importacao");
    },
  });

  function chooseSource(source: DataSource) {
    if (source === settings.data_source) return;
    if (source === "database" && !settings.last_import_at) {
      toast.error("Importe a planilha para o banco antes de trocar a fonte");
      return;
    }
    void save({ data_source: source }, source === "database" ? "O sistema agora le do banco de dados" : "O sistema agora le da planilha do Google");
  }

  return (
    <div>
      <PageHeader eyebrow="Administracao" title="Configuracoes" description="Planilha conectada, migracao para o banco de dados e modo demonstracao." />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" />Planilha do Google</CardTitle>
            <CardDescription>
              Compartilhe a planilha (somente leitura) com o email da conta de servico configurada na hospedagem. Assim ela nao precisa ficar aberta para qualquer pessoa com o link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input value={spreadsheetUrl} placeholder="https://docs.google.com/spreadsheets/d/..." onChange={(event) => setSpreadsheetUrl(event.target.value)} />
              <Button variant="outline" onClick={saveUrl}>
                <Save className="h-4 w-4" />
                Salvar link
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Migracao para o banco de dados</CardTitle>
            <CardDescription>
              Passo 1: importe a planilha para o banco (pode repetir quantas vezes quiser, ela substitui a copia anterior). Passo 2: quando conferir que esta tudo certo, troque a fonte para o banco. A partir dai os lancamentos ficam no banco e a planilha vira arquivo historico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending || isLocalMode || !settings.spreadsheet_url}>
                <UploadCloud className="h-4 w-4" />
                {importMutation.isPending ? "Importando..." : "Importar planilha para o banco"}
              </Button>
              {progress ? <Badge>{progress}</Badge> : null}
              <span className="text-sm text-muted-foreground">Ultima importacao: {settings.last_import_at ? formatDateTime(settings.last_import_at) : "nunca"}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SourceOption
                active={settings.data_source === "google"}
                title="Ler da planilha do Google"
                description="Como funciona hoje. Cadastros feitos no sistema ficam guardados no banco e listados como rascunhos da planilha."
                onClick={() => chooseSource("google")}
              />
              <SourceOption
                active={settings.data_source === "database"}
                title="Ler do banco de dados"
                description="Usa a copia importada. Lancamentos novos entram direto no banco e aparecem para todos."
                onClick={() => chooseSource("database")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" />Modo demonstracao</CardTitle>
            <CardDescription>Mostra bens, inventarios e imoveis de exemplo no Patrimonio. Use so para apresentar o sistema; deixe desligado no uso real.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant={settings.demo_mode ? "default" : "outline"} onClick={() => void save({ demo_mode: !settings.demo_mode }, settings.demo_mode ? "Modo demonstracao desligado" : "Modo demonstracao ligado")}>
              {settings.demo_mode ? "Desligar modo demonstracao" : "Ligar modo demonstracao"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SourceOption({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-4 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
      )}
    >
      <p className="flex items-center gap-2 font-medium">
        {title}
        {active ? <Badge>Em uso</Badge> : null}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
