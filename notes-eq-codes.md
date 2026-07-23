# Notas: Códigos EQ/CP nos componentes

## Campos EQ/CP disponíveis na API (ApiProduct interface em alfaluxApiAdapter.ts):
- `ledModuleEq2700/3000/4000/5000` — código EQ do módulo LED por CCT
- `ledModuleEq` — código EQ genérico (RGBW, legados)
- `oticaEq` — código EQ da ótica genérica
- `oticaPrimariaEq` — código EQ da ótica primária
- `oticaSecundariaEq` — código EQ da ótica secundária
- `dissipadorEq` — código EQ do dissipador
- `holderEq` — código EQ do holder
- `driver220.code`, `driverBivolt.code`, `driverDim110v.code`, `driverDimDali.code` — código EQ dos drivers

## Onde já aparece:
- productionTemplate.ts: stripflexEq na barra LED (linha 16: `${name} (${stripflexEq})`)
- productionTemplate.ts: driver.code nos drivers (linha 101: `${d.model} (${d.code})`)
- Home.tsx summaryText (linha 790): stripflexEq na barra
- Home.tsx summaryText (linha 797-798): driver.code nos drivers
- materialRequisition.ts: já usa ledModuleCode para agrupar módulos LED

## Onde FALTA:
1. **Resumo dos formatos especiais (ShapeResultCard)** — Home.tsx linhas 2032-2100: 
   - O summaryText não inclui EQ do módulo LED (stripflexEq) — VERIFICAR
   
2. **Resumo dos downlights/spots/painéis** — Home.tsx linhas ~9161-9509:
   - Verificar se inclui EQ dos módulos LED, ótica, dissipador

3. **Cards visuais** — verificar se os componentes (ótica, dissipador, holder) mostram EQ entre parênteses

## Arquivos a modificar:
- client/src/pages/Home.tsx — resumos e cards
- client/src/lib/productionTemplate.ts — já OK para perfis retos
- client/src/lib/materialRequisition.ts — já OK (usa código EQ)
