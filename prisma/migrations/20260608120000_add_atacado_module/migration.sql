-- CreateEnum
CREATE TYPE "AtacadoClienteStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "AtacadoProdutoStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "AtacadoPedidoStatus" AS ENUM ('RASCUNHO', 'AGUARDANDO_SEPARACAO', 'EM_SEPARACAO', 'SEPARADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_EXPEDICAO', 'EM_ENTREGA', 'ENTREGUE', 'CANCELADO', 'FALTA_ESTOQUE');

-- CreateEnum
CREATE TYPE "AtacadoAnexoTipo" AS ENUM ('PRODUTO', 'PEDIDO', 'SEPARACAO', 'COMPROVANTE_PIX', 'ENTREGA', 'ASSINATURA');

-- CreateEnum
CREATE TYPE "AtacadoPagamentoStatus" AS ENUM ('PENDENTE', 'PARCIAL', 'PAGO');

-- CreateEnum
CREATE TYPE "AtacadoEntregaTipo" AS ENUM ('ENTREGA_PROPRIA', 'TRANSPORTADORA', 'RETIRADA');

-- CreateEnum
CREATE TYPE "AtacadoEntregaStatus" AS ENUM ('PENDENTE', 'EM_ROTA', 'ENTREGUE', 'CANCELADA');

