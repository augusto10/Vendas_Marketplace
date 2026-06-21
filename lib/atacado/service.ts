import {
  Prisma,
  type AtacadoAnexoTipo,
  type AtacadoCarteiraMovimentoNatureza,
  type AtacadoCarteiraMovimentoOrigem,
  type AtacadoCarteiraMovimentoTipo,
  type AtacadoPedidoStatus,
  type AtacadoPagamentoStatus
} from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { clienteSchema, concluirEntregaSchema, entregaSchema, pagamentoSchema, pedidoSchema, produtoSchema, statusPedidoSchema } from "@/lib/atacado/schemas";
import { cloudinaryFolder, uploadImage } from "@/lib/cloudinary/upload";

type ClienteInput = z.infer<typeof clienteSchema>;
type ProdutoInput = z.infer<typeof produtoSchema>;
type PedidoInput = z.infer<typeof pedidoSchema>;
type StatusPedidoInput = z.infer<typeof statusPedidoSchema>;
type PagamentoInput = z.infer<typeof pagamentoSchema>;
type EntregaInput = z.infer<typeof entregaSchema>;
type ConcluirEntregaInput = z.infer<typeof concluirEntregaSchema>;
type CarteiraMovimentoNatureza = AtacadoCarteiraMovimentoNatureza;
type CarteiraMovimentoTipo = AtacadoCarteiraMovimentoTipo;
type CarteiraMovimentoOrigem = AtacadoCarteiraMovimentoOrigem;

