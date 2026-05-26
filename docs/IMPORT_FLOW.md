# Fluxo de Importacao

## Deteccao de Arquivo

Assinaturas usadas:

- Faturamento fiscal: `EMISSAO`, `DOCTO/SER`, `CFOP`, `VR TOTAL`, `VR ICMS`.
- Saldo da carteira Shopee: `Data`, `Tipo de transacao`, `ID do pedido`, `Direcao do dinheiro`, `Valor`.
- Shopee Acelera: `Data do resgate rapido`, `ID do resgate rapido`, `Taxa de Servico`, `Valor recebido`.
- Income/Renda Shopee: abas `Renda`, `Service Fee Details`, `Adjustment`, colunas `ID do pedido`, `SKU`, `Quantia total lancada`.

## Atualizacao sem Duplicidade

- Fiscal: `documentNumber + emissionDate + branch`.
- Carteira: hash de data, tipo, pedido, direcao, valor e saldo.
- Acelera: hash de resgate, pedido, status, valores e datas.
- Income: hash de pedido, SKU, produto, valor lancado e datas.

## DIFAL

Formula aplicada:

`DIFAL = BASE_CALCULO * (ALIQUOTA_INTERNA_DESTINO - ALIQUOTA_INTERESTADUAL)`

O resultado e sempre exibido como estimativa: "DIFAL estimado. Validar com contador."
