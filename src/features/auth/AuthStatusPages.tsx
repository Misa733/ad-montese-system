import { LogOut, RefreshCcw } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/application/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "./LoginPage";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

function MessageCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <AuthShell>
      <div className="rounded-lg border border-border bg-card p-4 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">{children}</div>
        {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </AuthShell>
  );
}

export function PendingApprovalPage() {
  const { profile, reload, signOut } = useAuth();
  return (
    <MessageCard
      title="Acesso aguardando aprovacao"
      actions={
        <>
          <Button variant="outline" onClick={() => void reload()}>
            <RefreshCcw className="h-4 w-4" />
            Verificar de novo
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </>
      }
    >
      <p>Seu cadastro ({profile?.email}) foi recebido.</p>
      <p>Um administrador do sistema precisa liberar seu acesso e definir seu perfil antes de voce entrar.</p>
    </MessageCard>
  );
}

export function BlockedPage() {
  const { signOut } = useAuth();
  return (
    <MessageCard title="Acesso bloqueado" actions={<Button variant="outline" onClick={() => void signOut()}><LogOut className="h-4 w-4" />Sair</Button>}>
      <p>Seu acesso foi bloqueado por um administrador. Fale com a secretaria da sede.</p>
    </MessageCard>
  );
}

export function LoadErrorPage() {
  const { error, reload, signOut } = useAuth();
  return (
    <MessageCard
      title="Nao foi possivel carregar o sistema"
      actions={
        <>
          <Button variant="outline" onClick={() => void reload()}><RefreshCcw className="h-4 w-4" />Tentar de novo</Button>
          <Button variant="ghost" onClick={() => void signOut()}><LogOut className="h-4 w-4" />Sair</Button>
        </>
      }
    >
      <p>{error}</p>
    </MessageCard>
  );
}

export function NotConfiguredPage() {
  return (
    <MessageCard title="Banco de dados nao configurado">
      <p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na hospedagem e publique de novo.</p>
      <p>O passo a passo esta no README do projeto.</p>
    </MessageCard>
  );
}

export function NewPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password);
      toast.success("Senha alterada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar a senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MessageCard title="Criar nova senha" actions={<Button onClick={() => void save()} disabled={saving}>{saving ? "Salvando..." : "Salvar senha"}</Button>}>
      <Input type="password" autoComplete="new-password" placeholder="Nova senha" value={password} onChange={(event) => setPassword(event.target.value)} />
    </MessageCard>
  );
}
