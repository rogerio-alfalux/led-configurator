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

## v4.0 — Mínimo de 2 barras para módulos IF e ML
- [x] Filtrar módulos com barras < 2 nas composições IF e ML (getModules com parâmetro forComposition=true)
- [x] Módulos < 2 barras permitidos apenas para IN (módulo único inteiro, forComposition=false)
- [x] Constante MIN_BARS_FOR_COMPOSITION = 2 adicionada ao ledEngine.ts
- [x] Atualizar testes para cobrir o novo comportamento — 257 testes passando

## v4.1 — Seletor de Categoria de Produto
- [x] Adicionar type ProductCategory e constante PRODUCT_CATEGORIES com 8 categorias
- [x] Estado productCategory com useState<ProductCategory>("Perfis") como padrão
- [x] Grid 4 colunas com botões de categoria (ícones lucide-react: Layers, Lightbulb, Grid2X2, Focus, Lamp, TreePine, Navigation, Sparkles)
- [x] Categoria "Perfis" ativa — exibe todos os campos de configuração normalmente
- [x] Categorias "em breve" (Downlights, Painéis, Spots, Arandelas, Área Externa, Balizadores, Decorativas): exibem badge "em breve" e toast ao clicar
- [x] Campos de perfil (Perfil, Instalação, Potência, CCT, Tensão, Comprimento, etc.) exibidos apenas quando productCategory === "Perfis"
- [x] Título do header corrigido para "Configurador de Produtos" (h1 no sidebar)
- [x] Rodapé já atualizado para "Configurador de Produtos"
- [x] 257 testes passando (sem regressão)

## Correção — Barras D1+D2 na tabela de composição
- [x] Quando aplicação = D1+D2, o campo "Barras" na tabela de módulos deve exibir barras × 2 (D1 e D2 têm sempre a mesma quantidade de barras)
- [x] Exemplo: 3.4 barras por módulo em D1+D2 → exibir 6.8 barras totais
- [x] Aplicar também no template de produção (campo "Barras por peça" e "Barras totais") — template já trata D1 e D2 como blocos separados (correto)
- [x] Testes: 257 passando, sem regressão (correção é puramente de exibição na UI)

## Correção — Driver D1+D2 sem Acendimento Independente
- [x] Quando D1+D2 e acendimento NÃO independente: usar barsPerModule × 2 para dimensionar o driver (as duas fileiras compartilham o mesmo driver)
- [x] Quando D1+D2 e acendimento independente: manter lógica atual (cada fileira tem seu próprio driver, barras individuais)
- [x] Exemplo: módulo de 3.4 barras em D1+D2 simultâneo → dimensionar driver para 6.8 barras → EQ00393 (65W)
- [x] Exemplo: módulo de 2 barras em D1+D2 simultâneo → dimensionar para 4 barras → EQ00347 (44W)
- [x] Atualizar testes para cobrir D1+D2 simultâneo vs independente (261 testes passando)

## Correção — Split de drivers para D1+D2 simultâneo acima do limite
- [x] Quando D1+D2 simultâneo e barras efetivas > limite máximo de 1 driver: dividir em múltiplos drivers do maior modelo disponível
- [x] Exemplo 18W 220Vac: 8.4 barras → 2× EQ00347 (44W, 4.2 barras cada); 10 barras → 2× EQ00347 (44W, 5 barras cada)
- [x] A divisão deve ser pelo maior driver que cabe (44W para 18W, pois é o maior antes de ERRO)
- [x] Resultado deve ser um combo com N drivers iguais (ex: combo: [{model, code, quantity: 2}])
- [x] Atualizar testes para cobrir os casos de split (266 testes passando, +5 novos)

## Resumo Técnico Copiável (Ficha de Pedido)
- [x] Gerar texto resumo no formato da ficha de pedido Alfalux para a assistente comercial copiar- [x] Formato: "[PRODUTO] [APLICAÇÃO] COM APROXIMADAMENTE [COMPRIMENTO]MM [POTÊNCIA/M] (CONFORME PROJETO). MONTADO COM APROXIMADAMENTE [BARRAS TOTAIS] BARRAS [TIPO BARRA] [CC- [x] Exibir como campo de texto copiável (botão de copiar) no painel de resultado
- [x] Cobrir casos: D1 simples, D1+D2 independente (2 linhas), D1+D2 conjunto (1 linha com barras×2)
- [x] Cobrir drivers com combo (ex: 2× EQ00347) e drivers split (ex: 2× PHILIPS XITANIUM 44W)

## Correção — Resumo para Pedido: barras e drivers por módulo
- [x] Barras e drivers no resumo devem ser por módulo (por peça), não o total da linha
- [x] Exemplo: módulo com 3.4 barras e 1 driver → exibir "3,4 BARRAS ... + 1X DRIVER", não "20,4 BARRAS ... + 6X DRIVER"

## Correção — Resumo para Pedido: comprimento por módulo
- [x] O comprimento na linha 1 do resumo deve ser o comprimento do módulo (por peça), não o total da linha

## Melhoria — Resumo para Pedido: um bloco por módulo com quantidade
- [x] Gerar um bloco "Item N" para cada SKU distinto da composição
- [x] Exibir quantidade de peças na frente: "2 x BLAZE H PENDENTE COM 2260MM 18W/M (LLP-6060.4IF.48F)"
- [x] Cada bloco tem sua própria linha 2 com barras e driver por peça

## Melhoria — Resumo: aplicação (D1/D2/D1+D2) no nome do produto
- [x] Inserir a aplicação (D1, D2 ou D1 + D2) no nome do produto no resumo
- [x] Somente quando installType for PENDENTE ou ARANDELA (não para EMBUTIR/SOBREPOR)
- [x] Exemplo: "2 x BLAZE H D1 + D2 PENDENTE COM 2075MM 18W/M + 18W/M (LLP-6060.35F.48F)"

## Melhoria — Resumo: indicar acendimento independente/simultâneo para D1+D2
- [x] Quando D1+D2 em Pendente ou Arandela, adicionar " - Acendimento Independente" ou " - Acendimento Simultâneo" ao final da linha de montagem

## Correção — Resumo D1+D2 Independente: bloco único com dados somados
- [x] Para D1+D2 independente, gerar um único bloco (não dois separados)
- [x] Barras = barsPerPiece D1 + barsPerPiece D2 (soma das duas fileiras)
- [x] Drivers = drivers D1 + drivers D2 somados (ex: 1X D1 + 1X D2 = 2X mesmo modelo)
- [x] Nome: "D1 + D2" no produto; sufixo: "- Acendimento Independente"

## Funcionalidade — Modo "Somente Barras Inteiras" (padrão)
- [x] Por padrão, o motor deve usar apenas módulos com barras inteiras (barsPerModule === inteiro: 1, 2, 3, 4, 5...)
- [x] Botão toggle "Considerar Medidas Quebradas" logo abaixo do campo "Comprimento Total"
- [x] Quando ativado, libera módulos com barras decimais (1.1, 1.2, 3.4, 4.2 etc)
- [x] Quando desativado (padrão), filtra o catálogo para usar apenas módulos com barsPerModule inteiro
- [x] Adicionar parâmetro allowFractional: boolean na interface de entrada do ledEngine
- [x] Atualizar testes para cobrir ambos os modos

## Funcionalidade — Modo "Somente Barras Inteiras" + botão "Considerar Medidas Quebradas" (29/04/2026)
- [x] Adicionar parâmetro allowFractional na interface ConfigInput (padrão false)
- [x] Filtrar módulos com barras decimais quando allowFractional=false (getModules)
- [x] Propagar allowFractional corretamente em toda a cadeia: calculateComposition → buildComposition → tryInSingle → buildIfMlComposition → getModules
- [x] Adicionar botão toggle "Considerar Medidas Quebradas" na UI, logo abaixo do campo Comprimento Total
- [x] Quando desativado (padrão): usar apenas módulos com 1, 2, 3, 4, 5 barras (inteiros)
- [x] Quando ativado: usar todos os módulos (incluindo decimais como 1.1, 1.4, 3.4 etc)
- [x] Atualizar testes para cobrir os dois modos (266 passando)

## Funcionalidade — Resumo Para Orçamento (29/04/2026)
- [x] Criar função generateQuoteSummary em novo arquivo quoteSummary.ts
- [x] Formato: "[NOME] [SUFIXO] [POTÊNCIA]W - Medida Total: [TOTAL]mm - Item 1: [QTD] x [NOME] [SUFIXO] [POTÊNCIA]W - [COMP]mm [TIPO], ..."
- [x] Sufixo de instalação: Embutir=E, Sobrepor=S, Pendente=P, Arandela=A
- [x] Tipo do módulo: IF, ML ou IN (sem barras, sem driver, sem CCT)
- [x] Exibir como card "Resumo Para Orçamento" logo acima do "Resumo para Pedido"
- [x] Botão de copiar no card

## Categoria Downlights (29/04/2026)

- [x] Criar catálogo downlightCatalog.ts com os 7 produtos da planilha (LUNA PP 6,5W, LUNA PP 13W, LUNA P 13W, LUNA G 17W, LUNA G 26W, LUNA GG 26W, LUNA GG 36W)
- [x] Função calculateDownlight() integrada no próprio downlightCatalog.ts (engine simples: seleção de driver por tensão)
- [x] Habilitar botão "Downlights" na grade de categorias (available: true, sem badge "em breve")
- [x] Criar UI de configuração para Downlights: produto, tensão (220V/Bivolt), CCT, quantidade
- [x] Criar UI de resultado para Downlights: produto, módulo LED, driver, cód. EQ, tensão, CCT, quantidade
- [x] Card "Resumo Para Orçamento" para Downlights com botão de copiar
- [x] Card "Resumo Para Pedido" para Downlights com botão de copiar
- [x] Estado vazio de Downlights (antes do cálculo)
- [x] Painel de Perfis ocultado quando categoria = Downlights (e vice-versa)
- [x] Escrever testes unitários para calculateDownlight() (11 testes — 277 total passando)

## Ajustes Downlights v1.1 (29/04/2026)

- [x] Tensão obrigatória: bloquear botão "Calcular Downlight" se tensão não foi selecionada (estado inicial sem seleção)
- [x] Remover campo "Quantidade" do painel de configuração de Downlights
- [x] Reformatar Resumo Para Pedido: "[PRODUTO] montada com MÓDULO LED [MÓDULO] [CCT] + DRIVER: [DRIVER] ([EQ])"

## Atualização Drivers Downlights v1.2 (29/04/2026)

- [x] LUNA PP LED 6,5W RE ABS: driver220 → LIFUD 13W 350MA BIVOLT (EQ00236)
- [x] LUNA PP LED 13W RE ABS: driver220 → LIFUD 13W 350MA BIVOLT (EQ00236)
- [x] LUNA P LED 13W RE: driver220 → PHILIPS XITANIUM 19W 350MA (EQ00346); driverBivolt → LIFUD 13W 350MA BIVOLT (EQ00236)
- [x] Módulo LED: "[CCT]" removido do campo ledModule (CCT já concatenado em ledModuleWithCCT)
- [x] Testes atualizados — 17 testes de Downlights, 283 total passando

## Ajustes Downlights v1.3 (29/04/2026)

- [x] Adicionar campo SKU em DownlightProduct e popular no catálogo (7 produtos)
- [x] Estado inicial dlProductIndex: null (sem produto selecionado por padrão)
- [x] Bloquear cálculo se produto não selecionado (aviso âmbar + botão desabilitado)
- [x] Resumo Para Pedido: "CÓDIGO: [SKU]\n[PRODUTO] [CCT] MONTADA COM MÓDULO LED [MÓDULO] [CCT] + 1x DRIVER [DRIVER] ([EQ])"
- [x] Testes atualizados — 22 testes de Downlights, 288 total passando

## Reestruturação Downlights v2.0 (06/05/2026)

- [x] Gerar downlightCatalog.ts com 156 produtos, campos: instalacao, familia, sku, produto, holder, otica, dissipador, modulo, driver220, driverBivolt
- [x] Fluxo de seleção: Instalação → Família → Produto (cada seleção filtra a próxima)
- [x] Resetar família e produto ao trocar instalação; resetar produto ao trocar família
- [x] Resumo Para Pedido: CÓDIGO + PRODUTO CCT TENSÃO MONTADA COM MÓDULO + ÓTICA + HOLDER + DISSIPADOR + DRIVER (omitir campos null/NÃO APLICÁVEL)
- [x] Resumo Para Orçamento Downlights: PRODUTO CCT TENSÃO (em maiúsculas)
- [x] Testes atualizados — 19 testes de Downlights, 285 total passando

## Correção Resumo Para Pedido (06/05/2026)

- [x] Remover "MÓDULO LED" duplicado: prefixo inteligente (startsWith) evita duplicação para MYRO e LUNA SPOT COB
- [x] Remover traço final " - " no Resumo Para Pedido (regex trim no final da string)

## Otimização ledEngine v3.3 — Maximizar Módulos Maiores (07/05/2026)

- [x] Algoritmo v3.3: preferência por limpeza em linhas longas (tolerância proporcional 0,2% do comprimento, mín 30mm, máx 100mm)
- [x] Caso BLAZE 42330mm: resultado agora é 2x LLE-2810.5IF.18F + 13x LLE-2810.5ML.18F (2 SKUs, 15 módulos)
- [x] Limite de módulos padrão ajustado de 2825mm para 2840mm (inclui IF-5 do BLAZE embutir 2835mm)
- [x] Novo teste v3.3 para o caso BLAZE 42330mm — 286 testes passando

## Foto do Produto no Resultado (07/05/2026)

- [x] Upload da imagem BLAZE embutir para storage do projeto (/manus-storage/BLAZEE_58697a4b.png)
- [x] Criar mapeamento profileCode → URL da foto em profilePhotos.ts (preparado para todos os perfis)
- [x] Exibir foto do produto no card "Resumo da Configuração" quando disponível (h-48, object-contain)
- [x] Fallback elegante: quando não há foto, o card não exibe o bloco de imagem (sem espaço vazio)

## Layout Foto no Resumo (08/05/2026)

- [x] Quando há foto: layout horizontal — foto quadrada à esquerda (w-40) + grid 2×2 de métricas à direita (mesma altura)
- [x] Quando não há foto: manter grid 2×4 original sem alteração

## Fotos de Produtos — Leva 1 (08/05/2026)

- [x] Upload de 33 imagens de perfis (BLAZE E/A/S, BLAZE H P, MINI BLAZE P/S, HIT P/A, EASY H PLUS P, EASY PRIME E, SKYLINE E/P, SHARP A/P com todas as combinações de difusor)
- [x] Upload de 7 imagens de Downlights (EASY LED POINT 1X1, 1X3, 1X6, 2X6, 3X3, 3X6, 4X6)
- [x] profilePhotos.ts atualizado: mapeamento simples por código (12 perfis) + SHARP por código+D1+D2 (22 variantes) + Downlights por família+produto (7 variantes)
- [x] getDownlightPhoto() adicionada ao profilePhotos.ts
- [x] Foto exibida no card de resultado de Downlights (layout horizontal: foto + grid 2x2 quando há foto)
- [x] getProfilePhoto() atualizada para aceitar diffuserD1/D2 e selecionar foto correta do SHARP

## Correção Fotos AURA e EASY LED POINT (08/05/2026)

- [x] Corrigir chave AURA: "AURA P QE 5W" → "AURA P QE 5W IP54" e "AURA P RE 5W" → "AURA P RE 5W IP54"
- [x] Corrigir chave EASY LED POINT 1X1: potência 2W (não 3W) e º unicode (\u00ba)
- [x] Corrigir todas as chaves EASY LED POINT: substituir ° por º (\u00ba) e ORIENTÁVEL por ORIENTÁVEL (\u00c1)

## Preço por Metro no Resumo Para Orçamento (08/05/2026)

- [x] Criar tabela PRICE_PER_METER em quoteSummary.ts mapeando profileCode → preço/m (começando com LLE-2810 = R$ 340,00)
- [x] Função getPricePerMeter(profileCode) retorna número ou null se não cadastrado
- [x] generateQuoteSummary: calcular preço total = (realizedLength / 1000) × pricePerMeter quando disponível
- [x] Adicionar linha "Preço Total: R$ X.XXX,XX" ao final do texto do resumo quando há preço cadastrado
- [x] Formatar valor em pt-BR (ex: R$ 3.400,00) usando Intl.NumberFormat
- [x] Testes unitários para o cálculo de preço (com e sem preço cadastrado)

## Correções UI e Imagens (11/05/2026)

- [x] Remover duplicação de CCT/Tensão no resultado do Downlight (aparecem no grid 2x2 com foto E no bloco abaixo)
- [x] Remover preço calculado do BLAZE E do Resumo Para Orçamento (temporário)
- [x] Substituir ícones do grid 2x4 de categorias por imagens reais fornecidas pelo usuário
- [x] Adicionar fotos ORIENTE (6 produtos) ao profilePhotos.ts
- [x] Adicionar fotos POLAR (2 produtos) ao profilePhotos.ts

## Botão "Ajustar para medida maior" (14/05/2026)

- [x] Adicionar flag `adjustToLarger` ao tipo ConfigInput do motor de cálculo (ledEngine)
- [x] Implementar lógica no ledEngine: quando `adjustToLarger=true` e a medida desejada não cabe em nenhuma combinação de módulos inteiros, forçar para o próximo módulo acima (ex: 1120mm → 1155mm IN)
- [x] Adicionar checkbox/toggle "Ajustar para medida maior" abaixo de "Considerar medidas quebradas" na UI (desativado por padrão)
- [x] Exibir aviso no resultado quando `adjustToLarger=true` e o ajuste foi aplicado: "Atenção: a medida foi ajustada para mais. Verifique no projeto se o espaço comporta esse ajuste e se não há risco de colisão com paredes ou outros elementos."
- [x] Testes unitários para a lógica de ajuste para cima no ledEngine

## Planilha LOOKUP R01 + Campo Controle (14/05/2026)

- [x] Atualizar downlightCatalog.ts com dados da planilha R01 (156 produtos, drivers ON/OFF 220V e Bivolt atualizados)
- [x] Criar painelCatalog.ts com 50 produtos da aba PAINÉIS (famílias: ALE-2462, ALS-3462, BOX LED E, LUMIGRID E/S, ORBIT E/S/P, ALE-2750, ALS-3750, ALE-2420, ALS-3420, ALE-2103, ALE-2118, ALE-2140, ALE-2430, ALE-2142, OFFICE COMFORT, PRISMA)
- [x] Adicionar campo `controle` (tipo ControleType = "ON/OFF" | "DIM 1-10V" | "DIM DALI") ao tipo DownlightProduct e PainelProduct
- [x] Adicionar caixa de seleção "Controle" na UI de Downlights e Painéis, logo acima do campo "Tensão"
- [x] Apenas "ON/OFF" habilitado por enquanto; "DIM 1-10V" e "DIM DALI" desabilitados (colunas ainda vazias na planilha)
- [x] Habilitar categoria "Painéis" no grid de categorias (remover badge "em breve")
- [x] Criar UI de configuração para Painéis: Instalação → Família → Produto (mesmo padrão dos Downlights)
- [x] Criar UI de resultado para Painéis: módulo LED, driver, resumo para orçamento e pedido
- [x] Atualizar testes unitários para cobrir Painéis e o novo campo Controle

## Novos Produtos Painéis + Fotos (14/05/2026)

- [x] Extrair BOX LED S 36W e BOX LED S 36W RTG da planilha R01 e adicionar ao painelCatalog.ts
- [x] Fazer upload das 23 fotos de Painéis para o storage do projeto
- [x] Criar função getPainelPhoto() em profilePhotos.ts com mapeamento familia→URL
- [x] Exibir foto do produto no card de resultado de Painéis (mesmo padrão dos Downlights)
- [x] Atualizar testes de painelCatalog.ts para 52 produtos

## Preços por Metro Linear (09/05/2026)

