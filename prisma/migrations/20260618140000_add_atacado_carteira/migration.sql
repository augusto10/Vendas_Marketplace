-- CreateEnum
CREATE TYPE "AtacadoCarteiraMovimentoTipo" AS ENUM ('PEDIDO_ABERTO_SEM_PAGAMENTO', 'PAGAMENTO_PARCIAL', 'PAGAMENTO_TOTAL', 'CREDITO_MANUAL', 'DEBITO_MANUAL', 'AJUSTE', 'ESTORNO', 'CANCELAMENTO_PEDIDO', 'SOBRA_PAGAMENTO');

-- CreateEnum
CREATE TYPE "AtacadoCarteiraMovimentoNatureza" AS ENUM ('CREDITO', 'DEBITO', 'NEUTRA');

-- CreateEnum
CREATE TYPE "AtacadoCarteiraMovimentoOrigem" AS ENUM ('PEDIDO', 'PAGAMENTO', 'MANUAL', 'SISTEMA', 'AJUSTE', 'ESTORNO');

-- CreateTable
CREATE TABLE "atacado_carteiras_clientes" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "saldoAtual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saldoBloqueado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atacado_carteiras_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atacado_carteira_movimentos" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "pedidoId" UUID,
    "pagamentoId" UUID,
    "tipo" "AtacadoCarteiraMovimentoTipo" NOT NULL,
    "natureza" "AtacadoCarteiraMovimentoNatureza" NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "saldoAnterior" DECIMAL(14,2) NOT NULL,
    "saldoPosterior" DECIMAL(14,2) NOT NULL,
    "dataMovimento" TIMESTAMP(3) NOT NULL,
    "dataCompetencia" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "origem" "AtacadoCarteiraMovimentoOrigem" NOT NULL,
    "criadoPorUsuarioId" UUID,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atacado_carteira_movimentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "atacado_carteiras_clientes_clienteId_key" ON "atacado_carteiras_clientes"("clienteId");

-- CreateIndex
CREATE INDEX "atacado_carteiras_clientes_clienteId_idx" ON "atacado_carteiras_clientes"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "atacado_carteira_movimentos_idempotencyKey_key" ON "atacado_carteira_movimentos"("idempotencyKey");

-- CreateIndex
CREATE INDEX "atacado_carteira_movimentos_clienteId_dataMovimento_idx" ON "atacado_carteira_movimentos"("clienteId", "dataMovimento");

-- CreateIndex
CREATE INDEX "atacado_carteira_movimentos_clienteId_dataCompetencia_idx" ON "atacado_carteira_movimentos"("clienteId", "dataCompetencia");

-- CreateIndex
CREATE INDEX "atacado_carteira_movimentos_pedidoId_idx" ON "atacado_carteira_movimentos"("pedidoId");

-- CreateIndex
CREATE INDEX "atacado_carteira_movimentos_pagamentoId_idx" ON "atacado_carteira_movimentos"("pagamentoId");

-- CreateIndex
CREATE INDEX "atacado_carteira_movimentos_tipo_idx" ON "atacado_carteira_movimentos"("tipo");

-- AddForeignKey
ALTER TABLE "atacado_carteiras_clientes" ADD CONSTRAINT "atacado_carteiras_clientes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "atacado_clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_carteira_movimentos" ADD CONSTRAINT "atacado_carteira_movimentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "atacado_clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_carteira_movimentos" ADD CONSTRAINT "atacado_carteira_movimentos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "atacado_pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_carteira_movimentos" ADD CONSTRAINT "atacado_carteira_movimentos_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "atacado_pagamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_carteira_movimentos" ADD CONSTRAINT "atacado_carteira_movimentos_criadoPorUsuarioId_fkey" FOREIGN KEY ("criadoPorUsuarioId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