-- CreateTable
CREATE TABLE "atacado_clientes" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "endereco" TEXT,
    "documento" TEXT,
    "observacoes" TEXT,
    "status" "AtacadoClienteStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atacado_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atacado_produtos" (
    "id" UUID NOT NULL,
    "referencia" TEXT,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "cor" TEXT,
    "grade" TEXT,
    "quantidadePorCaixa" INTEGER NOT NULL DEFAULT 12,
    "precoPorCaixa" DECIMAL(14,2) NOT NULL,
    "status" "AtacadoProdutoStatus" NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atacado_produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atacado_produto_fotos" (
    "id" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "metadata" JSONB,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atacado_produto_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atacado_pedidos" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" UUID NOT NULL,
    "vendedorId" UUID,
    "status" "AtacadoPedidoStatus" NOT NULL DEFAULT 'AGUARDANDO_SEPARACAO',
    "observacao" TEXT,
    "valorTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atacado_pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atacado_pedido_itens" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "quantidadeCaixas" INTEGER NOT NULL,
    "quantidadePares" INTEGER NOT NULL,
    "precoCaixa" DECIMAL(14,2) NOT NULL,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "atacado_pedido_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atacado_anexos" (
    "id" UUID NOT NULL,
    "pedidoId" UUID,
    "uploadedById" UUID,
    "tipo" "AtacadoAnexoTipo" NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atacado_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atacado_pagamentos" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "registradoPorId" UUID,
    "status" "AtacadoPagamentoStatus" NOT NULL DEFAULT 'PENDENTE',
    "valorPago" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "comprovanteUrl" TEXT,
    "comprovantePublicId" TEXT,
    "observacao" TEXT,
    "registradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atacado_pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atacado_entregas" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "motoristaId" UUID,
    "registradoPorId" UUID,
    "tipo" "AtacadoEntregaTipo" NOT NULL,
    "status" "AtacadoEntregaStatus" NOT NULL DEFAULT 'PENDENTE',
    "endereco" TEXT,
    "reciboUrl" TEXT,
    "reciboPublicId" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "observacao" TEXT,
    "entregueEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atacado_entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atacado_assinaturas" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "entregaId" UUID,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atacado_assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atacado_historico_status" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "usuarioId" UUID,
    "statusAnterior" "AtacadoPedidoStatus",
    "statusNovo" "AtacadoPedidoStatus" NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atacado_historico_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "atacado_clientes_nome_idx" ON "atacado_clientes"("nome");

-- CreateIndex
CREATE INDEX "atacado_clientes_cidade_estado_idx" ON "atacado_clientes"("cidade", "estado");

-- CreateIndex
CREATE INDEX "atacado_clientes_documento_idx" ON "atacado_clientes"("documento");

-- CreateIndex
CREATE INDEX "atacado_produtos_nome_idx" ON "atacado_produtos"("nome");

-- CreateIndex
CREATE INDEX "atacado_produtos_referencia_idx" ON "atacado_produtos"("referencia");

-- CreateIndex
CREATE INDEX "atacado_produto_fotos_produtoId_idx" ON "atacado_produto_fotos"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "atacado_pedidos_numero_key" ON "atacado_pedidos"("numero");

-- CreateIndex
CREATE INDEX "atacado_pedidos_clienteId_idx" ON "atacado_pedidos"("clienteId");

-- CreateIndex
CREATE INDEX "atacado_pedidos_vendedorId_idx" ON "atacado_pedidos"("vendedorId");

-- CreateIndex
CREATE INDEX "atacado_pedidos_status_criadoEm_idx" ON "atacado_pedidos"("status", "criadoEm");

-- CreateIndex
CREATE INDEX "atacado_pedido_itens_pedidoId_idx" ON "atacado_pedido_itens"("pedidoId");

-- CreateIndex
CREATE INDEX "atacado_pedido_itens_produtoId_idx" ON "atacado_pedido_itens"("produtoId");

-- CreateIndex
CREATE INDEX "atacado_anexos_pedidoId_idx" ON "atacado_anexos"("pedidoId");

-- CreateIndex
CREATE INDEX "atacado_anexos_uploadedById_idx" ON "atacado_anexos"("uploadedById");

-- CreateIndex
CREATE INDEX "atacado_anexos_tipo_idx" ON "atacado_anexos"("tipo");

-- CreateIndex
CREATE INDEX "atacado_pagamentos_pedidoId_idx" ON "atacado_pagamentos"("pedidoId");

-- CreateIndex
CREATE INDEX "atacado_pagamentos_status_idx" ON "atacado_pagamentos"("status");

-- CreateIndex
CREATE INDEX "atacado_entregas_pedidoId_idx" ON "atacado_entregas"("pedidoId");

-- CreateIndex
CREATE INDEX "atacado_entregas_motoristaId_idx" ON "atacado_entregas"("motoristaId");

-- CreateIndex
CREATE INDEX "atacado_entregas_status_idx" ON "atacado_entregas"("status");

-- CreateIndex
CREATE INDEX "atacado_assinaturas_pedidoId_idx" ON "atacado_assinaturas"("pedidoId");

-- CreateIndex
CREATE INDEX "atacado_assinaturas_entregaId_idx" ON "atacado_assinaturas"("entregaId");

-- CreateIndex
CREATE INDEX "atacado_historico_status_pedidoId_createdAt_idx" ON "atacado_historico_status"("pedidoId", "createdAt");

-- CreateIndex
CREATE INDEX "atacado_historico_status_usuarioId_idx" ON "atacado_historico_status"("usuarioId");

-- AddForeignKey
ALTER TABLE "atacado_produto_fotos" ADD CONSTRAINT "atacado_produto_fotos_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "atacado_produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_pedidos" ADD CONSTRAINT "atacado_pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "atacado_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_pedidos" ADD CONSTRAINT "atacado_pedidos_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_pedido_itens" ADD CONSTRAINT "atacado_pedido_itens_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "atacado_pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_pedido_itens" ADD CONSTRAINT "atacado_pedido_itens_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "atacado_produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_anexos" ADD CONSTRAINT "atacado_anexos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "atacado_pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_anexos" ADD CONSTRAINT "atacado_anexos_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_pagamentos" ADD CONSTRAINT "atacado_pagamentos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "atacado_pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_pagamentos" ADD CONSTRAINT "atacado_pagamentos_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_entregas" ADD CONSTRAINT "atacado_entregas_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "atacado_pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_entregas" ADD CONSTRAINT "atacado_entregas_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_entregas" ADD CONSTRAINT "atacado_entregas_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_assinaturas" ADD CONSTRAINT "atacado_assinaturas_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "atacado_pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_historico_status" ADD CONSTRAINT "atacado_historico_status_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "atacado_pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atacado_historico_status" ADD CONSTRAINT "atacado_historico_status_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
