import { SectionPage } from "@/components/section-page";

export default function ConfiguracoesPage() {
  return <SectionPage title="Configuracoes" description="Parametros globais, API tokens, manutencao, fiscal e integracoes futuras." items={["API tokens", "Regras fiscais", "Manutencao", "Sentry"]} />;
}
