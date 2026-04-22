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
