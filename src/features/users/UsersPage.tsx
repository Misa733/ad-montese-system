import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/application/auth/AuthProvider";
import { ROLE_LABELS, STATUS_LABELS, type UserProfile, type UserRole, type UserStatus } from "@/application/auth/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/infrastructure/supabase/supabaseClient";
import { formatDateTime } from "@/lib/utils";

export function UsersPage() {
  const { profile: me, isLocalMode } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["profiles"],
    queryFn: () => supabase.rest<UserProfile[]>("GET", "profiles", { params: { select: "*", order: "status.desc,created_at.asc" } }),
    enabled: !isLocalMode,
  });

  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<UserProfile, "role" | "status">> }) =>
      supabase.rest("PATCH", "profiles", { params: { id: `eq.${id}` }, body: patch, prefer: "return=minimal" }),
    onSuccess: () => {
      toast.success("Usuario atualizado");
      void queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar"),
  });

  const users = query.data ?? [];
  const pending = users.filter((user) => user.status === "pendente").length;

  return (
    <div>
      <PageHeader
        eyebrow="Seguranca"
        title="Usuarios"
        description="Quem pede acesso pela tela de login aparece aqui como pendente. Aprove e escolha o perfil de cada pessoa."
        actions={pending ? <Badge>{pending} aguardando aprovacao</Badge> : null}
      />

      {isLocalMode ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">Sem banco configurado nao existem usuarios. Configure o Supabase para usar esta tela.</CardContent>
        </Card>
      ) : query.isLoading ? (
        <Skeleton className="h-56" />
      ) : query.isError ? (
        <Card>
          <CardContent className="p-5 text-sm text-red-600">{query.error instanceof Error ? query.error.message : "Erro ao carregar usuarios"}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {users.map((user) => {
            const isMe = user.id === me?.id;
            return (
              <Card key={user.id}>
                <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_200px_200px] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.full_name || user.email}</p>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Cadastro: {formatDateTime(user.created_at)}</p>
                  </div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Perfil
                    <Select
                      className="mt-1 w-full"
                      value={user.role}
                      disabled={isMe || mutation.isPending}
                      onChange={(event) => mutation.mutate({ id: user.id, patch: { role: event.target.value as UserRole } })}
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    Situacao
                    <Select
                      className="mt-1 w-full"
                      value={user.status}
                      disabled={isMe || mutation.isPending}
                      onChange={(event) => mutation.mutate({ id: user.id, patch: { status: event.target.value as UserStatus } })}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </label>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-6">
        <CardContent className="space-y-1 p-5 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Administrador:</strong> tudo, inclusive usuarios e configuracoes.</p>
          <p><strong className="text-foreground">Tesouraria:</strong> lanca dizimos e movimentacoes.</p>
          <p><strong className="text-foreground">Patrimonio:</strong> cadastra bens, inventarios e manutencoes.</p>
          <p><strong className="text-foreground">Secretaria:</strong> cadastros gerais (membros, congregacoes).</p>
          <p><strong className="text-foreground">Somente leitura:</strong> consulta tudo, nao altera nada.</p>
        </CardContent>
      </Card>
    </div>
  );
}