- [x] Criar priceCatalog.ts com tabela de preços ON/OFF 220V por perfil e potência
- [x] Calcular preço total (metros × preço/m) na função de resultado do perfil linear
- [x] Exibir preço total no card Resumo para Orçamento (somente quando ON/OFF e 220V)
- [x] Não exibir preço/m, somente o valor total calculado
- [x] Testes unitários para o cálculo de preço

## Integração com API Alfalux (15/05/2026)

- [x] Criar procedure tRPC `alfalux.products` no servidor que faz proxy para a API Alfalux (paginação automática: 2 páginas de 200)
- [x] Criar adaptador `alfaluxApiAdapter.ts` que converte o formato da API para os tipos internos (DownlightProduct, PainelProduct)
- [x] Usar `trpc.alfalux.products.useQuery` com cache de 5 minutos e fallback para catálogos estáticos
- [x] Atualizar UI de Downlights para usar dados dinâmicos da API (badge verde "Dados ao vivo" + contagem)
- [x] Atualizar UI de Painéis para usar dados dinâmicos da API (badge verde "Dados ao vivo" + contagem)
- [x] Testes unitários para o adaptador de API (17 testes)

## Categoria Spots (15/05/2026)

- [x] Inspecionar dados de Spots na API (3 produtos ZEUS: 10°, 24°, 36°)
- [x] Criar spotCatalog.ts com tipos SpotProduct, SpotInput, SpotResult e função calculateSpot
- [x] Atualizar alfaluxApiAdapter.ts para mapear categoria SPOTS → SpotProduct
- [x] Habilitar categoria "Spots" no grid (available: true)
- [x] Implementar UI de Spots: Instalação → Família → Produto → Controle → Tensão → CCT → Calcular
- [x] Implementar card de resultado de Spots: módulo LED, ótica, holder, driver, foto
- [x] Implementar Resumo para Orçamento e Resumo para Pedido de Spots
- [x] Badge "Dados ao vivo" na UI de Spots
- [x] Testes unitários para spotCatalog.ts (13 testes)

## Correção Foto Spots (15/05/2026)

- [x] Verificar fotoUrl dos produtos ZEUS na API (caminho relativo /manus-storage/...)
- [x] Corrigir normalizeFotoUrl no adaptador: prefixar com https://alfaluxprod-c8zmg2fn.manus.space quando for caminho relativo
- [x] Aplicado para downlightFotos, painelFotos e spotFotos

## Proxy de Imagem (15/05/2026)

- [x] Criar endpoint GET /api/image-proxy?url=... no servidor Express (segue redirects CloudFront, retorna imagem diretamente)
- [x] Atualizar normalizeFotoUrl para usar /api/image-proxy?url=... em vez de URL direta

## Ocultar Preço Perfis + Planilha Importação (15/05/2026)
- [x] Ocultar exibição do preço total no card Resumo para Orçamento dos perfis lineares (manter lógica, só esconder UI)
- [x] Gerar planilha Excel de perfis no padrão da API Alfalux para importação futura

## Spots — Correção paginação API + verificação fluxo (16/05/2026)
- [x] Corrigir alfaluxApiService.ts: loop de paginação completo (busca todas as páginas até esgotar, antes só buscava 3 páginas = 600 produtos, SPOTS estão no offset 800)
- [x] Confirmar que Spots já está available: true na lista de categorias
- [x] Confirmar que activeSpotCatalog já usa dados da API (adaptedCatalogs?.spots)
- [x] Confirmar que o adaptador já filtra categoria === "SPOTS"
- [x] Confirmar que a UI de seleção e resultado de Spots já está implementada

## Perfis via API com fallback estático (16/05/2026)
- [x] Inspecionar estrutura dos perfis PERFIS na API e mapear campos para ledCatalog
- [x] Criar profileApiAdapter.ts: converte AlfaluxProduct (categoria=PERFIS) para estrutura do ledCatalog
- [x] Adicionar activeProfileCatalog no Home.tsx: usa API quando disponível, fallback para LED_CATALOG estático
- [x] Garantir que toda a lógica de cálculo (ledEngine, driverSelector, quoteSummary) continue funcionando
- [x] Testar fallback: API retorna null/vazio → LED_CATALOG estático é usado automaticamente
- [x] Badge "ao vivo" no header e footer quando perfis vierem da API; "(local)" quando fallback
- [x] 15 testes unitários para profileApiAdapter.ts (381 total passando)

## Badge de status nos Perfis (16/05/2026)
- [x] Adicionar badge "X variantes • Dados ao vivo" (verde) / "Catálogo local" (cinza) no bloco de Perfis, igual ao padrão das outras categorias

## Correção: usar SKU como chave única na seleção de produtos (17/05/2026)
- [x] Substituir productIndex por productSku em PainelInput/calculatePainel (painelCatalog.ts)
- [x] Substituir productIndex por productSku em DownlightInput/calculateDownlight (downlightCatalog.ts)
- [x] Substituir productIndex por productSku em SpotInput/calculateSpot (spotCatalog.ts)
- [x] Atualizar Home.tsx: estados dlProductIndex→dlProductSku, panelProductIndex→panelProductSku, spotProductIndex→spotProductSku
- [x] Cache local: servidor não persiste cache entre reinicializações (997 produtos recarregados a cada start)
- [x] Atualizar testes unitários para usar sku em vez de productIndex (381 testes passando)

## Bug: Driver ausente no resultado de Painéis (17/05/2026)
- [x] Diagnosticar: todos os 38 Painéis na API têm driverOnoff220 vazio; adaptador agora usa fallback do catálogo estático quando driver da API está vazio
- [x] Corrigir toPainelProduct no alfaluxApiAdapter.ts: busca driver por SKU no PAINEL_CATALOG estático quando API retorna string vazia
- [x] Verificado no browser: OFFICE COMFORT 1X6 32W exibe driver PHILIPS XITANIUM 44W 350MA (EQ00347)
- [x] Atualizar testes unitários (381 testes passando)

## Feature: DIM DALI e DIM 1-10V via API para Perfis (18/05/2026)
- [x] Verificado: API retorna driverDimDali preenchido para 260 produtos de PERFIS
- [x] profileApiAdapter.ts: popula driverDimDali e driverDim110v por perfil (primeiro valor não nulo)
- [x] ledCatalog.ts: adicionados campos driverDimDali e driverDim110v na interface ProfileVariant
- [x] ledEngine.ts: adicionado ControlType, controlType no ConfigInput e CompositionResult
- [x] Home.tsx: seletor Tipo de Controle exibido apenas quando API retornar driver DIM disponível
- [x] Home.tsx: driver DIM exibido no resumo do resultado com destaque âmbar
- [x] 381 testes passando após implementação

## Correções DIM DALI + JSX (18/05/2026)
- [x] ledEngine.ts: adicionado campo `catalog?: Record<string, ProfileVariant>` na interface ConfigInput (estava faltando, causava TS2339)
- [x] ledEngine.ts: calculateComposition usa `activeCatalog = input.catalog ?? LED_CATALOG` para ler driverDimDali da API
- [x] Home.tsx: botão ON/OFF agora exibido em maiúsculas (ON/OFF)
- [x] Home.tsx: corrigido erro JSX causado por `hover:bg-muted/50` em template literal — substituído por array de classes com `.join(" ")`
- [x] 381 testes passando, 0 erros TypeScript

## Correção: driverDimDali como objeto { model, code } (18/05/2026)
- [x] Corrigir alfaluxApiService.ts: interface AlfaluxProduct deve ter driverDimDali e driverDim110v como `{ model: string; code: string | null } | null` em vez de `string | null`
- [x] Corrigir alfaluxApiService.ts: mesma correção para driverOnoff220 e driverOnoffBivolt (também são objetos na API externa)
- [x] Corrigir ApiProduct em alfaluxApiAdapter.ts: mesma mudança de tipo para driverDimDali e driverDim110v
- [x] Corrigir profileApiAdapter.ts: ler `p.driverDimDali?.model` em vez de `p.driverDimDali`
- [x] Corrigir alfaluxApiAdapter.ts: ler `p.driverOnoff220?.model` para downlights/painéis/spots
- [x] Atualizar testes do profileApiAdapter para usar o formato de objeto
- [x] Atualizar testes do alfaluxApiAdapter para usar o formato de objeto

## Migração para /api/products/all com DriverInfo (18/05/2026)
- [x] alfaluxApiService.ts: migrado para /api/products/all, interface AlfaluxProduct com DriverInfo { model, code } | null
- [x] alfaluxApiAdapter.ts: interface ApiProduct atualizada para o novo formato (name, ledModule, driver220/driverBivolt/driverDim110v/driverDimDali como DriverInfo | null, temperaturasCor como string[])
- [x] profileApiAdapter.ts: usa p.name em vez de p.produto; variantMap tipado com DriverInfo | null
- [x] ledCatalog.ts: driverDimDali e driverDim110v em ProfileVariant agora são { model, code } | null
- [x] ledEngine.ts: driverDimDali e driverDim110v em ConfigInput e driverDimSelected em CompositionResult agora são { model, code } | null
- [x] Home.tsx: exibição de driverDimSelected usa .model do objeto DriverInfo
- [x] alfaluxApiAdapter.test.ts: reescrito para o novo formato ApiProduct
- [x] profileApiAdapter.test.ts: reescrito para o novo formato ApiProduct (name, DriverInfo)
- [x] 385 testes passando, 0 erros TypeScript

## Correções Painéis DIM DALI + ledModule CCT + SKU duplicado (18/05/2026)
- [x] painelCatalog.ts: adicionar driverDimDali e driverDim110v na interface PainelProduct
- [x] alfaluxApiAdapter.ts: mapear driverDimDali e driverDim110v em toPainelProduct
- [x] painelCatalog.ts: calculatePainel concatena CCT ao ledModule (ex: "4x Stripflex ... 3000K")
- [x] Home.tsx: seletor de controle de Painéis — isAvailable verifica driverDimDali/driverDim110v do produto selecionado
- [x] Home.tsx: seletor de produto de Painéis usa índice global como value para distinguir produtos com SKU duplicado
- [x] Home.tsx: calculatePainel busca produto pelo índice quando há SKUs duplicados

## Correções Painéis: DIM DALI + SKU duplicado + ledModule CCT (18/05/2026)
- [x] painelCatalog.ts: adicionados campos driverDim110v e driverDimDali (PainelDriver | null) na interface PainelProduct
- [x] painelCatalog.ts: adicionados driverDim110v: null, driverDimDali: null em todas as 52 entradas do catálogo estático
- [x] painelCatalog.ts: calculatePainel seleciona driver DIM DALI/1-10V quando controle !== ON/OFF
- [x] painelCatalog.ts: ledModuleWithCCT concatena CCT ao ledModule (ex: "4x Stripflex ... 3000K")
- [x] painelCatalog.ts: PainelInput aceita productIdx opcional para distinguir produtos com SKU duplicado
- [x] alfaluxApiAdapter.ts: toPainelProduct mapeia driverDim110v e driverDimDali da API
- [x] Home.tsx: seletor de Painéis usa panelProductIdx (índice global) em vez de panelProductSku para evitar ambiguidade com SKUs duplicados
- [x] Home.tsx: SelectItem de Painéis exibe "Nome — SKU" e usa índice global como value
- [x] Home.tsx: botões de controle DIM DALI/1-10V habilitados quando produto selecionado tem driver disponível
- [x] Home.tsx: panelControle resetado para ON/OFF ao trocar de produto
- [x] 388 testes passando, 0 erros TypeScript

## Identificação por SKU+Nome em todas as categorias (18/05/2026)
- [x] Definir chave composta `sku::name` como identificador único de produto em Painéis, Downlights e Spots
- [x] Home.tsx: Painéis — substituir panelProductIdx por panelProductKey (string "sku::name"); atualizar SelectItem, verificações de driver e chamada de calculatePainel
- [x] Home.tsx: Downlights — substituir identificação por SKU puro por "sku::name"
- [x] Home.tsx: Spots — substituir identificação por SKU puro por "sku::name"
- [x] painelCatalog.ts: calculatePainel busca produto por sku+name quando productName fornecido
- [x] downlightCatalog.ts: calculateDownlight busca produto por sku+name quando productName fornecido
- [x] spotCatalog.ts: calculateSpot busca produto por sku+name quando productName fornecido
- [x] 388 testes passando, 0 erros TypeScript

## Correções Seletor + DIM DALI Painéis (18/05/2026)
- [x] Home.tsx: SelectItem de Downlights, Painéis e Spots exibe apenas o nome (SKU removido da UI, mantido internamente como sku::name)
- [x] Home.tsx: Painéis — seletor corrigido para usar sku::name como value (era índice numérico, causava falha no cálculo e no DIM DALI)
- [x] Botão Calcular Painél: corrigido — o find por sku+name agora funciona corretamente
- [x] DIM DALI para Painéis: API agora retorna driverDimDali para 33 dos 52 painéis — botão DIM DALI habilitado corretamente

## Correções [CCT] + DIM DALI Painéis (18/05/2026)
- [x] alfaluxApiAdapter.ts: toPainelProduct remove [CCT] do ledModule (igual ao toSpotProduct)
- [x] Home.tsx: cache do cliente reduzido para 1 minuto + refetchOnWindowFocus habilitado para dados frescos
- [x] alfaluxApiAdapter.test.ts: 3 novos testes para remoção de [CCT] e mapeamento de driverDimDali em Painéis
- [x] 391 testes passando, 0 erros TypeScript

## Tensão bloqueada para DIM DALI/1-10V (18/05/2026)
- [x] Home.tsx: Bivolt desabilitado quando controle DIM DALI ou DIM 1-10V está selecionado e o driver não contém "bivolt" na descrição
- [x] Home.tsx: ao clicar em DIM DALI/1-10V, tensão é automaticamente revertida para 220V se o driver DIM não suportar bivolt
- [x] Mensagem de aviso "Driver DIM selecionado é somente 220V." exibida quando usuário tenta selecionar Bivolt com controle DIM
- [x] 391 testes passando, 0 erros TypeScript

## CCT por produto (18/05/2026)
- [x] DownlightProduct: campo ccts adicionado ao tipo e a todos os 156 itens do catálogo estático
- [x] PainelProduct: campo ccts adicionado ao tipo e a todos os 52 itens do catálogo estático
- [x] alfaluxApiAdapter.ts: toDownlightProduct e toPainelProduct mapeiam temperaturasCor para ccts
- [x] Home.tsx: Downlights e Painéis exibem apenas os botões de CCT disponíveis para o produto selecionado
- [x] Home.tsx: ao trocar produto em Downlights, Painéis e Spots, CCT é resetado para o primeiro valor disponível se o CCT atual não for suportado
- [x] 391 testes passando, 0 erros TypeScript reais

## LED BAR — Nova família em Perfis (19/05/2026)
- [x] Inspecionar estrutura da API para produtos LED BAR (potência, difusor, drivers)
- [x] Criar tipo LedBarProduct no adaptador (potência W/m, difusor DA/DB/DC, driverOnOff, driverDim010v, driverDimDali)
- [x] Remover [CCT] do ledModule no adaptador para LED BAR
- [x] Criar função calculateLedBar: comprimento → cortes → fonte por trecho
- [x] Lógica de cortes: comprimento ≤ 3000mm → 1 trecho; > 3000mm → exigir nCortes, dividir igualmente
- [x] Tensão 110V / 220V / Bivolt (drivers 0-10V são monovolt: 110V ou 220V separados, não bivolt automático)
- [x] UI: após selecionar LED BAR, mostrar seletor de potência (5/10/25 W/m)
- [x] UI: após potência, mostrar seletor de difusor (DA/DB/DC)
- [x] UI: campo de comprimento (mm), campo de cortes (aparece obrigatório se comprimento > 3000mm)
- [x] UI: seletor de controle (ON/OFF, DIM 0-10V, DIM DALI) baseado nos drivers do produto
- [x] UI: seletor de tensão 110V / 220V / Bivolt (Bivolt bloqueado para drivers 0-10V monovolt)
- [x] Resumo para orçamento e pedido com cortes, comprimento por trecho, fonte por trecho
- [x] Testes unitários para calculateLedBar e adaptador LED BAR (34 testes)

## allowMixedIF — Otimizar com IFs Diferentes (19/05/2026)
- [x] ConfigInput: campo allowMixedIF?: boolean adicionado
- [x] CompositionResult: compositionMode agora inclui "IF_ML_MIXED"
- [x] ledEngine.ts: função buildIfMlCompositionMixed() — testa todos os pares (IF1 ≠ IF2) + MLs, escolhe menor remainingLength
- [x] buildComposition: parâmetro allowMixedIF=false; quando true, testa mixed e usa se for melhor que IF_ML_LINE
- [x] calculateComposition: extrai allowMixedIF do input e passa para buildComposition
- [x] Nota de engenharia: "⚠️ IFs diferentes nas pontas — estética menos uniforme (otimização de comprimento ativa)."
- [x] Home.tsx: toggle "Otimizar com IFs Diferentes" com aviso de estética menos uniforme
- [x] 7 novos testes unitários para allowMixedIF (432 testes totais, 0 erros TypeScript reais)
- [x] Corrigir exibição dos perfis BAGEO que não aparecem nas opções de perfis
- [x] Implementar campo de busca rápida por produtos no topo do configurador com sugestões em tempo real

## v3.x — BAGEO como perfil linear com preço
- [x] Reestruturar BAGEO como perfil linear com entrada de comprimento e cálculo por metro
- [x] Integrar preços do BAGEO da API no resumo de orçamento
- [x] Ajustar dropdown de perfil: família BAGEO → instalação → modelos disponíveis

## v4.x — Reestruturação BAGEO como perfil linear (26/05/2026)

- [x] Ocultar card vazio superior quando BAGEO está selecionado
- [x] Corrigir mapeamento de preço da API (tentar precoOnOff220/precoOnOffBivolt/precoDim110v/precoDimDali e fallback para custo*)
- [x] Ajustar engine: 1 fonte a cada 2300mm (Math.ceil), fitaMetros = ledModuleQtd × metros
- [x] Atualizar UI: Fita LED mostra qtd/metro → total em metros; Fonte mostra "1 a cada 2300mm → Nx"
- [x] Atualizar resumo para pedido: inclui metragem de fita e quantidade de fontes
- [x] Atualizar testes: fitaMetros, driverQtd por 2300mm, teste para 56000mm (112m fita, 25 fontes)
- [x] 490 testes passando (zero erros TypeScript)

- [x] Mapear campos de preço da API BAGEO: precoOnOff220, precoOnOffBivolt, precoDim110v, precoDimDali
- [x] Atualizar toBageoProduct no alfaluxApiAdapter.ts para mapear instalacao e campos de preço
- [x] Reestruturar bageoCatalog.ts: BageoInstalacao, BageoControle (ON/OFF 220V, ON/OFF Bivolt, DIM 1-10V, DIM DALI)
- [x] Engine calculateBageo: cálculo por metro linear (ledModuleQtd, driverQtd, precoTotal = precoPorMetro × metros)
- [x] Helpers: getBageoAvailableInstalacoes, getBageoProductsByInstalacao, getBageoAvailableControles
- [x] UI: dropdown mostra apenas "BAGEO Sinuosa" → ao clicar abre botões de instalação → select de modelo
- [x] UI: campo de comprimento em mm com exibição em metros
- [x] UI: botões de controle (ON/OFF 220V, ON/OFF Bivolt, DIM 1-10V, DIM DALI)
- [x] Resultado: exibe comprimento, instalação, módulo LED com qtd por metro, driver com qtd, preço total e por metro
- [x] Resumo para orçamento: "NOME CCT CONTROLE COMPRIMENTOmm"
- [x] Resumo para pedido: inclui linha de preço total quando disponível
- [x] 31 novos testes unitários para bageoCatalog.ts (489 testes passando no total)

## v5.x — Carrinho de Orçamento e Gerador de Excel (27/05/2026)

