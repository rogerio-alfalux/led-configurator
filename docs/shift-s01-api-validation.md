# Validação API — SHIFT S01

Em 1º de setembro de 2026, os endpoints públicos da Alfalux foram consultados em modo somente leitura fora do processo local de desenvolvimento. O catálogo geral retornou 3.603 produtos disponíveis, e o endpoint de acessórios retornou a lista vigente de acessórios.

Esta confirmação separa a disponibilidade da API da falha transitória de rota observada no ambiente local.

## Componentes confirmados para a referência `33.x1x1-26`

Os SKUs de perfil `LLE-4846.150.18F` e `LLE-4846.250.18F` retornam o driver bivolt `EQ00112`, **FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM**, com quantidade `1` por SKU. A API também retorna os controles DIM próprios, que devem ser escolhidos somente conforme a configuração selecionada.

Os acessórios SHIFT S01 são produtos estruturados no catálogo principal, e não acessórios simples. Para cada unidade do S01, a API retorna o driver `EQ00257`, **REGULADOR DE VOLTAGEM 20X20MM ALUMINIO PCB**, com quantidade `1`, além da fonte de luz por CCT. No orçamento de referência, em 3000K, foram confirmados `EQ00265` para `S01-06862`, `EQ00321` para `S01-06851` e `EQ00161` para `S01-06860`, sempre com quantidade `1` por S01.

Portanto, o Sistema Luna deve transportar esses componentes estruturados desde a seleção do S01; não pode derivá-los por nome ou criar equivalentes estáticos.
