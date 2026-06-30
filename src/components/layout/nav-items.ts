import {
  Banknote,
  BarChart3,
  CalendarDays,
  Church,
  FileText,
  Gem,
  HandCoins,
  LayoutDashboard,
  Link2,
  Settings,
  ShieldCheck,
  TableProperties,
  Users,
  Warehouse,
} from "lucide-react";

export const navItems = [
  { title: "Dashboard", href: "/app", icon: LayoutDashboard },
  { title: "Areas", href: "/app/areas", icon: BarChart3 },
  { title: "Setores", href: "/app/setores", icon: ShieldCheck },
  { title: "Membros", href: "/app/membros", icon: Users },
  { title: "Dizimistas", href: "/app/dizimistas", icon: HandCoins },
  { title: "Congregacoes", href: "/app/congregacoes", icon: Church },
  { title: "Secretaria", href: "/app/secretaria", icon: FileText },
  { title: "Tesouraria", href: "/app/tesouraria", icon: Banknote },
  { title: "Patrimonio", href: "/app/patrimonio", icon: Warehouse },
  { title: "Eventos", href: "/app/eventos", icon: CalendarDays },
  { title: "Relatorios", href: "/app/relatorios", icon: BarChart3 },
  { title: "Dados da Planilha", href: "/app/dados", icon: TableProperties },
  { title: "Usuarios", href: "/app/usuarios", icon: ShieldCheck },
  { title: "Integracoes", href: "/app/integracoes", icon: Link2 },
  { title: "Configuracoes", href: "/app/configuracoes", icon: Settings },
] as const;

export const productBadges = [
  { label: "ERP Ministerial", icon: Gem },
  { label: "Multi-igrejas preparado", icon: Church },
];