- [x] Schema DB: tabela cart_items com userId, itemData JSON, createdAt
- [x] tRPC procedures: cart.add, cart.list, cart.remove, cart.clear, cart.updateQty
- [x] Botão "Enviar ao Carrinho" em cada card de resultado (Perfis, Downlights, Painéis, Spots, Arandelas, LED BAR, BAGEO)
- [x] Ícone de carrinho no header com badge de quantidade
- [x] Página /carrinho com lista de itens, preço unitário, preço total, controle de quantidade e botão Remover
- [x] Botão "Gerar Orçamento" na página do carrinho
- [x] Gerador de Excel fiel ao template Alfalux: cabeçalho azul #5B9BD5, campos cliente/obra/data, tabela de itens com foto, rodapé com condições gerais
- [x] Campos preenchíveis antes de gerar: Cliente, Contato, Tel, E-mail, Obra, Referência, Número, Data
- [x] 490 testes passando (zero erros TypeScript reais)

## v5.1 — Correções no Carrinho e Excel (27/05/2026)

- [x] Incluir tipo de controle (ON/OFF, DIM DALI, DIM 1-10V) na descrição de todos os itens ao enviar ao carrinho (Perfis, LED BAR, BAGEO, Downlights, Painéis, Arandelas, Spots)
- [x] Corrigir inserção de fotos no Excel gerado (proxy server-side para evitar CORS + ImagePosition com ext)

## v5.2 — Correções Imagens Excel e Resumo do Pedido (27/05/2026)

- [x] Corrigir imagens no Excel gerado (proxy bloqueava files.manuscdn.com — adicionado à whitelist)
- [x] Corrigir Resumo para Pedido para incluir tipo de controle em todas as categorias (Downlights, Painéis, Arandelas, Spots) + orderSummary atualizado no carrinho

## v6.x — Módulo de Gestão de Orçamentos (28/05/2026)

- [x] Schema DB: tabelas quotes, quote_versions, quote_items com versionamento e status
- [x] tRPC procedures: quotes.save, quotes.list, quotes.getById, quotes.updateStatus, quotes.stats
- [x] Botão "Salvar Orçamento" no Cart.tsx com formulário de identificação (vendedor/assistente)
- [x] Campo assistantName salvo no banco para indicadores internos (não aparece no orçamento)
- [x] Página /orcamentos: lista com busca por número, cliente, vendedor; filtro por status; paginação
- [x] Página /orcamentos/:id: detalhes, itens da versão atual, histórico de revisões, alterar status
- [x] Botão "Gerar Pedido de Fábrica" disponível apenas quando status = approved
- [x] Gerador de pedido de fábrica em Excel (FICHA TÉCNICA DE PRODUÇÃO) fiel ao template
- [x] Página /dashboard: KPIs (total, valor orçado, aprovado, taxa de conversão), breakdown por status, ranking de vendedores e assistentes
- [x] Rotas registradas no App.tsx: /orcamentos, /orcamentos/:id, /dashboard
- [x] 490 testes passando (zero erros TypeScript reais)

## v6.1 — Melhorias no Módulo de Orçamentos (28/05/2026)

- [x] Seleção de cor da peça no configurador via ColorPickerModal antes de enviar ao carrinho (todos os 7 blocos)
- [x] Cores disponíveis: Branco Fosco Micro, Preto Fosco Micro, Cinza Fosco Liso, Cinza Alumínio, Cinza Asfalto, Grafite, Marrom Cortén, Amarelo, Vermelho, Aço Cortén, Branco Fosco Liso + "A Definir"
- [x] Campo cor salvo no CartItemData e exibido no carrinho e na Ficha de Produção
- [x] Ficha de Produção: Fonte de Luz = moduloLed, Equipamentos = drivers, sem fotos, Cor da Peça com fallback "A Definir"
- [x] moduloLed e drivers preenchidos em todos os 7 blocos de CartItemData
- [x] Botão "Editar Orçamento" na página /orcamentos/:id (cria nova revisão preservando histórico, formulário pré-preenchido)
- [x] Botão "Excluir" com tripla confirmação: aviso 1 (irreversível), aviso 2 (considerar cancelar), confirmação 3 (digitar número do orçamento)
- [x] Número do orçamento: campo manual com sugestão automática (ORC-YYYY-NNNN) quando deixado em branco
- [x] Procedure tRPC: quotes.delete (hard delete) + quotes.suggestNumber
- [x] 490 testes passando (zero erros TypeScript reais)

## v6.2 — Correções no Carrinho e Fichas (28/05/2026)

- [x] Campo de quantidade no carrinho: input number editável por digitação livre (além das setas +/-)
- [x] Extrair potência (ex: 17W) da descrição do produto via regex como fallback na coluna Potência
- [x] Ficha de Produção: SKU (coluna E) = apenas o código SKU; PRODUTO (coluna D) = orderSummary completo
- [x] Ficha de Produção: Fonte de Luz dos perfis = "Stripflex 562,5 x 10mm 36L [CCT]" com CCT real

## v6.3 — Ficha Técnica de Produção: Composição Multi-Segmento de Perfis (28/05/2026)

- [x] CartItemData: novo campo profileSegments (ProfileSegment[]) com sku, qty, lengthMm, barsPerPiece, driverQtyPerPiece, driverModel, driverCode
- [x] CartItemData: novo campo stripMethod ("STRIPFLEX" | "STRIPLINE") para perfis 36W
- [x] Home.tsx: botão "Enviar ao Carrinho" de perfis popula profileSegments a partir de result.composition e driversD1/combinedDrivers
- [x] orderExcelGenerator.ts: SKU (col E) = multi-linha "02 x LLE-2810.3IF.18F - 1710mm" por segmento
- [x] orderExcelGenerator.ts: FONTE DE LUZ (col F) = "LLE-2810.3IF.18F - 03 x Stripflex 562,5 x 10mm 36L 3000K" por segmento (Stripline para 36W Stripline)
- [x] orderExcelGenerator.ts: EQUIPAMENTOS (col G) = "LLE-2810.3IF.18F - 02 x PHILIPS XITANIUM 44W 350MA (EQ00347)" por segmento
- [x] orderExcelGenerator.ts: ETIQUETA (col C) = em branco
- [x] orderExcelGenerator.ts: PRODUTO (col D) = orderSummary para perfis, description para outros
- [x] Altura de linha dinâmica: proporcional ao número de segmentos
- [x] Corrigido: LED BAR e BAGEO usavam r.product.driver (inexistente) → corrigido para driver220?.model
- [x] 490 testes passando, zero erros TypeScript reais

## v7 — Controle de Acesso, Auditoria e Painel ADM

- [x] Tabela audit_logs: id, userId, userEmail, userName, action, entityType, entityId, details (JSON), createdAt
- [x] DB helper: insertAuditLog(entry) e getAuditLogs(filters)
- [x] Procedure tRPC: admin.getLogs (somente ADM)
- [x] Restrição de domínio: bloquear login de e-mails fora de @grupoalfalux (exceto ADMs rogeriojohnwayne@gmail.com e rogerio@grupoalfalux.com.br)
- [x] Tela de acesso negado para usuários bloqueados
- [x] Marcar ADMINs no banco (role=admin para os dois e-mails do Rogério)
- [x] Instrumentar: criar orçamento, editar orçamento, excluir orçamento, alterar status, gerar ficha de produção
- [x] Página /admin com tabela de logs (paginada, filtrável por ação/usuário/data)
- [x] Rota /admin protegida: redireciona não-ADM para home
- [x] Link "Admin" visível somente para ADM no header/sidebar

## v7.1 — Correções de Fotos no Excel e Pedido de Fábrica sem Orçamento

- [x] Corrigir BOX LED sem foto no Excel de orçamentos (investigar campo photoUrl)
- [x] Corrigir proporção de imagens no Excel (contain, não stretch — manter aspect ratio original)
- [x] Verificar label de status inicial "Em Aberto" na UI (já estava correto)
- [x] Botão "Gerar Pedido de Fábrica" no carrinho (sem orçamento vinculado)
- [x] Dupla confirmação antes de gerar pedido direto do carrinho
- [x] Formulário com dados do cliente/obra/vendedor antes de gerar o pedido
- [x] Registrar geração de pedido direto no log de auditoria

## v7.3 — Precificação LED BAR U

- [x] Tabela de preços: 5W/m=R$106,40, 10W/m=R$120,00, 25W/m=R$133,89 (por metro linear)
- [x] Driver 60W fixo por corte: R$104,28
- [x] Fórmula: preço = (R$/m × comprimento_m) + (R$104,28 × nCortes)
- [x] Detalhamento do preço no card "Resumo para Orçamento" (perfil + driver + total)
- [x] Preço final agrupado exibido no orçamento e enviado ao carrinho
- [x] 490 testes passando, zero erros TypeScript reais

## v8 — Vendedores, Assistentes, RT, Margem, Frete, Filtros

- [x] Tabela sellers: id, code, name, phone, email
- [x] Tabela assistants: id, name, email
- [x] Tabela quote_sellers: quoteId, sellerId, role (seller1|seller2)
- [x] Popular sellers e assistants com dados do cadastro
- [x] Procedures tRPC: sellers.list, assistants.list
- [x] Schema quotes: assistantId, seller2Id, rtPercent, rtDest1/2/3, rtDest1Active/2Active/3Active, marginPercent, freteType (none|free|paid|night), freteIsento, freteLocalidade (sp|other)
- [x] Migração do banco
- [x] CartItemData: campo itemEmPlanta (string opcional)
- [x] Campo "Item em Planta" por produto no carrinho (Cart.tsx)
- [x] Formulário de orçamento: seleção vendedor1 (obrigatório), vendedor2 (opcional)
- [x] Formulário: seleção assistente (obrigatório); trava: assistente não pode ser vendedor
- [x] Formulário: campo RT % + 3 destinos com checkbox "não aplicável"
- [x] Formulário: campo Margem de Negociação % (default 10%)
- [x] Formulário: seleção de frete (SP grátis >R$1.500, outras localidades sob consulta, noturno R$2.000)
- [x] Opção de isentar frete pelo vendedor
- [x] Validações obrigatórias: Cliente, Obra, Vendedor 1, Assistente
- [x] Fórmula RT e Margem: preço_final = preço_base / (1 - RT%) / (1 - Margem%)
- [x] RT dividida igualmente entre destinos ativos (1, 2 ou 3)
- [x] Gerador Excel: novo template com Item em Planta, cor do produto, RT, margem, frete
- [x] Filtros na lista de orçamentos: por vendedor, assistente, status
- [x] Estatísticas: total de orçamentos, fechados, perdidos, em aberto por período
- [x] 490 testes passando, zero erros TypeScript reais

## v9 — Formulário Equipe Primeiro, Número por Prefixo, Edição Completa, Novo Template Excel

- [x] Formulário de orçamento: aba Equipe vem primeiro (antes de Cliente)
- [x] Número do orçamento gerado automaticamente com prefixo do vendedor (ex: 04.0203-26 para Daniel)
- [x] Ao selecionar Vendedor 1, número é preenchido automaticamente com prefixo correto
- [x] suggestNumber no servidor aceita sellerId e gera número com prefixo do vendedor
- [x] QuoteDetail.tsx: dialog de edição com abas (Equipe, Cliente, RT/Margem, Frete) — todos os campos editáveis
- [x] QuoteDetail.tsx: ao gerar Excel, usar todos os campos do quote (seller1Name, seller2Name, assistantName, rtPercent, marginPercent, freteType, freteIsento, freteLocalidade)
- [x] quoteExcelGenerator.ts: novo template fiel ao TEMPLATEVIVIAN28.05.2026.xlsx
  - Colunas: C=ITEM EM PLANTA, D=FOTO, E=MODELO ALFALUX, F=COMPRIMENTO(mm), G=POTÊNCIA(W), H=DIM, I=TENSÃO(V), J=COR, K=TEMPERATURA DE COR(K), L=QTD, M=PREÇO UNITÁRIO, N=PREÇO TOTAL
  - Cabeçalho: logo Alfalux, número do orçamento, vendedor, obra, cliente, contato, e-mail, arquitetura/LD, referência, data
  - RT e Margem em células P10/P11 (lado direito)
  - Rodapé: prazo de fabricação, valor total, condição de pagamento, frete, observação, nome do vendedor, contato
  - Condições gerais de fornecimento (3 itens)

## v10 — Template Excel Fiel ao TEMPLATEVIVIAN28.05.2026.xlsx

