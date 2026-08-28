# Validação de catálogo — SKYLINE FL

**Fonte consultada:** `https://alfaluxprod-c8zmg2fn.manus.space/api/products/all` e `https://alfaluxprod-c8zmg2fn.manus.space/api/componentes/all`.

**Data da consulta:** 28/08/2026, em leitura direta e sem alteração dos dados externos.

| Família | SKU | Versão | Instalação atual | CCTs | FITA LED / código API | Fonte ON/OFF Bivolt |
|---|---|---|---|---|---|---|
| SKYLINE FL | LLE-2052 | SKYLINE E FL 5W/M | EMBUTIR | 3000K, 4000K | EQ00586 / EQ00457 | EQ00800 |
| SKYLINE FL | LLE-2052 | SKYLINE E FL 10W/M | EMBUTIR | 2700K, 3000K, 4000K, 5000K | 3000K: EQ00557; 4000K: EQ00081 | EQ00801 |
| SKYLINE FL | LLE-2052 | SKYLINE E FL 25W/M | EMBUTIR | 3000K, 4000K | EQ00732 / EQ00733 | EQ00803 |

> A família usa o fluxo de LED BAR por metro linear. A sentinela interna `NF` apenas preserva a compatibilidade com o motor existente; não representa uma opção comercial e não deve ser exibida ao usuário. A instalação precisa ser lida dinamicamente da API para acomodar futuras versões PENDENTE e SOBREPOR.

## Regras de propagação verificadas

| Etapa | Fonte de dados | Unidade / quantidade |
|---|---|---|
| Configuração | Produto e componentes API | Potência, CCT, instalação e controles retornados pela API |
| Carrinho | Resultado LED BAR | `category: "LED BAR"`, campos `ledBar*`, módulo FITA LED e código EQ |
| Ficha de produção | Item LED BAR | FITA LED apresentada em milímetros e fonte por trecho |
| Requisição de materiais | Item LED BAR | Perfil e FITA em metros; fonte = cortes × quantidade do item |
