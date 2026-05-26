# Arquitetura do SaaS de BI Shopee e Fiscal

## Visao Geral

A aplicacao usa Next.js App Router como BFF e frontend, Prisma como camada de persistencia e PostgreSQL hospedavel em Neon ou Supabase. O desenho separa telas, servicos, repositorios, validacoes e importadores para permitir uma API publica/privada futura sem reescrever regras de negocio.

## Camadas

- `app`: rotas, layouts, Server Components, Route Handlers em `/api/v1`.
- `components`: componentes visuais reutilizaveis e base shadcn/ui.
- `features`: telas e componentes por dominio.
- `lib/auth`: Auth.js, sessao, RBAC e helpers de permissao.
- `lib/importers`: deteccao, parsing, normalizacao, upsert e resumo de importacao.
- `lib/repositories`: acesso a dados isolado do framework.
- `lib/services`: regras de negocio, dashboards, auditoria, fiscal e relatorios.
- `lib/validations`: DTOs e schemas Zod.
- `prisma`: schema, seed e migrations.
- `types`: contratos compartilhados.

## Modelo de Banco

O schema Prisma cobre usuarios, cargos, permissoes, logs de auditoria, uploads, entidades Shopee, fiscal, taxas detectadas, snapshots e tokens de API. Dinheiro usa `Decimal(14, 2)`, chaves usam UUID, e tabelas criticas possuem indices por periodo, UF, tipo e status.

## Fluxo de Importacao

1. Usuario autenticado envia XLS, XLSX ou CSV.
2. Backend valida permissao `uploads.create`.
3. Arquivo recebe checksum e registro em `uploads`.
4. Parser le workbook/CSV e localiza a linha de cabecalho.
5. Detector compara colunas normalizadas com assinaturas conhecidas.
6. Periodo e datas sao inferidos das colunas e metadados.
7. Valores em BRL sao normalizados para Decimal.
8. Registros sao inseridos ou atualizados por chaves naturais/hash.
9. Erros por linha sao gravados em `import_errors`.
10. Nomes de taxas nao mapeadas sao gravados em `detected_fees`.
11. O upload recebe resumo: lidas, importadas, atualizadas, erros e taxas novas.

## Permissoes

O Master tem todas as permissoes por regra de backend. O Administrador operacional nao pode alterar Master nem configuracoes criticas. O frontend filtra menus por permissao, mas o backend e a fonte de verdade. Toda acao administrativa deve criar `audit_logs`.

## Telas

- Login e recuperacao de senha.
- Dashboard geral, mensal, UF, financeiro, produtos e taxas.
- Uploads e historico.
- Vendas, pedidos e produtos.
- Financeiro, Acelera e Carteira Shopee.
- Fiscal, ICMS, DIFAL e regras por UF.
- Relatorios exportaveis.
- Administracao: usuarios, cargos, permissoes, logs, tokens e configuracoes.

## Plano de Implementacao por Fases

1. Fundacao: Next, Prisma, Auth.js, RBAC, layout SaaS e seed. Status: entregue.
2. Importacao: detector, parsers XLS/XLSX/CSV, normalizacao, upserts e taxas detectadas. Status: entregue.
3. Dashboards: KPIs, graficos, filtros por periodo e ranking por UF. Status: entregue.
4. Relatorios: vendas, financeiro, produtos, taxas e uploads em CSV/XLSX. Status: entregue.
5. Fiscal: regras por UF, ICMS, base de calculo e DIFAL estimado. Status: entregue.
6. Administracao: usuarios, cargos, permissoes e logs. Status: base entregue; convites e edicao granular entram na fase seguinte.
7. API: endpoints `/api/v1`, DTOs e respostas padronizadas. Status: base entregue; Swagger/OpenAPI, rate limit e tokens de API entram na fase seguinte.
8. Operacao: Sentry, jobs de reprocessamento, storage externo e hardening. Status: preparado na arquitetura.

## Padrao de Filtros e Relatorios

Telas analiticas recebem `start` e `end` pela URL e usam `parsePeriod`. Isso permite links compartilhaveis, exportacoes coerentes e dashboards reproduziveis. Relatorios aceitam:

- `type=sales`
- `type=financial`
- `type=products`
- `type=fees`
- `type=uploads`
- `format=csv` ou `format=xlsx`