- [x] Logo ALFALUX (novo, enviado pelo usuário) no canto superior direito do cabeçalho (linhas 1-14, colunas G-N)
- [x] Número do orçamento (C6:D6) com fundo azul (#5B9BD5), fonte 24pt bold
- [x] Data (C14:D14) com fundo azul, fonte 24pt bold
- [x] Título da obra (C17:N17) com fundo azul escuro (#1F3864), texto branco 28pt
- [x] Cabeçalho da tabela (linha 18) com fundo azul (#5B9BD5), texto branco 14pt, bordas medium
- [x] Linhas de dados com bordas medium, fonte 14pt, ITEM EM PLANTA em 26pt bold
- [x] Rodapé: prazo (vermelho), total (fundo azul claro), pagamento, frete, observação
- [x] Nome do vendedor no rodapé (sem assistente, sem RT, sem margem)
- [x] 9 condições gerais de fornecimento exatas do template
- [x] "Estou ciente..." em vermelho 24pt
- [x] Data e Assinatura em 26pt bold
- [x] Rodapé endereço com fundo azul
- [x] Sem nenhuma menção a RT, Margem ou Assistente no arquivo Excel

## v11 — Edição de Itens do Orçamento + Correções Excel

- [x] QuoteDetail: botão "Editar Itens" para abrir modal de edição de produtos do orçamento
- [x] Modal de edição de itens: editar qty, cor, CCT, itemEmPlanta e demais campos configurados
- [x] Salvar alterações dos itens no banco (tabela quote_items, campo itemData JSON)
- [x] Excel: logo ALFALUX com posição e proporção corretas (canto superior direito, proporcional)
- [x] Excel: coluna D (FOTO) com formato quadrado e imagem centralizada
- [x] Excel: fontes do cabeçalho menores, fiéis ao template original
- [x] Excel: ITEM EM PLANTA deixar em branco quando não preenchido (não mostrar número automático)

## v12 — Correções Modal de Edição e Foto Excel

- [x] Modal "Editar Itens": substituir Dialog por Sheet lateral (painel deslizante), grid 2 colunas, sem scroll horizontal
- [x] Excel: foto LED BAR U corrigida - URL CloudFront expirada, agora busca URL fresca via API Alfalux
- [x] imageProxy.ts: aceitar subdomínios do CloudFront (d36hbw14aib5lz.cloudfront.net)

## v16 — Carrinho por Usuário e Limpeza Automática

- [x] Carrinho isolado por usuário (userId) — já implementado no banco, cada item tem userId, todas as queries filtram por userId
- [x] Limpar o carrinho automaticamente após salvar o orçamento com sucesso (clearCart() no onSuccess do saveQuoteMutation)
- [x] Confirmado: não há risco de cruzamento entre usuários — carrinho é gerenciado no banco por userId

## v18 — Ficha de Produção LED BAR U (29/05/2026)
- [x] Adicionar campos ledBarNCortes, ledBarComprimentoPorTrechoMm, ledBarComprimentoTotalMm, ledBarDriverModel, ledBarDriverCode ao CartItemData
- [x] Salvar esses campos ao adicionar LED BAR U ao carrinho (Home.tsx)
- [x] Ficha de produção: FONTE DE LUZ mostra módulo LED + trechos com comprimentos
- [x] Ficha de produção: EQUIPAMENTOS mostra QTY x driver com código (ex: "2x FONTE 60W 24V (EQ00112)")
- [x] Corrigir import faltante de tinyint no schema.ts (causava crash do servidor)
- [x] Corrigir tipos InsertUser, InsertCartItem, InsertQuote, etc. faltantes no schema.ts
- [x] Corrigir campos boolean (active, rtDest1Active, freteIsento) que estavam como tinyint
- [x] Corrigir timestamps (lastSignedIn, approvedAt) para usar string ISO no db.ts, oauth.ts, sdk.ts

## v24 — Adicionar itens a orçamentos salvos + autosave "Item no Projeto"

- [x] Autosave do campo "Item no Projeto" por item do carrinho (persistir em localStorage por itemId, não perder ao navegar)
- [x] Permitir editar o "Item no Projeto" depois de salvo no orçamento (inline edit no QuoteDetail)
- [x] Botão "Adicionar mais itens" em orçamentos salvos (QuoteDetail) que reabre o configurador com o carrinho vinculado ao orçamento
- [x] Ao enviar ao carrinho com orçamento aberto, o novo item é adicionado diretamente ao orçamento existente
- [x] Procedure tRPC para adicionar item a orçamento existente (server/routers.ts)

## v25 — Item Especial + Revisão do Orçamento + RT/Margem no Excel

- [x] cartTypes.ts: adicionar campos specialItem* ao CartItemData (isSpecialItem, specialDescription, specialDimensions, specialPower, specialDim, specialVoltage, specialColor, specialUnitPrice, specialPhotoUrl, specialInternalNotes)
- [x] drizzle/schema.ts: adicionar campo revisionCount (int, default 0) à tabela quotes
- [x] Migração SQL: ALTER TABLE quotes ADD COLUMN revisionCount INT DEFAULT 0
- [x] server/routers.ts: ao salvar/editar orçamento, incrementar revisionCount; ao criar novo, revisionCount=0
- [x] server/routers.ts: procedure para upload de foto de item especial (storagePut)
- [x] Home.tsx: adicionar aba/seção "Item Especial" no configurador com formulário (Foto, Descrição, Dimensões, Potência, DIM, Tensão, Cor da Peça, Valor unitário, Observação interna)
- [x] Home.tsx: upload de foto via tRPC mutation → storagePut → URL /manus-storage/...
- [x] Home.tsx: ao submeter Item Especial, addToCart com category='Item Especial' e todos os campos
- [x] Cart.tsx: renderizar Item Especial com seus campos específicos (foto thumbnail, descrição, etc.) — já funciona pelo render genérico existente
- [x] quoteExcelGenerator.ts: renderizar linha de Item Especial com campos diretos (sem regex de description)
- [x] quoteExcelGenerator.ts: adicionar coluna O (OBSERVAÇÃO INTERNA) fora da área de impressão, mesma linha do item
- [x] quoteExcelGenerator.ts: adicionar RT e Margem fora da área de impressão (colunas P-Q, linhas do cabeçalho)
- [x] quoteExcelGenerator.ts: incluir revisão do orçamento (RV0, RV1...) no número do orçamento (ex: "04.0203-26 (RV0)")
- [x] orderExcelGenerator.ts: renderizar Item Especial na ficha de produção
- [x] Testes: 495/495 passando

## v26 — Melhorias Carrinho + Excel + REVENDA

- [x] quoteExcelGenerator.ts: usar totalFinal (com RT+Margem) como valor total do orçamento no Excel
- [x] Cart.tsx: instalar @dnd-kit/core e @dnd-kit/sortable para drag-and-drop
- [x] Cart.tsx: implementar drag-and-drop para reordenar itens no carrinho
- [x] Cart.tsx: implementar edição inline de CCT, potência e cor da peça por item
- [x] Home.tsx: adicionar categoria REVENDA com formulário simplificado (dados da API)
- [x] cartTypes.ts: campo isRevenda não necessário (category='Revenda' é suficiente)
- [x] quoteExcelGenerator.ts: renderizar itens REVENDA corretamente (usa render genérico existente)
- [x] orderExcelGenerator.ts: renderizar itens REVENDA na ficha de produção (usa render genérico existente)

## v26.5 — Campo de observação por item + melhorias Revenda
- [x] Campo itemNote em CartItemData (observação livre por item)
- [x] Revenda: preenchimento automático de itemNote com fabricante + ref (ex: "STELLA ref: SD1720BR")
- [x] Revenda: modal de edição simplificado (só qtd, preço, observação — sem CCT/potência/cor)
- [x] Revenda: exibir "Definir preço →" clicável no carrinho quando preço = 0
- [x] Todos os itens: observação visível no card do carrinho (📋 texto)
- [x] Excel orçamento: coluna P com observação livre do item (fora da área de impressão, azul)
- [x] Excel orçamento: RT/Margem/Assistente movidos para colunas Q-R (era P-Q)

## v26.14 — 5 correções

- [x] appendToQuote: após salvar itens no carrinho, redirecionar de volta ao orçamento correto
- [x] Revisão do orçamento só incrementa ao gerar novo Excel (não ao editar itens/dados)
- [x] Campo OBRA obrigatório no formulário de criação/edição de orçamento
- [x] CCT "A definir" disponível na tela inicial do configurador
- [x] Excel: linha de frete noturno em vermelho

## v27 — API REST somente-leitura para sistemas externos

- [x] drizzle/schema.ts: criar tabela api_keys (id, name, keyHash, createdAt, lastUsedAt, active)
- [x] Migração SQL: CREATE TABLE api_keys
- [x] server/apiAuth.ts: middleware de autenticação por Bearer token (hash SHA-256)
- [x] server/index.ts: registrar rotas REST /api/v1/*
- [x] GET /api/v1/quotes: lista paginada de orçamentos com filtros (status, vendedor, data)
- [x] GET /api/v1/quotes/:id: detalhes completos do orçamento com itens e versões
- [x] GET /api/v1/sellers: lista de vendedores (via tRPC)
- [x] Página admin /admin/api-keys: listar, criar e revogar chaves
- [x] Documentação dos endpoints (formato, exemplos, autenticação)
- [x] Testes: endpoints retornam 401 sem chave, 200 com chave válida (manual)

## v28 — CCT do editor de orçamento restrito ao produto

- [x] Adicionar campo availableCCTs ao CartItemData para armazenar CCTs válidos por produto
- [x] Salvar availableCCTs ao adicionar ao carrinho: Perfis (2700K/3000K/4000K/5000K/A definir), demais categorias (ccts do produto via catálogo/API)
- [x] Seletor de CCT no editor do orçamento (QuoteDetail) usa apenas as opções de availableCCTs do item
- [x] Itens sem availableCCTs (Revenda, Item Especial) exibem campo de texto livre para CCT

## v29 — Adicionar Itens ao Orçamento (modo appendToQuote)

- [x] Detectar parâmetro ?appendToQuote=ID na URL do Home.tsx
- [x] Exibir banner de contexto no topo do configurador indicando que itens serão adicionados ao orçamento ID
- [x] Substituir botão "Enviar ao Carrinho" por "Enviar ao Orçamento" quando appendToQuote está ativo
- [x] Acumular itens selecionados em estado local (pendingQuoteItems) em vez de usar o carrinho
- [x] Exibir contador de itens pendentes para o orçamento no banner
- [x] Botão "Confirmar e Voltar ao Orçamento" que chama quotes.appendItems e redireciona para /quotes/:id
- [x] Botão "Cancelar" no banner que volta para o orçamento sem adicionar itens
- [x] Revenda: chamar addToQuoteMode diretamente (sem ColorPickerModal) quando appendToQuote ativo
- [x] Item Especial: chamar addToQuoteMode diretamente quando appendToQuote ativo

## v29 — Adicionar Itens ao Orçamento via Configurador (01/06/2026)
- [x] Fluxo de Adicionar Itens ao Orçamento: ao clicar em "Adicionar Itens" no orçamento, configurador abre com ?appendToQuote=ID
- [x] Banner no topo do configurador indicando o modo de adição ao orçamento
- [x] Botão "Enviar ao Carrinho" muda para "Enviar ao Orçamento" em todas as categorias
- [x] Itens acumulados em lista local (pendingQuoteItems) antes de confirmar
- [x] Botão "Confirmar" no banner chama quotes.appendItems e redireciona ao orçamento
- [x] Botão "Cancelar" retorna ao orçamento sem salvar

## v30 — Formatos EM L: drivers por peça, allowLongModules e ShapeResultCard (02/06/2026)

- [x] lCatalog.ts: adicionar tipo ShapePieceDriver com code, model, quantity, combo
- [x] lCatalog.ts: adicionar campos bars e driver em ShapePiece
- [x] lCatalog.ts: adicionar campos power, voltage, stripMethod, cct, profileName em ShapeResult
- [x] lEngine.ts: reescrever com cálculo de driver por peça via selectDriverFallback
- [x] lEngine.ts: respeitar allowLongModules ao filtrar módulos IF (limite MAX_IF_LENGTH_STANDARD = 2840mm)
- [x] lEngine.ts: exportar ShapeDriverParams com power, voltage, stripMethod, allowLongModules, cct, profileName
- [x] Home.tsx: passar ShapeDriverParams ao calcular L_SHAPE, SQUARE, RECTANGLE
- [x] Home.tsx: criar ShapeResultCard com lista de peças + driver por peça + textarea copiável + botão Enviar ao Carrinho/Orçamento
- [x] Home.tsx: substituir bloco básico de resultado EM L pelo ShapeResultCard
- [x] 495 testes passando

## v30.1 — Medidas Quebradas: apenas com toggle ativo (02/06/2026)

- [x] lEngine.ts: adicionar parâmetro allowFractionalBars em ShapeDriverParams (default false)
- [x] lEngine.ts: findBestIFModule filtra módulos com barras decimais quando allowFractionalBars = false
- [x] Home.tsx: passar allowFractional (toggle existente) como allowFractionalBars no ShapeDriverParams
- [x] Home.tsx: ocultar toggles "Ajustar para Medida Maior" e "Otimizar com IFs Diferentes" quando profileShape !== STRAIGHT (não se aplicam a EM L)
- [x] 495 testes passando

## v30.2 — Preço por metro linear nos formatos EM L (02/06/2026)

- [x] lCatalog.ts: adicionar campos profileCode e totalLengthMm ao ShapeResult
- [x] lEngine.ts: calcular totalLengthMm em cada função (L_SHAPE: canto + 2 retos; SQUARE: 4 × lado; RECTANGLE: 2 × largura + 2 × altura) e incluir profileCode no retorno
- [x] Home.tsx: calcular precoTotal no ShapeResultCard usando getStaticPricePerMeter(profileCode, power, "onoff", false) × (totalLengthMm / 1000)
- [x] Home.tsx: exibir comprimento linear total em mm e metros, e preço estimado em R$ no ShapeResultCard
- [x] 495 testes passando

## v30.3 — Otimização e ShapeResultCard enriquecido (03/06/2026)

- [x] lEngine.ts: reescrever findBestIFModule para testar múltiplas quantidades (1×, 2×, 3×...) por módulo e escolher a combinação que minimiza o desvio (MAX_MODULES_PER_SIDE = 8)
- [x] lEngine.ts: retornar moduleQty no StraightSegment e usar na descrição e quantidade das peças
- [x] Home.tsx: ShapeResultCard enriquecido com foto do perfil, tipo de instalação, barra Stripflex/Stripline, tabela de composição de módulos (SKU/tipo/comprimento/qtd/barras), tabela de drivers por SKU (SkuDriverList), resumo de drivers consolidado
- [x] Home.tsx: texto copiável inclui comprimento total, barra e preço estimado
- [x] Home.tsx: botão Enviar ao Carrinho passa unitPrice e totalPrice
- [x] 495 testes passando

## v31 — Campos Comerciais no Orçamento (03/06/2026)

- [x] BAGEO: priceFromApi: false — preço sempre editável (pré-preenchido com valor da API)
- [x] Schema: novos campos deliveryDays, commissionPercent, paymentTerm, destState, difalEnabled, difalPercent, difalValue, fcpEnabled, fcpPercent, fcpValue na tabela quotes
- [x] db.ts: SaveQuoteInput atualizado com todos os novos campos
- [x] routers.ts: schema Zod de createQuote e addRevision atualizado com novos campos
- [x] difalTable.ts: tabela completa de DIFAL e FCP por estado (27 UFs + DF)
- [x] QuoteDetail.tsx: aba "Comercial" no diálogo de edição com prazo, pagamento, comissão, estado destino, toggles DIFAL/FCP
- [x] QuoteDetail.tsx: exibição de prazo, pagamento, comissão e DIFAL/FCP no card de Dados Internos
- [x] QuoteDetail.tsx: cálculo automático de DIFAL e FCP ao selecionar estado destino
- [x] cartTypes.ts: QuoteFormData atualizado com deliveryDays, paymentTerm, commissionPercent, destState, difalEnabled, difalValue, fcpEnabled, fcpValue
- [x] quoteExcelGenerator.ts: prazo dinâmico e condição de pagamento dinâmica no Excel do orçamento
- [x] orderExcelGenerator.ts: prazo calculado (data aprovação + dias úteis) exibido em vermelho na ficha de produção
- [x] 495 testes passando

## v32 — Melhorias no Orçamento (03/06/2026)

- [x] Aba Comercial na criação inicial do orçamento (não apenas na edição)
- [x] Opção "Especificar" na condição de pagamento com campo de texto livre
- [x] Alterações no orçamento salvam logs sem gerar nova revisão; revisão gerada apenas ao baixar Excel
- [x] Excel: incluir DIFAL e FCP no total final quando aplicáveis

## v32.1 — Correções Comercial (03/06/2026)

- [x] Cart.tsx: SP adicionado como opção no Select de estado destino (venda interna — sem DIFAL)
- [x] Cart.tsx: mensagem informativa quando SP selecionado ("São Paulo é o estado de origem — DIFAL não se aplica")
- [x] Cart.tsx: destState default alterado para "SP" no saveForm inicial
- [x] Cart.tsx: paymentTerm default atualizado para string completa "30% Sinal e 70% a 28DDF..."
- [x] Cart.tsx: lógica de payload paymentTerm simplificada (sem mapeamento "custom" → usa valor direto)
- [x] QuoteDetail.tsx: SP adicionado como opção no Select de estado destino com mesma mensagem informativa
- [x] QuoteDetail.tsx: condição {destState !== "SP"} para não exibir toggles DIFAL/FCP quando SP selecionado
- [x] Commission max=5% enforced em Cart.tsx (Math.min) e QuoteDetail.tsx
- [x] 495 testes passando

## v32.2 — Preço de Venda nos Produtos de Revenda (03/06/2026)

- [x] Home.tsx: handleAddRevendaItem pré-preenche unitPrice e totalPrice com precoVenda da API
- [x] Home.tsx: priceFromApi: false para Revenda (preço editável, mas pré-preenchido)
- [x] Home.tsx: toast diferenciado — exibe o preço quando disponível, ou pede para definir quando zero
- [x] Home.tsx: lista de produtos de revenda exibe precoVenda em verde ao lado do SKU/referência
- [x] 495 testes passando

## v32.3 — Cabeceira no Formato EM L para Embutir (03/06/2026)

- [x] Planilha MEDIDASPERFIL analisada: cabeceiras por perfil embutir extraídas
- [x] lCatalog.ts: campo cabeceiraMm adicionado ao tipo LProfileConfig
- [x] lCatalog.ts: LLE-2580 (EASY PRIME embutir) → cabeceiraMm: 7
- [x] lCatalog.ts: LLE-2052 (SKYLINE embutir) → cabeceiraMm: 7
- [x] lCatalog.ts: LLE-2810 (BLAZE embutir) → cabeceiraMm: 10
- [x] lCatalog.ts: perfis não-embutir (LLP-*, LLS-*, LLA-*) → sem cabeceiraMm
- [x] lCatalog.ts: getCabeceiraMm() exportada para uso na engine
- [x] lCatalog.ts: cantos LLE-2052 e LLE-2810 atualizados com SKUs corretos da planilha (1L2, 1L3, 1L4)
- [x] lCatalog.ts: LLP-4945 (BLAZE pendente/sobrepor/arandela) removido — substituído por LLS-3945 e LLA-5945 com SKUs corretos
- [x] lEngine.ts: calculateLShape aplica 2× cabeceira em cada lado SEM módulos retos (canto isolado)
- [x] lEngine.ts: quando há módulos retos (IF/ML), cabeceira NÃO é somada (já incluída no IF)
- [x] lEngine.ts: totalLengthMm corrigido para actualH + actualV
- [x] lEngine.ts: summary inclui linha informativa quando cabeceira é aplicada
- [x] lEngine.test.ts: 14 novos testes cobrindo lógica de cabeceira (getCabeceiraMm + calculateLShape + quadrado/retangular)
- [x] 509 testes passando (18 arquivos)

## v32.6 — Correção de Módulos por Formato (05/06/2026)
- [x] Quadrado/Retangular: usar cantos ML + retos ML (nunca IF)
- [x] Formato L: usar retos IF para acabamento (comportamento já correto)
- [x] lEngine.ts: findBestModuleByType genérico criado; findBestMLModule adicionado
- [x] calculateSquare e calculateRectangle migrados para findBestMLModule
- [x] Tipo das peças retas: STRAIGHT_ML em quadrado/retangular, STRAIGHT_IF em formato L
- [x] UI: tabela de composição exibe "ML — Meio de Linha" vs "IF — Início/Final de Linha"
- [x] 3 novos testes cobrindo ML vs IF por formato (512 testes passando)

## v32.7 — Algoritmo Greedy de Otimização de Módulos (05/06/2026)
- [x] lEngine.ts: findBestModuleByType substituído por algoritmo greedy (maior módulo que cabe primeiro)
- [x] StraightSegment refatorado para MultiSegment com lista de peças (pieces[])
- [x] calculateSquare, calculateRectangle e calculateLShape migrados para MultiSegment
- [x] Resultado: quadrado 8000mm LLP-6060 passou de 24 peças para 12 peças (−50%)
- [x] lEngine.test.ts: testes atualizados para cobrir combinação de módulos diferentes
- [x] 513 testes passando

## v32.8 — LUMIGRID cor única Branco (05/06/2026)
- [x] painelCatalog.ts: campo corUnica adicionado ao tipo PainelProduct
- [x] LUMIGRID E e LUMIGRID S: corUnica = "Branco"
- [x] Home.tsx: botão "Enviar ao Carrinho" de painéis pula modal quando corUnica definido
- [x] 513 testes passando

## v32.12 — Categoria Acessórios (05/06/2026)
- [x] Endpoint GET /api/acessorios/all no alfaluxApiService.ts
- [x] Procedure acessoriosProducts no routers.ts
- [x] Botão de categoria "Acessórios" na grade de categorias (Home.tsx)
- [x] Lista de acessórios com filtro por família e busca por texto
- [x] Painel de resumo à direita ao selecionar um acessório
- [x] Adição ao carrinho e ao orçamento (modo appendToQuoteId)
- [x] Miniatura de foto na lista (placeholder quando fotoUrl = null)
- [x] 516/516 testes passando (0 erros TypeScript)

## v32.15 — Busca Global com Revenda e Acessórios

- [x] Adicionar "Revenda" e "Acessórios" ao tipo ProductCategory no ProductSearch
- [x] Definir interfaces RevendaSearchItem e AcessorioSearchItem no ProductSearch
- [x] Adicionar campos revenda e acessorios à interface ProductSearchCatalogs
- [x] Adicionar ícones ShoppingBag (Revenda) e Wrench (Acessórios) no CategoryIcon
- [x] Adicionar cores teal-500 (Revenda) e cyan-500 (Acessórios) no CATEGORY_COLORS
- [x] Adicionar Revenda e Acessórios na função buildSuggestions()
- [x] Adicionar revenda e acessorios ao searchCatalogs useMemo no Home.tsx
- [x] Atualizar handleSearchSelect para navegar a Revenda (setRvSelectedSku) e Acessórios (setAcSelectedId)
- [x] 0 erros TypeScript, 516/516 testes passando

## v32.16 — Botão "Incluir Acessório" e Prazo de Entrega com Feriados

- [x] Botão "Incluir Acessório" no painel de resultado (todas as categorias)
- [x] Modal de seleção de acessório: lista filtrável com foto, código, dimensão, família e preço
- [x] Ao confirmar, acessório adicionado como item separado no carrinho/orçamento
- [x] fetchHolidays(year) com cache em memória via BrasilAPI
- [x] addBusinessDays() atualizado para descontar feriados nacionais
- [x] calcDeliveryDate() exportada: calcula displayDays = deliveryDays - 1 com feriados
- [x] handleGenerateOrder no QuoteDetail chama calcDeliveryDate antes de gerar o Excel
- [x] Excel do pedido de fábrica: prazo exibido como "19 dias úteis → DD/MM/YYYY"
- [x] 0 erros TypeScript, 516/516 testes passando

## v32.17 — Acessórios Vinculados ao Produto (Sub-item Opcional)

- [x] Adicionar campo `accessories?: LinkedAccessory[]` ao CartItemData (código, descrição, qtd, preço, fotoUrl)
- [x] Modal "Incluir Acessório": ao confirmar, acessório é adicionado ao item atual (não ao carrinho como item separado)
- [x] Carrinho: exibir acessórios vinculados indentados abaixo do produto pai (ícone Wrench, código, qtd, preço)
- [x] QuoteDetail: exibir acessórios vinculados abaixo do item pai na lista de itens
- [x] Excel do pedido de fábrica: listar acessórios como sub-linhas do produto pai (linha ciano)
- [x] 0 erros TypeScript novos, 516/516 testes passando

## v32.18 — Corrigir Vínculo de Acessório ao Produto Pai

- [x] handleAddAcessorioItem: quando há produto configurado, acumula em pendingAccessories em vez de criar item separado
- [x] Botão da aba Acessórios: mostra "Vincular ao Produto" (ciano) quando há produto configurado
- [x] Imagem do acessório no Cart.tsx: exibe fotoUrl do LinkedAccessory quando disponível
- [x] 0 erros TypeScript novos, 516/516 testes passando

## v32.21 — Pedido de Fábrica com Revisões Independentes

- [x] Criar tabelas `factory_orders` e `factory_order_items` no banco (schema + migração SQL)
- [x] Procedures tRPC: criar/listar/atualizar factory_order e seus itens (produto, qtd, cor, controle, drivers, acessórios)
- [x] Página FactoryOrderDetail: editor completo de itens com revisões numeradas (Rev.1, Rev.2...)
- [x] Edição de item: produto, quantidade, cor, tipo de controle, drivers (lista da API), acessórios vinculados
- [x] Integrar ao QuoteDetail: botão "Gerenciar Pedido de Fábrica" abre FactoryOrderDetail (orçamento congelado, pedido editável)
- [x] Excel do pedido de fábrica gerado a partir dos dados do factory_order (não mais do orçamento)
- [x] 0 erros TypeScript novos, 516/516 testes passando

## v32.22 — Dashboard Gerencial com Controle de Acesso

- [x] Expandir enum `role` em users: admin | gerente | vendedor | assistente | user
- [x] Criar tabela `sales_goals` (metas anuais e mensais de faturamento)
- [x] Funções DB: getManagerDashboard, getSellerDashboard, getSalesGoalsByYear, upsertSalesGoal, getMonthlyReport
- [x] Procedures tRPC: dashboard.managerData, dashboard.sellerData, dashboard.goals, dashboard.upsertGoal, dashboard.updateUserRole, dashboard.listUsers, dashboard.monthlyReport
- [x] Dashboard reescrito com controle de acesso por papel (admin/gerente veem tudo, vendedor vê só os próprios dados, assistente bloqueado)
- [x] Comissões por vendedor: total faturado, % comissão, valor a receber — visível somente para admin/gerente
- [x] Ranking de vendas por vendedor — visível somente para admin/gerente
- [x] Ranking de RT (Retorno de Tabela) por destinatário — visível somente para admin/gerente
- [x] Metas de faturamento: anual e mensal com barra de progresso — visível para todos exceto assistentes, editável somente por admin
- [x] Exportar relatório mensal de vendas em Excel com comissões por vendedor e resumo por vendedor — somente admin/gerente
- [x] 516/516 testes passando, 0 erros TypeScript novos

## v32.23 — Integração Revenda com nova API /revenda/all

- [x] Atualizar interface RevendaProduct no backend: remover campos id, observacoes, custo (não existem na nova API)
- [x] Remover mapeamento de observacoes no routers.ts e no Home.tsx
- [x] Atualizar normalizeFornecedor para aceitar null/undefined e retornar "SEM FORNECEDOR"
- [x] BACKLIT LUMIGRID agora agrupado em DIVERSOS (antes era ignorado/oculto)
- [x] Todos os 216 produtos exibidos sem filtro de exclusão por fornecedor
- [x] Busca textual também filtra por nome do fornecedor normalizado
- [x] 0 erros TypeScript, 516/516 testes passando
## v32.24 — Melhorias de Orçamento e Excel
- [x] Corrigir bug Rev0/Rev1: usar (revisionCount ?? 0) + 1 ao gerar Excel
- [x] Duplicar orçamento: botão no QuoteDetail.tsx com dialog de confirmação e navegação para o novo orçamento
- [x] Campo Número do Projeto (projectNumber): exibido no cabeçalho do orçamento, editável nos formulários
- [x] Comissão dividida (commissionPercent2): campo "Comissão 2º Vendedor" no Cart.tsx e QuoteDetail.tsx
- [x] Frete cotado (freteValue): campo "Frete Cotado (R$)" na aba Frete do Cart.tsx e QuoteDetail.tsx
- [x] Observação por item (itemObs + itemObsShowInExcel): campo no dialog de edição de item no Cart.tsx
- [x] Margem por item (itemMarginPercent): campo no dialog de edição de item no Cart.tsx
- [x] Controle de preços por papel: apenas admin/gerente podem editar preços de itens que vieram da API
- [x] Rabicho inline no Excel: rabicho aparece como texto na coluna D do item pai, não em sub-linha separada
- [x] Remover cor do item especial: coluna J não exibe specialColor para itens da categoria "Item Especial"
- [x] Categoria Serviços: nova categoria com formulário simples e linha compacta no Excel
- [x] Orçamento por pavimentos: campo Pavimento/Ambiente no dialog de edição; cabeçalho de pavimento no Excel
- [x] 516/516 testes passando, 0 erros TypeScript novos
- [x] Centralizar versão no package.json e injetar automaticamente no cabeçalho via Vite define

## v32.35 — Correção do Excel para download (15/06/2026)
- [x] Rabicho movido para célula E (MODELO ALFALUX) com separador tracejado, igual ao preview
- [x] Logo ALFALUX no cabeçalho: colunas K-N (canto superior direito), linhas 3-6
- [x] Logo ALFALUX no rodapé: ao lado do bloco do vendedor (colunas K-N)
- [x] Telefone/endereço no cabeçalho: colunas C-J (não mais C-N, para não sobrepor o logo)
- [x] Observação em linha única com rich text (label negrito + texto normal)
- [x] "Fico à disposição" (não "Estamos à disposição") — igual ao preview e template
- [x] Contato do vendedor: usa seller1Phone/seller2Phone (não telefone fixo hardcoded)

## Correções v32.37 — Excel para download

- [x] Corrigir frete: freteValue não era passado ao enrichedForm no Cart.tsx (geração direta do carrinho)
- [x] Corrigir configurações de impressão: usar propriedades individuais do pageSetup (não objeto), DPI=4294967295 idêntico ao template
- [x] Corrigir logo cabeçalho: posição col=4.823 row=6.419, tamanho 420x97px (fiel ao template)
- [x] Corrigir logos rodapé: tamanho 162x49px e 162x50px (fiel ao template, não 420x97px)

## Correções v32.38 — Excel: logos, impressão e imagens de Painel/Bageo
- [x] Logo cabeçalho: posição corrigida para col=9.689, row=8.032 (centralizado nas linhas 7-14, colunas K-N)
- [x] Logos rodapé: posição corrigida para col=10.942 (centralizado nas colunas K-N)
- [x] Imagens de Painel (RV*): getFreshPhotoUrl agora busca em revendaProducts além de alfalux.products
- [x] Imagens de Bageo: getFreshPhotoUrl usa fallbackUrl quando SKU não encontrado na API principal
- [x] Configurações de impressão: printArea via wb.definedNames, sheetPr/pageSetup/pageMargins idênticos ao template

## Correções v32.39 — Temperatura de cor, scroll, busca e avisos

- [x] Temperatura de cor no Item Especial: seletor de CCT (N/A, 2700K, 3000K, 3500K, 4000K, 5000K, 6500K) no formulário do Home.tsx e no dialog de edição do Cart.tsx; campo specialColorTemp adicionado à interface CartItemData
- [x] Scroll no dialog de edição do carrinho: DialogContent com max-h-[90vh] flex flex-col; área de campos com overflow-y-auto flex-1; rodapé com botões fixo (flex-shrink-0 border-t)
- [x] Busca de orçamentos corrigida: usa TRIM(projectName) para ignorar espaços iniciais; busca também em seller1Name e assistantName além de quoteNumber, clientName, vendorName
- [x] Inverter Obra/Cliente na listagem: Obra (projectName) exibida como título principal, Cliente (clientName) como subtítulo com ícone 👤
- [x] Aviso de obra duplicada: ao criar orçamento, verifica se já existe outro com o mesmo projectName nos últimos 6 meses; exibe toast não-bloqueante com número e cliente do orçamento existente
- [x] Ricardo Miranda: inserido como assistente comercial no banco (email miranda@grupoalfalux.com.br)

## v32.40 — Correção adjustToLarger com composição IF+ML

- [x] Corrigir lógica de "ajustar para medida maior": antes buscava apenas módulos IN acima do solicitado; agora busca a menor composição realizável (IN ou 2×IF ou 2×IF+MLs) que seja >= ao comprimento solicitado
- [x] Respeitar allowLongModules do usuário ao buscar candidatos IN (não usar módulos de 6 barras se allowLongModules=false)
- [x] Para IF/ML: usar allowLongModules=true pois não há limite de barras por módulo individual em composições de linha longa
- [x] Caso de uso corrigido: EASY H PLUS 3370mm com adjustToLarger → 3400mm (2×IF-3 de 1700mm), não mais 2270mm
- [x] 523/523 testes passando (7 novos testes de regressão para EASY H PLUS adjustToLarger)

## v32.41 — GLOW e Decorativas
- [x] Categoria Decorativas habilitada (available: true)
- [x] Adaptador: glowProducts e decorativas populados a partir da API
- [x] Bloco de formulário GLOW: seleção de produto fixo, tensão e CCT; botão Calcular GLOW
- [x] Resultado GLOW: card com SKU, produto, CCT, tensão, driver; resumo para orçamento com botão Enviar ao Carrinho
- [x] Estado vazio GLOW exibido quando nenhum produto GLOW está calculado
- [x] Bloco de formulário Decorativas: seleção de família, produto e CCT
- [x] Resultado Decorativas: card com SKU, produto, CCT, preço; resumo para orçamento com botão Enviar ao Carrinho
- [x] Estado vazio Decorativas exibido quando nenhum produto está selecionado
- [x] Reset de estados GLOW e Decorativas ao trocar de categoria
- [x] 523/523 testes passando

## v32.44 — Acessórios: Fontes e Drivers da API
- [x] Atualizar interface AcessorioProduct para incluir campos source e observacoes
- [x] Exibir acessórios na categoria Acessórios separados por subcategoria (Drivers/Fontes vs. Físicos)
- [x] Filtros por família dentro da categoria Acessórios
- [x] Botão "Enviar ao Carrinho" para acessórios individuais (já existia)

## Melhorias Jun 2026 (solicitadas pelo usuário)

- [x] Frete aparece no Excel e na pré-visualização do orçamento
- [x] Número de orçamento escolhido pelo usuário persiste até o final (não é sobrescrito)
- [x] Revisão só incrementa ao clicar em "Baixar Excel" (não ao salvar/editar)
- [x] Campo de quantidade ao lado do botão "Enviar ao Carrinho" em todos os blocos (espelhado no carrinho)
- [x] Opção "A definir" de CCT disponível em todos os itens via select (não botões fixos)
- [x] Botão "Duplicar item" no carrinho e na edição de orçamento

## Melhorias Jun 2026 - Lote 2

- [x] Bloquear download Excel sem orçamento salvo (Cart.tsx) — obrigar salvar antes de baixar
- [x] Frete cotado (freteValue) aparece no Excel e na pré-visualização para todos os tipos de frete
- [x] Número de orçamento digitado manualmente não é sobrescrito pela sugestão automática
- [x] Revisão RV0 ao salvar pela primeira vez (não incrementar ao editar sem baixar Excel)
- [x] Campo de quantidade ao lado do botão Enviar ao Carrinho em todos os blocos (espelhado no carrinho)
- [x] Opção "A definir" de CCT em todos os selects de CCT
- [x] Botão duplicar item no carrinho e na edição de orçamento (QuoteDetail)

## Correções solicitadas agora

- [x] Corrigir foto do LED BAR na pré-visualização e no Excel do orçamento
- [x] Corrigir exibição do valor de frete no orçamento, Excel e pré-visualização
- [x] Corrigir espelhamento da quantidade configurada para o carrinho, vinculando os campos de quantidade

## Correções Jun 2026 - Lote 3

- [x] Diluíção proporcional do frete nos produtos: quando freteIncluded=true, distribuir freteValue proporcionalmente ao totalPrice de cada linha (não divisão igualitária)

## Lista robusta de alterações v7.0 (18/06/2026)

### Configurador
- [x] Perfil Flexível: adicionar opção de instalação Embutir ou Sobrepor (já estava implementado)
- [x] Frete a Calcular: abrir campo para digitar valor; somar ao orçamento; ignorar caixa de seleção
- [x] Item Especial: caixa de seleção preço por metro ou unitário com cálculo automático no carrinho e orçamento
- [x] Adicionar LED BAR EC ao catálogo (aguardando dados do produto - descartado neste lote)

### Carrinho / Orçamento
- [x] Assistente Comercial: incluir opção "VENDEDOR" na lista
- [x] Número de orçamento: permitir edição manual em qualquer etapa, respeitando sempre o valor escolhido pelo usuário
- [x] Remover campo Ambiente do formulário de orçamento (descartado - manter por enquanto)
- [x] Vendedor é campo obrigatório (bloquear salvar sem vendedor)
- [x] Emitir alerta BLOQUEANTE ao tentar cadastrar novo orçamento com obra já existente

### Excel / Preview
- [x] Pavimento: já implementado como cabeçalho de grupo no Excel e preview
- [x] Prazo de produção no pedido de fábrica: corrigir data de acordo com prazo do orçamento
- [x] Fotos de trilhos e acessórios: tirar novas fotos melhores (não é tarefa de código - descartado)

### Comissão
- [x] Comissão máxima de 5%; soma de dois vendedores não pode ultrapassar 5%
- [x] Vivian e Dennis podem alterar comissão para qualquer valor (sem limite)

### Dashboard
- [x] Vendedor vê apenas seus próprios dados no dashboard
- [x] Assistente não pode ver o dashboard
- [x] Vivian e Dennis veem dashboard completo com dados de todos os vendedores
- [x] Vivian e Dennis podem editar metas no dashboard
- [x] Filtros de data início e fim no dashboard
- [x] Filtros de data início e fim nos meus orçamentos
- [x] Relatório Mensal de Vendas: adicionar coluna de obra
- [x] Filtros por vendedor nos meus orçamentos devem puxar somente dados do vendedor selecionado

### Busca
- [x] Corrigir busca de orçamentos (busca por número, cliente, obra, vendedor, assistente)

## Correções Jun 2026 - Lote 4 (19/06/2026)

- [x] Fuso horário de Brasília (America/Sao_Paulo) em quoteExcelGenerator.ts: substituir new Date().toLocaleDateString("pt-BR") por toBrasiliaDate(new Date())
- [x] Fuso horário de Brasília em orderExcelGenerator.ts: substituir toLocaleDateString("pt-BR") por toBrasiliaDate() em todas as ocorrências
- [x] Versão inicial do orçamento: v0 (não v1) — alterado currentVersion e version de 1 para 0 no db.ts (createQuote e duplicateQuote)

## Produtos sem preço por metro (19/06/2026)

- [x] Produtos sem tabela de preço (LED BAR WW E, LED BAR WW S, FLOOR, LED BAR EC, MEIA LUA, MILANO, FLEXÍVEL): não calcular preço automaticamente — exibir aviso e enviar ao carrinho com preço null (editável manualmente)

## Pavimento e Ambiente por item (19/06/2026)

- [x] Adicionar campos `pavimento` (string) e `ambiente` (string) ao CartItemData (shared/types)
- [x] Migrar schema DB: adicionar colunas pavimento e ambiente na tabela quote_items
- [x] Adicionar campos pavimento/ambiente no modal de edição de itens do orçamento (QuoteEditModal)
- [x] Adicionar campos pavimento/ambiente no carrinho (Cart.tsx) — visível por item
- [x] Agrupamento/organização por pavimento no carrinho (botão toggle Agrupar/Agrupado)
- [x] Agrupamento/organização por pavimento no painel de edição do orçamento (QuoteDetail)
- [x] Exportação Excel com agrupamento por pavimento (quoteExcelGenerator.ts) + coluna Q com pavimento/ambiente

## Balizadores e Decorativas sem driver (19/06/2026)

- [x] Habilitar categoria Balizadores na UI (remover badge "em breve")
- [x] Detectar produto sem driver: todos os campos driver* são null → campo semDriver=true no DownlightProduct
- [x] Produtos sem driver: ocultar seleção de tensão e dimerização; exibir apenas CCT e quantidade
- [x] Produtos sem driver: controle sempre ON/OFF (não exibir opções de dim)
- [x] Balizadores com tensão embutida no nome/ledModule (ex: "AC 110V", "AC 220V"): exibir tensão como informação, não como seleção
- [x] Ajustar Decorativas: mesma lógica de sem driver quando driver220 = null (já não exibia tensão/dim)
- [x] Ao adicionar ao carrinho: não incluir campos de driver/tensão/dim no itemData para produtos sem driver

## Barras de Pavimento no Carrinho (19/06/2026)

- [x] Corrigir envio de pavimento/ambiente do configurador ao carrinho (campo não chega ao CartItemData)
- [x] Exibir campo Pavimento e Ambiente diretamente no card do item no carrinho (badge no card + edição via modal)
- [x] Implementar barras de título por pavimento no carrinho (separador visual com nome do pavimento)
- [x] Edição do nome do pavimento em tempo real na barra de título (inline edit)
- [x] Ao alterar o pavimento na barra de título, atualizar todos os itens daquele pavimento
- [x] Mesma lógica de barras de título no painel de edição do orçamento (já implementado em checkpoint anterior)
- [x] Persistir alterações de pavimento feitas no carrinho ao salvar orçamento (itemData é persistido integralmente)

- [x] Cart.tsx: Drag & drop na barra de pavimento (move todos os itens do grupo junto)
- [x] Cart.tsx: Botão expandir/recolher por grupo de pavimento
- [x] QuoteDetail.tsx: Drag & drop na barra de pavimento (move todos os itens do grupo junto)
- [x] QuoteDetail.tsx: Botão expandir/recolher por grupo de pavimento
## Equipamentos do Item Especial (22/06/2026)
- [x] cartTypes.ts: Adicionar campo specialEquipments (lista de equipamentos) ao CartItemData
- [x] routers.ts: Criar endpoint trpc.led.componentes para buscar acessórios (drivers + acessórios físicos) da API
- [x] FactoryOrderDetail.tsx: UI para adicionar/remover equipamentos no item especial (busca da API de acessórios)
- [x] Cart.tsx: Exibir equipamentos do item especial no modal de edição
- [x] QuoteDetail.tsx: Exibir equipamentos do item especial no editor do orçamento
- [x] orderExcelGenerator.ts: Incluir specialEquipments na coluna EQUIPAMENTOS do pedido de fábrica

## Equipamentos do Item Especial (22/06/2026)
- [x] cartTypes.ts: Adicionar campo specialEquipments (lista de equipamentos) ao CartItemData
- [x] routers.ts: Criar endpoint trpc.led.componentes para buscar acessórios (drivers + acessórios físicos) da API
- [x] FactoryOrderDetail.tsx: UI para adicionar/remover equipamentos no item especial (busca da API de acessórios)
- [x] Cart.tsx: Exibir equipamentos do item especial no modal de edição
- [x] QuoteDetail.tsx: Exibir equipamentos do item especial no editor do orçamento
- [x] orderExcelGenerator.ts: Incluir specialEquipments na coluna EQUIPAMENTOS do pedido de fábrica

## Sprint — Markup restrito + Dashboard gerencial
- [x] Ocultar markup na UI do configurador (QuoteSummaryCard) para usuários não autorizados
- [x] Restringir botão de edição de markup no QuoteDetail (só Dennis, Vivian e owner)
- [x] Implementar métricas gerenciais no backend: lucro bruto, margem, famílias mais orçadas
- [x] Construir painel gerencial no Dashboard com KPIs estratégicos (visível só para autorizados)

## Lote 5 — 10 Alterações em Massa (24/06/2026)

### DB Schema
- [x] Adicionar colunas `arquiteto` e `lightDesigner` na tabela `quotes`
- [x] Remover campo `ambiente` do sistema (manter coluna no DB por compatibilidade, mas ocultar da UI)

### Backend
- [x] Atualizar createQuote/updateQuote para salvar arquiteto e lightDesigner
- [x] Atualizar getQuoteById para retornar arquiteto e lightDesigner
- [x] Verificar duplicidade de número de orçamento no backend (retornar erro ou aviso)
- [x] Atualizar data do orçamento (updatedAt) ao editar/adicionar revisão

### UI — Carrinho (Cart.tsx)
- [x] Adicionar campos Arquiteto e Light Designer no formulário do carrinho
- [x] Quando RT for selecionado/inserido, auto-preencher Light Designer com o nome da RT
- [x] Número do orçamento: tornar editável manualmente, exibir alerta se número já existe
- [x] Remover campo Ambiente do formulário do carrinho
- [x] Corrigir tela de seleção de cor ao clicar "enviar ao orçamento" (deve aparecer a tela de cor)

### UI — QuoteDetail.tsx
- [x] Adicionar campos Arquiteto e Light Designer no editor do orçamento
- [x] Quando RT for selecionado/inserido, auto-preencher Light Designer com o nome da RT
- [x] Preservar todos os campos preenchidos (vendedor, assistente, RT, margem, DIFAL, etc.) ao adicionar novos itens
- [x] Remover campo Ambiente do editor do orçamento
- [x] Corrigir separador de pavimento: exibir apenas o nome do pavimento (nunca "Térreo - Térreo")
- [x] Número do orçamento editável com alerta de duplicidade

### Excel (quoteExcelGenerator.ts)
- [x] Adicionar Arquiteto e Light Designer no cabeçalho do Excel
- [x] Remover coluna Ambiente do Excel
- [x] Mostrar cor do Item Especial na coluna correta do Excel
- [x] Padrão de nome do arquivo: `{número} ({RVx}) - {obra} - {cliente}.xlsx`
- [x] Corrigir separador de pavimento: apenas nome do pavimento (sem duplicação)

### PDF Preview
- [x] Adicionar Arquiteto e Light Designer na pré-visualização do PDF
- [x] Mostrar cor do Item Especial na pré-visualização
- [x] Botão para baixar PDF da pré-visualização SEM gerar nova revisão
- [x] Corrigir separador de pavimento: apenas nome do pavimento (sem duplicação)

### Metragem L/Retangular/Quadrado
- [x] Corrigir cálculo de metragem total para formas L, retangular e quadrado: somar TODAS as arestas
- [x] Exibir metragem total correta no resultado e no carrinho

## Lote 6 — Troca de CCT no Carrinho e Orçamento (24/06/2026)

- [x] Seleção de CCT no carrinho: usar `<select>` com apenas os CCTs disponíveis para o produto (availableCCTs)
- [x] Ao alterar CCT no carrinho: atualizar descrição/nome do produto para refletir o novo CCT
- [x] Ao alterar CCT no carrinho: atualizar o SKU do módulo LED e os profileSegments para o novo CCT
- [x] Seleção de CCT no editor de orçamento (QuoteDetail.tsx): mesma lógica — select com CCTs disponíveis
- [x] Ao alterar CCT no QuoteDetail: atualizar descrição, SKU e profileSegments do item
- [x] Garantir que a ficha de produção (productionSheet) usa o módulo LED do CCT atualizado

## Lote 8 — Seletor de Formato Downlight (25/06/2026)

- [x] Adicionar estado `downlightShape: 'R' | 'Q' | null` na configuração de Downlights
- [x] Renderizar botões visuais Redondo (R) / Quadrado (Q) antes dos outros filtros de Downlight
- [x] Filtrar produtos de Downlight pela letra R ou Q no nome do produto
- [x] Limpar seleção de produto ao trocar o formato
- [x] Garantir que o seletor de formato aparece logo após selecionar a categoria Downlights

## Lote 9 — Fórmula DIFAL/FCP por dentro (25/06/2026)

- [x] Corrigir cálculo de DIFAL no Cart.tsx para usar fórmula por dentro: `difalAcrescimo = totalFinal / (1 - DIFAL%) - totalFinal`
- [x] Corrigir cálculo de FCP no Cart.tsx para usar fórmula por dentro: `fcpAcrescimo = totalComDifal / (1 - FCP%) - totalComDifal`
- [x] Corrigir cálculo de DIFAL/FCP no QuoteDetail.tsx com a mesma fórmula
- [x] Corrigir o totalFinal salvo no banco ao criar/editar orçamento para incluir DIFAL/FCP por dentro
- [x] Corrigir exibição do total com DIFAL/FCP na pré-visualização e Excel

## Lote 10 — Acessório, Fallback de Preço e Edição Manual (25/06/2026)

- [x] Corrigir botão "Incluir Acessório" que não aparece na UI
- [x] Fallback para preço por metro linear quando API não retornar custo/markup para perfis
- [x] Permitir edição manual de preço no carrinho para produtos sem preço na API nem no banco estático (não-perfis)
- [x] Permitir edição manual de preço no editor de orçamento salvo para os mesmos produtos

## Lote 11 — Desmembramento de Drivers no Excel/Pré-visualização (25/06/2026)

- [x] Adicionar interface DriverLine ao CartItemData (cartTypes.ts)
- [x] Criar lumPriceMap para mapear custo/markup de Downlights, Spots, Painéis, Arandelas, Área Externa, Balizadores e Decorativas via API
- [x] Criar função buildLumDriverLines para calcular driverLines e priceWithoutDriver
- [x] Popular driverLines nos itens Downlight, Spot, Painel, Arandela, Área Externa, Balizador, Decorativa
- [x] Renderizar sub-linhas de driver no quoteExcelGenerator.ts (fundo laranja claro, modelo, código, qtd, preço)
- [x] Adicionar totais "Total sem driver" e "Total drivers" no rodapé do Excel
- [x] Renderizar sub-linhas de driver no ExcelPreviewModal.tsx (fundo laranja claro, modelo, código, qtd, preço)
- [x] Adicionar totais "Total sem driver" e "Total drivers" no rodapé da pré-visualização
- [x] Garantir retrocompatibilidade: orçamentos sem driverLines não são afetados

## Lote 12 — Fator de Correção de Potência para Perfis (25/06/2026)

- [x] Aplicar fator de correção de potência na função getSkuPreco: 26W = +5%, 36W = +10% sobre o custo antes do markup

## Lote 13 — Separação completa de preços luminária/driver (25/06/2026)

- [x] Adicionar campos unitPriceLuminaria, unitPriceDriver, luminariaHasApiPrice ao CartItemData
- [x] Atualizar buildLumDriverLines para calcular priceWithoutDriver mesmo quando custoCorpo é null
- [x] Popular campos em todos os blocos de criação de item (Downlight, Spot, Painel, Arandela, Área Externa, Balizador, Decorativa)
- [x] Exibir preços separados de luminária e driver no carrinho com campo editável para luminária sem preço API
- [x] Modal de edição: campo separado para preço da luminária (editável) e driver (somente leitura)
- [x] Excel: linha principal mostra preço da luminária, sub-linha mostra driver com preço
- [x] Pré-visualização: linha principal mostra preço da luminária, sub-linha mostra driver com preço
- [x] Totais "Total sem driver" e "Total drivers" no rodapé do Excel e da pré-visualização

## Lote 14 — Exibição de totais luminária/driver no carrinho e configurador (25/06/2026)

- [x] Corrigir exibição do driver no carrinho: mostrar total (qty × unitPrice) em vez de preço unitário
- [x] Exibir subtotais "Luminárias" e "Drivers" no rodapé do carrinho
- [x] Exibir totais luminária/driver/geral no card de resultado do configurador (Downlight, Área Externa, Painel, Arandela, Spot, Balizador Fixo, Decorativa) antes de enviar ao carrinho
- [x] Mostrar "LUMINÁRIAS: A DEFINIR" quando API não retorna custo do corpo

## Lote 15 — Correção de preço BAGEO SINUOSA P D1 40W/M (25/06/2026)

- [x] Adicionar BAGEO SINUOSA P D1 40W/M ao catálogo estático (bageoCatalog.ts) com precoOnOff220: 1140 (R$1.140,00/m)
- [x] Todos os controles (ON/OFF 220V, ON/OFF Bivolt, DIM 1-10V, DIM DALI) com preço R$1.140,00/m
- [x] Drivers configurados: EQ00112 (ON/OFF), EQ00583 (DIM TRIAC), EQ00666 (DIM DALI)
- [x] Preço estático sobrescreve o valor incorreto R$910,00 retornado pela API até correção no backend

## Lote 16 — Correção de precificação LED BAR (25/06/2026)

- [x] Adicionar campos custoDriver220/Bivolt/Dim010v/DimDali/DimTriac110v/DimTriac220v/markupMinimoDriver à interface LedBarProduct
- [x] Populá-los no toLedBarProduct no alfaluxApiAdapter.ts
- [x] Atualizar calcLedBarPrice e calcLedBarPriceDetail para aceitar custoDriverApi e markupDriver
- [x] Atualizar chamadas em Home.tsx para passar custo do driver da API (por controle selecionado)
- [x] Adicionar LED BAR E, LED BAR 45, LED BAR EC à lista LED_BAR_FAMILIES_NO_PRICE (sem preço de perfil cadastrado)
- [x] Corrigir referência perfilFlexivelTemp → perfilFlexivel na UI

## Lote 17 — Correção do download da pré-visualização (25/06/2026)

- [x] Corrigir download em branco: substituir window.print() por abertura de nova janela com HTML serializado do conteúdo
- [x] Nome do arquivo segue padrão do Excel: "{numero} (RVx) - {obra} - {cliente} rascunho"
- [x] Imagens aguardam carregamento (800ms) antes de acionar print na nova janela
- [x] Fallback de 2500ms caso onload não dispare

## Lote 18 — Preços via API em todas as categorias (26/06/2026)

- [x] Adicionar campos custoCorpo* e markupPadraoDriver* à interface AlfaluxProduct no servidor
- [x] Adicionar dimTriac110v e dimTriac220v ao tipo ControlType no ledEngine
- [x] Corrigir índice do parâmetro lumPriceMap no PriceBreakdownBlock (de [5] para [6])
- [x] Criar componente PriceBreakdownBlock reutilizável (luminária amber + driver blue + total emerald)
- [x] Inserir PriceBreakdownBlock em Downlights, Área Externa, Painéis, Arandelas, Spots, GLOW e BAGEO fixo
- [x] Zero erros TypeScript reais (tsc --noEmit passa limpo)

## Lote 19 — Correção definitiva de preço de luminária (SKU duplicado na API)

- [x] Identificado: SKU `LDE 6450.140.18B` atribuído a dois produtos distintos (LUNA G LED 17W RE e 26W RE) na API
- [x] Causa raiz: `lumPriceMap` usava SKU simples como chave → segundo produto sobrescrevia o primeiro
- [x] Correção: `lumPriceMap` agora usa chave composta `sku||name` para cada entrada
- [x] Fallback: chave simples `sku` mantida apenas para o PRIMEIRO produto com aquele SKU (não sobrescreve)
- [x] `buildLumDriverLines` atualizado para aceitar `productName` e usar chave composta no lookup
- [x] Todos os 15 call sites de `buildLumDriverLines` atualizados para passar `productName`
- [x] Todos os 7 `PriceBreakdownBlock` atualizados para passar `productName`
- [x] `tsc --noEmit` passa com zero erros reais

## Lote 20 — 8 bugs reportados (26/06/2026)

- [x] Trilhos e acessórios: substituir "Vincular ao Produto" por "Enviar ao Carrinho" (criar item independente)
- [x] Carrinho: mostrar montante total de luminária (qty × preço unitário), não só o unitário
- [x] Pavimento: permitir renomear (campo editável inline)
- [x] Drag-and-drop: melhorar fluidez, especialmente arrastar de baixo para cima
- [x] Versão inicial deve ser RV0 (não RV1 ou v1)
- [x] Excel: frete preenchido (ex: R$2.000,00 para RJ) não aparece na folha
- [x] Excel: driver com coluna deslocada (quantidade na coluna de preço unitário), quantidade não condiz com luminárias, preço total errado
- [x] Excel: BLAZE H sem destaque de driver na linha do carrinho (Lum/Driver separados)

## Lote 21 — Bug de preço zerado em Painéis (26/06/2026)

- [x] Painéis com preço definido aparecem com preço 0 no carrinho e "A consultar" no total — não entram no orçamento Excel (corrigido: getPrecoForControle usa custo × markup como fallback quando precoOnOff220 = null)

## Lote 22 — Bugs reportados (26/06/2026)

- [x] BAGEO: não puxa driver e não mostra preço (luminária nem driver) — corrigido: calcPreco prioriza custo×MKP da API; driverQtdPorCorte usa campo da API; D1+D2 mostra 8x por lado (total 16x)
- [ ] Downlights com preço definido: mostram R$0 no modal de edição e "A consultar" no total
- [x] Preço editado manualmente não aparecia na pré-visualização Excel nem no download Excel (itens com driverLines)
- [x] Carrinho: total de drivers não era multiplicado pela quantidade — corrigido: Cart.tsx, QuoteDetail.tsx e quoteExcelGenerator.ts agora incluem driverLines no total
- [ ] Perfis: driver não separado no orçamento Excel (linha de driver sem destaque)
- [ ] Pré-visualização Excel: colunas deslocadas na linha de driver (QTD na coluna errada, linha de obra azul ganha coluna extra)
- [ ] Carrinho: não permite renomear pavimento diretamente no carrinho
- [ ] Markup mínimo e máximo: onde editar no sistema?

## Histórico completo de revisões (29/06/2026)
- [x] Endpoint tRPC `quotes.getRevisionItems` para buscar itens de uma revisão específica
- [x] Função `getRevisionItems(versionId)` no db.ts
- [x] Seção "Histórico de Revisões" exibe botões "Ver" e "Excel" em cada linha
- [x] Modal de visualização de itens de revisão histórica com total calculado
- [x] Download de Excel de qualquer revisão histórica com dados corretos (RV, data, cabeçalho)
- [x] Revisões antigas já salvas no banco são acessíveis automaticamente (itens já estavam armazenados)

## Status "Faturado" e painel de metas (29/06/2026)

- [x] Adicionar valor `invoiced` ao enum de status no schema (migração 0014)
- [x] Adicionar coluna `invoicedAt` na tabela quotes (migração 0015)
- [x] `getManagerDashboard` retorna `invoicedTotals`, `monthlyInvoiced`, `invoicedBySeller`
- [x] routers.ts: enum de status inclui `invoiced`
- [x] Quotes.tsx: badge roxo "Faturado", filtro e card de estatística
- [x] QuoteDetail.tsx: opção "Faturado" no seletor de status + exibição de `invoicedAt`
- [x] Dashboard.tsx: `annualInvoiced` calculado a partir de `monthlyInvoiced`
- [x] Dashboard: meta anual baseada em faturado (NF), aprovado como info secundária
- [x] Dashboard: metas mensais mostram faturado (NF) + aprovado por mês

## Número de Pedido e Empresa Faturadora (29/06/2026)

- [x] Migração: adicionar coluna `orderNumber` (varchar 6) na tabela quotes
- [x] Migração: adicionar coluna `billingCompany` (enum: alfalux, primelux, decada, primelase, luminew) na tabela quotes
- [x] Schema Drizzle: orderNumber + billingCompany
- [x] routers.ts: updateQuoteStatus aceita orderNumber + billingCompany ao fechar (approved)
- [x] routers.ts: validação — orderNumber obrigatório ao mudar para approved; billingCompany obrigatório
- [x] QuoteDetail.tsx: modal obrigatório ao selecionar status "Fechado" com campo orderNumber + billingCompany
- [x] QuoteDetail.tsx: trava — status "Faturado" só habilitado se status atual for "approved"
- [x] QuoteDetail.tsx: exibir orderNumber e billingCompany no cabeçalho do orçamento
- [x] Ficha de produção (orderSummary.ts): campo Pedido usa orderNumber em vez do número do orçamento
- [ ] Dashboard: exibir breakdown de faturamento por empresa (billingCompany)

## Pré-visualização do Pedido de Fábrica (29/06/2026)

- [x] Criar lib/orderPreviewGenerator.ts: gera HTML da ficha técnica de produção (mesmo layout do Excel)
- [x] Criar components/OrderPreviewModal.tsx: modal com iframe/HTML renderizado + botão Imprimir
- [x] QuoteDetail.tsx: botão "Pré-visualizar Pedido" abre modal de pré-visualização antes de gerar Excel
- [x] Seleção de empresa (ALFALUX/LUMINEW) integrada ao fluxo de pré-visualização
- [x] Botão "Gerar Excel" disponível dentro do modal de pré-visualização para oficializar

## Categoria "Customizados" (29/06/2026)

- [x] Home.tsx: faixa horizontal "Customizados" abaixo das categorias existentes
- [x] Home.tsx: ao clicar na faixa, exibir painel de configuração de produto customizado
- [x] Home.tsx: buscar produtos com category="Customizados" da API e listar para seleção
- [ ] Home.tsx: formulário de configuração (produto, qty, cor, observações, cliente específico)
- [ ] cartTypes.ts: suporte a category="Customizados" no CartItemData
- [ ] Excel/ficha de produção: tratar itens Customizados corretamente

## Correção de Duplicação de Orçamento (29/06/2026)

- [x] Ao duplicar orçamento, gerar novo número sequencial no formato correto (sem prefixo ORC...)
- [x] Campo de número do orçamento editável pelo usuário dentro do formato especificado
- [x] Validação de unicidade: impedir salvar dois orçamentos com o mesmo número, avisar imediatamente

## Exportação / Backup (30/06/2026)

- [x] Backend: endpoint admin para exportar banco de dados completo em SQL
- [x] Backend: endpoint admin para exportar orçamentos + itens em Excel
- [x] Frontend: página /backup acessível apenas para admin com botões de exportação
- [x] Menu lateral: link para /backup visível apenas para admins

## Restrição de Acesso por Domínio (30/06/2026)

- [x] Backend: bloquear login de e-mails fora do domínio @grupoalfalux.com.br no callback OAuth
- [x] Backend: retornar erro claro quando domínio não permitido
- [x] Frontend: guard de autenticação em todas as rotas (redirecionar para login se não autenticado)
- [x] Frontend: tela de "Acesso Negado" para usuários com domínio inválido

## Correção de Preço para Composições EM L (30/06/2026)

- [x] Investigar categoria dos cantos EM L na API (confirmado: categoria=PERFIS, SKUs com padrão 1L1)
- [x] Identificar bug: ShapeResultCard não recebia prop skuPriceMap — usava apenas catálogo estático
- [x] Adicionar prop skuPriceMap ao ShapeResultCard
- [x] Substituir cálculo estático (getStaticPricePerMeter) por cálculo por SKU individual via API
- [x] Calcular preço de cada peça (incluindo cantos EM L) como custoCorpoOnoff220v × markupPadraoOnoff220v
- [x] Fallback para catálogo estático quando algum SKU não tem dados na API
- [x] Indicar na UI se o preço veio da API ou do catálogo estático
- [x] Passar skuPriceMap na chamada de ShapeResultCard (linha ~7224 do Home.tsx)
- [x] Atualizar priceFromApi no CartItemData para refletir a fonte do preço

## Edição Manual de Preço para Produtos sem Custo na API (30/06/2026)

- [x] Cart.tsx: quando unitPrice=null e priceFromApi=false → campo editável com destaque e mensagem clara para todos os usuários
- [x] ShapeResultCard (Home.tsx): quando precoTotal=null → campo de entrada de preço manual visível para todos
- [x] Resultados de downlight/painel/spot/arandela/LED BAR (Home.tsx): quando preço=null → unitPrice preservado como null (editável no carrinho para todos os usuários)
- [ ] QuoteDetail.tsx: quando totalPrice=null → campo manual editável para todos (não apenas admin/gerente)

## Backup Automático Diário (30/06/2026)

- [x] Ler skill de agendamento (automation-and-scheduling) antes de implementar
- [x] Backend: job agendado diário que gera export SQL completo do banco
- [x] Backend: job agendado diário que gera Excel com todos os orçamentos + itens
- [x] Backend: salvar arquivos de backup no S3 com timestamp no nome
- [x] Backend: tabela `backups` no banco para registrar histórico (data, tipo, tamanho, url)
- [x] Frontend: página /backup (admin only) com lista de backups disponíveis e botão de download
- [x] Frontend: link para /backup no menu lateral (apenas admins)
- [x] Frontend: indicador de último backup bem-sucedido no dashboard

## Formato em U e Corre\u00e7\u00e3o de Barras Quebradas em Formas (30/06/2026)

- [x] Corrigir buildShapeComposition: barras quebradas devem vir dos ML, não dos cantos (cantos sempre inteiros)
- [x] Implementar formato em U na UI (novo botão de forma ao lado de L/quadrado/retangular)
- [x] Implementar cálculo de composição em U: 2 cantos EM L + ML para 3 lados (lado1 + base + lado2)
- [x] Exibir resultado do formato em U no ShapeResultCard com peças detalhadas
- [x] Adicionar formato U ao carrinho (handleAddToCart) — já funciona via shapeLabel/dimensionLabel/totalLengthMm

## Refinamento do Pedido de Fábrica (30/06/2026)

- [x] Schema: tabela `factory_order_excels` para histórico de Excels gerados
- [x] Schema: `orderNumber` alterado para varchar(6) na tabela `factory_orders`
- [x] `generateOrderExcel` retorna ArrayBuffer além de fazer download
- [x] `createFactoryOrderExcel` e `listFactoryOrderExcels` adicionados ao db.ts
- [x] Endpoints `factoryOrders.saveExcel` e `factoryOrders.listExcels` adicionados ao routers.ts
- [x] FactoryOrderDetail.tsx: validação 6 dígitos numéricos para campo orderNumber
- [x] FactoryOrderDetail.tsx: botão Gerar Excel bloqueado até número de 6 dígitos ser preenchido
- [x] FactoryOrderDetail.tsx: upload automático do Excel para S3 após geração
- [x] FactoryOrderDetail.tsx: histórico de Excels gerados com data e botão de download
- [x] FactoryOrderDetail.tsx: placeholder e validação visual (borda vermelha) para campo orderNumber
- [x] FactoryOrderDetail.tsx: input só aceita dígitos numéricos (máximo 6)

## Melhorias no Pedido de Fábrica — CCT, Revisões e Alertas (01/07/2026)

- [x] FactoryOrderDetail.tsx: campo CCT como dropdown (2700K, 3000K, 4000K, 5000K + "Outra" com input livre)
- [x] FactoryOrderDetail.tsx: para itens não-especiais, filtrar CCTs disponíveis via availableCCTs da API
- [x] FactoryOrderDetail.tsx: para itens especiais, sempre mostrar todas as opções de CCT
- [x] FactoryOrderDetail.tsx: remover botão "Nova Revisão" manual do header
- [x] FactoryOrderDetail.tsx: nova revisão criada automaticamente ao gerar Excel quando há alterações
- [x] FactoryOrderDetail.tsx: nova revisão herda o mesmo orderNumber da revisão anterior
- [x] db.ts: createFactoryOrderRevision propaga orderNumber da revisão anterior
- [x] FactoryOrderDetail.tsx: aviso de confirmação antes de gerar Excel alertando sobre itens pendentes (equipamentos/cor/CCT a definir)

## Correção de Timezone — Sempre Horário de Brasília (UTC-3) (30/06/2026)

- [x] Identificar todos os pontos onde new Date() ou CURRENT_TIMESTAMP geram datas no sistema
- [x] Criar/atualizar utilitário nowBrasilia() que retorna a data/hora atual no fuso de Brasília
- [x] Corrigir dateUtils.ts: toBrasiliaDate e funções relacionadas para usar timezone correto
- [x] Corrigir geração de quoteNumber (ano/mês) para usar data de Brasília
- [x] Corrigir todos os campos de data exibidos no frontend para usar horário de Brasília
- [x] Garantir que createdAt exibido em orçamentos, pedidos e histórico use Brasília

## Numeração Automática de Orçamentos por Vendedor (01/07/2026)

- [ ] Criar tabela quote_number_sequences no schema (vendorId, prefix, nextSeq, year)
- [ ] Aplicar migration SQL e popular com os números iniciais de cada vendedor
- [ ] Backend: getNextQuoteNumber busca/incrementa sequência por vendedor atomicamente
- [ ] Backend: createQuote usa getNextQuoteNumber em vez de generateQuoteNumber
- [ ] Frontend: remover campo de edição manual do número do orçamento no Cart.tsx

## Correção de Separação de Drivers — LED BAR / Perfil Flexível / Meia Lua / Milano (01/07/2026)

- [x] Investigar por que LED BAR, Perfil Flexível, Meia Lua e Milano não separam drivers no orçamento
- [x] Corrigir lógica de separação de drivers para essas linhas (igual aos demais produtos)

## Correções de Orçamento — Preço Perfil Flexível / Margem / Frete (01/07/2026)

- [x] Perfil Flexível: aplicar preço fixo R$157,00/m para 5W/m e 10W/m (sem driver, sem API)
- [x] Verificar e corrigir margem individual por produto (itemMarginPercent) no Excel e Preview
- [x] Verificar diluição proporcional do frete (estava correta)
- [x] Corrigir total do orçamento para incluir o frete (sistema, preview e Excel)

## Configurador SPACE Genérico — Painéis Tensionados (01/07/2026)

- [x] Criar biblioteca spaceCalculator.ts com fórmulas de cálculo SPACE (Space R, Space Q, Space Ret)
- [x] Importar spaceCalculator no Home.tsx
- [x] Adicionar estados do configurador SPACE (formato, diâmetro, largura, comprimento, potência, CCT, resultado)
- [x] Detectar produtos SPACE genéricos no catálogo de Painéis (família SPACE + nome contém GENÉRICA)
- [x] Inserir UI do configurador SPACE na seção de Painéis (formato, dimensões, potência, CCT)
- [x] Botão "Calcular SPACE" para produtos genéricos (substitui "Calcular Painél" quando SPACE genérico selecionado)
- [x] Bloco de resultado SPACE com metragem, área da tela, potência total, fluxo útil e driver
- [x] Resumo para Orçamento SPACE com botão copiar e enviar ao carrinho
- [x] Resumo para Pedido SPACE com todos os dados técnicos
- [x] Estado vazio de Painéis atualizado para mencionar SPACE genérico
- [x] Verificar exibição no browser e testar fluxo completo

## Correções de Vendedor e Número de Orçamento

- [x] Corrigir bumpVersion=false→true no dialog de edição do QuoteDetail (vendedor/assistente não salvava)
- [x] Gerar novo número automaticamente no servidor quando seller1Id muda (prefixo do novo vendedor)
- [x] Liberar campo de número do orçamento para edição manual no dialog de edição do QuoteDetail (orçamentos já salvos)
- [x] Corrigir duplicação: permitir alterar vendedor e gerar novo número com prefixo correto

## Correções SPACE e Duplicação (Jul 2026)

- [x] Substituir produtos SPACE genéricos no dropdown por opção única "SPACE Customizada"
- [x] Ao selecionar "SPACE Customizada", ativar modo de cálculo SPACE (igual ao fluxo atual com genéricas)
- [x] Corrigir bug de duplicação com troca de vendedor (staleTime: 0 no suggestNumberQuery)

## Correções de Duplicação — Assistente e RV0 (Jul 2026)

- [x] Adicionar seletor de assistente no dialog de duplicação (QuoteDetail.tsx)
- [x] Corrigir RV0 do histórico de revisões: usar vendorName/assistantName do novo orçamento (não do original)
- [x] Atualizar routers.ts: aceitar newAssistantId e newAssistantName no input do duplicate
- [x] Atualizar db.ts: duplicateQuote aceita newAssistantId/newAssistantName e usa no RV0

## Corrente de Programação do Driver (Jul 2026)

- [x] Adicionar campo corrente às interfaces PainelDriver, ArandelaDriver e SpotDriver
- [x] Adicionar campo corrente às interfaces DownlightDriver, BageoDriverInfo (já existia em DownlightDriver)
- [x] Adicionar campo markupMinimo à interface DownlightProduct para compatibilidade com getCustoForControle
- [x] Passar driverCorrente nas chamadas de buildLumDriverLines para Decorativas, Balizadores, Perfis BAGEO/GLOW
- [x] orderPreviewGenerator.ts: exibir corrente como "PROGRAMAÇÃO: XXX" em itálico na coluna de equipamentos da ficha de produção (somente)
- [x] orderExcelGenerator.ts: exibir corrente como "PROGRAMAÇÃO: XXX" na célula de equipamentos do Excel (somente)
- [x] Confirmar que corrente NÃO aparece em nenhum outro lugar (orçamento, preview de orçamento, etc.)

## Rodapé da Ficha de Produção — Data/Hora/Revisão (Jul 2026)

- [x] orderPreviewGenerator.ts: adicionar rodapé fixo em todas as páginas com data, hora (Brasília) e revisão do pedido no momento do download
- [x] orderExcelGenerator.ts: adicionar rodapé (headerFooter) com data, hora (Brasília) e revisão do pedido em todas as páginas do Excel

## Correção de Subtotal (qty × valor unitário) — Jul 2026

- [x] Investigar onde subtotal é calculado no Excel, carrinho, orçamento e preview
- [x] Corrigir subtotal no Excel do orçamento (quoteExcelGenerator.ts): priceWithoutDriver × qty para itens com driverLines
- [x] Corrigir subtotal no carrinho (Cart.tsx): exibição e soma total com priceWithoutDriver × qty
- [x] Corrigir subtotal na tela do orçamento (QuoteDetail.tsx): lumTotalDisplay e totalLuminaria com priceWithoutDriver × qty
- [x] Corrigir subtotal na pré-visualização do Excel (ExcelPreviewModal.tsx): priceWithoutDriver × qty
- [x] Corrigir ColorPickerModal (Home.tsx): recalcular priceWithoutDriver e driverLines com effectiveQty ao salvar novos itens

## Correção de Drivers de Perfis via API — Jul 2026

- [x] ProfileVariant: adicionar campos driver220/driverBivolt/driverDimDali/driverDim110v à interface
- [x] profileApiAdapter.ts: incluir driver220/driverBivolt no variantMap e catálogo final
- [x] ledEngine.ts: CompositionInput recebe driver220/driverBivolt; applyDimDriver usa driver da API para ON/OFF e DIM
- [x] lEngine.ts: ShapeDriverParams recebe controlType e campos driver; calcPieceDriver usa driver da API
- [x] Home.tsx: calculateComposition e ShapeDriverParams passam driver220/driverBivolt/controlType

## Bug: Multiplicação incorreta do preço do driver no orçamento — Jul 2026

- [x] Investigar: driver EQ00346 mostra R$93,33/un mas total R$58.333,33 (25 × 25 × 93,33 = qty²)
- [x] Causa raiz: driverQty e driverTotalPrice em perfis lineares e LED BAR eram calculados com globalQty incluído, mas ColorPickerModal reescalava novamente por effectiveQty
- [x] Corrigir Home.tsx: driverQty = nModules (por luminária), driverTotalPrice = precoDriverTotal (por luminária) — ColorPickerModal escala corretamente
- [x] Corrigir Home.tsx LED BAR: driverQty = r.nCortes (por unidade), driverTotalPrice = precoDriverPorCorte × r.nCortes (por unidade)

## BAGEO Sinuosa — Lógica de Cortes (máx 2000mm) — Jul 2026

- [x] bageoCatalog.ts: adicionar BAGEO_MAX_LENGTH_MM = 2000; adicionar nCortes e comprimentoPorCorte ao BageoResult
- [x] bageoCatalog.ts: calculateBageo recebe nCortes como input; calcula comprimentoPorCorte = ceil(comprimento / nCortes); valida que comprimentoPorCorte <= 2000mm
- [x] bageoCatalog.ts: precoTotal = precoPorMetro × comprimentoMetros (igual ao atual — cobrado pelo total, não por corte)
- [x] Home.tsx: adicionar estado bgNCortes; calcular bgRequiresCuts (comprimento > 2000mm); calcular bgMinCortesNecessarios; validar bgTrechoExcede
- [x] Home.tsx: exibir campo "Quantidade de Cortes" na UI (igual LED BAR) com aviso quando obrigatório
- [x] Home.tsx: passar nCortes para calculateBageo; exibir nCortes e comprimentoPorCorte no resultado
- [x] Home.tsx: atualizar orderSummary/quoteSummary para incluir informação de cortes
- [x] Home.tsx: atualizar CartItemData para incluir ledBarNCortes (reutilizar campo existente)
- [x] Atualizar testes bageoCatalog.test.ts para cobrir lógica de cortes

## BAGEO Sinuosa — Driver Separado (Jul 2026)

- [x] bageoCatalog.ts: BAGEO_MAX_LENGTH_MM = 2000; nCortes e comprimentoPorCorte no BageoResult
- [x] bageoCatalog.ts: calculateBageo recebe nCortes opcional; calcula minCortes automaticamente; comprimentoPorCorte = ceil(comprimento / nCortes)
- [x] bageoCatalog.ts: precoTotal = precoPerfil + precoDriverTotal (corpo separado do driver)
- [x] bageoCatalog.ts: precoDriverPorUnidade e precoDriverTotal calculados via custoDriver × markupDriver
- [x] alfaluxApiAdapter.ts: toBageoProduct inclui custoDriver220/Bivolt/DimDali e markupDriver* fields
- [x] Home.tsx: campo "Quantidade de Cortes" sempre visível para BAGEO sinuosa (obrigatório)
- [x] Home.tsx: bloco de resultado mostra cortes sempre visíveis com nCortes e comprimentoPorCorte
- [x] Home.tsx: driver exibe precoDriverPorUnidade × driverQtd = precoDriverTotal
- [x] Home.tsx: resumo de preço exibe Corpo + Driver separados (igual LED BAR)
- [x] Home.tsx: CartItemData com driverLines para BAGEO sinuosa quando API tem custo de driver
- [x] QuoteDetail.tsx: driverLines já tratado genericamente — funciona para BAGEO sem alteração
- [x] quoteExcelGenerator.ts: driverLines já tratado genericamente — funciona para BAGEO sem alteração
- [x] bageoCatalog.test.ts: testes atualizados para cobrir nCortes automático e precoTotal com driver
- [x] bageoCatalog.ts: remover DRIVER_INTERVAL_MM estático; usar driverQtd220/Bivolt/Dim110v/DimDali da API (soberana) para driverQtdPorCorte; fallback conservador = 1 quando API não tem o campo
- [x] alfaluxApiAdapter.ts: toBageoProduct mapeia driverQtd220/Bivolt/Dim110v/DimDali da API para BageoProduct
- [x] alfaluxApiAdapter.ts: toBageoProduct usa precoOnOff220D1D2 para D1+D2 e precoOnOff220D1 para D1 (API soberana nos preços por aplicação)

## Correção de Totais com Drivers + Opção Cliente Retira — Jul 2026
- [x] QuoteDetail.tsx: editTotalBase (linha ~884) corrigido para incluir driverLines no total base (RT/Margem)
- [x] QuoteDetail.tsx: editableItems total no rodapé do modal de edição corrigido para incluir driverLines
- [x] QuoteDetail.tsx: totalBase no onClick do botão Salvar do modal de edição corrigido para incluir driverLines
- [x] quoteExcelGenerator.ts: coluna N (PREÇO TOTAL por item) corrigida para incluir totais de drivers (_driversTotalForItem + _totalForLuminaria)
- [x] Adicionar opção "Cliente Retira (R$ 0,00)" no seletor de tipo de frete
- [x] drizzle/schema.ts: enum freteType expandido para incluir 'pickup'
- [x] server/db.ts: SaveQuoteInput.freteType expandido para incluir 'pickup'
- [x] server/routers.ts: z.enum de freteType expandido para incluir 'pickup'
- [x] client/src/lib/cartTypes.ts: QuoteFormData.freteType expandido para incluir 'pickup'

## Correção — Regras IF/ML para formatos especiais (07/07/2026)
- [x] lEngine.ts: collectAllModules deve aceitar filtro de tipo `ML | IF | both`
- [x] lEngine.ts: findBestSegmentOptimal deve repassar filtro de tipo para restringir módulos por formato
- [x] Formato L: usar exatamente 2 módulos IF (um em cada extremidade) e preencher o restante apenas com ML
- [x] Formato U: usar exatamente 2 módulos IF (um em cada extremidade abertas) e preencher o restante apenas com ML
- [x] Formato Quadrado: usar apenas módulos ML com cantos 1L1 (sem IF)
- [x] Formato Retangular: usar apenas módulos ML com cantos 1L1 (sem IF)
- [x] lEngine.ts: separar peças IF como `STRAIGHT_IF` e manter ML como `STRAIGHT_ML` nas descrições e no summary
- [x] quoteExcelGenerator.ts: buildFreteText trata freteType='pickup' → "Cliente Retira — Frete R$ 0,00"
- [x] QuoteDetail.tsx: ao selecionar "Cliente Retira", freteValue é zerado automaticamente

## Correção BAGEO D1 40W/M (06/07/2026)
- [x] BAGEO: colisão de value no Select entre D1 20W/M e D1 40W/M (mesmo SKU/aplicação) — corrigido: Select usa nome do produto como discriminador
- [x] BAGEO: ledModuleQtd genérico (=2) ignorava campos por CCT (=4) para 40W/M — corrigido: calculateBageo usa ledModuleQtd2700/3000/4000/5000 quando disponível
- [x] BAGEO: ledModule por CCT da API agora usado diretamente (sem substituição de [CCT]) quando disponível
- [x] BAGEO: driverQtdBivolt=2 para D1 40W/M (2 fontes por corte) já funcionava via API — confirmado
- [x] BAGEO: 4 novos testes vitest cobrindo D1 40W/M com ledModuleQtd por CCT e não-colisão de SKU

## Bugs reportados (06/07/2026)
- [x] Orçamento: campo de observação não aparecia no preview/Excel — corrigido: adicionado em ExcelPreviewModal e quoteExcelGenerator
- [x] Orçamento: número digitado pelo usuário era substituído pelo sequencial automático — corrigido: createQuote agora usa o número do usuário quando fornecido

## Bugs reportados — edição no orçamento salvo (06/07/2026)
- [x] QuoteDetail: campo itemObs (observação por item) não era editável após orçamento salvo — corrigido: adicionado ao SortableEditItem
- [x] QuoteDetail: checkbox itemObsShowInExcel não era editável após orçamento salvo — corrigido: adicionado ao SortableEditItem
- [x] QuoteDetail: barra de markup (itemMarginPercent) não era editável após orçamento salvo — corrigido: adicionado ao SortableEditItem
- [x] QuoteDetail: todos os campos editáveis do Cart.tsx devem ser editáveis também no QuoteDetail — corrigido

## Bug crítico — perda de dados ao editar orçamento (06/07/2026)
- [x] Editar orçamento: DIFAL, FCP, localidade de entrega e campos de frete são perdidos ao salvar e reabrir
- [x] Editar orçamento: campos de DIFAL/FCP devem sincronizar localidade para a aba Frete

## Reformulação DIFAL/FCP (06/07/2026)
- [x] DIFAL/FCP: usar alíquota combinada (DIFAL+FCP) em campo único por estado
- [x] DIFAL/FCP: fórmula "por dentro" — total = (produtos + frete) ÷ (1 - alíquota_combinada)
- [x] DIFAL/FCP: incluir frete na base de cálculo antes de aplicar DIFAL/FCP
- [x] DIFAL/FCP: UI unificada — um único checkbox "Aplicar DIFAL/FCP", sem checkbox separado por imposto
- [x] DIFAL/FCP: exibir alíquota combinada e valor resultante no resumo do orçamento
- [x] DIFAL/FCP: corrigir em Home.tsx (carrinho), QuoteDetail.tsx, quoteExcelGenerator.ts e ExcelPreviewModal.tsx

## Controle de visibilidade de comissão (06/07/2026)
- [x] server/routers.ts: getById retorna canSeeCommission e canEditCommission baseado em role/email do usuário vs sellers do orçamento
- [x] Cart.tsx: comissão padrão 5% geral, 10% para Gustavo Gatti; divisão igual quando 2 vendedores
- [x] Cart.tsx: blocos de comissão (1º e 2º vendedor) ocultos para não-managers com {isManagerUser && ...}
- [x] QuoteDetail.tsx: bloco de comissão na view de detalhes oculto para quem não tem canSeeCommission
- [x] QuoteDetail.tsx: campos de comissão no formulário de edição ocultos para quem não tem canSeeCommission; readOnly/disabled para quem não tem canEditCommission
- [x] Dashboard.tsx: seção de comissões já protegida por isManager (confirmado)
- [x] salesReportGenerator.ts: exportação de relatório com comissões já protegida por isManager no Dashboard (confirmado)
- [x] QuoteList.tsx: não exibe dados de comissão (confirmado)

## Acessórios como produtos independentes (06/07/2026)
- [x] handleAddAcessorioItem: quando productCategory === "Acessórios", sempre adicionar como item independente (nunca vincular a produto pai)
- [x] Painel de resultado de acessórios: adicionar campo de quantidade antes do botão "Adicionar ao Carrinho"
- [x] handleAddAcessorioItem: usar a quantidade informada no painel ao adicionar como item independente
- [x] handleAddAcessorioItem: usar globalQty como quantidade padrão ao adicionar como item independente

## Correção NotFoundError removeChild — emojis no JSX (07/07/2026)
- [x] Quotes.tsx: substituir emoji 👤 por ícone SVG (causa crash com Google Tradutor)
- [x] Cart.tsx: substituir emojis 🎨 🏢 📋 ⚠️ por ícones SVG ou spans com translate="no"
- [x] QuoteDetail.tsx: substituir emojis 👤 📞 📁 ✏️ 📅 🔄 ✅ 📋 💰 🔒 ⚡ por ícones SVG
- [x] Home.tsx: substituir emojis ⚠️ 🔧 ⚡ por ícones SVG
- [x] ExcelPreviewModal.tsx: substituir emoji ⚠️ por texto simples
- [x] ledEngine.ts: remover emojis ⚠️ de strings de engineeringNotes
- [x] Adicionar translate="no" no index.html para prevenir traduções automáticas que causam removeChild

## Correção duplicação de drivers no total do orçamento (07/07/2026)
- [x] quoteExcelGenerator.ts: corrigir totalBase — usar calcItemLumTotal (priceWithoutDriver) + calcItemDrvTotal em vez de totalPrice + calcItemDrvTotal (duplicava drivers)
- [x] quoteExcelGenerator.ts: corrigir _totalBaseParaFrete com mesma lógica
- [x] ExcelPreviewModal.tsx: corrigir totalBase — mesma duplicação de drivers corrigida

## Melhoria algoritmo composição formas especiais (07/07/2026)
- [x] lEngine.ts: substituir greedy por busca exaustiva (DP) para maximizar preenchimento em formatos L/quadrado/retangular/U
- [x] lEngine.ts: incluir módulos ML e IF combinados na busca para formatos especiais
- [x] lEngine.ts: incluir módulos de 1 barra (minBars=1) na busca para formatos especiais
- [x] lEngine.ts: preferir ML sobre IF quando ambos têm comprimento similar (consistência)

## Preço de módulos em formatos especiais (07/07/2026)
- [x] Investigar como modulePriceResult é calculado para formatos especiais em ledEngine.ts
- [x] Garantir que cada módulo (canto 1L1 + retos) tenha preço buscado na API individualmente
- [x] Garantir que driver seja destacado separadamente no preço de formatos especiais
- [x] Verificar se priceWithoutDriver e driverLines são corretamente populados para formatos especiais

## Regras IF/ML obrigatórias por formato (07/07/2026)
- [x] lEngine.ts: collectAllModules aceita filtro de tipo `ML | IF | both`
- [x] lEngine.ts: findBestSegmentOptimal aceita parâmetro allowSmallModules para desabilitar módulos de 1 barra
- [x] lEngine.ts: findBestEndCappedSegment filtra IFs de 1 barra (exige bars >= 2 para composições EM L/U)
- [x] Formato L: exatamente 2 módulos IF de 2+ barras (1 por extremidade) + ML para o restante
- [x] Formato U: exatamente 2 módulos IF de 2+ barras (1 por extremidade aberta) + ML para o restante
- [x] Formato Quadrado: apenas módulos ML com cantos 1L1 (sem IF, sem módulos de 1 barra)
- [x] Formato Retangular: apenas módulos ML com cantos 1L1 (sem IF, sem módulos de 1 barra)
- [x] Fallback para canto sozinho (sem espaço para IF): retornar resultado com cabeceira (perfis embutir)
- [x] Atualizar testes para refletir as novas regras IF/ML

## Correção — Otimização de comprimento em formatos especiais (07/07/2026)
- [x] lEngine.ts: remover filtro MAX_IF_LENGTH_STANDARD de collectAllModules (IF/ML de 6 barras agora sempre disponíveis em formas especiais, independente de allowLongModules)
- [x] lEngine.ts: corrigir critério de seleção em findBestEndCappedSegment — prioridade: 1) menor desvio (maior comprimento), 2) menos peças

## Detalhamento de Preços (07/07/2026)
- [x] Home.tsx: adicionar painel "Detalhamento de Preços" abaixo do resumo de orçamento para formatos especiais (L/U/Quadrado/Retangular), mostrando SKU, tipo, comprimento, barras, preço lum., preço drv., subtotal — sem exibir markup
- [x] Home.tsx: adicionar painel "Detalhamento de Preços" para perfis lineares retos (usando modulePriceResult.breakdown)

## Correção — Bug itemMarginPercent (07/07/2026)
- [x] Cart.tsx: corrigir lógica de salvamento de margem individual — parseFloat("0") || undefined retornava undefined (0 é falsy); agora: campo vazio → undefined (usa margem global), campo com valor incluindo "0" → salva explicitamente como número; mínimo sempre 0% via Math.max(0, parsed)

## Correção — Módulos longos em formatos especiais (07/07/2026)
- [x] lEngine.ts: collectAllModules agora respeita allowLongModules — módulos com comprimento > 2840mm (6 barras) só são incluídos quando o usuário habilita "Permitir Módulos Longos"; antes eram sempre disponíveis em formatos especiais (L/U/Quadrado/Retangular)
- [x] lEngine.test.ts: 3 novos testes cobrindo allowLongModules=false para calculateSquare e calculateRectangle

## Correção — Margem individual não afetava preço no carrinho (07/07/2026)
- [x] Cart.tsx: criar helper applyItemMargin(base, itemMarginPercent) que aplica margem individual por fórmula de markup (base / (1 - pct))
- [x] Cart.tsx: totalGeral agora aplica applyItemMargin por item antes de somar (margem individual entra no total)
- [x] Cart.tsx: exibição de preço de cada item no SortableCartItem usa applyItemMargin — preço exibido reflete margem individual
- [x] Cart.tsx: indicador visual "+X% margem ind." exibido abaixo do preço quando itemMarginPercent > 0
- [x] Cart.tsx: applyItemMargin passada como prop para SortableCartItem (ambas as instâncias: lista plana e lista agrupada por pavimento)

## Correção — driverQty errado e preços "A definir" em itens legados (08/07/2026)
- [x] QuoteDetail.tsx: currentItemsMigrated — multiplicar driverQty por itemQty (estava calculando apenas por luminária, não pelo total de luminárias)
- [x] QuoteDetail.tsx: modal de edição — mesmo bug corrigido no bloco de migração do Sheet de edição
- [x] QuoteDetail.tsx: _resolvedUnitLum — usar fallback (totalPrice - driversTotalPrice) / qty em vez de unitPrice (que inclui driver)
- [x] QuoteDetail.tsx: totais globais (totalLuminaria, totalDriver, totalGeral) — usar mesmo fallback
- [x] QuoteDetail.tsx: editTotalBase e totalBase no modal de edição — usar fallback correto
- [x] quoteExcelGenerator.ts: getLegacyDriverInfoExcel — multiplicar totalQty por itemQty
- [x] ExcelPreviewModal.tsx: getLegacyDriverInfoPreview — multiplicar totalQty por itemQty

## Preço de driver para todos os produtos via API (08/07/2026)

- [x] Unificar lumPriceMap para incluir TODOS os produtos (PERFIS + DOWNLIGHTS + SPOTS + PAÍNÉIS + etc.) com custoDriver220/Bivolt/Dim
- [x] Garantir que buildLumDriverLines funcione para perfis lineares (BLAZE S, BLAZE E, HIT, etc.) — desacoplado do preço da luminária
- [x] Exibir preço do driver destacado no resumo de todos os produtos (summaryText inclui LUMINÁRIA + DRIVERS separados)
- [x] Exibir preço do driver no carrinho (driverLines) para todos os produtos
- [x] Exibir preço do driver no preview do orçamento para todos os produtos
- [x] Exportar preço do driver no Excel para todos os produtos
- [x] Corrigir erros TypeScript pré-existentes em downlightCatalog.ts e spotCatalog.ts (campos faltantes no retorno isLamp)
- [x] Corrigir parseCCTs para retornar ["3000K"] quando array vazio (teste alfaluxApiAdapter.test.ts)

## Potência por produto via API (08/07/2026)

- [x] Indexar skuPriceMap por sku+potência (chave: "LLS-3945.1IF.38F|18W") para suportar múltiplos registros por SKU
- [x] Remover powerFactor manual (×1.05 para 26W, ×1.10 para 36W) — custo já vem correto da API
- [x] Extrair potência do nome do produto na API (padrão: "36W SL", "36W SF", "26W", "18W")
- [x] Atualizar getSkuPrice para usar sku+potência como chave
- [x] UI de potência já exibe 18W, 26W, 36W com toggle Stripflex/Stripline (comportamento mantido)
- [x] skuPriceMap já agrupa por sku|powerLabel (driver e custo corretos por potência)
- [x] ledEngine/driverSelector usa driver correto por potência via driverLookup (sem alteração necessária)
- [x] Implementado e testado: 563 testes passando

## Driver e preço para todos os perfis (08/07/2026)

- [x] Diagnosticar por que LLP-6060 (BLAZE H) não mostra driver nem preço na tabela de detalhamento
- [x] Garantir que custoDriver220 da API é usado para calcular preço do driver em todos os perfis
- [x] Mostrar driver destacado (código EQ + preço) sempre que disponível na API

## Driver destacado em todos os perfis (08/07/2026)

- [ ] Exibir driver sempre separado e destacado no card de resumo (preço da luminária + preço do driver separados)
- [ ] Exibir driver sempre separado e destacado na tabela de detalhamento (linha própria com código EQ, modelo e preço)
- [ ] Garantir que o preço do driver apareça em TODOS os perfis que têm driver cadastrado na API
- [ ] Exibir preço total = luminária + driver de forma clara

## Edição de preço de drivers (2026-07-10)
- [x] Criar tabela driver_price_overrides no banco de dados
- [x] Criar endpoints tRPC: list, upsert, delete, getMap (restrito a vivian@grupoalfalux.com.br)
- [x] Aplicar overrides no skuPriceMap e lumPriceMap antes do cálculo de preços
- [x] Criar componente DriverPriceEditor com edição inline e remoção de overrides
- [x] Integrar DriverPriceEditor no Home.tsx visível apenas para vivian@grupoalfalux.com.br

## Bug crítico — perda de dados ao salvar itens do orçamento (16/07/2026)
- [x] QuoteDetail.tsx: addRevisionForItemsMutation não enviava freteValue, freteCity, freteState, freteIncluded, destState, difalEnabled, fcpEnabled, deliveryDays, commissionPercent, paymentTerm, difalPercent, fcpPercent, difalValue, fcpValue, projectNumber, diluicaoValor, diluicaoDescricao, quoteNumber ao salvar itens — todos esses campos eram sobrescritos com null/false/0 no banco
- [x] Corrigido: addRevisionForItemsMutation agora preserva todos os campos do orçamento ao salvar apenas itens

## Nova categoria "Não Orçamos" (16/07/2026)
- [x] Home.tsx: adicionar categoria "Não Orçamos" na grade de categorias (caixa retangular igual a Customizados)
- [x] Home.tsx: ao selecionar "Não Orçamos", mostrar formulário com apenas Descrição e Item em Planta (sem CCT, tensão, cor, quantidade, controle)
- [x] Home.tsx: ao adicionar ao carrinho, usar category="NaoOrcamos", sku="NAO-ORCAMOS", description=texto do usuário, totalPrice=0, qty=1 (sem perguntar cor)
- [x] Cart.tsx: tratar category="NaoOrcamos" — não mostrar driver, não mostrar preço, exibir badge especial
- [x] QuoteDetail.tsx: tratar category="NaoOrcamos" — exibir corretamente sem preço, sem driver
- [x] ExcelPreviewModal.tsx e quoteExcelGenerator.ts: linha sem preço, sem driver para NaoOrcamos

## Ajustes "Não Orçamos" (16/07/2026)
- [x] Home.tsx: remover obrigatoriedade da descrição para enviar ao carrinho (botão habilitado mesmo sem descrição)
- [x] quoteExcelGenerator.ts: exibir "Não Orçamos" como linha normal de produto (sem linha vermelha especial, sem borda lateral)
- [x] ExcelPreviewModal.tsx: exibir "Não Orçamos" como linha normal de produto (sem linha vermelha especial, sem borda lateral)
- [x] Corrigir no Cart.tsx o cálculo do DIFAL/FCP para incluir o frete separado (freteIncluded=false) na base ao gerar novos orçamentos
- [x] Validar que quoteExcelGenerator.ts e ExcelPreviewModal.tsx usam a mesma regra de base de DIFAL/FCP com frete separado
- [x] Configurar Excel gerado com impressão pronta para caber em 1 página: fitToPage=true, fitToWidth=1, fitToHeight=1, área de impressão dinâmica (C1:N{lastRow}), margens reduzidas (0.5")

## Download PDF do Orçamento (16/07/2026)
- [ ] Criar quotePdfGenerator.ts com layout fiel ao Excel (cabeçalho, tabela de itens, rodapé, logo)
- [ ] Adicionar botão "Baixar PDF" no Cart.tsx (diálogo de geração) com mesmas regras de revisão do Excel
- [ ] Adicionar botão "Baixar PDF" no QuoteDetail.tsx com mesmas regras de revisão do Excel
- [ ] Incrementar revisão ao baixar PDF (mesma lógica do Excel: conta como revisão oficial)

## Download PDF do Orçamento (Jul 2026)
- [x] Criar quotePdfGenerator.ts com jsPDF + autoTable replicando o layout do Excel
- [x] Adicionar botão "Baixar PDF" no Cart.tsx e QuoteDetail.tsx com as mesmas regras de revisão do Excel

- [x] orderGrouping.ts: criar função groupOrderItems() que agrupa itens idênticos somando qtys e concatenando etiquetas com pavimento
- [x] orderExcelGenerator.ts: aplicar groupOrderItems() antes de gerar linhas do Excel do pedido de fábrica
- [x] orderPreviewGenerator.ts: aplicar groupOrderItems() antes de gerar linhas do HTML do preview do pedido de fábrica
- [x] FactoryOrderDetail.tsx: tela de gerenciamento continua mostrando itens individuais (agrupamento só ocorre na geração do Excel/preview)

## Correção — Driver incorreto no pedido de fábrica (17/07/2026)
- [x] Home.tsx: ao montar profileSegments, sobrescrever driver com dados do skuPriceMap por SKU específico (em vez do driver genérico do ProfileVariant que usava o primeiro produto do profileCode)
- [x] Banco: corrigir 459 itens com driverLines contendo EQ00346 (XITANIUM 19W) → EQ00347 (XITANIUM 44W) para SKUs de 2+ barras (SKYLINE, EASY PRIME, BLAZE E, etc.)
- [x] Banco: profileSegments já estavam corretos (EQ00347) — apenas driverLines precisava de correção

## Correção — Driver incorreto na tabela factory_order_items (17/07/2026)
- [x] Identificar que factory_order_items tem cópia independente dos dados do orçamento, salva no momento da criação do pedido
- [x] Corrigir 7 itens em factory_order_items: driverLines EQ00346 → EQ00347 e profileSegments EQ00346 → EQ00347
- [x] Verificar que o item 3 do pedido de fábrica 900001 (orçamento 20.0397-26) agora exibe EQ00347 corretamente

## Corrente de programação e código EQ de módulos LED na ficha de produção (17/07/2026)
- [x] Home.tsx: adicionar corrente220/Bivolt/DimDali/Dim110v ao SkuPriceMap e usar na montagem de profileSegments e perfilDrvLines
- [x] FactoryOrderDetail.tsx: exibir PROGRAMAÇÃO: corrente no buildEquipamentosText para profileSegments (igual ao Excel)
- [x] Home.tsx: incluir código EQ do módulo LED (ledModuleEq/ledModuleEq3000 etc.) no ProfileSegment (novo campo ledModuleCode)
- [x] CartItemData: adicionar campo ledModuleCode ao ProfileSegment para armazenar código EQ do módulo LED
- [x] FactoryOrderDetail.tsx: exibir código EQ do módulo LED na seção Módulo LED / Fonte de Luz
- [x] orderExcelGenerator.ts: incluir código EQ do módulo LED na coluna Fonte de Luz
- [x] orderPreviewGenerator.ts: incluir código EQ do módulo LED na coluna Fonte de Luz
- [x] Corrigir corrente e código EQ nos dados já salvos no banco (quote_items e factory_order_items)

## Bug — Seleção múltipla na categoria Customizados (17/07/2026)
- [x] Corrigir bug onde clicar em um produto Customizado seleciona todos os itens com o mesmo SKU (ex: LDP-1650.500.48F aparece 2 vezes selecionado)
## Correções e Requisição de Materiais (17/07/2026 — tarde)
- [x] Corrigir agrupamento de Itens Especiais por pavimento (orderGrouping.ts)
- [x] Adicionar campo drvQtyPerUnit ao DriverLine (cartTypes.ts)
- [x] Corrigir buildEquipamentosText (FactoryOrderDetail.tsx) para usar drvQtyPerUnit
- [x] Corrigir downlightCatalog.ts e painelCatalog.ts para usar driverBivolt como fallback quando driver220 é null
- [x] Criar materialRequisition.ts com função buildMaterialRequisition
- [x] Adicionar aba "Requisição de Materiais" no Excel (orderExcelGenerator.ts)
- [x] Adicionar seção "Requisição de Materiais" na pré-visualização HTML (orderPreviewGenerator.ts)
- [x] Corrigir drvQtyPerUnit nos dados já salvos no banco (2010 quote_items + 55 factory_order_items)

## Reorganização Aba Destino + Correção DIFAL (17/07/2026)
- [x] Renomear aba "Frete" para "Destino" na tela de edição do orçamento
- [x] Mover bloco DIFAL/FCP da aba Comercial para a aba Destino (após campos de frete)
- [x] Corrigir bug de dupla contagem do frete no TOTAL GERAL do Excel (totalComDifal + freteValue quando DIFAL já inclui frete na base)
- [x] Ajustar ordem de exibição no preview HTML e Excel (frete antes do DIFAL)

## Migração 4 — Resolução correta de ledModuleCode por potência

- [x] Expandir ApiProductDriverInfo com campos ledModuleEq2700/3000/4000/5000, ledModuleEq, name
- [x] Exportar helpers toPowerLabel() e extractPowerLabelFromName() de cartTypes.ts
- [x] Implementar Migração 4 em migrateItemDrivers: corrigir ledModuleCode nos profileSegments usando produto correto da API por SKU+potência+stripMethod
- [x] Atualizar productSkuMapFO em FactoryOrderDetail.tsx para indexar por sku|powerLabel e incluir campos ledModuleEq
- [x] Atualizar productSkuMap em QuoteDetail.tsx para indexar por sku|powerLabel e incluir campos ledModuleEq
- [x] Adicionar Migração 4 inline em QuoteDetail.tsx (currentItemsMigrated) antes das migrações existentes
- [x] Remover fallback estático de nome de barra em productionTemplate.ts (usar sempre result.stripflexName da API)
- [x] Remover fallback estático de nome de barra em materialRequisition.ts (usar sempre descMap da API)
- [x] TypeScript check: 0 erros
- [x] Vitest: 563 testes passando (21 arquivos)

## Requisição de Materiais — Agrupamento e categorização

- [x] Agrupar perfis por código-base (LLE-2810, LLS-3945, etc.) com metragem total somada em uma única linha
- [x] Incluir LED BAR na contabilização de perfis (metragem total)
- [x] Fita LED unificada em um único item por código EQ da API (metragem total somada)
- [x] Módulos LED (Stripflex, Stripline, Lux Round, etc.) contabilizados por unidade (UN), não metros
- [x] TypeScript check e testes passando

## Ficha de Produção — Código EQ/CP entre parênteses
- [ ] Módulo LED: mostrar descrição + (EQ00XXX) na Ficha de Produção
- [ ] Drivers/fontes: mostrar descrição + (EQ/CP) na Ficha de Produção
- [ ] Todos os equipamentos e fontes de luz: usar EQ ou CP conforme o tipo

## Sistema de Custo/Markup e Dashboard de Lucro
- [x] Campo de custo no Item Especial (visível só para Vivian, Dennis, Rogério) no carrinho
- [x] Campo de custo no Item Especial na edição de itens do orçamento
- [x] Campo de markup que calcula preço de venda a partir do custo (e vice-versa)
- [x] Tabela de custos adicionais por orçamento no banco de dados
- [x] tRPC endpoints para CRUD de custos adicionais
- [x] Dashboard de lucro por orçamento (margens, bruto, líquido) — restrito a Vivian/Dennis/Rogério
- [x] Botão "Incluir custo adicional" no orçamento (valor + descrição)
- [x] Custos adicionais debitam do lucro no dashboard do orçamento
- [x] Índice de custos adicionais no dashboard geral
