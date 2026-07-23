# Fix: Requisição de Materiais - Agrupamento Fitas LED

## Problemas identificados no screenshot:
1. EQ00586 (FITA LED 2835 60LEDS/M 24V 5W/M IP20 IRC90 3000K 500LM/M) aparece em DUAS linhas:
   - FITAS LED | EQ00586 | ... | M | 1247.1 (vem do LED BAR, linha 354 do materialRequisition.ts)
   - MÓDULOS LED | EQ00586 | ... | UN | 1386 (vem do bloco profileSegments, linha 271)
   
2. PT001050 (MODULO LUX ROUND 36 LEDS 830-3000K 1800LM D80MM) mostra código do fornecedor em vez de EQ00121

## Causa raiz:
- Linha 271 do materialRequisition.ts força `"un"` e `"MÓDULOS LED"` para TODOS os módulos LED de perfis
- A chave de agrupamento é `${codigo}||${unidade}`, então `EQ00586||m` e `EQ00586||un` não agrupam
- resolveEqFromDesc aceita PT\d+ como código válido (regex na linha 207 original)

## Correção necessária:
1. No bloco profileSegments (linha ~264-272): detectar tipo via `detectTipo()`. Se for "FITAS LED", usar unidade "m" e calcular metragem: `totalMetros = seg.qty * seg.barsPerPiece * itemQty * (seg.lengthMm / 1000)`
2. No bloco luminárias com driverLines (já corrigido acima): usar `detectTipo()` em vez de forçar "MÓDULOS LED"
3. resolveEqFromDesc: já corrigido para não aceitar PT como código EQ

## Campos disponíveis em ProfileSegment:
- seg.lengthMm: comprimento em mm de cada peça
- seg.qty: quantidade de peças
- seg.barsPerPiece: barras por peça
- seg.sku: SKU do perfil
- seg.driverCode, seg.driverModel, seg.driverQtyPerPiece, seg.corrente

## Lógica de conversão para fitas:
- Cada "barra" de Stripflex tem comprimento = seg.lengthMm (que é o comprimento do módulo/barra)
- NÃO! O seg.lengthMm é o comprimento do PERFIL, não da barra individual
- Na verdade, cada barra de Stripflex tem 562.5mm (fixo)
- Melhor abordagem: para fitas LED, contar em METROS usando comprimento fixo da barra (562.5mm por barra)
- Ou melhor: usar o comprimento do perfil (seg.lengthMm) como comprimento total da fita por peça

## Decisão final:
- Para FITAS LED (Stripflex/Stripline/Fita LED): unidade = "m", qty = seg.qty * itemQty * (seg.lengthMm / 1000)
  - Porque a fita cobre todo o comprimento do perfil
- Para MÓDULOS LED (Lux Round, etc.): unidade = "un", qty = seg.qty * seg.barsPerPiece * itemQty
  - Porque são peças discretas

## Sobre o comprimento da fita em luminárias (não perfis):
- Para luminárias com driverLines (downlights, spots), o moduloLed pode ser fita LED
- Nesses casos, a fita é cortada no comprimento interno da luminária
- O campo `description` do produto pode conter o comprimento (ex: "1260mm")
- Alternativa: extrair comprimento da descrição do produto
