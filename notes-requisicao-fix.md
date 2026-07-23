# Correção Requisição de Materiais — Notas

## Problema
Na imagem do usuário, a coluna CÓDIGO mostra descrições longas como "MODULO_2x STRIPFLEX..." em vez de códigos EQ.
Também há duplicatas de Stripflex (mesmo EQ em 2 linhas separadas).

## Causa Raiz
1. Itens antigos no carrinho não têm `moduloLedCode` preenchido (campo adicionado recentemente)
2. O fallback usava `MODULO_${item.moduloLed}` como código — gerando chaves diferentes do EQ real
3. A busca no reverseDescMap era muito rígida (exigia match exato)

## Correções Aplicadas
1. `materialRequisition.ts` — Nova função `resolveEqFromDesc()` com busca robusta:
   - Busca exata normalizada
   - Remove prefixo de quantidade (ex: "2x STRIPFLEX...")
   - Remove sufixo EQ entre parênteses
   - Extrai EQ diretamente se presente na string
   - Busca parcial como último recurso
2. Removido prefixo "MODULO_" e "FITA_LEDBAR_" dos fallbacks — agora usa descrição limpa

## Ainda Falta Verificar
- `orderPreviewGenerator.ts` — buildProfileFonteLuzText e buildLedBarFonteLuzText
  - Já corrigidos anteriormente para incluir EQ
- `orderExcelGenerator.ts` — buildProfileFonteLuzText e buildLedBarFonteLuzText
  - Já corrigidos anteriormente para incluir EQ
- Ficha de produção (productionTemplate.ts) — já inclui EQ via getBarName()

## Arquivos Relevantes
- `/home/ubuntu/led-configurator/client/src/lib/materialRequisition.ts` — lógica de agrupamento
- `/home/ubuntu/led-configurator/client/src/lib/orderPreviewGenerator.ts` — renderização HTML
- `/home/ubuntu/led-configurator/client/src/lib/orderExcelGenerator.ts` — renderização Excel
- `/home/ubuntu/led-configurator/client/src/lib/productionTemplate.ts` — ficha de produção texto
