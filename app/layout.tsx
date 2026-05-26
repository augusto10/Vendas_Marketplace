import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "@/app/theme-script";

export const metadata: Metadata = {
  title: "Marketplace Vendas",
  description: "Integração Shopee"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body><ThemeScript />{children}</body>
    </html>
  );
}
