import { Prisma, type AtacadoAnexoTipo, type AtacadoPedidoStatus, type AtacadoPagamentoStatus } from "@prisma/client";
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
            { categoria: { contains: query, mode: "insensitive" } },
            { cor: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: { fotos: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
}

export function createProduto(data: ProdutoInput) {
  return prisma.atacadoProduto.create({
    data: {
      ...data,
      precoPorCaixa: new Prisma.Decimal(data.precoPorCaixa)
    }
  });
}

export function updateProduto(id: string, data: ProdutoInput) {
  return prisma.atacadoProduto.update({
    where: { id },
    data: {
      ...data,
      precoPorCaixa: new Prisma.Decimal(data.precoPorCaixa)
    }
  });
}

export async function addProdutoFoto(id: string, file: File, principal = false) {
  const uploaded = await uploadImage(file, cloudinaryFolder("produtos"));
  return prisma.atacadoProdutoFoto.create({
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
}

export async function listPedidos(filters: { status?: AtacadoPedidoStatus; clienteId?: string; vendedorId?: string } = {}) {
  return prisma.atacadoPedido.findMany({
    where: {
      status: filters.status,
      clienteId: filters.clienteId,
      vendedorId: filters.vendedorId
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

export async function createPedido(data: PedidoInput, userId: string) {
  const produtos = await prisma.atacadoProduto.findMany({
    where: { id: { in: data.itens.map((item) => item.produtoId) } }
  });
  const produtosById = new Map(produtos.map((produto) => [produto.id, produto]));

  return prisma.$transaction(async (tx) => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const count = await tx.atacadoPedido.count({ where: { criadoEm: { gte: start, lt: end } } });
    const numero = `AT${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${String(count + 1).padStart(4, "0")}`;

    const itens = data.itens.map((item) => {
      const produto = produtosById.get(item.produtoId);
      if (!produto) throw new Error("Produto invalido no pedido.");
      const quantidadePares = item.quantidadeCaixas * produto.quantidadePorCaixa;
      const valorTotal = produto.precoPorCaixa.mul(item.quantidadeCaixas);
      return {
        produtoId: item.produtoId,
        quantidadeCaixas: item.quantidadeCaixas,
        quantidadePares,
        precoCaixa: produto.precoPorCaixa,
        valorTotal,
        observacao: item.observacao
      };
    });

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

export async function updatePedidoStatus(id: string, data: StatusPedidoInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.atacadoPedido.findUniqueOrThrow({ where: { id }, select: { status: true } });
    const pedido = await tx.atacadoPedido.update({ where: { id }, data: { status: data.status } });
    await tx.atacadoHistoricoStatus.create({
      data: {
        pedidoId: id,
        usuarioId: userId,
        statusAnterior: current.status,
        statusNovo: data.status,
        observacao: data.observacao
      }
    });
    return pedido;
  });
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

export async function registerPagamento(id: string, data: PagamentoInput, userId: string, file?: File) {
  const uploaded = file ? await uploadImage(file, cloudinaryFolder("pagamentos")) : null;
  const pagamento = await prisma.atacadoPagamento.create({
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

  if (data.status === "PAGO") {
    await updatePedidoStatus(id, { status: "PAGO", observacao: "Pagamento confirmado" }, userId);
  } else if (data.status === "PARCIAL") {
    await updatePedidoStatus(id, { status: "AGUARDANDO_PAGAMENTO", observacao: "Pagamento parcial registrado" }, userId);
  }

  return pagamento;
}

export function createEntrega(id: string, data: EntregaInput, userId: string) {
  return prisma.atacadoEntrega.create({
    data: {
      pedidoId: id,
      motoristaId: data.motoristaId,
      registradoPorId: userId,
      tipo: data.tipo,
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
    where: {
      motoristaId: userId,
      status: { in: ["PENDENTE", "EM_ROTA"] }
    },
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
        status: "PENDENTE",
        endereco: pedido.cliente.endereco,
        observacao: "Motorista solicitou liberacao da expedicao"
      },
      include: { pedido: { include: { cliente: true } }, motorista: { select: { id: true, name: true, email: true } } }
    });

    await tx.atacadoPedido.update({ where: { id: pedidoId }, data: { status: "EM_EXPEDICAO" } });
    await tx.atacadoHistoricoStatus.create({
      data: {
        pedidoId,
        usuarioId: userId,
        statusAnterior: "PAGO",
        statusNovo: "EM_EXPEDICAO",
        observacao: "Motorista solicitou liberacao da expedicao"
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

    if (entregaAtual.status !== "PENDENTE") {
      throw new Error("Entrega nao esta aguardando liberacao.");
    }

    const entrega = await tx.atacadoEntrega.update({
      where: { id },
      data: { status: "EM_ROTA" },
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
          observacao: "Expedicao liberou a entrega para o motorista"
        }
      });
    }

    return entrega;
  });
}

export async function concluirEntrega(id: string, data: ConcluirEntregaInput, userId: string, file?: File) {
  const current = await prisma.atacadoEntrega.findUniqueOrThrow({ where: { id }, select: { motoristaId: true } });
  if (current.motoristaId !== userId) {
    throw new Error("Entrega nao atribuida a este motorista.");
  }

  const uploaded = file ? await uploadImage(file, cloudinaryFolder("entregas")) : null;

  const observacoes = [
    data.recebedorNome ? `Recebedor: ${data.recebedorNome}` : null,
    data.assinaturaNome ? `Assinatura: ${data.assinaturaNome}` : null,
    data.observacao
  ].filter(Boolean);

  const entrega = await prisma.atacadoEntrega.update({
    where: { id },
    data: {
      status: "ENTREGUE",
      reciboUrl: uploaded?.url,
      reciboPublicId: uploaded?.publicId,
      latitude: data.latitude == null ? undefined : new Prisma.Decimal(data.latitude),
      longitude: data.longitude == null ? undefined : new Prisma.Decimal(data.longitude),
      observacao: observacoes.join("\n") || undefined,
      entregueEm: new Date()
    }
  });

  await updatePedidoStatus(entrega.pedidoId, { status: "ENTREGUE", observacao: "Entrega concluida" }, userId);
  return entrega;
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
