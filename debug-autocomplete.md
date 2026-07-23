# Debug: Autocomplete não funciona em produção

## API Backend: FUNCIONA PERFEITAMENTE
- Endpoint: /api/trpc/alfalux.componentes
- Retorna 486 itens com campos: codigo, descricao, tipo, familia, potencia, tensaoEntrada, corrente, custoDriver, mkpPadrao, precoVenda, fotoUrl, observacoes, disponivel
- 132 itens MODULO_LED, 265 itens DRIVER_*
- Todos têm campo `disponivel: true/false`

## Frontend: ComponentSearchField
- Interface: { codigo: string; descricao: string; tipo: string; disponivel: boolean }
- Lógica: onFocus → setOpen(true), setSearch("") → filtered = options.slice(0,50) → dropdown aparece se filtered.length > 0
- Se options está vazio → dropdown não aparece

## Código no FactoryOrderDetail.tsx:
- componentesData carregado via: `trpc.alfalux.componentes.useQuery(undefined, { staleTime: 5*60*1000, retry: 3, retryDelay: 2000 })`
- Passado ao EditableItem como: `componentesData={componentesData?.items ?? []}`
- Dentro do EditableItem: `moduloLedOptions = componentesData.filter(c => c.tipo === "MODULO_LED")`
- Dentro do EditableItem: `driverOptions = componentesData.filter(c => c.tipo.startsWith("DRIVER_"))`

## Hipótese do problema:
O FactoryOrderDetail.tsx é uma página protegida. A query de componentes pode estar batching com outras queries (acessoriosProducts, products) e se UMA falhar, TODAS falham no batch.

Verificar: se a query está no mesmo batch que outras queries que podem falhar, o componentesData fica undefined e options fica [].

## Solução potencial:
Separar a query de componentes para não batcher com queries que podem falhar, ou adicionar refetchOnMount: true.
