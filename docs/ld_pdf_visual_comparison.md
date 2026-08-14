# Comparação visual: PDF entregue ao LD vs. PDF oficial

## Referências analisadas

| Arquivo | Observação |
|---|---|
| `Alfalux_33_XXXX-26.pdf` | Arquivo entregue ao LD pela captura automática atual. Uma página, conteúdo comprimido verticalmente. |
| `04.0366-26(RV0)-ORATÓRIO-REFORMAESCRITÓRIO-PROENGCONSTRUTORA.pdf` | Referência oficial validada. Duas páginas, primeira com itens e totais; segunda com informações complementares, condições, assinatura e rodapé. |

## Divergências confirmadas

O PDF do LD é uma rasterização única da prévia HTML. Ele reduz todos os conteúdos para uma única página e, por isso, não preserva a paginação, escala, logotipo, respiros, distribuição de itens e rodapé do arquivo oficial. O PDF oficial é originado pelo diálogo de impressão do navegador em A4 retrato e mantém a quebra natural em múltiplas páginas.

## Regra de implementação

Não modificar o layout oficial. O fluxo do LD deve armazenar e disponibilizar o mesmo arquivo que o navegador gera a partir do diálogo de impressão oficial, ou uma geração que reproduza esse artefato com a mesma paginação. A captura de uma página contínua não atende ao requisito de fidelidade visual.
