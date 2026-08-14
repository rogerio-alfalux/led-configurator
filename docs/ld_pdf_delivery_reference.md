# Referência de entrega de PDF ao LD

## Regra imutável

O layout do PDF oficial do orçamento é validado pelo usuário e **não pode ser alterado** sem pedido expresso.

## Comparação dos arquivos recebidos em 14/08/2026

| Arquivo | Origem | Resultado |
|---|---|---|
| `ARQUIVOPDFLD.pdf` | Download pelo LD | Layout divergente: tabela, tipografia, cabeçalho e composição visual não correspondem ao PDF oficial. |
| `PDFADMIN.pdf` | PDF gerado pelo administrador | Referência oficial que deve ser entregue também ao LD. |

## Diretriz de implementação

O PDF entregue ao LD deve reutilizar o **mesmo Blob/arquivo já gerado no fluxo oficial do administrador**, sem recriar o documento por um gerador paralelo ou por um layout alternativo. A entrega deve apenas anexar e disponibilizar esse arquivo oficial à solicitação LD.
