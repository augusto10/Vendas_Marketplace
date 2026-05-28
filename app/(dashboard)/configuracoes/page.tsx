import { SectionPage } from "@/components/section-page";

export default function ConfiguracoesPage() {
  return <SectionPage title="Configuracoes do sistema" description="Parametros globais, API tokens, manutencao, regras fiscais e integracoes futuras." items={["API tokens", "Regras fiscais", "Manutencao", "Sentry"]} />;
}
