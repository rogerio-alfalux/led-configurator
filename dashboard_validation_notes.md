# Validação visual do Dashboard

- Em 05/09/2026, duas capturas autenticadas de `/dashboard` mostraram o estado inicial “Carregando dados...”.
- O servidor registrou carregamento das fontes Alfalux durante a segunda captura, sem erro de TypeScript ou de console identificado.
- A renderização final da aba administrativa de produtos ainda precisa ser confirmada após a conclusão das consultas de dados.
- A navegação automatizada independente não preservou a sessão administrativa; por isso, a captura móvel do orçamento 20.0523-26 parou no estado de carregamento e não substitui a validação autenticada real da foto.
- Após aquecer o catálogo e postergar a consulta de produtos, uma nova captura ainda mostrou o carregamento da consulta gerencial pré-existente; a nova consulta de produtos já não é iniciada em paralelo a ela.
