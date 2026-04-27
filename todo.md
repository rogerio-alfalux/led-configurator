# LED Configurator - TODO

- [x] Inicializar projeto web-db-user
- [x] Configurar tema visual Alfalux (CSS, cores, tipografia dark/light)
- [x] Criar catálogo JSON completo com 12 perfis do Excel (HIT, EASY H PLUS, SKYLINE, BLAZE, etc.)
- [x] Implementar engine calculateComposition() com priorização de maior módulo
- [x] Suporte às 3 potências (18W, 26W, 36W) com lógica barra simples vs dupla
- [x] Seleção automática de drivers por potência (350mA e 500mA)
- [x] Lógica de acendimento independente (D1 ≠ D2 força Independente=Sim)
- [x] Alerta "Driver Remoto Obrigatório" para EASY H PLUS com múltiplos drivers
- [x] Toggle "Permitir Módulos Longos (>2825mm)"
- [x] Formulário com dropdowns: Perfil, Aplicação, Potência, CCT, Tensão, Comprimento
- [x] Card de resumo: Comprimento Realizado vs Solicitado
- [x] Tabela de itens: SKU, Comprimento, Qtd Barras, Qtd Drivers
- [x] Seção de Notas de Engenharia
- [x] Modo dark/light com alternância
- [x] Interface responsiva e profissional
- [x] Testes vitest (15 testes passando)

## Ajustes v1.1 (solicitados pelo usuário)

- [x] Renomear título da ferramenta para "Configurador de Perfis" (manter subtítulo "Alfalux Iluminação")
- [x] Renomear LLP-6060 de "BLAZE" para "BLAZE H" no catálogo e UI
- [x] Garantir que o perfil BLAZE (sem H) não permita aplicação D1+D2 (apenas D1 ou D2)
- [x] Corrigir 18W: usar 350mA (não 500mA) com drivers Philips 19W/44W/65W 350mA em 220Vac
- [x] Adicionar seleção de tensão: 220Vac ou Bivolt
- [x] Quando Bivolt: usar LIFUD 20W 350mA, LIFUD 40W 350mA ou LIFUD 60W 350mA para 18W
- [x] Atualizar testes unitários para refletir as novas regras de drivers

## Ajustes v1.2 (solicitados pelo usuário)

- [x] Remover seletor de tipo de módulo da UI — engine escolhe automaticamente IN/IF/ML ideal
- [x] Engine: algoritmo de seleção automática de módulos misturando IN, IF e ML para melhor composição
- [x] Unificar D1+D2 em bloco único de resultado — um único campo de comprimento total
- [x] Toggle "Acendimento Independente" forçado e bloqueado quando D1 ≠ D2 em potência
- [x] Corrigir nomenclatura: IN = Módulo Inteiro, IF = Início ou Final de Linha, ML = Meio de Linha
- [x] Atualizar testes para refletir nova lógica de seleção automática de módulos

## Correção v1.3 - Lógica correta de módulos IN/IF/ML

- [x] IN só usado como peça única (comprimento total ≤ 5 barras; ≤ 6 com módulos longos habilitados)
- [x] Linhas longas (> limite de barras) devem usar APENAS IF + ML (2 IFs nas pontas + MLs no meio)
- [x] Os 2 IFs devem ser sempre iguais entre si
- [x] Algoritmo IF+ML: testar todas combinações, priorizar menor quantidade de módulos, depois melhor equilíbrio, depois mais próximo sem ultrapassar
- [x] Atualizar testes unitários para cobrir a nova lógica

## Ajustes v1.4 - Campo Instalação e reestruturação de perfis

- [x] Adicionar campo "Instalação" como primeiro parâmetro (Pendente, Sobrepor, Embutir, Arandela)
- [x] Reestruturar catálogo: cada perfil tem variantes por tipo de instalação com SKU/código correto
- [x] EASY PRIME: apenas Embutir
- [x] SKYLINE: Embutir (LLE-2052) ou Pendente D1/D2 nunca D1+D2 (LLP-4536)
- [x] BLAZE: Sobrepor (LLS-3945) só D1, ou Arandela (LLA-5945) D1 ou D2 nunca D1+D2
- [x] BLAZE H: apenas Pendente (LLP-6060)
- [x] MINI BLAZE: Pendente (LLP-3336) ou Sobrepor (LLS-3336), ambas só D1
- [x] HIT: Pendente (LLP-4251) D1/D2/D1+D2, ou Arandela (LLA-3395) D1/D2/D1+D2
- [x] EASY H PLUS: Pendente (LLP-4450) D1/D2/D1+D2, ou Arandela (LLA-4450) D1/D2/D1+D2
- [x] SHARP: Pendente (LLP-4451) D1/D2/D1+D2, ou Arandela (LLA-4451) D1/D2/D1+D2
- [x] SHARP: seletor de difusor por lado (DA/DB/DC) para D1 e D2 independentemente
- [x] FLOW: apenas Pendente (LLP-4825), só D2, sem D1 nem D1+D2
- [x] SOFT: apenas Pendente (LLP-4452), só D1
- [x] SMART MINI: Pendente (LLP-3435) D1/D2 nunca D1+D2, Sobrepor (LLS-3400) só D1, Arandela (LLA-5010) D1/D2 nunca D1+D2
- [x] EASY G: remover da UI (não disponível para venda)
- [x] Filtros dinâmicos: ao selecionar perfil, mostrar apenas instalações disponíveis; ao selecionar instalação, mostrar apenas aplicações válidas
- [x] Atualizar testes unitários para cobrir as novas restrições