type CarteiraMovimentoInput = {
  clienteId: string;
  pedidoId?: string | null;
  pagamentoId?: string | null;
  tipo: CarteiraMovimentoTipo;
  natureza: CarteiraMovimentoNatureza;
  valor: Prisma.Decimal.Value;
  saldoAnterior?: Prisma.Decimal.Value;
  dataMovimento?: Date;
  dataCompetencia?: Date;
  observacao?: string | null;
  origem: CarteiraMovimentoOrigem;
  criadoPorUsuarioId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

type PedidoItemCreateInput = {
  produtoId: string;
  quantidadeCaixas: number;
  quantidadePares: number;
  precoCaixa: Prisma.Decimal;
  valorTotal: Prisma.Decimal;
  observacao: string | null;
};

type PedidoItemBuildOptions = {
  priceOverrideAuthorized?: boolean;
};

type DecimalLike = Prisma.Decimal.Value;

function toDecimal(value: DecimalLike | Prisma.Decimal = 0) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function signedDelta(natureza: CarteiraMovimentoNatureza, valor: Prisma.Decimal) {
  if (natureza === "CREDITO") return valor;
  if (natureza === "DEBITO") return valor.neg();
  return new Prisma.Decimal(0);
}

async function ensureCarteiraCliente(tx: Prisma.TransactionClient, clienteId: string) {
  return tx.atacadoCarteiraCliente.upsert({
    where: { clienteId },
    update: {},
    create: { clienteId }
  });
}

async function lockCarteiraCliente(tx: Prisma.TransactionClient, clienteId: string) {
  await ensureCarteiraCliente(tx, clienteId);
  await tx.$queryRaw`
    SELECT 1
    FROM "atacado_carteiras_clientes"
    WHERE "clienteId" = CAST(${clienteId} AS uuid)
    FOR UPDATE
  `;
}

async function sumMovimentosPedido(tx: Prisma.TransactionClient, pedidoId: string) {
  const movimentos = await tx.atacadoCarteiraMovimento.findMany({
    where: { pedidoId },
    select: { natureza: true, valor: true }
  });

  return movimentos.reduce((saldo, movimento) => saldo.add(signedDelta(movimento.natureza, toDecimal(movimento.valor))), new Prisma.Decimal(0));
}

async function createCarteiraMovimento(tx: Prisma.TransactionClient, input: CarteiraMovimentoInput) {
  if (input.idempotencyKey) {
    const existing = await tx.atacadoCarteiraMovimento.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (existing) return existing;
  }

  await lockCarteiraCliente(tx, input.clienteId);
  const carteira = await tx.atacadoCarteiraCliente.findUniqueOrThrow({
    where: { clienteId: input.clienteId },
    select: { saldoAtual: true }
  });

  const saldoAnterior = input.saldoAnterior ? toDecimal(input.saldoAnterior) : toDecimal(carteira.saldoAtual);
  const valor = toDecimal(input.valor);
  const delta = signedDelta(input.natureza, valor);
  const saldoPosterior = saldoAnterior.add(delta);

  return tx.atacadoCarteiraMovimento.create({
    data: {
      clienteId: input.clienteId,
      pedidoId: input.pedidoId ?? null,
      pagamentoId: input.pagamentoId ?? null,
      tipo: input.tipo,
      natureza: input.natureza,
      valor,
      saldoAnterior,
      saldoPosterior,
      dataMovimento: input.dataMovimento ?? new Date(),
      dataCompetencia: input.dataCompetencia ?? input.dataMovimento ?? new Date(),
      observacao: input.observacao ?? null,
      origem: input.origem,
      criadoPorUsuarioId: input.criadoPorUsuarioId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      metadata: input.metadata ?? undefined
    }
  }).then(async (movimento) => {
    await tx.atacadoCarteiraCliente.update({
      where: { clienteId: input.clienteId },
      data: { saldoAtual: saldoPosterior }
    });
    return movimento;
  });
}

async function backfillCarteiraClienteHistorica(tx: Prisma.TransactionClient, clienteId: string) {
  const pedidos = await tx.atacadoPedido.findMany({
    where: {
      clienteId,
      status: { not: "RASCUNHO" }
    },
    select: {
      id: true,
      valorTotal: true,
      status: true,
      criadoEm: true,
      pagamentos: {
        select: {
          id: true,
          valorPago: true,
          registradoEm: true,
          status: true
        },
        orderBy: { registradoEm: "asc" }
      }
    },
    orderBy: { criadoEm: "asc" }
  });

  for (const pedido of pedidos) {
    const movimentosPedido = await tx.atacadoCarteiraMovimento.findMany({
      where: { pedidoId: pedido.id },
      select: { id: true }
    });

    if (movimentosPedido.length > 0) {
      continue;
    }

    if (pedido.status === "CANCELADO") {
      continue;
    }

    const dataMovimento = pedido.criadoEm ?? new Date();
    const totalPago = pedido.pagamentos.reduce((sum, pagamento) => {
      if (pagamento.status === "PENDENTE") return sum;
      return sum.add(toDecimal(pagamento.valorPago));
    }, new Prisma.Decimal(0));

    if (totalPago.lt(pedido.valorTotal)) {
      await createCarteiraMovimento(tx, {
        clienteId,
        pedidoId: pedido.id,
        tipo: "PEDIDO_ABERTO_SEM_PAGAMENTO",
        natureza: "DEBITO",
        valor: toDecimal(pedido.valorTotal).sub(totalPago),
        origem: "SISTEMA",
        dataMovimento,
        dataCompetencia: dataMovimento,
        observacao: totalPago.gt(0) ? "Backfill historico de pagamento parcial." : "Backfill historico de pedido sem pagamento.",
        idempotencyKey: `legacy:pedido:${pedido.id}:abertura`
      });
    }

    if (totalPago.gt(pedido.valorTotal)) {
      const ultimoPagamento = pedido.pagamentos.filter((pagamento) => pagamento.status !== "PENDENTE").at(-1);
      if (ultimoPagamento) {
        await createCarteiraMovimento(tx, {
          clienteId,
          pedidoId: pedido.id,
          pagamentoId: ultimoPagamento.id,
          tipo: "SOBRA_PAGAMENTO",
          natureza: "CREDITO",
          valor: totalPago.sub(pedido.valorTotal),
          origem: "SISTEMA",
          dataMovimento: ultimoPagamento.registradoEm ?? dataMovimento,
          dataCompetencia: ultimoPagamento.registradoEm ?? dataMovimento,
          observacao: "Backfill historico de sobra de pagamento.",
          idempotencyKey: `legacy:pedido:${pedido.id}:sobra`
        });
      }
    }
}
}

export async function listClientes(query?: string) {
  return prisma.atacadoCliente.findMany({
    where: query
      ? {
          OR: [
            { nome: { contains: query, mode: "insensitive" } },
            { cidade: { contains: query, mode: "insensitive" } },
            { telefone: { contains: query, mode: "insensitive" } },
            { documento: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    take: 100
  });
}

export async function listClientesPage(filters: { query?: string; page?: number; take?: number } = {}) {
  const rawPage = Number(filters.page ?? 1);
  const rawTake = Number(filters.take ?? 20);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
  const take = Number.isFinite(rawTake) ? Math.min(50, Math.max(1, Math.trunc(rawTake))) : 20;
  const skip = (page - 1) * take;

  const clientes = await prisma.atacadoCliente.findMany({
    where: filters.query
      ? {
          OR: [
            { nome: { contains: filters.query, mode: "insensitive" } },
            { cidade: { contains: filters.query, mode: "insensitive" } },
            { telefone: { contains: filters.query, mode: "insensitive" } },
            { documento: { contains: filters.query, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    skip,
    take: take + 1
  });

  const hasMore = clientes.length > take;
  return {
    clientes: hasMore ? clientes.slice(0, take) : clientes,
    hasMore,
    page,
    take
  };
}

export function createCliente(data: ClienteInput) {
  return prisma.atacadoCliente.create({ data });
}

export function updateCliente(id: string, data: ClienteInput) {
  return prisma.atacadoCliente.update({ where: { id }, data });
}

export async function listProdutos(query?: string) {
  return prisma.atacadoProduto.findMany({
    where: query
      ? {
          OR: [
            { nome: { contains: query, mode: "insensitive" } },
            { referencia: { contains: query, mode: "insensitive" } },
            { codigo: { contains: query, mode: "insensitive" } },
            { codigoBarras: { contains: query, mode: "insensitive" } },
            { categoria: { contains: query, mode: "insensitive" } },
            { cor: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: { fotos: { orderBy: [{ principal: "desc" }, { createdAt: "desc" }], take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
}

export function createProduto(data: ProdutoInput) {
  return prisma.$queryRaw<{
    id: string;
    referencia: string | null;
    codigo: string | null;
    codigoBarras: string | null;
    nome: string;
    categoria: string | null;
    cor: string | null;
    grade: string | null;
    numeracao: string | null;
    embalagem: string | null;
    quantidadePorCaixa: number;
    precoPorCaixa: Prisma.Decimal;
    permiteEditarPrecoPedido: boolean;
    status: string;
    observacoes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[]>`
    INSERT INTO "atacado_produtos" (
      "id",
      "referencia",
      "codigo",
      "codigoBarras",
      "nome",
      "categoria",
      "cor",
      "grade",
      "numeracao",
      "embalagem",
      "quantidadePorCaixa",
      "precoPorCaixa",
      "permiteEditarPrecoPedido",
      "status",
      "observacoes",
      "createdAt",
      "updatedAt"
    ) VALUES (
      CAST(${randomUUID()} AS uuid),
      ${data.referencia ?? null},
      ${data.codigo ?? null},
      ${data.codigoBarras ?? null},
      ${data.nome},
      ${data.categoria ?? null},
      ${data.cor ?? null},
      ${data.grade ?? null},
      ${data.numeracao ?? null},
      ${data.embalagem ?? null},
      ${data.quantidadePorCaixa},
      ${new Prisma.Decimal(data.precoPorCaixa)},
      ${data.permiteEditarPrecoPedido},
      CAST(${data.status} AS "AtacadoProdutoStatus"),
      ${data.observacoes ?? null},
      NOW(),
      NOW()
    )
    RETURNING *;
  `.then((rows) => rows[0]);
}

export function updateProduto(id: string, data: ProdutoInput) {
  return prisma.$queryRaw<{
    id: string;
    referencia: string | null;
    codigo: string | null;
    codigoBarras: string | null;
    nome: string;
    categoria: string | null;
    cor: string | null;
    grade: string | null;
    numeracao: string | null;
    embalagem: string | null;
    quantidadePorCaixa: number;
    precoPorCaixa: Prisma.Decimal;
    permiteEditarPrecoPedido: boolean;
    status: string;
    observacoes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[]>`
    UPDATE "atacado_produtos"
    SET
      "referencia" = ${data.referencia ?? null},
      "codigo" = ${data.codigo ?? null},
      "codigoBarras" = ${data.codigoBarras ?? null},
      "nome" = ${data.nome},
      "categoria" = ${data.categoria ?? null},
      "cor" = ${data.cor ?? null},
      "grade" = ${data.grade ?? null},
      "numeracao" = ${data.numeracao ?? null},
      "embalagem" = ${data.embalagem ?? null},
      "quantidadePorCaixa" = ${data.quantidadePorCaixa},
      "precoPorCaixa" = ${new Prisma.Decimal(data.precoPorCaixa)},
      "permiteEditarPrecoPedido" = ${data.permiteEditarPrecoPedido},
      "status" = CAST(${data.status} AS "AtacadoProdutoStatus"),
      "observacoes" = ${data.observacoes ?? null},
      "updatedAt" = NOW()
    WHERE "id" = CAST(${id} AS uuid)
    RETURNING *;
  `.then((rows) => rows[0]);
}

export async function addProdutoFoto(id: string, file: File, principal = false) {
  const uploaded = await uploadImage(file, cloudinaryFolder("produtos"));
  return prisma.$transaction(async (tx) => {
    if (principal) {
      await tx.atacadoProdutoFoto.updateMany({
        where: { produtoId: id, principal: true },
        data: { principal: false }
      });
    }

    return tx.atacadoProdutoFoto.create({
      data: {
        produtoId: id,
        url: uploaded.url,
        publicId: uploaded.publicId,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        principal,
        metadata: { width: uploaded.width, height: uploaded.height }
      }
    });
  });
}

export async function listPedidos(filters: { status?: AtacadoPedidoStatus; clienteId?: string; vendedorId?: string; start?: Date; end?: Date; pedido?: string } = {}) {
  return prisma.atacadoPedido.findMany({
    where: {
      status: filters.status,
      clienteId: filters.clienteId,
      vendedorId: filters.vendedorId,
      criadoEm: filters.start || filters.end ? { gte: filters.start, lte: filters.end } : undefined,
      numero: filters.pedido ? { contains: filters.pedido, mode: "insensitive" } : undefined
    },
    include: {
      cliente: true,
      vendedor: { select: { id: true, name: true, email: true } },
      itens: { include: { produto: true } },
      pagamentos: { orderBy: { registradoEm: "desc" }, take: 1 },
      anexos: { orderBy: { createdAt: "desc" }, take: 3 },
      entregas: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { criadoEm: "desc" },
    take: 100
  });
}

export function getPedido(id: string) {
  return prisma.atacadoPedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      vendedor: { select: { id: true, name: true, email: true } },
      itens: { include: { produto: { include: { fotos: true } } } },
      anexos: { orderBy: { createdAt: "desc" } },
      pagamentos: { orderBy: { registradoEm: "desc" } },
      entregas: {
        include: { motorista: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" }
      },
      historicoStatus: {
        include: { usuario: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

function buildPedidoItens(
  data: PedidoInput,
  produtos: Awaited<ReturnType<typeof prisma.atacadoProduto.findMany>>,
  options: PedidoItemBuildOptions = {}
) {
  const produtosById = new Map(produtos.map((produto) => [produto.id, produto]));

  return data.itens.map((item) => {
    const produto = produtosById.get(item.produtoId);
    if (!produto) throw new Error("Produto invalido no pedido.");
    const quantidadePorEmbalagem = item.quantidadePorCaixa ?? item.unidadesPorEmbalagem ?? produto.quantidadePorCaixa;
    const quantidadePares = item.quantidadePares ?? item.quantidadeCaixas * quantidadePorEmbalagem;
    const basePrecoCaixa = item.precoCaixa !== null && item.precoCaixa !== undefined
      ? new Prisma.Decimal(item.precoCaixa)
      : produto.precoPorCaixa;
    const descontoPercentual = new Prisma.Decimal(item.descontoPercentual ?? 0);
    const precoCaixa = basePrecoCaixa.mul(new Prisma.Decimal(100).sub(descontoPercentual)).div(100);
    const valorTotal = precoCaixa.mul(item.quantidadeCaixas);
    return {
      produtoId: item.produtoId,
      quantidadeCaixas: item.quantidadeCaixas,
      quantidadePares,
      precoCaixa,
      valorTotal,
      observacao: item.observacao ?? (descontoPercentual.gt(0) ? `Desconto ${descontoPercentual.toString()}% sobre ${basePrecoCaixa.toString()}` : null)
    } satisfies PedidoItemCreateInput;
  });
}

export async function createPedido(data: PedidoInput, userId: string, options: PedidoItemBuildOptions = {}) {
  const produtos = await prisma.atacadoProduto.findMany({
    where: { id: { in: data.itens.map((item) => item.produtoId) } }
  });

  return prisma.$transaction(async (tx) => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const count = await tx.atacadoPedido.count({ where: { criadoEm: { gte: start, lt: end } } });
    const numero = `AT${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${String(count + 1).padStart(4, "0")}`;

    const itens = buildPedidoItens(data, produtos, options);

    const valorTotal = itens.reduce((sum, item) => sum.add(item.valorTotal), new Prisma.Decimal(0));
    const pedido = await tx.atacadoPedido.create({
      data: {
        numero,
        clienteId: data.clienteId,
        vendedorId: data.vendedorId ?? userId,
        observacao: data.observacao,
        valorTotal,
        itens: { create: itens }
      },
      include: { cliente: true, itens: { include: { produto: true } } }
    });

    await tx.atacadoHistoricoStatus.create({
      data: {
        pedidoId: pedido.id,
        usuarioId: userId,
        statusNovo: pedido.status,
        observacao: "Pedido criado"
      }
    });

    return pedido;
  });
}

export async function updatePedido(id: string, data: PedidoInput, userId: string, options: PedidoItemBuildOptions = {}) {
  const produtos = await prisma.atacadoProduto.findMany({
    where: { id: { in: data.itens.map((item) => item.produtoId) } }
  });

  return prisma.$transaction(async (tx) => {
    const current = await tx.atacadoPedido.findUniqueOrThrow({
      where: { id },
      select: { status: true }
    });

    if (["EM_ENTREGA", "ENTREGUE", "CANCELADO"].includes(current.status)) {
      throw new Error("Nao e possivel alterar o carrinho de pedido em rota, entregue ou cancelado.");
    }

    const itens = buildPedidoItens(data, produtos, options);
    const valorTotal = itens.reduce((sum, item) => sum.add(item.valorTotal), new Prisma.Decimal(0));

    await tx.atacadoPedidoItem.deleteMany({ where: { pedidoId: id } });

    const pedido = await tx.atacadoPedido.update({
      where: { id },
      data: {
        clienteId: data.clienteId,
        vendedorId: data.vendedorId ?? userId,
        observacao: data.observacao,
        valorTotal,
        itens: { create: itens }
      },
      include: {
        cliente: true,
        vendedor: { select: { id: true, name: true, email: true } },
        itens: { include: { produto: true } }
      }
    });

    await tx.atacadoHistoricoStatus.create({
      data: {
        pedidoId: id,
        usuarioId: userId,
        statusAnterior: current.status,
        statusNovo: current.status,
        observacao: "Carrinho do pedido alterado"
      }
    });

    return pedido;
  });
}

async function updatePedidoStatusTx(
  tx: Prisma.TransactionClient,
  id: string,
  data: StatusPedidoInput,
  userId: string,
  options: { isMaster?: boolean; createOpenMovement?: boolean } = {}
) {
  const current = await tx.atacadoPedido.findUniqueOrThrow({
    where: { id },
    select: {
      status: true,
      clienteId: true,
      valorTotal: true
    }
  });

  if (["EM_ENTREGA", "ENTREGUE", "CANCELADO"].includes(current.status) && !options.isMaster) {
    throw new Error("Somente Administrador Master pode alterar pedido em rota ou finalizado.");
  }

  const pedido = current.status === data.status
    ? await tx.atacadoPedido.findUniqueOrThrow({ where: { id } })
    : await tx.atacadoPedido.update({ where: { id }, data: { status: data.status } });

  if (options.createOpenMovement) {
    const existingOpening = await tx.atacadoCarteiraMovimento.findFirst({
      where: {
        pedidoId: id,
        tipo: "PEDIDO_ABERTO_SEM_PAGAMENTO"
      },
      select: { id: true }
    });

    if (!existingOpening) {
      await createCarteiraMovimento(tx, {
        clienteId: current.clienteId,
        pedidoId: id,
        tipo: "PEDIDO_ABERTO_SEM_PAGAMENTO",
        natureza: "DEBITO",
        valor: current.valorTotal,
        origem: "PEDIDO",
        criadoPorUsuarioId: userId,
        observacao: data.observacao ?? "Pedido liberado sem pagamento.",
        dataCompetencia: new Date(),
        dataMovimento: new Date(),
        idempotencyKey: `pedido:${id}:abertura`
      });
    }
  }

  if (data.status === "CANCELADO") {
    const openingMovement = await tx.atacadoCarteiraMovimento.findFirst({
      where: {
        pedidoId: id,
        tipo: "PEDIDO_ABERTO_SEM_PAGAMENTO"
      },
      orderBy: { createdAt: "asc" },
      select: { valor: true }
    });

    if (openingMovement) {
      await createCarteiraMovimento(tx, {
        clienteId: current.clienteId,
        pedidoId: id,
        tipo: "CANCELAMENTO_PEDIDO",
        natureza: "CREDITO",
        valor: openingMovement.valor,
        origem: "SISTEMA",
        criadoPorUsuarioId: userId,
        observacao: data.observacao ?? "Pedido cancelado e saldo revertido.",
        dataCompetencia: new Date(),
        dataMovimento: new Date(),
        idempotencyKey: `pedido:${id}:cancelamento`
      });
    }
  }

  if (current.status !== data.status) {
    await tx.atacadoHistoricoStatus.create({
      data: {
        pedidoId: id,
        usuarioId: userId,
        statusAnterior: current.status,
        statusNovo: data.status,
        observacao: data.observacao
      }
    });
  }

  return pedido;
}

export async function updatePedidoStatus(id: string, data: StatusPedidoInput, userId: string, options: { isMaster?: boolean; createOpenMovement?: boolean } = {}) {
  return prisma.$transaction(async (tx) => updatePedidoStatusTx(tx, id, data, userId, options));
}

export async function addPedidoAnexo(id: string, file: File, tipo: AtacadoAnexoTipo, userId: string) {
  const uploaded = await uploadImage(file, cloudinaryFolder(`pedidos/${tipo.toLowerCase()}`));
  return prisma.atacadoAnexo.create({
    data: {
      pedidoId: id,
      uploadedById: userId,
      tipo,
      url: uploaded.url,
      publicId: uploaded.publicId,
      originalName: file.name,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      metadata: { width: uploaded.width, height: uploaded.height }
    }
  });
}

async function registerPagamentoTx(tx: Prisma.TransactionClient, id: string, data: PagamentoInput, userId: string, uploaded: Awaited<ReturnType<typeof uploadImage>> | null) {
  const pedido = await tx.atacadoPedido.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      clienteId: true,
      valorTotal: true,
      status: true
    }
  });

  const pagamento = await tx.atacadoPagamento.create({
    data: {
      pedidoId: id,
      registradoPorId: userId,
      status: data.status,
      valorPago: new Prisma.Decimal(data.valorPago),
      comprovanteUrl: uploaded?.url,
      comprovantePublicId: uploaded?.publicId,
      observacao: data.observacao
    }
  });

  const valorPago = new Prisma.Decimal(data.valorPago);

  if (data.status !== "PENDENTE" && valorPago.gt(0)) {
    const openingMovement = await tx.atacadoCarteiraMovimento.findFirst({
      where: {
        pedidoId: id,
        tipo: "PEDIDO_ABERTO_SEM_PAGAMENTO"
      },
      select: { id: true }
    });

    if (openingMovement) {
      const saldoPedidoAtual = await sumMovimentosPedido(tx, id);
      const saldoDevedor = saldoPedidoAtual.isNegative() ? saldoPedidoAtual.abs() : new Prisma.Decimal(0);
      const valorAplicado = saldoDevedor.gt(0)
        ? (valorPago.gte(saldoDevedor) ? saldoDevedor : valorPago)
        : new Prisma.Decimal(0);

      if (valorAplicado.gt(0)) {
        const tipoAplicacao = valorAplicado.eq(saldoDevedor) ? "PAGAMENTO_TOTAL" : "PAGAMENTO_PARCIAL";

        await createCarteiraMovimento(tx, {
          clienteId: pedido.clienteId,
          pedidoId: id,
          pagamentoId: pagamento.id,
          tipo: tipoAplicacao,
          natureza: "CREDITO",
          valor: valorAplicado,
          origem: "PAGAMENTO",
          criadoPorUsuarioId: userId,
          observacao: data.observacao ?? "Pagamento registrado.",
          dataCompetencia: pagamento.registradoEm,
          dataMovimento: pagamento.registradoEm,
          idempotencyKey: `pagamento:${pagamento.id}:principal`
        });
      }

      if (valorPago.gt(valorAplicado)) {
        await createCarteiraMovimento(tx, {
          clienteId: pedido.clienteId,
          pedidoId: id,
          pagamentoId: pagamento.id,
          tipo: "SOBRA_PAGAMENTO",
          natureza: "CREDITO",
          valor: valorPago.sub(valorAplicado),
          origem: "PAGAMENTO",
          criadoPorUsuarioId: userId,
          observacao: "Pagamento excedente registrado como credito futuro.",
          dataCompetencia: pagamento.registradoEm,
          dataMovimento: pagamento.registradoEm,
          idempotencyKey: `pagamento:${pagamento.id}:sobra`
        });
      }
    } else if (valorPago.lt(pedido.valorTotal)) {
      await createCarteiraMovimento(tx, {
        clienteId: pedido.clienteId,
        pedidoId: id,
        pagamentoId: pagamento.id,
        tipo: "PEDIDO_ABERTO_SEM_PAGAMENTO",
        natureza: "DEBITO",
        valor: pedido.valorTotal.sub(valorPago),
        origem: "PEDIDO",
        criadoPorUsuarioId: userId,
        observacao: data.observacao ?? "Pagamento parcial registrado. Restante em aberto.",
        dataCompetencia: pagamento.registradoEm,
        dataMovimento: pagamento.registradoEm,
        idempotencyKey: `pedido:${id}:abertura`
      });
    } else if (valorPago.gt(pedido.valorTotal)) {
      await createCarteiraMovimento(tx, {
        clienteId: pedido.clienteId,
        pedidoId: id,
        pagamentoId: pagamento.id,
        tipo: "SOBRA_PAGAMENTO",
        natureza: "CREDITO",
        valor: valorPago.sub(pedido.valorTotal),
        origem: "PAGAMENTO",
        criadoPorUsuarioId: userId,
        observacao: "Pagamento excedente registrado como credito futuro.",
        dataCompetencia: pagamento.registradoEm,
        dataMovimento: pagamento.registradoEm,
        idempotencyKey: `pagamento:${pagamento.id}:sobra`
      });
    }

    const saldoDepois = await sumMovimentosPedido(tx, id);
    const statusFinal: AtacadoPagamentoStatus = openingMovement
      ? (saldoDepois.isNegative() ? "PARCIAL" : "PAGO")
      : (valorPago.lt(pedido.valorTotal) ? "PARCIAL" : "PAGO");
    if (pagamento.status !== statusFinal) {
      await tx.atacadoPagamento.update({
        where: { id: pagamento.id },
        data: { status: statusFinal }
      });
    }

    await updatePedidoStatusTx(tx, id, { status: statusFinal === "PARCIAL" ? "AGUARDANDO_PAGAMENTO" : "PAGO", observacao: statusFinal === "PARCIAL" ? "Pagamento parcial registrado" : "Pagamento confirmado" }, userId, { isMaster: true, createOpenMovement: false });
  }

  return pagamento;
}

export async function registerPagamento(id: string, data: PagamentoInput, userId: string, file?: File) {
  const uploaded = file ? await uploadImage(file, cloudinaryFolder("pagamentos")) : null;
  return prisma.$transaction(async (tx) => registerPagamentoTx(tx, id, data, userId, uploaded));
}

export function createEntrega(id: string, data: EntregaInput, userId: string) {
  return prisma.atacadoEntrega.create({
    data: {
      pedidoId: id,
      motoristaId: data.motoristaId,
      registradoPorId: userId,
      tipo: data.tipo,
      status: "EM_ROTA",
      endereco: data.endereco,
      observacao: data.observacao
    }
  });
}

export function listPedidosLiberadosParaEntrega() {
  return prisma.atacadoPedido.findMany({
    where: {
      status: "PAGO",
      entregas: { none: { status: { in: ["PENDENTE", "EM_ROTA"] } } }
    },
    include: {
      cliente: true,
      vendedor: { select: { id: true, name: true, email: true } },
      itens: { include: { produto: true } },
      pagamentos: { orderBy: { registradoEm: "desc" }, take: 1 },
      entregas: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { criadoEm: "desc" },
    take: 100
  });
}

export function listEntregasMotorista(userId: string) {
  return prisma.atacadoEntrega.findMany({
    where: { motoristaId: userId },
    include: {
      pedido: {
        include: {
          cliente: true,
          itens: { include: { produto: true } }
        }
      },
      motorista: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export function listEntregasExpedicao() {
  return prisma.atacadoEntrega.findMany({
    where: { status: "PENDENTE" },
    include: {
      pedido: {
        include: {
          cliente: true,
          itens: { include: { produto: true } }
        }
      },
      motorista: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function solicitarEntrega(pedidoId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.atacadoPedido.findUniqueOrThrow({ where: { id: pedidoId }, select: { status: true, cliente: { select: { endereco: true } } } });
    if (pedido.status !== "PAGO") {
      throw new Error("Pedido ainda nao esta liberado para entrega.");
    }

    const activeEntrega = await tx.atacadoEntrega.findFirst({
      where: { pedidoId, status: { in: ["PENDENTE", "EM_ROTA"] } },
      select: { id: true }
    });
    if (activeEntrega) {
      throw new Error("Este pedido ja possui entrega em andamento.");
    }

    const entrega = await tx.atacadoEntrega.create({
      data: {
        pedidoId,
        motoristaId: userId,
        registradoPorId: userId,
        tipo: "ENTREGA_PROPRIA",
        status: "EM_ROTA",
        endereco: pedido.cliente.endereco,
        observacao: "Motorista aceitou a entrega liberada pelo financeiro"
      },
      include: { pedido: { include: { cliente: true } }, motorista: { select: { id: true, name: true, email: true } } }
    });

    await tx.atacadoPedido.update({ where: { id: pedidoId }, data: { status: "EM_ENTREGA" } });
    await tx.atacadoHistoricoStatus.create({
      data: {
        pedidoId,
        usuarioId: userId,
        statusAnterior: "PAGO",
        statusNovo: "EM_ENTREGA",
        observacao: "Motorista aceitou a entrega liberada pelo financeiro"
      }
    });

    return entrega;
  });
}

export async function liberarEntregaExpedicao(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const entregaAtual = await tx.atacadoEntrega.findUniqueOrThrow({
      where: { id },
      select: { pedidoId: true, motoristaId: true, status: true, pedido: { select: { status: true } } }
    });

    if (!["PENDENTE", "EM_ROTA"].includes(entregaAtual.status)) {
      throw new Error("Entrega nao esta disponivel para aceite.");
    }

    const entrega =
      entregaAtual.status === "PENDENTE"
        ? await tx.atacadoEntrega.update({
            where: { id },
            data: { status: "EM_ROTA" },
            include: { pedido: { include: { cliente: true } } }
          })
        : await tx.atacadoEntrega.findUniqueOrThrow({
            where: { id },
            include: { pedido: { include: { cliente: true } } }
          });

    if (entregaAtual.pedido.status !== "EM_ENTREGA") {
      await tx.atacadoPedido.update({ where: { id: entregaAtual.pedidoId }, data: { status: "EM_ENTREGA" } });
      await tx.atacadoHistoricoStatus.create({
        data: {
          pedidoId: entregaAtual.pedidoId,
          usuarioId: userId,
          statusAnterior: entregaAtual.pedido.status,
          statusNovo: "EM_ENTREGA",
          observacao: "Motorista aceitou a entrega"
        }
      });
    }

    return entrega;
  });
}

export async function concluirEntrega(id: string, data: ConcluirEntregaInput, userId: string, file?: File) {
  const current = await prisma.atacadoEntrega.findUniqueOrThrow({
    where: { id },
    select: {
      motoristaId: true,
      pedidoId: true,
      status: true,
      pedido: { select: { status: true } }
    }
  });
  if (current.motoristaId !== userId) {
    throw new Error("Entrega nao atribuida a este motorista.");
  }
  if (current.status !== "EM_ROTA") {
    throw new Error("A entrega precisa estar em rota para ser finalizada.");
  }
  if (!file || file.size === 0) {
    throw new Error("A foto da entrega e obrigatoria.");
  }

  const uploaded = await uploadImage(file, cloudinaryFolder("entregas"));

  const observacoes = [
    `Recebedor: ${data.recebedorNome}`,
    data.observacao
  ].filter(Boolean);

  return prisma.$transaction(async (tx) => {
    const entrega = await tx.atacadoEntrega.update({
      where: { id },
      data: {
        status: "ENTREGUE",
        reciboUrl: uploaded.url,
        reciboPublicId: uploaded.publicId,
        latitude: data.latitude == null ? undefined : new Prisma.Decimal(data.latitude),
        longitude: data.longitude == null ? undefined : new Prisma.Decimal(data.longitude),
        observacao: observacoes.join("\n"),
        entregueEm: new Date()
      }
    });

    await tx.atacadoPedido.update({
      where: { id: current.pedidoId },
      data: { status: "ENTREGUE" }
    });
    await tx.atacadoHistoricoStatus.create({
      data: {
        pedidoId: current.pedidoId,
        usuarioId: userId,
        statusAnterior: current.pedido.status,
        statusNovo: "ENTREGUE",
        observacao: `Entrega concluida por ${data.recebedorNome}`
      }
    });

    return entrega;
  });
}

type CarteiraMovimentoFilters = {
  clienteId: string;
  dataInicio?: Date;
  dataFim?: Date;
  tipo?: CarteiraMovimentoTipo;
  pedidoId?: string;
};

type CarteiraMovimentoComRelacoes = Awaited<ReturnType<typeof listMovimentosCarteira>>[number];

function isLegacySettlementWithoutDebt(movimento: {
  tipo: CarteiraMovimentoTipo;
  origem: CarteiraMovimentoOrigem;
  pedidoId?: string | null;
  observacao?: string | null;
}, movimentosDoPedido: Array<{ tipo: CarteiraMovimentoTipo; natureza: CarteiraMovimentoNatureza; origem: CarteiraMovimentoOrigem; observacao?: string | null }>) {
  if (!movimento.pedidoId) return false;
  const hasAutomaticOpening = movimentosDoPedido.some((item) => {
    const observacao = item.observacao?.toLowerCase() ?? "";
    return item.tipo === "PEDIDO_ABERTO_SEM_PAGAMENTO" && observacao.includes("conciliacao do pagamento");
  });

  if (hasAutomaticOpening) {
    return ["PEDIDO_ABERTO_SEM_PAGAMENTO", "PAGAMENTO_PARCIAL", "PAGAMENTO_TOTAL"].includes(movimento.tipo);
  }

  if (movimento.origem !== "SISTEMA") return false;
  if (!["PAGAMENTO_PARCIAL", "PAGAMENTO_TOTAL"].includes(movimento.tipo)) return false;

  return !movimentosDoPedido.some((item) => item.natureza === "DEBITO" && item.tipo === "PEDIDO_ABERTO_SEM_PAGAMENTO");
}

function signedMovimentoValue(movimento: { natureza: CarteiraMovimentoNatureza; valor: Prisma.Decimal }) {
  return signedDelta(movimento.natureza, toDecimal(movimento.valor));
}

async function listMovimentosCarteira(tx: Prisma.TransactionClient, filters: CarteiraMovimentoFilters) {
  const dataMovimento = filters.dataInicio || filters.dataFim
    ? {
        ...(filters.dataInicio ? { gte: filters.dataInicio } : {}),
        ...(filters.dataFim ? { lte: filters.dataFim } : {})
      }
    : undefined;

  return tx.atacadoCarteiraMovimento.findMany({
    where: {
      clienteId: filters.clienteId,
      tipo: filters.tipo,
      pedidoId: filters.pedidoId,
      dataMovimento
    },
    include: {
      pedido: { select: { id: true, numero: true, valorTotal: true, status: true } },
      pagamento: { select: { id: true, valorPago: true, status: true, registradoEm: true } },
      criadoPorUsuario: { select: { id: true, name: true, email: true } }
    },
    orderBy: [{ dataMovimento: "desc" }, { createdAt: "desc" }]
  });
}

export async function getCarteiraCliente(clienteId: string) {
  return prisma.$transaction(async (tx) => {
    await backfillCarteiraClienteHistorica(tx, clienteId);
    const cliente = await tx.atacadoCliente.findUniqueOrThrow({
      where: { id: clienteId },
      include: { carteira: true }
    });

    const carteira = cliente.carteira ?? await tx.atacadoCarteiraCliente.upsert({
      where: { clienteId },
      update: {},
      create: { clienteId }
    });

    return { cliente, carteira };
  });
}

export async function getSaldoCliente(clienteId: string) {
  const { carteira } = await getCarteiraCliente(clienteId);
  return {
    clienteId,
    saldoAtual: carteira.saldoAtual,
    saldoBloqueado: carteira.saldoBloqueado,
    saldoDevedor: carteira.saldoAtual.isNegative() ? carteira.saldoAtual.abs() : new Prisma.Decimal(0),
    creditoDisponivel: carteira.saldoAtual.isPositive() ? carteira.saldoAtual : new Prisma.Decimal(0)
  };
}

export async function getExtratoCarteiraCliente(clienteId: string, filters: Omit<CarteiraMovimentoFilters, "clienteId"> = {}) {
  return prisma.$transaction(async (tx) => {
    await backfillCarteiraClienteHistorica(tx, clienteId);
    const cliente = await tx.atacadoCliente.findUniqueOrThrow({
      where: { id: clienteId },
      select: { id: true, nome: true, documento: true, status: true }
    });
    await ensureCarteiraCliente(tx, clienteId);
    const movimentosVisiveis = await listMovimentosCarteiraVisiveis(tx, clienteId);
    let saldoCorrente = new Prisma.Decimal(0);
    const movimentosComSaldo = movimentosVisiveis.map((movimento) => {
      const saldoAnterior = saldoCorrente;
      saldoCorrente = saldoCorrente.add(signedMovimentoValue(movimento));
      return {
        ...movimento,
        saldoAnterior,
        saldoPosterior: saldoCorrente
      };
    });
    const movimentos = movimentosComSaldo
      .filter((movimento) => !filters.tipo || movimento.tipo === filters.tipo)
      .filter((movimento) => !filters.pedidoId || movimento.pedidoId === filters.pedidoId)
      .filter((movimento) => !filters.dataInicio || movimento.dataMovimento >= filters.dataInicio)
      .filter((movimento) => !filters.dataFim || movimento.dataMovimento <= filters.dataFim)
      .sort((left, right) => right.dataMovimento.getTime() - left.dataMovimento.getTime());

    return {
      cliente,
      saldoAtual: saldoCorrente,
      saldoBloqueado: new Prisma.Decimal(0),
      periodo: {
        dataInicio: filters.dataInicio ?? null,
        dataFim: filters.dataFim ?? null
      },
      movimentos
    };
  });
}

async function createMovimentoManual(
  clienteId: string,
  data: {
    valor: Prisma.Decimal.Value;
    tipo: CarteiraMovimentoTipo;
    natureza: CarteiraMovimentoNatureza;
    observacao: string;
    dataCompetencia?: Date;
    criadoPorUsuarioId: string;
    pedidoId?: string | null;
    origem?: CarteiraMovimentoOrigem;
  }
) {
  return prisma.$transaction(async (tx) => createCarteiraMovimento(tx, {
    clienteId,
    pedidoId: data.pedidoId ?? null,
    tipo: data.tipo,
    natureza: data.natureza,
    valor: data.valor,
    origem: data.origem ?? "MANUAL",
    criadoPorUsuarioId: data.criadoPorUsuarioId,
    observacao: data.observacao,
    dataMovimento: data.dataCompetencia ?? new Date(),
    dataCompetencia: data.dataCompetencia ?? new Date(),
    idempotencyKey: undefined
  }));
}

export function criarCreditoManual(clienteId: string, data: { valor: Prisma.Decimal.Value; observacao: string; dataCompetencia?: Date; criadoPorUsuarioId: string }) {
  return createMovimentoManual(clienteId, {
    valor: data.valor,
    tipo: "CREDITO_MANUAL",
    natureza: "CREDITO",
    observacao: data.observacao,
    dataCompetencia: data.dataCompetencia,
    criadoPorUsuarioId: data.criadoPorUsuarioId,
    origem: "MANUAL"
  });
}

async function listMovimentosCarteiraVisiveis(tx: Prisma.TransactionClient, clienteId: string) {
  const movimentos = await tx.atacadoCarteiraMovimento.findMany({
    where: { clienteId },
    include: {
      pedido: { select: { id: true, numero: true, valorTotal: true, status: true } },
      pagamento: { select: { id: true, valorPago: true, status: true, registradoEm: true } },
      criadoPorUsuario: { select: { id: true, name: true, email: true } }
    },
    orderBy: [{ dataMovimento: "asc" }, { createdAt: "asc" }]
  });
  const movimentosPorPedido = new Map<string, typeof movimentos>();
  for (const movimento of movimentos) {
    if (!movimento.pedidoId) continue;
    const current = movimentosPorPedido.get(movimento.pedidoId) ?? [];
    current.push(movimento);
    movimentosPorPedido.set(movimento.pedidoId, current);
  }

  return movimentos.filter((movimento) => !isLegacySettlementWithoutDebt(movimento, movimento.pedidoId ? movimentosPorPedido.get(movimento.pedidoId) ?? [] : []));
}

function calcularSaldoMovimentos(movimentos: Array<{ natureza: CarteiraMovimentoNatureza; valor: Prisma.Decimal }>) {
  return movimentos.reduce((saldo, movimento) => saldo.add(signedMovimentoValue(movimento)), new Prisma.Decimal(0));
}

function isPedidoCarteiraAtivo(status: AtacadoPedidoStatus) {
  return !["CANCELADO", "RASCUNHO"].includes(status);
}

function isMovimentoManualCarteira(movimento: { tipo: CarteiraMovimentoTipo; pedidoId?: string | null }) {
  return !movimento.pedidoId && ["CREDITO_MANUAL", "DEBITO_MANUAL", "AJUSTE"].includes(movimento.tipo);
}

export async function adicionarSaldoCarteiraCliente(
  clienteId: string,
  data: {
    valor: Prisma.Decimal.Value;
    observacao: string;
    dataCompetencia?: Date;
    criadoPorUsuarioId: string;
    comprovante?: Awaited<ReturnType<typeof uploadImage>> | null;
  }
) {
  return prisma.$transaction(async (tx) => {
    let restante = toDecimal(data.valor);
    const movimentosCriados = [];
    const dataMovimento = data.dataCompetencia ?? new Date();
    const metadata = data.comprovante
      ? {
          comprovanteUrl: data.comprovante.url,
          comprovantePublicId: data.comprovante.publicId,
          comprovanteMimeType: data.comprovante.mimeType,
          comprovanteSize: data.comprovante.size
        }
      : undefined;

    const movimentosComPedido = await tx.atacadoCarteiraMovimento.findMany({
      where: {
        clienteId,
        pedidoId: { not: null }
      },
      select: {
        pedidoId: true,
        dataMovimento: true,
        pedido: { select: { id: true, status: true } }
      },
      orderBy: [{ dataMovimento: "asc" }, { createdAt: "asc" }]
    });
    const pedidosEmAberto = await tx.atacadoPedido.findMany({
      where: {
        clienteId,
        status: { notIn: ["CANCELADO", "RASCUNHO", "PAGO", "EM_ENTREGA", "ENTREGUE"] }
      },
      select: {
        id: true,
        valorTotal: true,
        criadoEm: true,
        pagamentos: {
          where: { status: { not: "PENDENTE" } },
          select: { valorPago: true }
        }
      },
      orderBy: { criadoEm: "asc" }
    });
    const pedidoIds = [
      ...new Set([
        ...movimentosComPedido.map((movimento) => movimento.pedidoId).filter(Boolean) as string[],
        ...pedidosEmAberto.map((pedido) => pedido.id)
      ])
    ];
    const pedidosEmAbertoPorId = new Map(pedidosEmAberto.map((pedido) => [pedido.id, pedido]));

    for (const pedidoId of pedidoIds) {
      if (restante.lte(0)) break;

      let saldoPedido = await sumMovimentosPedido(tx, pedidoId);
      if (saldoPedido.eq(0)) {
        const pedidoAberto = pedidosEmAbertoPorId.get(pedidoId);
        if (pedidoAberto) {
          const totalPago = pedidoAberto.pagamentos.reduce((sum, pagamento) => sum.add(toDecimal(pagamento.valorPago)), new Prisma.Decimal(0));
          const saldoAberto = totalPago.sub(toDecimal(pedidoAberto.valorTotal));

          if (saldoAberto.isNegative()) {
            await createCarteiraMovimento(tx, {
              clienteId,
              pedidoId,
              tipo: "PEDIDO_ABERTO_SEM_PAGAMENTO",
              natureza: "DEBITO",
              valor: saldoAberto.abs(),
              origem: "SISTEMA",
              criadoPorUsuarioId: data.criadoPorUsuarioId,
              observacao: "Abertura automatica para aplicar saldo na carteira.",
              dataCompetencia: pedidoAberto.criadoEm,
              dataMovimento: pedidoAberto.criadoEm,
              idempotencyKey: `pedido:${pedidoId}:abertura`
            });
            saldoPedido = saldoAberto;
          }
        }
      }
      if (!saldoPedido.isNegative()) continue;

      const saldoDevedor = saldoPedido.abs();
      const valorAplicado = restante.gte(saldoDevedor) ? saldoDevedor : restante;
      const tipoAplicacao = valorAplicado.eq(saldoDevedor) ? "PAGAMENTO_TOTAL" : "PAGAMENTO_PARCIAL";

      movimentosCriados.push(await createCarteiraMovimento(tx, {
        clienteId,
        pedidoId,
        tipo: tipoAplicacao,
        natureza: "CREDITO",
        valor: valorAplicado,
        origem: "MANUAL",
        criadoPorUsuarioId: data.criadoPorUsuarioId,
        observacao: data.observacao,
        dataCompetencia: dataMovimento,
        dataMovimento,
        metadata,
        idempotencyKey: undefined
      }));

      restante = restante.sub(valorAplicado);
      const saldoAposAplicacao = await sumMovimentosPedido(tx, pedidoId);
      await updatePedidoStatusTx(tx, pedidoId, {
        status: saldoAposAplicacao.isNegative() ? "AGUARDANDO_PAGAMENTO" : "PAGO",
        observacao: saldoAposAplicacao.isNegative() ? "Saldo aplicado parcialmente na carteira" : "Saldo aplicado e pedido quitado"
      }, data.criadoPorUsuarioId, { isMaster: true, createOpenMovement: false });
    }

    if (restante.gt(0)) {
      movimentosCriados.push(await createCarteiraMovimento(tx, {
        clienteId,
        tipo: "CREDITO_MANUAL",
        natureza: "CREDITO",
        valor: restante,
        origem: "MANUAL",
        criadoPorUsuarioId: data.criadoPorUsuarioId,
        observacao: data.observacao,
        dataCompetencia: dataMovimento,
        dataMovimento,
        metadata,
        idempotencyKey: undefined
      }));
    }

    return movimentosCriados;
  }, { timeout: 20000, maxWait: 10000 });
}

export function criarDebitoManual(clienteId: string, data: { valor: Prisma.Decimal.Value; observacao: string; dataCompetencia?: Date; criadoPorUsuarioId: string }) {
  return createMovimentoManual(clienteId, {
    valor: data.valor,
    tipo: "DEBITO_MANUAL",
    natureza: "DEBITO",
    observacao: data.observacao,
    dataCompetencia: data.dataCompetencia,
    criadoPorUsuarioId: data.criadoPorUsuarioId,
    origem: "MANUAL"
  });
}

export function criarAjusteManual(clienteId: string, data: { valor: Prisma.Decimal.Value; natureza: CarteiraMovimentoNatureza; observacao: string; dataCompetencia?: Date; criadoPorUsuarioId: string }) {
  return createMovimentoManual(clienteId, {
    valor: data.valor,
    tipo: "AJUSTE",
    natureza: data.natureza,
    observacao: data.observacao,
    dataCompetencia: data.dataCompetencia,
    criadoPorUsuarioId: data.criadoPorUsuarioId,
    origem: "AJUSTE"
  });
}

export async function getRelatorioCarteira(period: { start: Date; end: Date }) {
  const [clientes, movimentos, pedidos] = await Promise.all([
    prisma.atacadoCliente.findMany({
      select: { id: true, nome: true, documento: true, status: true }
    }),
    prisma.atacadoCarteiraMovimento.findMany({
      select: {
        clienteId: true,
        pedidoId: true,
        tipo: true,
        natureza: true,
        origem: true,
        observacao: true,
        valor: true,
        dataMovimento: true,
        dataCompetencia: true
      }
    }),
    prisma.atacadoPedido.findMany({
      select: {
        clienteId: true,
        status: true,
        valorTotal: true,
        pagamentos: {
          select: {
            valorPago: true,
            status: true,
            registradoEm: true
          }
        }
      }
    })
  ]);

  const movimentosPorPedido = new Map<string, typeof movimentos>();
  for (const movimento of movimentos) {
    if (!movimento.pedidoId) continue;
    const current = movimentosPorPedido.get(movimento.pedidoId) ?? [];
    current.push(movimento);
    movimentosPorPedido.set(movimento.pedidoId, current);
  }
  const movimentosVisiveis = movimentos.filter((movimento) => !isLegacySettlementWithoutDebt(movimento, movimento.pedidoId ? movimentosPorPedido.get(movimento.pedidoId) ?? [] : []));
  const movimentosByCliente = new Map<string, typeof movimentos>();
  for (const movimento of movimentosVisiveis) {
    const current = movimentosByCliente.get(movimento.clienteId) ?? [];
    current.push(movimento);
    movimentosByCliente.set(movimento.clienteId, current);
  }

  const pedidosByCliente = new Map<string, typeof pedidos>();
  for (const pedido of pedidos) {
    const current = pedidosByCliente.get(pedido.clienteId) ?? [];
    current.push(pedido);
    pedidosByCliente.set(pedido.clienteId, current);
  }

  const clientesResumo = clientes.map((cliente) => {
    const clientPedidos = pedidosByCliente.get(cliente.id) ?? [];
    const clientMovimentos = movimentosByCliente.get(cliente.id) ?? [];
    const clientMovimentosPeriodo = clientMovimentos.filter((movimento) => movimento.dataMovimento >= period.start && movimento.dataMovimento <= period.end);
    const hasMovimentos = clientMovimentos.length > 0;
    const saldoLegacy = clientPedidos.reduce((sum, pedido) => {
      if (!isPedidoCarteiraAtivo(pedido.status)) {
        return sum;
      }
      const totalPagamentos = pedido.pagamentos.reduce((paymentSum, pagamento) => {
        if (pagamento.status === "PENDENTE") return paymentSum;
        return paymentSum.add(toDecimal(pagamento.valorPago));
      }, new Prisma.Decimal(0));
      return sum.add(totalPagamentos.sub(toDecimal(pedido.valorTotal)));
    }, new Prisma.Decimal(0));
    const saldoAtual = hasMovimentos ? calcularSaldoMovimentos(clientMovimentos) : saldoLegacy;
    const saldoDevedor = saldoAtual.isNegative() ? saldoAtual.abs() : new Prisma.Decimal(0);
    const creditoDisponivel = saldoAtual.isPositive() ? saldoAtual : new Prisma.Decimal(0);
    const totalPagoMovimentos = clientMovimentosPeriodo
      .filter((movimento) => ["PAGAMENTO_PARCIAL", "PAGAMENTO_TOTAL"].includes(movimento.tipo))
      .reduce((sum, movimento) => sum.add(movimento.valor), new Prisma.Decimal(0));
    const totalSobraMovimentos = clientMovimentosPeriodo
      .filter((movimento) => movimento.tipo === "SOBRA_PAGAMENTO")
      .reduce((sum, movimento) => sum.add(movimento.valor), new Prisma.Decimal(0));
    const totalAjustesMovimentos = clientMovimentosPeriodo
      .filter((movimento) => ["CREDITO_MANUAL", "DEBITO_MANUAL", "AJUSTE"].includes(movimento.tipo))
      .reduce((sum, movimento) => sum.add(signedMovimentoValue(movimento)), new Prisma.Decimal(0));

    const totalPagoLegacyPeriodo = clientPedidos.reduce((sum, pedido) => {
      return sum.add(pedido.pagamentos.reduce((paymentSum, pagamento) => {
        if (pagamento.status === "PENDENTE") return paymentSum;
        if (pagamento.registradoEm < period.start || pagamento.registradoEm > period.end) return paymentSum;
        return paymentSum.add(toDecimal(pagamento.valorPago));
      }, new Prisma.Decimal(0)));
    }, new Prisma.Decimal(0));

    const totalSobraLegacyPeriodo = clientPedidos.reduce((sum, pedido) => {
      const totalPagamentosPeriodo = pedido.pagamentos.reduce((paymentSum, pagamento) => {
        if (pagamento.status === "PENDENTE") return paymentSum;
        if (pagamento.registradoEm < period.start || pagamento.registradoEm > period.end) return paymentSum;
        return paymentSum.add(toDecimal(pagamento.valorPago));
      }, new Prisma.Decimal(0));
      const sobra = totalPagamentosPeriodo.sub(toDecimal(pedido.valorTotal));
      return sobra.gt(0) ? sum.add(sobra) : sum;
    }, new Prisma.Decimal(0));
    const totalPagoPeriodo = hasMovimentos ? totalPagoMovimentos : totalPagoLegacyPeriodo;
    const totalSobraPeriodo = hasMovimentos ? totalSobraMovimentos : totalSobraLegacyPeriodo;
    const totalAjustesPeriodo = hasMovimentos ? totalAjustesMovimentos : new Prisma.Decimal(0);

    return {
      cliente,
      saldoAtual,
      saldoDevedor,
      creditoDisponivel,
      totalPagoPeriodo,
      totalSobraPeriodo,
      totalAjustesPeriodo
    };
  });

  const resumoMensalPorCliente = clientes.map((cliente) => {
    const clientMovimentos = movimentosByCliente.get(cliente.id) ?? [];
    const meses = new Map<string, { mes: string; credito: Prisma.Decimal; debito: Prisma.Decimal; saldo: Prisma.Decimal }>();

    for (const movimento of clientMovimentos) {
      const mes = movimento.dataMovimento.toISOString().slice(0, 7);
      const current = meses.get(mes) ?? { mes, credito: new Prisma.Decimal(0), debito: new Prisma.Decimal(0), saldo: new Prisma.Decimal(0) };
      if (movimento.natureza === "CREDITO") {
        current.credito = current.credito.add(movimento.valor);
        current.saldo = current.saldo.add(movimento.valor);
      } else if (movimento.natureza === "DEBITO") {
        current.debito = current.debito.add(movimento.valor);
        current.saldo = current.saldo.sub(movimento.valor);
      }
      meses.set(mes, current);
    }

    return {
      cliente,
      meses: [...meses.values()].sort((left, right) => left.mes.localeCompare(right.mes))
    };
  });

  const rankingSaldoDevedor = [...clientesResumo]
    .sort((left, right) => right.saldoDevedor.comparedTo(left.saldoDevedor))
    .slice(0, 20);
  const rankingCreditoDisponivel = [...clientesResumo]
    .sort((left, right) => right.creditoDisponivel.comparedTo(left.creditoDisponivel))
    .slice(0, 20);

  return {
    periodo: period,
    clientes: clientesResumo,
    resumoMensalPorCliente,
    rankingSaldoDevedor,
    rankingCreditoDisponivel,
    totaisPeriodo: {
      totalPago: clientesResumo.reduce((sum, item) => sum.add(item.totalPagoPeriodo), new Prisma.Decimal(0)),
      totalSobra: clientesResumo.reduce((sum, item) => sum.add(item.totalSobraPeriodo), new Prisma.Decimal(0)),
      totalAjustes: clientesResumo.reduce((sum, item) => sum.add(item.totalAjustesPeriodo), new Prisma.Decimal(0)),
      totalCreditoDisponivel: clientesResumo.reduce((sum, item) => sum.add(item.creditoDisponivel), new Prisma.Decimal(0)),
      totalSaldoDevedor: clientesResumo.reduce((sum, item) => sum.add(item.saldoDevedor), new Prisma.Decimal(0))
    }
  };
}

export async function getAtacadoDashboard() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [statusCounts, pedidosDia, totals] = await Promise.all([
    prisma.atacadoPedido.groupBy({
      by: ["status"],
      _count: { _all: true }
    }),
    prisma.atacadoPedido.count({ where: { criadoEm: { gte: start, lt: end } } }),
    prisma.atacadoPedido.aggregate({
      _sum: { valorTotal: true },
      where: { status: { notIn: ["CANCELADO"] } }
    })
  ]);

  const counts = Object.fromEntries(statusCounts.map((item) => [item.status, item._count._all]));
  const valorTotalVendido = totals._sum.valorTotal ?? new Prisma.Decimal(0);

  return {
    pedidosDia,
    counts,
    valorTotalVendido
  };
}
