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