## Correção v1.5

- [x] Adicionar BLAZE Embutir (LLE-2810) ao catálogo com módulos extraídos do Excel

## Ajustes v1.6

- [x] Embutir: ocultar seleção de aplicação (sempre D1) e ocultar toggle acendimento independente
- [x] Embutir: driver sempre em ponto remoto
- [x] Tabela: cada SKU com seu próprio driver discriminado (nunca otimizar entre SKUs)
- [x] Nome completo da barra: "Stripflex 562,5 x 10mm 36L [CCT]" variando CCT
- [x] CCT: adicionar 2700K e 5000K, default 3000K
- [x] Regras de driver remoto: embutir, BLAZE H D1+D2, SKYLINE Pendente, MINI BLAZE, SHARP, SOFT (EASY H PLUS nunca remoto)
- [x] 36W: nova opção Stripline 562,5 x 15mm 105L [CCT] a 250mA/75V (apenas barras inteiras 1-5)
- [x] 36W: toggle Stripflex dupla vs Stripline única quando potência = 36W

## Ajustes v1.7 - Banco de Dados de Drivers (Google Sheets)

- [x] Criar endpoint tRPC no servidor para buscar drivers do Google Sheets (CSV export)
- [x] Implementar cache com TTL de 1 hora para evitar requisições excessivas
- [x] Refatorar engine: seleção de driver por tensão de saída calculada, corrente e prioridade
- [x] Exibir código EQ e descrição completa do driver na tabela de resultado
- [x] Suportar BIVOLT com drivers LIFUD (EQ00580/581/582) e 220V com Philips/OSRAM/LIFUD
- [x] Atualizar testes para usar estrutura de driver com código EQ

## Ajustes v1.8 — Atualização Planilha de Drivers

- [x] Filtrar drivers com DISPONÍVEL = NÃO (EQ00236, EQ00232, EQ00494, EQ00104, EQ00459)
- [x] Parsear coluna OBSERVAÇÕES da planilha para extrair regras de seleção
- [x] Implementar regras de faixa de barras para Philips 18W (EQ00346: 1-2 barras, EQ00347: 3-5, EQ00393: 6-7)
- [x] OSRAM IT FIT 75W (EQ00220): restrito a 26W/500mA apenas
- [x] Philips CERTADRIVE 20W (EQ00353): restrito a 26W/500mA, 1 barra, Embutir/remoto, não BLAZE H
- [x] LIFUD Bivolt (EQ00580/581/582): apenas Bivolt, apenas 18W fileira simples ou 36W Stripflex
- [x] Atualizar driverService.ts para parsear coluna DISPONÍVEL e OBSERVAÇÕES
- [x] Atualizar selectDriverFromSheet() para aplicar novas restrições
- [x] Atualizar testes para cobrir novas regras

## v2.2 — Lógica definitiva de drivers v00 (23/04/2026)
- [x] Reescrever selectDriverFallback com lógica v00 por potência/tensão/método
- [x] 18W 220V: 1-2 barras=EQ00346, 3-5=EQ00347, 6-7=EQ00393
- [x] 18W Bivolt: 1-2=EQ00580, 3-4=EQ00581, 5-6=EQ00582
- [x] 36W 220V STRIPFLEX dupla: mesma lógica do 18W 220V (barras físicas, lado a lado)
- [x] 36W 220V STRIPLINE: 0-1=EQ00347, 1-2=EQ00393 (barras inteiras apenas)
- [x] 36W Bivolt STRIPLINE: 0-1=EQ00581, 1-2=EQ00582 (barras inteiras apenas)
- [x] Garantir STRIPLINE só aceita barras inteiras
- [x] Atualizar testes para cobrir todos os casos v00

