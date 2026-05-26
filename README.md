# Marketplace Finance BI

Aplicacao SaaS em Next.js para importar planilhas da Shopee e faturamento fiscal, persistir dados em PostgreSQL, evitar duplicidade e gerar dashboards financeiros, fiscais e operacionais.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS e componentes shadcn/ui.
- Auth.js com JWT/session, middleware e RBAC granular.
- Prisma + PostgreSQL, pronto para Neon ou Supabase.
- SheetJS/xlsx e PapaParse para XLS, XLSX e CSV.
- TanStack Table, Recharts, React Hook Form, Zod e date-fns.

## Como Rodar

1. Configure `.env` com base em `.env.example`.
2. Instale dependencias: `cmd /c npm install`.
3. Gere o client Prisma: `cmd /c npm run prisma:generate`.
4. Rode migracao: `cmd /c npx prisma migrate dev --name init`.
5. Rode seed: `cmd /c npm run prisma:seed`.
6. Inicie: `cmd /c npm run dev`.

Usuario seed:

- Email: `master@empresa.com`
- Senha: `Admin@12345`

## Deploy

Use Vercel para a aplicacao e Neon PostgreSQL ou Supabase PostgreSQL para o banco. Defina `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true` e `NEXTAUTH_URL` nas variaveis de ambiente.

## Importadores

O upload detecta automaticamente:

- Faturamento fiscal.
- Saldo da carteira Shopee.
- Shopee Acelera.
- Income/Renda Shopee.

O processamento normaliza datas, moeda brasileira, periodo, hashes de deduplicacao, upserts e erros por linha. Arquivos originais sao gravados em `uploads/` no ambiente local; em producao, substituir por storage externo como Vercel Blob, S3 ou Supabase Storage.

## Permissoes

Perfis seedados:

- Administrador Master.
- Administrador.
- Financeiro.
- Fiscal.
- Operador.
- Visualizador.

Permissoes seguem os modulos `dashboard`, `uploads`, `finance`, `fiscal`, `fees`, `users`, `system` e `api.tokens`.

## Filtros e Relatorios

As telas executivas usam filtros de periodo por URL (`start` e `end`) e exportam relatorios em CSV ou Excel:

- Vendas fiscais.
- Financeiro.
- Produtos.
- Taxas.
- Historico de uploads.

Exemplo:

`/api/v1/reports?type=sales&format=xlsx&start=2026-04-01&end=2026-04-12`

## API

Endpoints iniciais:

- `POST /api/v1/uploads`
- `GET /api/v1/dashboard`
- `GET /api/v1/reports`

A arquitetura ja separa DTOs, services, repositories futuros, resposta padronizada e logs para evoluir para Swagger/OpenAPI, tokens e integracoes ERP/marketplaces.

## Documentacao Tecnica

- [Arquitetura](docs/ARCHITECTURE.md)
- [Fluxo de importacao](docs/IMPORT_FLOW.md)
