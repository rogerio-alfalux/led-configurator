# Perfil SHIFT — observações da API

Fonte consultada em 17/08/2026: rota interna `alfalux.shiftModules`, abastecida por `https://alfaluxprod-c8zmg2fn.manus.space/api/products/all`.

Os módulos comerciais do SHIFT são produtos cujo SKU começa com `S01`. O retorno atual inclui, entre outros, `S01-06860` (SHIFT MÓDULO GUGA G 13W, 24°/36°, dimensões Ø76 × 206 × 103 mm) e `S01-06863` (SHIFT MÓDULO GUGA M 8W, 24°/36°, dimensões Ø57 × 206 × 103 mm). Os produtos trazem URL de foto, potência, dimensões, CCTs cadastrados e driver, mas o tratamento do perfil SHIFT não deve associar o módulo LED próprio do perfil a CCT.

O adaptador atual reconhece o SKU-base `LLE-4846` como SHIFT. Há regras estáticas legadas no adaptador e na Home que fixam Embutir, 18 W, 3000 K e Stripflex; essas devem ser substituídas/isoladas de acordo com o novo fluxo orientado pela API.

O endpoint completo de produtos é grande e a transferência direta pode exceder o tempo do ambiente. A rota interna já dispõe da cópia carregada em memória e deve ser preferida para consultas específicas durante a implementação.
