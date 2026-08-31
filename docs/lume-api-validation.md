# Validação do catálogo LUME — API Alfalux

Consulta somente leitura realizada em 31/08/2026 à fonte comercial e técnica obrigatória:

`https://alfaluxprod-c8zmg2fn.manus.space/api/products/all`

## Resultado relevante

A API retornou produtos da família `LUME`, categoria `PERFIS`, em versões fixas com instalação `PENDENTE`. As variantes incluem módulos retos como `LUME P (MÓDULO RETO 600MM) 10W/M`, `1200MM` e `2400MM`, com CCTs 2700K, 3000K, 4000K e 5000K.

As opções de driver vêm da API: fonte bivolt ON/OFF, DIM TRIAC/0-10V e DIM DALI. As variantes incluem o anexo compartilhado `Manual-Instalacao_Sistema_Lume.pdf` no campo `documentos.manualInstalacao`.

## Decisão de integração

LUME deve usar o mesmo fluxo técnico e comercial de BAGEO fixo (e não BAGEO Sinuosa): instalação, seleção de produto, CCT, controle, tensão, corpo e driver separados, carrinho, orçamento, ficha, requisição e documentos. Não usar catálogo comercial estático.
