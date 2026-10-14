export type UserRole = "admin" | "secretaria" | "tesouraria" | "patrimonio" | "leitura";
export type UserStatus = "pendente" | "ativo" | "bloqueado";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  congregation: string | null;
  created_at?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  secretaria: "Secretaria",
  tesouraria: "Tesouraria",
  patrimonio: "Patrimonio",
  leitura: "Somente leitura",
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  pendente: "Aguardando aprovacao",
  ativo: "Ativo",
  bloqueado: "Bloqueado",
};