## v2.3 — Instrução Técnica Alfalux v.01
- [x] Atualizar selectDriverFallback: 18W/36W Dupla 220V: 1-2→EQ00346, 3-5→EQ00347, 6-7→EQ00393 (trava: 65W nunca para ≤5 barras)
- [x] Atualizar selectDriverFallback: 18W Bivolt: 1-2→EQ00580, 3-4→EQ00581, 5-6→EQ00582
- [x] Atualizar selectDriverFallback: Stripline 220V: ≤1→EQ00347 250mA, >1→EQ00393 250mA (inteiro superior)
- [x] Atualizar selectDriverFallback: Stripline Bivolt: ≤1→EQ00581 250mA, >1→EQ00582 250mA (inteiro superior)
- [x] Garantir arredondamento para inteiro superior em Stripline
- [x] Atualizar testes para cobrir todos os cenários v.01

## v2.4 — Lógica de Drivers Alfalux Versão Final 02 (24/04/2026)
- [x] Cenário A 220V: 1.0-2.0→EQ00346, 2.1-5.0→EQ00347, 5.1-7.0→EQ00393
- [x] Cenário B Bivolt: 1.0-2.0→EQ00580, 2.1-4.0→EQ00581, 4.1-6.0→EQ00582
- [x] Cenário C Stripline 220V: exatamente 1→EQ00347 250mA, exatamente 2→EQ00393 250mA
- [x] Cenário D Stripline Bivolt: exatamente 1→EQ00581 250mA, exatamente 2→EQ00582 250mA
- [x] Piso mínimo: se barras < 1.0 assumir 1.0
- [x] Stripline: apenas inteiros (bloquear decimais na lógica)
- [x] Atualizar testes para cobrir gatilhos de faixa (2.0 vs 2.1, 5.0 vs 5.1)

## v2.4 — Logica de Drivers Alfalux Versao Final 02 (24/04/2026)
- [x] Cenario A 220V: 1.0-2.0->EQ00346, 2.1-5.0->EQ00347, 5.1-7.0->EQ00393
- [x] Cenario B Bivolt: 1.0-2.0->EQ00580, 2.1-4.0->EQ00581, 4.1-6.0->EQ00582
- [x] Cenario C Stripline 220V: exatamente 1->EQ00347 250mA, exatamente 2->EQ00393 250mA
- [x] Cenario D Stripline Bivolt: exatamente 1->EQ00581 250mA, exatamente 2->EQ00582 250mA
- [x] Piso minimo: se barras < 1.0 assumir 1.0
- [x] Stripline: apenas inteiros (bloquear decimais na logica)
- [x] Atualizar testes para cobrir gatilhos de faixa (2.0 vs 2.1, 5.0 vs 5.1)

## v2.5 - Logica v01 (24/04/2026)
- [x] 26W: 1-3 barras -> CERTADRIVE (EQ00353) com quantidade multipla; 4-6 barras -> OSRAM (EQ00220)
- [x] 26W: medidas quebradas 1.x -> CERTADRIVE, 2.x/3.x -> CERTADRIVE, 4.x/5.x -> OSRAM
- [x] 26W: bloquear opcao Bivolt na UI (somente 220Vac disponivel)
- [x] 18W/36W: medidas quebradas usam driver do proximo inteiro acima (floor+1)
- [x] Bivolt 18W: medidas quebradas 1.x -> EQ00580, 2.x/3.x -> EQ00581, 4.x/5.x -> EQ00582
- [x] Atualizar testes para cobrir todos os novos cenarios

## v2.7 — Template de Produção Alfalux v.03
- [x] Função generateProductionTemplate que gera o bloco de texto formatado
- [x] Seção "Pedido de Produção" no resultado com textarea e botão copiar
- [x] Template inclui: dados da luminária, composição técnica por módulo, notas de montagem
- [x] Exibir quantidade de barras considerando 36W fileira dupla (barras × 2)
- [x] Exibir divisão de drivers por módulo com código EQ

## v2.8 — Lógica oficial de barras e drivers
- [x] Corrigir CCT duplicado no campo "Barras" do template de produção
- [x] Medidas quebradas 26W: 1.1-1.6 → Certadrive ×1; 1.7-1.8 → erro inválido; 2.0-3.2 → Certadrive ×2
- [x] Restrição HIT: 26W abaixo de 4 barras → erro/aviso
- [x] Observação BLAZE H: driver 26W deve ser desencapado
- [x] Medidas quebradas 18W: 1.x → 19W; 2.x/3.x/4.x → 44W; 5.x → 65W
- [x] Medidas quebradas Bivolt: 1.x → 20W; 2.x/3.x → 40W; 4.x/5.x → 60W

