# Auditoria de materiais — 27.0011-26 e 27.0012-26

Fonte consultada: `https://alfaluxprod-c8zmg2fn.manus.space/api/products/all` em 27/08/2026 (horário de Brasília).

## Pedido 27.0012-26

| SKU | Produto | CCT | Módulo LED oficial | Código oficial | Quantidade por peça |
| --- | --- | --- | --- | --- | --- |
| LLE-2488.051.18F | EASY LED POINT 1X6 13W 48º | 3000K | MODULO LINEAR 6 LEDS 830-3000K 1500LM 154X23MM ADV CNB 18V/700MA | EQ00147 | 1 |

O identificador `P0000786` aparece no texto de referência do módulo, mas não é o código de material que deve constar na requisição. A consulta a `https://alfaluxprod-c8zmg2fn.manus.space/api/componentes/all` confirmou o código oficial `EQ00147` para essa descrição, que deve ter precedência em qualquer requisição.

## Pedido 27.0011-26

| SKU | Produto | CCT | Módulo LED | Driver 220V | Quantidade por peça |
| --- | --- | --- | --- | --- | --- |
| LLS-9465.115.65F | GLOW S 54W 1154MM | 5000K | 2x STRIPLINE 562.5X15MM 108LEDS 28W 850-5000K (LC) 75V | EQ00393 — LED DRIVER 65W 200-350MA 120-185VDC 230V | 1 driver |

O endpoint de componentes confirmou `EQ00415` para o módulo 5000K e `EQ00393` para o driver 220V. O endpoint retornou três versões de potência para o SKU `LLS-9465.115.65F`; a seleção deve considerar o nome de produto e a potência configurada, não o SKU isoladamente.

O SKU `LLS-9465.115.70E`, salvo como Item Especial com o sufixo “C/ MÓDULO DE EMERGENCIA”, não foi retornado pelo endpoint de produtos. Portanto, a API não fornece neste momento um componente adicional de emergência para ele; somente os componentes do GLOW S 54W base podem ser associados sem inventar dados.
