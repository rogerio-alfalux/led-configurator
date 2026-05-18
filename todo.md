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
- [ ] DIM DALI para Painéis: API retorna driverDimDali: null para todos os 52 painéis — aguardando preenchimento na plataforma Alfalux
