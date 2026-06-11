import { z } from "zod";

export const clienteSchema = z.object({
  nome: z.string().min(2),
  telefone: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().max(2).optional().nullable(),
  endereco: z.string().optional().nullable(),
  documento: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO")
});

export const produtoSchema = z.object({
  referencia: z.string().optional().nullable(),
  nome: z.string().min(2),
  categoria: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  quantidadePorCaixa: z.coerce.number().int().positive().default(12),
  precoPorCaixa: z.coerce.number().nonnegative(),
  permiteEditarPrecoPedido: z.coerce.boolean().default(false),
  status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),
  observacoes: z.string().optional().nullable()
});

export const pedidoItemSchema = z.object({
  produtoId: z.string().uuid(),
  quantidadeCaixas: z.coerce.number().int().positive(),
  precoCaixa: z.coerce.number().nonnegative().optional().nullable(),
  descontoPercentual: z.coerce.number().min(0).max(100).default(0),
  observacao: z.string().optional().nullable()
});

export const pedidoSchema = z.object({
  clienteId: z.string().uuid(),
  vendedorId: z.string().uuid().optional().nullable(),
  observacao: z.string().optional().nullable(),
  itens: z.array(pedidoItemSchema).min(1)
});

export const statusPedidoSchema = z.object({
  status: z.enum([
    "RASCUNHO",
    "AGUARDANDO_SEPARACAO",
    "EM_SEPARACAO",
    "SEPARADO",
    "AGUARDANDO_PAGAMENTO",
    "PAGO",
    "EM_EXPEDICAO",
    "EM_ENTREGA",
    "ENTREGUE",
    "CANCELADO",
    "FALTA_ESTOQUE"
  ]),
  observacao: z.string().optional().nullable()
});

export const pagamentoSchema = z.object({
  status: z.enum(["PENDENTE", "PARCIAL", "PAGO"]).default("PENDENTE"),
  valorPago: z.coerce.number().nonnegative(),
  observacao: z.string().optional().nullable()
});

export const entregaSchema = z.object({
  motoristaId: z.string().uuid().optional().nullable(),
  tipo: z.enum(["ENTREGA_PROPRIA", "TRANSPORTADORA", "RETIRADA"]),
  endereco: z.string().optional().nullable(),
  observacao: z.string().optional().nullable()
});

export const concluirEntregaSchema = z.object({
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  recebedorNome: z.string().optional().nullable(),
  assinaturaNome: z.string().optional().nullable(),
  observacao: z.string().optional().nullable()
});
