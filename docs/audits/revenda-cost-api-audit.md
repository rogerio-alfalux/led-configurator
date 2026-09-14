# Auditoria da API de Revenda — 14/09/2026

Fonte oficial consultada: `https://alfaluxprod-c8zmg2fn.manus.space`.

- O endpoint público `GET /api/revenda/all` retornou 217 produtos, mas o contrato observado contém somente `codigo`, `descricao`, `fornecedor`, `fotoUrl`, `precoVenda` e `referencia`; nenhum campo de custo foi exposto.
- O item `RV00064` foi localizado nessa rota, igualmente sem custo no payload público.
- A aplicação administrativa da API usa a consulta autenticada `revenda.list` e possui a mutação `revenda.updateCosts`, indicando que o custo existe na base protegida.
- Uma chamada sem sessão a `revenda.list` retornou HTTP 401 (`UNAUTHORIZED`). Portanto, a ausência no Sistema Luna não deve ser tratada como inexistência de custo; é uma limitação do contrato público atual.
- A conta técnica configurada no servidor foi validada contra a rota autenticada. Para `RV00064`, a API retornou custo oficial unitário de `R$ 190,46` e preço de venda de `R$ 476,15`.
- A integração final mantém credenciais exclusivamente em segredos do servidor, mescla custos por código RV e não expõe custo no catálogo comercial entregue ao navegador.
