import {
  Banknote,
  Boxes,
  ClipboardList,
  CreditCard,
  FileBarChart,
  History,
  LayoutDashboard,
  Percent,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldCheck,
  Truck,
  Upload,
  Users
} from "lucide-react";
import type { PermissionKey } from "@/lib/auth/permissions";

export const sidebarItems: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: PermissionKey;
  section: "visao" | "operacao" | "admin";
}> = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, permission: "dashboard.view", section: "visao" },
  { href: "/uploads", label: "Uploads", icon: Upload, permission: "uploads.view", section: "visao" },
  { href: "/relatorios", label: "Relatorios", icon: FileBarChart, permission: "finance.export", section: "visao" },
  { href: "/historico", label: "Historico", icon: History, permission: "uploads.view", section: "visao" },
  { href: "/vendas", label: "Vendas", icon: ReceiptText, permission: "finance.view", section: "operacao" },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList, permission: "finance.view", section: "operacao" },
  { href: "/produtos", label: "Produtos", icon: Boxes, permission: "finance.view", section: "operacao" },
  { href: "/comissoes", label: "Comissoes", icon: Percent, permission: "fees.view", section: "operacao" },
  { href: "/taxas", label: "Taxas", icon: Percent, permission: "fees.view", section: "operacao" },
  { href: "/devolucoes", label: "Devolucoes", icon: RotateCcw, permission: "finance.view", section: "operacao" },
  { href: "/fretes", label: "Fretes", icon: Truck, permission: "finance.view", section: "operacao" },
  { href: "/fiscal", label: "Fiscal", icon: ShieldCheck, permission: "fiscal.view", section: "operacao" },
  { href: "/financeiro", label: "Financeiro", icon: Banknote, permission: "finance.view", section: "operacao" },
  { href: "/acelera", label: "Acelera", icon: CreditCard, permission: "finance.view", section: "operacao" },
  { href: "/carteira", label: "Carteira Shopee", icon: Banknote, permission: "finance.view", section: "operacao" },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, permission: "users.view", section: "admin" },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings, permission: "system.settings", section: "admin" }
];
