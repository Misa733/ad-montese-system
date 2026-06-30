export interface AuditEntry {
  id: string;
  entity: string;
  entityId: string;
  action: "created" | "updated" | "deleted" | "synced" | "exported";
  description: string;
  createdAt: string;
  actor: string;
}

export interface Member {
  id: string;
  name: string;
  photoUrl?: string;
  cpf?: string;
  phone?: string;
  email?: string;
  role: string;
  congregation: string;
  sector: string;
  area: string;
  gender?: "Masculino" | "Feminino" | "Não informado";
  birthDate?: string;
  baptismDate?: string;
  maritalStatus?: string;
  status: "Ativo" | "Inativo" | "Transferido";
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MinistryArea {
  id: string;
  name: string;
  supervisor: string;
  status: "Ativa" | "Inativa";
  createdAt: string;
  updatedAt: string;
}

export interface Sector {
  id: string;
  name: string;
  area: string;
  pastor: string;
  status: "Ativo" | "Inativo";
  createdAt: string;
  updatedAt: string;
}

export interface Congregation {
  id: string;
  name: string;
  area: string;
  sector: string;
  pastor: string;
  address?: string;
  status: "Ativa" | "Inativa";
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryMovement {
  id: string;
  congregation: string;
  sector: string;
  area: string;
  type: string;
  identification: string;
  date: string;
  paymentMethod: string;
  amount: number;
  localNumber?: string;
  receiptLink?: string;
  status: "Confirmado" | "Cancelado";
  createdAt: string;
  updatedAt: string;
}

export interface OperationalState {
  members: Member[];
  areas: MinistryArea[];
  sectors: Sector[];
  congregations: Congregation[];
  treasury: TreasuryMovement[];
  audit: AuditEntry[];
}

export type OperationalCollection = keyof Pick<
  OperationalState,
  "members" | "areas" | "sectors" | "congregations" | "treasury"
>;