## v2.9 — Divisão obrigatória de circuitos
- [x] Implementar regra de divisão: 18W máximo 3 barras por circuito elétrico
- [x] Driver dimensionado por circuito (não pelo total bruto de barras)
- [x] Exibir circuitos no resultado (ex: "Circuito 1: 3 barras, Circuito 2: 3 barras")
- [x] Restaurar CCT no campo Barras do template de produção
- [x] Atualizar template de produção para listar circuitos e drivers por circuito

## v3.0 — Driver por peça/SKU individual (sem divisão de circuitos)
- [x] Reverter splitIntoCircuits: driver calculado por barra/peça individual (não total bruto)
- [x] Medidas quebradas: 1.x→19W, 2.x/3.x/4.x→44W, 5.x/6.x→65W (por peça)
- [x] Remover exibição de circuitos da tabela de drivers na UI
- [x] Atualizar template de produção: campos "Barras por peça" e "Barras totais"
- [x] Validação: quantidade de drivers = quantidade de peças × driver por peça
- [x] Substituir testes v2.9 (circuitos) por testes v3.0 (driver por peça) — 198 testes passando

## v3.1 — Regra de Otimização de Módulos (Prioridade Absoluta)
- [x] Ordem de decisão: (1) não ultrapassar, (2) minimizar módulos, (3) mais próximo, (4) menos variedade de SKUs, (5) IFs iguais
- [x] Para linhas até 6000mm: testar SEMPRE 2x IF antes de usar ML
- [x] Solução com menos módulos vence mesmo que diferença de comprimento seja maior
- [x] Exemplo: 4000mm → 2x IF 1885mm (3770mm, 2 módulos), NÃO 2x IF 1135 + 1x ML 1695 (3965mm, 3 módulos)
- [x] Atualizar testes para cobrir a nova ordem de prioridade — 204 testes passando

## v3.2 — Regra de Tolerância 250mm para Linhas até 5650mm
- [x] Para comprimentos até 5650mm: testar primeiro 2x IF
- [x] Se diferença (solicitado - realizado) <= 250mm: manter solução com 2 módulos
- [x] Se diferença > 250mm: permitir mais módulos para aproximar melhor a medida
- [x] Nota: no catálogo LLP-4251, 4000mm → 2x IF 1885mm = 3770mm (diff=230mm <= 250mm) → aceita 2 módulos
- [x] Para comprimentos > 5650mm: comportamento padrão (mais próximo, depois menos módulos)
- [x] Atualizar testes v3.1 e adicionar testes v3.2 — 204 testes passando

## v3.3 — Validação da Regra de Tolerância 250mm (exemplo 5000mm)
- [x] Análise: o exemplo do documento refere-se ao BLAZE H (LLP-6060), não ao HIT (LLP-4251)
- [x] Para LLP-6060 com 5000mm: maior IF que cabe é IF 3.8b (2200mm), 2x=4400mm, diff=600mm > 250mm → usa 3 módulos ✅
- [x] Para LLP-4251 com 5000mm: maior IF que cabe é IF 4.2b (2385mm), 2x=4770mm, diff=230mm ≤ 250mm → aceita 2 módulos ✅
- [x] Algoritmo já está correto para ambos os perfis (usa catálogo específico de cada perfil)
- [x] Adicionar testes específicos para LLP-6060 (BLAZE H) cobrindo 4000mm, 4500mm e 5000mm — 214 testes passando

## v3.4 — Correção das Fronteiras de Driver (Regra Absoluta)
- [x] Verificar se o código usa CEIL ou arredondamento para calcular barras
- [x] Reescrever com comparações diretas: bars <= 2.0 → EQ00346; bars <= 5.0 → EQ00347; else → EQ00393
- [x] 5.0 barras usa EQ00347 (44W), nunca EQ00393
- [x] 5.1 barras usa EQ00393 (65W)
- [x] Proibido: 3.8, 4.8, 5.0 barras com EQ00393 — verificado por varredura completa
- [x] Atualizar testes com todos os exemplos obrigatórios do documento — 225 testes passando

## v3.5 — Confirmação de Fronteiras Exatas (0–2.0 / 2.01–5.0 / 5.01–7.0)
- [x] Código usa bars <= 2.0 (EQ00346) e bars <= 5.0 (EQ00347) — fronteiras inclusivas corretas
- [x] Sem Math.ceil, Math.round ou Math.floor no fluxo 18W/36W STRIPFLEX
- [x] Testes para limites exatos: 2.00 → EQ00346; 2.01 → EQ00347; 5.00 → EQ00347; 5.01 → EQ00393
- [x] Varredura completa de 1.0 a 7.0 em passos de 0.1 — 233 testes passando

