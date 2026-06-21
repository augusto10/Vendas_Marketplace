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
  codigo: z.string().optional().nullable(),
  codigoBarras: z.string().optional().nullable(),
  nome: z.string().min(2),
  categoria: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  grade: z.enum(["ALTA", "BAIXA"]).optional().nullable(),
  numeracao: z.enum(["33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"]).optional().nullable(),
  embalagem: z.enum(["SACO", "CAIXA"]).optional().nullable(),
  quantidadePorCaixa: z.coerce.number().int().positive().default(12),
  precoPorCaixa: z.coerce.number().nonnegative(),
  permiteEditarPrecoPedido: z.coerce.boolean().default(false),
  status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),
  observacoes: z.string().optional().nullable()
});

export const pedidoItemSchema = z.object({
  produtoId: z.string().uuid(),
  quantidadeCaixas: z.coerce.number().int().positive(),
  quantidadePares: z.coerce.number().int().positive().optional().nullable(),
  quantidadePorCaixa: z.coerce.number().int().positive().optional().nullable(),
  unidadesPorEmbalagem: z.coerce.number().int().positive().optional().nullable(),
  tipoEmbalagem: z.enum(["SACO", "CAIXA"]).optional().nullable(),
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
  recebedorNome: z.string().trim().min(2, "Informe o nome de quem recebeu."),
  observacao: z.string().optional().nullable()
});

export const carteiraMovimentoBaseSchema = z.object({
  valor: z.coerce.number().positive(),
  observacao: z.string().min(2),
  dataCompetencia: z.coerce.date().optional().nullable()
});

export const carteiraCreditoSchema = carteiraMovimentoBaseSchema;

export const carteiraDebitoSchema = carteiraMovimentoBaseSchema;

export const carteiraAjusteSchema = carteiraMovimentoBaseSchema.extend({
  tipo: z.enum(["CREDITO", "DEBITO"])
});

export const carteiraExtratoQuerySchema = z.object({
  dataInicio: z.coerce.date().optional().nullable(),
  dataFim: z.coerce.date().optional().nullable(),
  tipo: z.enum([
    "PEDIDO_ABERTO_SEM_PAGAMENTO",
    "PAGAMENTO_PARCIAL",
    "PAGAMENTO_TOTAL",
    "CREDITO_MANUAL",
    "DEBITO_MANUAL",
    "AJUSTE",
    "ESTORNO",
    "CANCELAMENTO_PEDIDO",
    "SOBRA_PAGAMENTO"
  ]).optional(),
  pedidoId: z.string().uuid().optional()
});
