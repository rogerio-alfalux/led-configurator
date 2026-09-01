# Validação da estrutura heterogênea da API Alfalux

Consulta somente leitura realizada em 01/09/2026 nos endpoints oficiais:

- `https://alfaluxprod-c8zmg2fn.manus.space/api/products/all`
- `https://alfaluxprod-c8zmg2fn.manus.space/api/componentes/all`

## Contrato publicado

O catálogo retornou 3.603 produtos e expôs os campos estruturais `modoIluminacao`, `semModuloLed`, `moduloRgbw`, `moduloLedRgbw`, `moduloLedRgbwCode`, `qtdModuloLedRgbw`, `moduloTunableWhite`, `moduloLedTunableWhite`, `moduloLedTunableWhiteCode`, `qtdModuloLedTunableWhite`, `moduloLampada`, `lampadaAcessorioId`, `lampada`, `outrosEquipamentos`, `ledModulesExtras`, `driversExtras` e os campos de drivers extras por controle.

Os itens de `outrosEquipamentos` são objetos estruturados com `componentId`, `modelo`, `codigo`, `tipo` e `qtd`. A aplicação deve preservar exatamente esses valores, sem deduzir descrição, código ou quantidade.

## Caso SHIFT confirmado

O produto `LLE-4846.100.18F`, nome `SHIFT E 1020MM ML`, instalação `EMBUTIR`, retornou:

- `temperaturasCor: []`
- `ledModule: null`
- `ledModuleQtd: null`
- `modoIluminacao: "SEM_MODULO_LED"`
- `semModuloLed: true`
- `outrosEquipamentos`: `PCI CONTATO 500MM REV01 (500X26MM)`, código `MP00064`, tipo API `MODULO_LED`, quantidade `2`

Esse componente deve ser tratado funcionalmente como **outro equipamento**, porque a classificação estrutural soberana é o campo `outrosEquipamentos`. Ele deve aparecer na coluna Equipamentos da ficha e ser contabilizado na requisição como `2 × quantidade de luminárias`.

Outras variantes SHIFT ainda retornavam, na mesma consulta, a PCI em campos legados `ledModule2700`/`ledModuleCode2700`. Esses registros não devem ser reinterpretados automaticamente: a aplicação deve obedecer ao campo estrutural efetivamente publicado em cada produto.

## Tunable White e lâmpada

Na consulta realizada, não havia produto com componente Tunable White efetivamente preenchido (`moduloTunableWhite`, descrição, código e quantidade), nem produto com objeto `lampada`/`lampadaAcessorioId` preenchido. Há produtos antigos com `moduloLampada: true`, mas `lampada: null`; portanto eles não autorizam criar ou inferir uma lâmpada.

A implementação deve ficar preparada para os campos publicados: quando `moduloTunableWhite` vier ativo, `TUNABLE WHITE` será a opção de CCT, equivalente ao tratamento de `RGBW`; quando `lampada` vier preenchida, sua descrição, código e quantidade serão preservados como fonte de luz. Campos ausentes ou nulos devem permanecer ausentes, sem fallback comercial ou técnico.