## v3.6 — DRIVER_LOOKUP como fonte única de verdade
- [x] Incorporar tabela DRIVER_LOOKUP_ALFALUX como constante TypeScript em driverLookup.ts
- [x] Reescrever selectDriverFallback: lookup por (Potencia, Tensao, Tipo_Barra, Barras_Min <= barras <= Barras_Max)
- [x] Retornar ERRO para combinações inválidas (ex: 26W com 1.7-1.99 barras)
- [x] Remover toda lógica hardcoded de if/else para seleção de drivers
- [x] Atualizar testes para validar lookup e cobrir caso de ERRO — 238 testes passando

## v3.6b — Correções da tabela DRIVER_LOOKUP (respostas confirmadas)
- [x] 26W: dividir faixa 2–3.2 em 2.0–2.99 (2x Certadrive) e 3.0–3.2 (3x Certadrive)
- [x] 26W: faixa 4.0–6.0 = OSRAM IT FIT 75W (EQ00220) — sem Certadrive acima de 3.2
- [x] 36W Stripflex: adicionar linhas para 7.01–14 barras (fileira dupla, mesmos drivers)
- [x] 18W: máximo 7 barras — acima disso retorna ERRO
- [x] Stripline: apenas inteiros 1 e 2 — valores quebrados retornam ERRO
- [x] Atualizar testes para refletir o novo comportamento

## v3.6c — Restrição de módulos inválidos para 26W
- [x] Filtrar módulos com barras no gap 3.21–3.99 para 26W (sem driver válido na tabela DRIVER_LOOKUP)
- [x] Filtrar módulos com barras no gap 1.61–1.99 para 26W
- [x] Atualizar testes para cobrir o comportamento de filtragem — 238 testes passando

## v3.7 — Driver por módulo individual (não por total acumulado)
- [x] Corrigir toCompositionItems: driver calculado por barras do módulo individual (barsPerModule = item.barras × barsPerSection)
- [x] Adicionar campo barsPerModule ao CompositionItem (barras de UMA peça, nunca acumulado)
- [x] barsTotal continua acumulando apenas para exibição
- [x] driverPerSku usa barsPerModule, não barsTotal
- [x] buildSkuDriverList usa item.barsPerModule, não item.barsTotal
- [x] Testes v3.7: barsPerPiece nunca excede 7 para 18W, múltiplos módulos têm driver individual — 240 testes passando

## v3.8 — 36W Stripline: regras completas (220V e Bivolt)
- [x] 36W Stripline 220V: 1b=EQ00347, 2b=EQ00393, 3b=EQ00347+EQ00393 (combo), 4b=2×EQ00393, 5b=2×EQ00393+EQ00347
- [x] 36W Stripline Bivolt: 1b=EQ00581, 2b=EQ00582, 3b=EQ00581+EQ00582 (combo), 4b=2×EQ00582, 5b=2×EQ00582+EQ00581
- [x] Suporte a drivers compostos (combo): campo combo?: Array<{code, model, quantity}> adicionado ao SelectedDriver
- [x] Atualizar driverLookup.ts com todas as novas linhas (3, 4 e 5 barras Stripline)
- [x] Atualizar selectDriverFallback para retornar combo quando driverCodigo contém " + "
- [x] Propagar combo de SelectedDriver → DriverSpec → SkuDriverEntry → CompositionResult (campo combo preservado no pipeline completo)
- [x] Testes para todos os casos de Stripline 1–5 barras (220V e Bivolt) — 250 testes passando

## v3.9 — 36W Bivolt Stripflex (fileira dupla)
- [x] Adicionar 36W Bivolt Stripflex: 1-2b=LIFUD 20W (EQ00580), 2.01-4b=LIFUD 40W (EQ00581), 4.01-6b=LIFUD 60W (EQ00582)
- [x] 18W Bivolt Stripflex duplicata na planilha: mantida apenas uma entrada (sem observação) — a segunda entrada com "Fileira dupla" foi ignorada (18W já cobre fileira dupla com as mesmas linhas)
- [x] 26W faixa 3.0-3.2 (3x Certadrive) mantida na tabela (confirmada pelo usuário em versão anterior)
- [x] Testes para 36W Bivolt Stripflex (1, 2, 2.01, 4, 4.01, 6, 7 barras) — 257 testes passando
