# Mapeamento das planilhas Shopee

Base analisada: `Income.lançado.br.20260401_20260430.xlsx`

## Regra principal

A aba `Renda` possui dois tipos de linha para muitos pedidos:

- `SKU = "-"`: linha resumo do pedido.
- `SKU real`: linha de produto.

Nao devemos somar as duas linhas juntas, porque isso duplica valores. Para conciliacao por pedido:

- Usar a linha `SKU real` para produto, SKU, preco do produto, comissao, taxa de servico, frete logistico, reembolso e valor recebido.
- Usar a linha `SKU = "-"` quando a informacao so existir no resumo, como `Quantia paga pelo comprador`, metodo de pagamento e alguns dados gerais do pedido.
- Se um pedido nao tiver linha de produto, usar a linha resumo como fallback.

## Summary

Uso sugerido: informativo do arquivo.

Campos observados:

- Nome de usuario vendedor
- Titular da conta bancaria
- Dados gerais do relatorio

Nao deve entrar diretamente nos calculos por pedido.

## Renda

Uso principal: base da conciliacao financeira por pedido.

Campos importantes:

- `ID do pedido`: chave para cruzar com ERP.
- `ID do reembolso`: identifica linhas com reembolso.
- `SKU`: separa linha resumo (`-`) de linha produto.
- `Nome do produto`
- `Data de criação do pedido`
- `Data de conclusão do pagamento`
- `Canal de liberação`
- `Tipo de pedido`
- `Quantia total lançada (R$)`: valor recebido/liberado.
- `Preço do produto`: valor vendido na Shopee.
- `Valor do Reembolso`
- `Taxa de frete paga pelo comprador`
- `Frete cobrado pelo parceiro logístico`
- `Desconto de frete pela Shopee`
- `Taxa de envio reverso`
- `Taxa de devolução do vendedor`
- `Taxa de comissão líquida`
- `Taxa de serviço líquida`
- `Taxa de transação`
- `Taxa de comissão Afiliados do Vendedor`
- `Taxa de Devolução Fácil Shopee`
- `Quantia paga pelo comprador`
- `Método de Pagamento do Comprador`
- `Transportadora`
- `Nome da Transportadora`
- `Taxa de comissão bruta`
- `Taxa de serviço bruta`
- `Valor Reembolsado ao Comprador`

Totais observados em abril/2026:

- Linhas resumo: `1692`
- Linhas produto: `1750`
- Pedidos unicos: `1692`
- Recebido: `R$ 67.524,89`
- Venda Shopee em linhas produto: `R$ 93.584,59`
- Frete logistico: `-R$ 26.980,82`
- Desconto de frete Shopee: `R$ 23.094,54`
- Frete pago pelo comprador: `R$ 3.847,01`
- Comissao liquida: `-R$ 16.719,52`
- Taxa servico liquida: `-R$ 8.886,37`
- Afiliados: `-R$ 112,07`
- Reembolso: `-R$ 2.201,96`

## Service Fee Details

Uso sugerido: detalhar taxas por pedido e detectar taxas diferentes.

Campos:

- `Número da sequência`
- `ID do pedido`
- `Taxa de Transação`
- `Taxa por item vendido`

Uso nos calculos:

- Pode validar/detalhar `Taxa de serviço líquida` e `Taxa de transação` da aba `Renda`.
- Pode alimentar uma tela de `Taxas diferentes`.
- Evitar somar junto com `Renda` sem regra de conciliacao, para nao duplicar taxa.

## Adjustment

Uso sugerido: ajustes posteriores por pedido.

Campos:

- `Data de conclusão do ajuste`
- `Tipo/Descrição do ajuste`
- `Motivo do ajuste`
- `Valor do ajuste`
- `Número do pedido relacionado`
- `Data de conclusão do pagamento`

Uso nos calculos:

- Mostrar separado como `Ajustes`.
- Classificar por descricao/motivo:
  - DIFAL/ICMS destino
  - reembolso/devolucao
  - credito/compensacao
  - outros
- Nao misturar automaticamente com taxas ou devolucoes da aba `Renda`, porque pode representar evento posterior.

## Shipping Fee Discrepancy

Uso sugerido: auditoria de divergencia de frete.

Campos:

- `ID do pedido`
- `Taxa de frete esperada:`
- `Taxa de frete real cobrada pelo parceiro logístico:`
- `Motivo da discrepância`

Uso nos calculos:

- Nao entra direto no lucro do pedido.
- Deve aparecer como alerta de frete quando houver diferenca entre frete esperado e frete real.

Totais observados:

- Frete esperado: `R$ 96,14`
- Frete real: `R$ 170,48`
- Diferenca: `R$ 74,34`

## Como refazer os calculos

Para cada pedido:

1. Buscar pedido no ERP usando `sales_invoices.customerOrder`.
2. Buscar pedido Shopee usando `Renda.ID do pedido`.
3. Separar linhas da aba `Renda`:
   - produto: `SKU != "-"`
   - resumo: `SKU = "-"`
4. Calcular valores financeiros prioritariamente pelas linhas de produto.
5. Completar dados gerais pela linha resumo quando necessario.
6. Somar ajustes da aba `Adjustment` em coluna separada.
7. Usar `Shipping Fee Discrepancy` apenas como alerta.
8. Usar `Service Fee Details` para detalhamento/classificacao de taxas, nao como soma principal.

Formula para frete liquido e valor liquido recebido:

```text
frete_liquido_vendedor =
  max(0, frete_logistico - frete_pago_pelo_comprador - desconto_frete_shopee)
  + envio_reverso
  + taxa_devolucao_vendedor

liquido_recebido =
  valor_recebido
  + ajustes_carteira
```

Observacao: `Quantia total lancada` ja vem liquida dos descontos da Shopee. Comissao, taxa, frete e devolucao devem ser exibidos como detalhamento do desconto, mas nao devem ser subtraidos novamente do valor recebido. Para calcular lucro real ainda falta custo do produto e regra fiscal/contabil definida.
