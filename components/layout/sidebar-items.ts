import type { ComponentType } from "react";
import {
  Banknote,
  Boxes,
  ClipboardList,
  CreditCard,
  HandCoins,
  History,
  LayoutDashboard,
  Percent,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldCheck,
  Truck,
  Upload,
  Users,
  Wallet,
  Warehouse
} from "lucide-react";
import type { PermissionKey } from "@/lib/auth/permissions";

export type SidebarItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission: PermissionKey;
  section: "visao" | "operacao" | "atacado" | "admin";
  children?: SidebarItem[];
};

export const sidebarItems: SidebarItem[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, permission: "dashboard.view", section: "visao" },
  { href: "/uploads", label: "Uploads", icon: Upload, permission: "uploads.view", section: "visao" },
  { href: "/historico", label: "Historico", icon: History, permission: "uploads.view", section: "visao" },
  { href: "/vendas", label: "Vendas", icon: ReceiptText, permission: "finance.view", section: "operacao" },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList, permission: "finance.view", section: "operacao" },
  { href: "/produtos", label: "Produtos", icon: Boxes, permission: "finance.view", section: "operacao" },
  {
    href: "/atacado",
    label: "Atacado",
    icon: Warehouse,
    permission: "atacado.dashboard.view",
    section: "atacado",
    children: [
      { href: "/atacado", label: "Resumo", icon: LayoutDashboard, permission: "atacado.dashboard.view", section: "atacado" },
      { href: "/atacado/clientes", label: "Clientes", icon: Users, permission: "atacado.clientes.view", section: "atacado" },
      { href: "/atacado/produtos", label: "Produtos", icon: Boxes, permission: "atacado.produtos.view", section: "atacado" },
      { href: "/atacado/pedidos", label: "Pedidos", icon: ClipboardList, permission: "atacado.pedidos.view", section: "atacado" },
      { href: "/atacado/separacao", label: "Separacao", icon: Warehouse, permission: "atacado.separacao.view", section: "atacado" },
      { href: "/atacado/financeiro", label: "Financeiro", icon: HandCoins, permission: "atacado.financeiro.view", section: "atacado" },
      { href: "/atacado/carteira", label: "Carteira", icon: Wallet, permission: "atacado.financeiro.view", section: "atacado" },
      { href: "/atacado/entregas", label: "Entregas", icon: Truck, permission: "atacado.entregas.view", section: "atacado" }
    ]
  },
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
